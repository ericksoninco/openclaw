import type { ModelCandidate } from "./model-fallback.types.js";

export const FORMAT_FAILOVER_RECOVERED_TICKET_THRESHOLD = 3;
const FORMAT_FAILOVER_RECOVERED_ROLLING_WINDOW_MS = 24 * 60 * 60 * 1000;
const UNKNOWN_AGENT_ID = "unknown-agent";

type FormatFailoverGuardrailEntry = {
  recoveredAt: number[];
  diagnosticEnabled: boolean;
  defectTicketAutofiled: boolean;
  defectTicketId?: string;
};

export type FormatFailoverGuardrailSnapshot = {
  key: string;
  primaryProvider: string;
  agentId?: string;
  recoveredCount: number;
  firstRecoveredForKey: boolean;
  diagnosticEnabled: boolean;
  defectTicketAutofiled: boolean;
  defectTicketId?: string;
};

const guardrailState = new Map<string, FormatFailoverGuardrailEntry>();

function normalizeKeyPart(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function formatGuardrailKey(primaryProvider: string, agentId?: string): string {
  return `${normalizeKeyPart(primaryProvider, "unknown-provider")}::${normalizeKeyPart(agentId, UNKNOWN_AGENT_ID)}`;
}

function pruneRollingWindow(entry: FormatFailoverGuardrailEntry, now: number): void {
  const oldestAllowed = now - FORMAT_FAILOVER_RECOVERED_ROLLING_WINDOW_MS;
  entry.recoveredAt = entry.recoveredAt.filter((timestamp) => timestamp >= oldestAllowed);
}

function buildDefectTicketId(key: string): string {
  return `format-body-defect:${key}`;
}

export function recordFormatFailoverRecovered(params: {
  primary: ModelCandidate;
  secondary: ModelCandidate;
  agentId?: string;
  sessionId?: string;
  requestId?: string;
  now?: number;
}): FormatFailoverGuardrailSnapshot {
  const now = params.now ?? Date.now();
  const key = formatGuardrailKey(params.primary.provider, params.agentId);
  const entry =
    guardrailState.get(key) ??
    ({
      recoveredAt: [],
      diagnosticEnabled: false,
      defectTicketAutofiled: false,
    } satisfies FormatFailoverGuardrailEntry);

  pruneRollingWindow(entry, now);
  const firstRecoveredForKey = !entry.diagnosticEnabled;
  entry.recoveredAt.push(now);
  entry.diagnosticEnabled = true;

  if (
    !entry.defectTicketAutofiled &&
    entry.recoveredAt.length >= FORMAT_FAILOVER_RECOVERED_TICKET_THRESHOLD
  ) {
    entry.defectTicketAutofiled = true;
    entry.defectTicketId = buildDefectTicketId(key);
  }

  guardrailState.set(key, entry);
  return {
    key,
    primaryProvider: params.primary.provider,
    agentId: params.agentId,
    recoveredCount: entry.recoveredAt.length,
    firstRecoveredForKey,
    diagnosticEnabled: entry.diagnosticEnabled,
    defectTicketAutofiled: entry.defectTicketAutofiled,
    defectTicketId: entry.defectTicketId,
  };
}

export function isFormatFailoverRejectedPayloadDiagnosticEnabled(params: {
  provider: string;
  agentId?: string;
}): boolean {
  const provider = normalizeKeyPart(params.provider, "unknown-provider");
  if (params.agentId) {
    return (
      guardrailState.get(formatGuardrailKey(provider, params.agentId))?.diagnosticEnabled === true
    );
  }
  for (const [key, entry] of guardrailState) {
    if (key.startsWith(`${provider}::`) && entry.diagnosticEnabled) {
      return true;
    }
  }
  return false;
}

export function resetFormatFailoverGuardrailsForTesting(): void {
  guardrailState.clear();
}
