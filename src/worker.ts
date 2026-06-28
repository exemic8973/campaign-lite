/**
 * Dedicated BullMQ worker entrypoint.
 *
 * Run as a separate long-running process:
 *   npm run worker        (dev)
 *   npm run worker:prod   (production)
 *
 * The RUN_WORKER env var is set by the npm script BEFORE the process starts,
 * so static imports see it regardless of hoisting.
 */
import "./lib/queue";

// Dynamic import so reconcileStuckCampaigns is loaded after queue.ts.
// Static import here is fine since the function is exported; the critical
// part is that queue.ts sees RUN_WORKER=1 before its module body runs,
// which cross-env guarantees.
import { reconcileStuckCampaigns } from "./lib/queue";

// In-worker reconciler: sweep stuck campaigns every 60s.
setInterval(() => {
  reconcileStuckCampaigns().catch(() => {});
}, 60_000);

// Keep the process alive
process.stdin.resume();

console.log("[worker] BullMQ email worker started. reconciler interval: 60s. Press Ctrl+C to stop.");
