import { describe, expect, expectTypeOf, it } from "vitest";
import type { AgentRuntimePlan } from "../runtime-plan/types.js";
import { createPreparedReplyRuntime } from "./types.js";
import type { PreparedReplyRuntime, PreparedReplyTelemetryStage } from "./types.js";

type FakeModel = {
  id: string;
  api: string;
};

type FakeAuthStorage = {
  kind: "auth-storage";
};

type FakeModelRegistry = {
  kind: "model-registry";
};

type FakeRuntimePlan = {
  resolvedRef: string;
};

type FakeProviderHandle = {
  provider: string;
};

type FakeClientTool = {
  name: string;
};

type FakeToolPolicy = {
  materialize: boolean;
};

type FakeContextEngine = {
  assemble(): string;
};

type FakeTelemetryContext = {
  requestKind: "reply";
};

type FakePreparedRuntime = PreparedReplyRuntime<
  FakeModel,
  FakeAuthStorage,
  FakeModelRegistry,
  FakeRuntimePlan,
  FakeProviderHandle,
  FakeClientTool,
  FakeToolPolicy,
  FakeContextEngine,
  FakeTelemetryContext
>;

describe("PreparedReplyRuntime", () => {
  it("constructs a request-scoped runtime from fake collaborators", () => {
    const model: FakeModel = { id: "gpt-5.5", api: "openai-responses" };
    const authStorage: FakeAuthStorage = { kind: "auth-storage" };
    const modelRegistry: FakeModelRegistry = { kind: "model-registry" };
    const runtimePlan: FakeRuntimePlan = { resolvedRef: "openai/gpt-5.5" };
    const providerHandle: FakeProviderHandle = { provider: "openai" };
    const clientTool: FakeClientTool = { name: "shell" };
    const toolPolicy: FakeToolPolicy = { materialize: true };
    const contextEngine: FakeContextEngine = { assemble: () => "prompt" };
    const telemetryContext: FakeTelemetryContext = { requestKind: "reply" };

    const runtime = createPreparedReplyRuntime<
      FakeModel,
      FakeAuthStorage,
      FakeModelRegistry,
      FakeRuntimePlan,
      FakeProviderHandle,
      FakeClientTool,
      FakeToolPolicy,
      FakeContextEngine,
      FakeTelemetryContext
    >({
      modelSelection: {
        provider: "openai",
        modelId: model.id,
        modelApi: model.api,
        model,
        resolvedRef: runtimePlan.resolvedRef,
      },
      auth: {
        authStorage,
        modelRegistry,
        authProfileId: "openai:work",
        authProfileIdSource: "user",
      },
      providerRuntime: {
        runtimePlan,
        handle: providerHandle,
      },
      toolSurface: {
        clientTools: [clientTool],
        toolsAllow: ["shell"],
        policy: toolPolicy,
      },
      sessionRuntime: {
        sessionId: "session-1",
        sessionKey: "main",
        workspaceDir: "/tmp/openclaw-prepared-runtime",
        agentDir: "/tmp/openclaw-prepared-runtime/agent",
        agentId: "agent-1",
        agentHarnessId: "codex",
        contextEngine,
        contextTokenBudget: 200_000,
      },
      telemetry: {
        runId: "run-1",
        context: telemetryContext,
        spans: [{ stage: "model-selection", durationMs: 3 }],
      },
    });

    expect(runtime.scope).toBe("request");
    expect(runtime.modelSelection.model).toBe(model);
    expect(runtime.auth.authStorage).toBe(authStorage);
    expect(runtime.auth.modelRegistry).toBe(modelRegistry);
    expect(runtime.providerRuntime.runtimePlan).toBe(runtimePlan);
    expect(runtime.providerRuntime.handle).toBe(providerHandle);
    expect(runtime.toolSurface.clientTools).toEqual([clientTool]);
    expect(runtime.toolSurface.policy).toBe(toolPolicy);
    expect(runtime.sessionRuntime.contextEngine).toBe(contextEngine);
    expect(runtime.telemetry.context).toBe(telemetryContext);
    expectTypeOf(runtime).toEqualTypeOf<FakePreparedRuntime>();
  });

  it("keeps the default provider runtime plan compatible with AgentRuntimePlan", () => {
    expectTypeOf<
      NonNullable<PreparedReplyRuntime["providerRuntime"]["runtimePlan"]>
    >().toEqualTypeOf<AgentRuntimePlan>();
  });

  it("keeps telemetry stage names low-cardinality", () => {
    const stages = [
      "model-selection",
      "auth-resolution",
      "provider-runtime",
      "tool-surface",
      "session-runtime",
    ] satisfies PreparedReplyTelemetryStage[];

    expect(stages).toEqual([
      "model-selection",
      "auth-resolution",
      "provider-runtime",
      "tool-surface",
      "session-runtime",
    ]);
  });
});
