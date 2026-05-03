import type { AgentRuntimePlan } from "../runtime-plan/types.js";

export type PreparedReplyAuthProfileSource = "auto" | "user";

export type PreparedReplyRuntimeScope = "request";

export type PreparedReplyModelSelectionResult<TModel = unknown> = {
  provider: string;
  modelId: string;
  model?: TModel;
  modelApi?: string | null;
  resolvedRef?: string;
  catalogSource?: string;
  discoveryRequired?: boolean;
};

export type PreparedReplyAuthResult<TAuthStorage = unknown, TModelRegistry = unknown> = {
  authStorage?: TAuthStorage;
  modelRegistry?: TModelRegistry;
  authProfileId?: string;
  authProfileIdSource?: PreparedReplyAuthProfileSource;
};

export type PreparedReplyProviderRuntimeHandle<
  TRuntimePlan = AgentRuntimePlan,
  TProviderHandle = unknown,
> = {
  runtimePlan?: TRuntimePlan;
  handle?: TProviderHandle;
};

export type PreparedReplyToolSurfaceResult<TClientTool = unknown, TToolPolicy = unknown> = {
  clientTools?: readonly TClientTool[];
  disableTools?: boolean;
  toolsAllow?: readonly string[];
  ownerOnlyToolAllowlist?: readonly string[];
  policy?: TToolPolicy;
};

export type PreparedReplySessionRuntimeResult<TContextEngine = unknown> = {
  sessionId: string;
  sessionKey?: string;
  workspaceDir: string;
  agentDir?: string;
  agentId?: string;
  agentHarnessId?: string;
  contextEngine?: TContextEngine;
  contextTokenBudget?: number;
};

export type PreparedReplyTelemetryStage =
  | "model-selection"
  | "auth-resolution"
  | "provider-runtime"
  | "tool-surface"
  | "session-runtime";

export type PreparedReplyTelemetrySpan = {
  stage: PreparedReplyTelemetryStage;
  durationMs?: number;
  metadata?: Readonly<Record<string, unknown>>;
};

export type PreparedReplyTelemetryContext<TContext = unknown> = {
  runId?: string;
  traceId?: string;
  context?: TContext;
  spans?: readonly PreparedReplyTelemetrySpan[];
};

export type PreparedReplyRuntime<
  TModel = unknown,
  TAuthStorage = unknown,
  TModelRegistry = unknown,
  TRuntimePlan = AgentRuntimePlan,
  TProviderHandle = unknown,
  TClientTool = unknown,
  TToolPolicy = unknown,
  TContextEngine = unknown,
  TTelemetryContext = unknown,
> = {
  scope: PreparedReplyRuntimeScope;
  modelSelection: PreparedReplyModelSelectionResult<TModel>;
  auth: PreparedReplyAuthResult<TAuthStorage, TModelRegistry>;
  providerRuntime: PreparedReplyProviderRuntimeHandle<TRuntimePlan, TProviderHandle>;
  toolSurface: PreparedReplyToolSurfaceResult<TClientTool, TToolPolicy>;
  sessionRuntime: PreparedReplySessionRuntimeResult<TContextEngine>;
  telemetry: PreparedReplyTelemetryContext<TTelemetryContext>;
};

export type CreatePreparedReplyRuntimeParams<
  TModel = unknown,
  TAuthStorage = unknown,
  TModelRegistry = unknown,
  TRuntimePlan = AgentRuntimePlan,
  TProviderHandle = unknown,
  TClientTool = unknown,
  TToolPolicy = unknown,
  TContextEngine = unknown,
  TTelemetryContext = unknown,
> = Omit<
  PreparedReplyRuntime<
    TModel,
    TAuthStorage,
    TModelRegistry,
    TRuntimePlan,
    TProviderHandle,
    TClientTool,
    TToolPolicy,
    TContextEngine,
    TTelemetryContext
  >,
  "scope"
> & {
  scope?: PreparedReplyRuntimeScope;
};

export function createPreparedReplyRuntime<
  TModel = unknown,
  TAuthStorage = unknown,
  TModelRegistry = unknown,
  TRuntimePlan = AgentRuntimePlan,
  TProviderHandle = unknown,
  TClientTool = unknown,
  TToolPolicy = unknown,
  TContextEngine = unknown,
  TTelemetryContext = unknown,
>(
  params: CreatePreparedReplyRuntimeParams<
    TModel,
    TAuthStorage,
    TModelRegistry,
    TRuntimePlan,
    TProviderHandle,
    TClientTool,
    TToolPolicy,
    TContextEngine,
    TTelemetryContext
  >,
): PreparedReplyRuntime<
  TModel,
  TAuthStorage,
  TModelRegistry,
  TRuntimePlan,
  TProviderHandle,
  TClientTool,
  TToolPolicy,
  TContextEngine,
  TTelemetryContext
> {
  return {
    scope: params.scope ?? "request",
    modelSelection: params.modelSelection,
    auth: params.auth,
    providerRuntime: params.providerRuntime,
    toolSurface: params.toolSurface,
    sessionRuntime: params.sessionRuntime,
    telemetry: params.telemetry,
  };
}
