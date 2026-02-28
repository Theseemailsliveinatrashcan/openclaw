import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/config.js";

const internalHookMocks = vi.hoisted(() => ({
  createInternalHookEvent: vi.fn(
    (_domain: string, _event: string, _sessionKey: string, payload: unknown) => payload,
  ),
  triggerInternalHook: vi.fn(async () => {}),
}));

vi.mock("../../hooks/internal-hooks.js", () => ({
  createInternalHookEvent: internalHookMocks.createInternalHookEvent,
  triggerInternalHook: internalHookMocks.triggerInternalHook,
}));

vi.mock("../../agents/pi-embedded.js", () => ({
  abortEmbeddedPiRun: vi.fn(),
}));

vi.mock("./commands-session-store.js", () => ({
  persistAbortTargetEntry: vi.fn(async () => true),
}));

vi.mock("./abort.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./abort.js")>();
  return {
    ...actual,
    resolveSessionEntryForKey: vi.fn(() => ({ entry: undefined, key: "agent:main:main" })),
    setAbortMemory: vi.fn(),
    stopSubagentsForRequester: vi.fn(() => ({ stopped: 0 })),
  };
});

vi.mock("./queue.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./queue.js")>();
  return {
    ...actual,
    clearSessionQueues: vi.fn(() => ({ followupCleared: 0, laneCleared: 0, keys: [] })),
  };
});

const { handleAbortTrigger } = await import("./commands-session-abort.js");
const { buildCommandTestParams } = await import("./commands.test-harness.js");

const baseCfg = {
  session: { mainKey: "main", scope: "per-sender" },
} satisfies OpenClawConfig;

describe("commands-session-abort", () => {
  beforeEach(() => {
    internalHookMocks.createInternalHookEvent.mockClear();
    internalHookMocks.triggerInternalHook.mockClear();
  });

  it("emits command:abort internal hook on text abort trigger", async () => {
    const params = buildCommandTestParams("abort", baseCfg);
    const result = await handleAbortTrigger(params, true);

    expect(result?.shouldContinue).toBe(false);
    expect(result?.reply?.text).toContain("aborted");
    expect(internalHookMocks.createInternalHookEvent).toHaveBeenCalledWith(
      "command",
      "abort",
      "agent:main:main",
      expect.objectContaining({
        commandSource: params.command.surface,
      }),
    );
    expect(internalHookMocks.triggerInternalHook).toHaveBeenCalledTimes(1);
  });
});
