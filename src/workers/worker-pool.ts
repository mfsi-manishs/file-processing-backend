/**
 * @file worker-pool.ts
 * @fileoverview Worker pool
 */

import { Worker } from "worker_threads";
import type { Job } from "../models/job.model.js";
import { getNextPendingJob } from "../services/jobs.service.js";

type WorkerRequestMessage = { type: "request-job" };
type WorkerJobMessage = { type: "job"; job: Job | null };
type WorkerMessage = WorkerRequestMessage | WorkerJobMessage;

/**
 * Starts a worker pool with the given size.
 * Each worker will request jobs from the database and process them.
 * @param {Object} options - Options for the worker pool.
 * @param {number} options.size - The number of workers to spawn.
 */
export function startWorkerPool({ size }: { size: number }) {
  for (let i = 0; i < size; i++) spawnWorker();
}

/**
 * Spawns a new worker which will request jobs from the database and process them.
 * Listens for "request-job" messages and responds with the next pending job.
 * Listens for "exit" events and respawns the worker if it exited with a non-zero code.
 */
function spawnWorker() {
  const worker = new Worker(new URL("./job-worker.js", import.meta.url));

  worker.on("message", async (msg: WorkerMessage) => {
    if (msg.type === "request-job") {
      try {
        const job = await getNextPendingJob();
        worker.postMessage({ type: "job", job });
      } catch (err) {
        console.error("Error fetching job:", err);
        worker.postMessage({ type: "job", job: null });
      }
    }
  });

  worker.on("exit", (code) => {
    if (code !== 0) {
      console.error(`Worker crashed with code ${code}, respawning...`);
      spawnWorker();
    }
  });

  worker.on("error", (err) => {
    console.error("Worker error:", err);
  });
}
