import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProviderRuntimePluginHandle } from "../../../plugins/provider-hook-runtime.js";
import { resolveProviderAuthProfileId } from "../../../plugins/provider-runtime.js";
import type { AuthProfileStore } from "../../auth-profiles.js";
import { resolveAuthProfileOrder } from "../../model-auth.js";
import { prepareEmbeddedRunAuthSelection } from "./auth-selection.js";

const modelAuthMocks = vi.hoisted(() => ({
  resolveAuthProfileOrder: vi.fn(),
}));

vi.mock("../../model-auth.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../model-auth.js")>();
  return {
    ...actual,
    resolveAuthProfileOrder: modelAuthMocks.resolveAuthProfileOrder,
  };
});

vi.mock("../../../plugins/provider-runtime.js", () => ({
  resolveProviderAuthProfileId: vi.fn(),
}));

describe("prepareEmbeddedRunAuthSelection", () => {
  beforeEach(() => {
    vi.mocked(resolveProviderAuthProfileId).mockReset();
    vi.mocked(resolveAuthProfileOrder).mockReset();
  });

  it("reuses the resolved provider runtime handle for provider auth profile hooks", () => {
    const runtimeHandle = {
      provider: "demo",
      plugin: {
        id: "demo",
        label: "Demo",
        auth: [],
      },
    } as ProviderRuntimePluginHandle;
    const authStore: AuthProfileStore = {
      version: 1,
      profiles: {
        "demo:a": { type: "api_key", provider: "demo", key: "a" },
        "demo:b": { type: "api_key", provider: "demo", key: "b" },
      },
    };
    vi.mocked(resolveAuthProfileOrder).mockReturnValue(["demo:a", "demo:b"]);
    vi.mocked(resolveProviderAuthProfileId).mockReturnValue("demo:b");

    const selection = prepareEmbeddedRunAuthSelection({
      agentDir: "/tmp/agent",
      workspaceDir: "/tmp/workspace",
      provider: "demo",
      modelId: "demo-model",
      authStore,
      providerRuntimeHandle: runtimeHandle,
      harnessId: "pi",
      pluginHarnessOwnsTransport: false,
    });

    expect(resolveProviderAuthProfileId).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "demo",
        runtimeHandle,
      }),
    );
    expect(selection.profileCandidates).toEqual(["demo:b", "demo:a"]);
  });

  it("reuses prepared auth profile order instead of resolving it again", () => {
    const authStore: AuthProfileStore = {
      version: 1,
      profiles: {
        "demo:a": { type: "api_key", provider: "demo", key: "a" },
        "demo:b": { type: "api_key", provider: "demo", key: "b" },
      },
    };
    vi.mocked(resolveAuthProfileOrder).mockReturnValue(["demo:a"]);

    const selection = prepareEmbeddedRunAuthSelection({
      agentDir: "/tmp/agent",
      workspaceDir: "/tmp/workspace",
      provider: "demo",
      modelId: "demo-model",
      authStore,
      authProfileOrder: ["demo:b", "demo:a"],
      harnessId: "pi",
      pluginHarnessOwnsTransport: false,
    });

    expect(resolveAuthProfileOrder).not.toHaveBeenCalled();
    expect(selection.profileCandidates).toEqual(["demo:b", "demo:a"]);
    expect(resolveProviderAuthProfileId).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          profileOrder: ["demo:b", "demo:a"],
        }),
      }),
    );
  });

  it("keeps the requested prepared auth profile first", () => {
    const authStore: AuthProfileStore = {
      version: 1,
      profiles: {
        "demo:a": { type: "api_key", provider: "demo", key: "a" },
        "demo:b": { type: "api_key", provider: "demo", key: "b" },
      },
    };

    const selection = prepareEmbeddedRunAuthSelection({
      agentDir: "/tmp/agent",
      workspaceDir: "/tmp/workspace",
      provider: "demo",
      modelId: "demo-model",
      authProfileId: "demo:a",
      authStore,
      authProfileOrder: ["demo:b", "demo:a"],
      harnessId: "pi",
      pluginHarnessOwnsTransport: false,
    });

    expect(resolveAuthProfileOrder).not.toHaveBeenCalled();
    expect(selection.profileCandidates).toEqual(["demo:a", "demo:b"]);
  });
});
