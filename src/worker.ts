/**
 * Dedicated BullMQ worker entrypoint.
 *
 * Run as a separate long-running process:
 *   node -r @next/env src/worker.ts
 *
 * This keeps the worker alive independent of HTTP server restarts.
 */
import "./lib/queue"; // worker starts at module load

// Keep the process alive
process.stdin.resume();

console.log("[worker] BullMQ email worker started. Press Ctrl+C to stop.");
