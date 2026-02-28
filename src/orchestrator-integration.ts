/**
 * Orchestrator-next integration module
 *
 * Provides lifecycle event emission to the orchestrator-next bridge.
 * Auto-enables if ORCH_ENABLE=true env var is set.
 */

import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

let bridge: unknown = null;
let isEnabled = process.env.ORCH_ENABLE === "true";
const orchMode = process.env.ORCH_MODE || "disabled";

// Lazy-load the bridge to avoid import errors if not built
function getBridge(): unknown {
  if (!isEnabled) {
    return null;
  }

  if (!bridge) {
    try {
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const orchestratorPath = resolve(__dirname, "../../openclaw-orchestrator-next/dist/index.js");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const orch = require(orchestratorPath) as {
        OpenClawRuntimeBridge: new () => { handle: (event: unknown) => Promise<unknown> };
      };
      bridge = new orch.OpenClawRuntimeBridge();
      console.log(`[orchestrator] Bridge initialized (mode: ${orchMode})`);
    } catch (err) {
      console.error("[orchestrator] Failed to initialize bridge:", err);
      isEnabled = false;
      return null;
    }
  }
  return bridge;
}

// Auto-initialize on module load
if (isEnabled) {
  console.log(`[orchestrator] Auto-enabled via ORCH_ENABLE=true (mode: ${orchMode})`);
  // Pre-warm on first use, not at import time
}

export function isOrchestratorEnabled(): boolean {
  return isEnabled;
}

// Event emission functions
type BridgeHandle = { handle: (event: unknown) => Promise<unknown> };

export async function emitPreDispatch(storyId: string, storyTitle?: string): Promise<void> {
  const b = getBridge() as BridgeHandle | null;
  if (!b) {
    return;
  }

  try {
    await b.handle({
      type: "preDispatch",
      storyId,
      storyTitle,
      override: false,
    });
  } catch (err) {
    console.error("[orchestrator] preDispatch error:", err);
  }
}

export async function emitComplete(
  storyId: string,
  startTime: number,
  result: "success" | "failure" = "success",
  summary?: string,
): Promise<void> {
  const b = getBridge() as BridgeHandle | null;
  if (!b) {
    return;
  }

  try {
    await b.handle({
      type: "complete",
      storyId,
      startTime,
      complete: {
        type: "COMPLETE",
        workflow: "gateway-message",
        storyId,
        result,
        summary: summary || `Message flow ${result} for ${storyId}`,
        filesChanged: [],
        verification: { testsRun: [], allPassed: result === "success" },
        followups: [],
      },
    });
  } catch (err) {
    console.error("[orchestrator] complete error:", err);
  }
}

export async function emitHalt(
  storyId: string,
  startTime: number,
  reasonCode: string,
  message: string,
  safeToRetry: boolean = true,
): Promise<void> {
  const b = getBridge() as BridgeHandle | null;
  if (!b) {
    return;
  }

  try {
    await b.handle({
      type: "halt",
      storyId,
      startTime,
      halt: {
        type: "HALT",
        reasonCode,
        message,
        context: { workflow: "gateway-message", storyId },
        unblockOptions: [],
        retryHint: { safeToRetry, recommendedAfter: "immediate" },
      },
    });
  } catch (err) {
    console.error("[orchestrator] halt error:", err);
  }
}
