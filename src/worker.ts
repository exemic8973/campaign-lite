/**
 * Dedicated BullMQ worker entrypoint.
 *
 * Run as a separate long-running process:
 *   npm run worker        (dev — uses tsx)
 *   node dist/worker.js   (production build)
 *
 * This keeps the worker alive independent of HTTP server restarts.
 * Sets RUN_WORKER=1 before importing queue.ts so the worker starts here
 * and nowhere else.
 */
process.env.RUN_WORKER = "1";

import "./lib/queue";
import { reconcileStuckCampaigns } from "./lib/queue";

// In-worker reconciler: sweep stuck campaigns every 60s.
// This avoids needing an HTTP cron route for the common case.
setInterval(() => {
  reconcileStuckCampaigns().catch(() => {});
}, 60_000);

// Keep the process alive
process.stdin.resume();

console.log("[worker] BullMQ email worker started. reconciler interval: 60s. Press Ctrl+C to stop.");
