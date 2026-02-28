/**
 * Spike test: Orchestrator-next integration
 *
 * This file validates that the OpenClawRuntimeBridge can be initialized
 * and handles hook events correctly.
 *
 * Run: npx tsx src/spike-orchestrator-integration.ts
 *
 * NOTE: Requires orchestrator-next to be built first:
 *   cd ../openclaw-orchestrator-next && pnpm build
 */

import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

// Dynamic import for ESM module
const __dirname = dirname(fileURLToPath(import.meta.url));
// Go up from openclaw/src/ to workspace root, then into orchestrator-next
const orchestratorPath = resolve(__dirname, "../../openclaw-orchestrator-next/dist/index.js");

async function runSpike() {
  console.log("🧪 Starting orchestrator-next integration spike...\n");

  // Step 1: Import the bridge dynamically
  let OpenClawRuntimeBridge: unknown;
  try {
    const orch = await import(orchestratorPath);
    OpenClawRuntimeBridge = orch.OpenClawRuntimeBridge;
  } catch (err) {
    console.error(
      "❌ Failed to import orchestrator-next. Run: cd ../openclaw-orchestrator-next && pnpm build",
    );
    console.error("Error:", err);
    process.exit(1);
  }

  // Step 2: Initialize the bridge
  const BridgeClass = OpenClawRuntimeBridge as {
    new (): { handle(event: unknown): Promise<unknown> };
  };
  const bridge = new BridgeClass();
  console.log("✅ Bridge initialized");

  // Step 3: Test preDispatch event
  const preDispatchResult = await bridge.handle({
    type: "preDispatch",
    storyId: "spike:test-pre",
    storyTitle: "Spike Test Pre-Dispatch",
  });
  console.log("✅ preDispatch handled:", preDispatchResult);

  // Step 4: Test complete event
  const completeResult = await bridge.handle({
    type: "complete",
    storyId: "spike:test-complete",
    startTime: Date.now() - 1000,
    complete: {
      type: "COMPLETE",
      workflow: "spike-test",
      storyId: "spike:test-complete",
      result: "success",
      summary: "Spike test completed",
      filesChanged: [],
      verification: { testsRun: [], allPassed: true },
      followups: [],
    },
  });
  console.log("✅ complete handled:", completeResult);

  // Step 5: Test halt event
  const haltResult = await bridge.handle({
    type: "halt",
    storyId: "spike:test-halt",
    startTime: Date.now() - 500,
    halt: {
      type: "HALT",
      reasonCode: "tool-failure",
      message: "Spike test failure",
      context: { workflow: "spike-test", storyId: "spike:test-halt" },
      unblockOptions: [],
      retryHint: { safeToRetry: true, recommendedAfter: "immediate" },
    },
  });
  console.log("✅ halt handled:", haltResult);

  console.log("\n🎉 Spike test completed successfully!");
}

runSpike().catch((err) => {
  console.error("❌ Spike failed:", err);
  process.exit(1);
});
