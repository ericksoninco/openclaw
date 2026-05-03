import {
  createStageTracker,
  DEFAULT_STAGE_WARN_STAGE_MS,
  DEFAULT_STAGE_WARN_TOTAL_MS,
  emitStageSummary,
  formatStageSummary,
  shouldWarnStageSummary,
  type StageLogger,
  type StageSummary,
  type StageTiming,
  type StageTracker,
} from "../../../infra/stage-timing.js";

export type EmbeddedRunStageTiming = StageTiming;
export type EmbeddedRunStageSummary = StageSummary;
export type EmbeddedRunStageTracker = StageTracker;
type EmbeddedRunStageLogger = StageLogger;

export const EmbeddedRunStageName = {
  workspaceSessionPrep: "workspace-session-prep",
  pluginRuntimeLoading: "plugin-runtime-loading",
  replyHooks: "reply-hooks",
  harnessPrep: "harness-prep",
  modelSelection: "model-selection",
  authSelection: "auth-selection",
  authControllerCreate: "auth-controller-create",
  authProfileInitialize: "auth-profile-initialize",
  authResolution: "auth-resolution",
  contextEnginePrep: "context-engine-prep",
  retryAttemptPrep: "retry-attempt-prep",
  providerRuntimeLookup: "provider-runtime-lookup",
  skillPrep: "skill-prep",
  toolPlanning: "tool-planning",
  toolMaterialization: "tool-materialization",
  bootstrapContext: "bootstrap-context",
  pluginCapabilityLoading: "plugin-capability-loading",
  systemPrompt: "system-prompt",
  sessionWriteLock: "session-write-lock",
  sessionTranscriptRepair: "session-transcript-repair",
  sessionManagerOpen: "session-manager-open",
  contextEngineBootstrap: "context-engine-bootstrap",
  sessionManagerPrepare: "session-manager-prepare",
  piSettings: "pi-settings",
  extensionFactoryBuild: "extension-factory-build",
  resourceLoaderCreate: "resource-loader-create",
  sessionResourceLoader: "session-resource-loader",
  agentSession: "agent-session",
  streamSetup: "stream-setup",
  promptCacheTraceSetup: "prompt-cache-trace-setup",
  streamWrapperSetup: "stream-wrapper-setup",
  sessionHistoryPrepare: "session-history-prepare",
  subscriptionSetup: "subscription-setup",
  activeRunRegistration: "active-run-registration",
  modelRequestPrep: "model-request-prep",
  modelExecution: "model-execution",
  promptFinalization: "prompt-finalization",
  compactionRetryWait: "compaction-retry-wait",
  attemptStateCapture: "attempt-state-capture",
  contextEngineFinalize: "context-engine-finalize",
  subscriptionCleanup: "subscription-cleanup",
  attemptResultBuild: "attempt-result-build",
} as const;

export const EMBEDDED_RUN_STAGE_WARN_TOTAL_MS = DEFAULT_STAGE_WARN_TOTAL_MS;
export const EMBEDDED_RUN_STAGE_WARN_STAGE_MS = DEFAULT_STAGE_WARN_STAGE_MS;

export function createEmbeddedRunStageTracker(options?: {
  now?: () => number;
}): EmbeddedRunStageTracker {
  return createStageTracker(options);
}

export function shouldWarnEmbeddedRunStageSummary(
  summary: EmbeddedRunStageSummary,
  options?: {
    totalThresholdMs?: number;
    stageThresholdMs?: number;
  },
): boolean {
  return shouldWarnStageSummary(summary, {
    totalThresholdMs: options?.totalThresholdMs ?? EMBEDDED_RUN_STAGE_WARN_TOTAL_MS,
    stageThresholdMs: options?.stageThresholdMs ?? EMBEDDED_RUN_STAGE_WARN_STAGE_MS,
  });
}

export function formatEmbeddedRunStageSummary(
  prefix: string,
  summary: EmbeddedRunStageSummary,
): string {
  return formatStageSummary(prefix, summary);
}

export function emitEmbeddedRunStageSummary(params: {
  logger: EmbeddedRunStageLogger;
  prefix: string;
  summary: EmbeddedRunStageSummary;
  normalLevel?: "debug" | "trace";
}): boolean {
  return emitStageSummary({
    logger: params.logger,
    prefix: params.prefix,
    summary: params.summary,
    normalLevel: params.normalLevel,
    totalThresholdMs: EMBEDDED_RUN_STAGE_WARN_TOTAL_MS,
    stageThresholdMs: EMBEDDED_RUN_STAGE_WARN_STAGE_MS,
  });
}
