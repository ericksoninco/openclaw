import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class FakeSocket extends EventEmitter {
  public readonly writes: string[] = [];
  public encoding: BufferEncoding | null = null;

  setEncoding(encoding: BufferEncoding): void {
    this.encoding = encoding;
  }

  write(data: string): void {
    this.writes.push(data);
  }

  end(): void {
    this.emit("end");
  }

  destroy(): void {
    this.emit("close");
  }
}

const { netConnectSpy, tlsConnectSpy } = vi.hoisted(() => ({
  netConnectSpy: vi.fn(() => new FakeSocket()),
  tlsConnectSpy: vi.fn(() => new FakeSocket()),
}));

vi.mock("node:net", () => ({
  default: { connect: netConnectSpy },
  connect: netConnectSpy,
}));

vi.mock("node:tls", () => ({
  default: { connect: tlsConnectSpy },
  connect: tlsConnectSpy,
}));

function makeOptions(
  overrides: Partial<Parameters<typeof import("./client.js").connectIrcClient>[0]> = {},
) {
  return {
    host: "irc.example.net",
    port: 6697,
    tls: true,
    nick: "openclaw",
    username: "openclaw",
    realname: "OpenClaw Bot",
    connectTimeoutMs: 25,
    ...overrides,
  };
}

describe("IRC direct socket proxy policy", () => {
  const originalProxyActive = process.env["OPENCLAW_PROXY_ACTIVE"];
  const originalAllowDirect = process.env["OPENCLAW_IRC_ALLOW_DIRECT_WITH_MANAGED_PROXY"];

  beforeEach(() => {
    netConnectSpy.mockClear();
    tlsConnectSpy.mockClear();
    delete process.env["OPENCLAW_PROXY_ACTIVE"];
    delete process.env["OPENCLAW_IRC_ALLOW_DIRECT_WITH_MANAGED_PROXY"];
  });

  afterEach(() => {
    if (originalProxyActive === undefined) {
      delete process.env["OPENCLAW_PROXY_ACTIVE"];
    } else {
      process.env["OPENCLAW_PROXY_ACTIVE"] = originalProxyActive;
    }
    if (originalAllowDirect === undefined) {
      delete process.env["OPENCLAW_IRC_ALLOW_DIRECT_WITH_MANAGED_PROXY"];
    } else {
      process.env["OPENCLAW_IRC_ALLOW_DIRECT_WITH_MANAGED_PROXY"] = originalAllowDirect;
    }
  });

  it("blocks direct IRC sockets before connecting when managed proxy mode is active", async () => {
    process.env["OPENCLAW_PROXY_ACTIVE"] = "1";
    const { connectIrcClient } = await import("./client.js");

    await expect(connectIrcClient(makeOptions())).rejects.toThrow(
      /IRC direct sockets are disabled while managed proxy mode is active/,
    );

    expect(tlsConnectSpy).not.toHaveBeenCalled();
    expect(netConnectSpy).not.toHaveBeenCalled();
  });

  it("allows direct IRC sockets with explicit break-glass override", async () => {
    process.env["OPENCLAW_PROXY_ACTIVE"] = "1";
    process.env["OPENCLAW_IRC_ALLOW_DIRECT_WITH_MANAGED_PROXY"] = "1";
    const { connectIrcClient } = await import("./client.js");

    await expect(connectIrcClient(makeOptions())).rejects.toThrow(/timed out/);

    expect(tlsConnectSpy).toHaveBeenCalledWith({
      host: "irc.example.net",
      port: 6697,
      servername: "irc.example.net",
    });
  });

  it("allows direct IRC sockets when managed proxy mode is inactive", async () => {
    const { connectIrcClient } = await import("./client.js");

    await expect(connectIrcClient(makeOptions({ tls: false, port: 6667 }))).rejects.toThrow(
      /timed out/,
    );

    expect(netConnectSpy).toHaveBeenCalledWith({ host: "irc.example.net", port: 6667 });
  });
});
