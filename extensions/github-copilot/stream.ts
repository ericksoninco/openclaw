import type { StreamFn } from "@earendil-works/pi-agent-core";
import type { Context } from "@earendil-works/pi-ai";
import type { ProviderWrapStreamFnContext } from "openclaw/plugin-sdk/plugin-entry";
import { buildCopilotIdeHeaders, COPILOT_INTEGRATION_ID } from "openclaw/plugin-sdk/provider-auth";
import {
  applyAnthropicEphemeralCacheControlMarkers,
  streamWithPayloadPatch,
} from "openclaw/plugin-sdk/provider-stream-shared";
import { rewriteCopilotResponsePayloadConnectionBoundIds } from "./connection-bound-ids.js";

type StreamOptions = Parameters<StreamFn>[2];

function containsCopilotContentType(value: unknown, type: string): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => containsCopilotContentType(item, type));
  }
  if (!value || typeof value !== "object") {
    return false;
  }
  const entry = value as { type?: unknown; content?: unknown };
  return entry.type === type || containsCopilotContentType(entry.content, type);
}

function inferCopilotInitiator(messages: Context["messages"]): "agent" | "user" {
  const last = messages[messages.length - 1];
  if (!last) {
    return "user";
  }
  if (last.role === "user" && containsCopilotContentType(last.content, "tool_result")) {
    return "agent";
  }
  return last.role === "user" ? "user" : "agent";
}

export function hasCopilotVisionInput(messages: Context["messages"]): boolean {
  return messages.some((message) => {
    if (message.role === "user" && Array.isArray(message.content)) {
      return message.content.some((item) => containsCopilotContentType(item, "image"));
    }
    if (message.role === "toolResult" && Array.isArray(message.content)) {
      return message.content.some((item) => containsCopilotContentType(item, "image"));
    }
    return false;
  });
}

export function buildCopilotDynamicHeaders(params: {
  messages: Context["messages"];
  hasImages: boolean;
}): Record<string, string> {
  return {
    ...buildCopilotIdeHeaders(),
    "Copilot-Integration-Id": COPILOT_INTEGRATION_ID,
    "Openai-Organization": "github-copilot",
    "x-initiator": inferCopilotInitiator(params.messages),
    ...(params.hasImages ? { "Copilot-Vision-Request": "true" } : {}),
  };
}

function patchOnPayloadResult(result: unknown): unknown {
  if (result && typeof result === "object" && "then" in result) {
    return Promise.resolve(result).then((next) => {
      sanitizeCopilotOpenAIResponsesPayload(next);
      return next;
    });
  }
  sanitizeCopilotOpenAIResponsesPayload(result);
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isTruthyEnvValue(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length > 0 &&
    normalized !== "0" &&
    normalized !== "false" &&
    normalized !== "off" &&
    normalized !== "no"
  );
}

function redactPayloadText(value: string): string {
  return value
    .replace(/\b(sk-[A-Za-z0-9_-]{12})[A-Za-z0-9_-]+/g, "$1…<redacted>")
    .replace(/\b(ghp_[A-Za-z0-9_]{8})[A-Za-z0-9_]+/g, "$1…<redacted>")
    .replace(/\b(github_pat_[A-Za-z0-9_]{8})[A-Za-z0-9_]+/g, "$1…<redacted>")
    .replace(/\b(Bearer\s+)[A-Za-z0-9._-]+/gi, "$1<redacted>");
}

function maybeLogCopilotOpenAIResponsesPayload(payload: unknown): void {
  if (!isTruthyEnvValue(process.env.OPENCLAW_DEBUG_REJECTED_MODEL_PAYLOAD)) {
    return;
  }
  try {
    console.error(
      `[github-copilot] responses outbound payload=${redactPayloadText(JSON.stringify(payload))}`,
    );
  } catch {
    console.error("[github-copilot] responses outbound payload=<unserializable>");
  }
}

function sanitizeCopilotOpenAIResponsesPayload(payload: unknown): void {
  rewriteCopilotResponsePayloadConnectionBoundIds(payload);
  if (!isRecord(payload)) {
    return;
  }
  delete payload.store;
  delete payload.prompt_cache_key;
  delete payload.prompt_cache_retention;
  if (Array.isArray(payload.include)) {
    payload.include = payload.include.filter((item) => item !== "reasoning.encrypted_content");
    if (payload.include.length === 0) {
      delete payload.include;
    }
  }
  const input = payload.input;
  if (!Array.isArray(input)) {
    maybeLogCopilotOpenAIResponsesPayload(payload);
    return;
  }
  const sanitizedInput = input.filter((item) => !(isRecord(item) && item.type === "reasoning"));
  payload.input = sanitizedInput;
  for (const item of sanitizedInput) {
    if (isRecord(item) && item.type === "message") {
      delete item.phase;
    }
  }
  maybeLogCopilotOpenAIResponsesPayload(payload);
}

function buildCopilotRequestHeaders(
  context: Parameters<StreamFn>[1],
  headers: Record<string, string> | undefined,
): Record<string, string> {
  return {
    ...buildCopilotDynamicHeaders({
      messages: context.messages,
      hasImages: hasCopilotVisionInput(context.messages),
    }),
    ...headers,
  };
}

export function wrapCopilotAnthropicStream(
  baseStreamFn: StreamFn | undefined,
): StreamFn | undefined {
  if (!baseStreamFn) {
    return undefined;
  }
  const underlying = baseStreamFn;
  return (model, context, options) => {
    if (model.provider !== "github-copilot" || model.api !== "anthropic-messages") {
      return underlying(model, context, options);
    }

    return streamWithPayloadPatch(
      underlying,
      model,
      context,
      {
        ...options,
        headers: buildCopilotRequestHeaders(context, options?.headers),
      },
      applyAnthropicEphemeralCacheControlMarkers,
    );
  };
}

export function wrapCopilotOpenAIResponsesStream(
  baseStreamFn: StreamFn | undefined,
): StreamFn | undefined {
  if (!baseStreamFn) {
    return undefined;
  }
  const underlying = baseStreamFn;
  return (model, context, options) => {
    if (model.provider !== "github-copilot" || model.api !== "openai-responses") {
      return underlying(model, context, options);
    }

    const originalOnPayload = options?.onPayload;
    const wrappedOptions: StreamOptions = {
      ...options,
      headers: buildCopilotRequestHeaders(context, options?.headers),
      onPayload: (payload, payloadModel) => {
        sanitizeCopilotOpenAIResponsesPayload(payload);
        return patchOnPayloadResult(originalOnPayload?.(payload, payloadModel));
      },
    };
    return underlying(model, context, wrappedOptions);
  };
}

export function wrapCopilotOpenAICompletionsStream(
  baseStreamFn: StreamFn | undefined,
): StreamFn | undefined {
  if (!baseStreamFn) {
    return undefined;
  }
  const underlying = baseStreamFn;
  return (model, context, options) => {
    if (model.provider !== "github-copilot" || model.api !== "openai-completions") {
      return underlying(model, context, options);
    }

    return underlying(model, context, {
      ...options,
      headers: buildCopilotRequestHeaders(context, options?.headers),
    });
  };
}

export function wrapCopilotProviderStream(ctx: ProviderWrapStreamFnContext): StreamFn | undefined {
  return wrapCopilotOpenAICompletionsStream(
    wrapCopilotOpenAIResponsesStream(wrapCopilotAnthropicStream(ctx.streamFn)),
  );
}
