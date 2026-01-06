/**
 * @file worker-pool.ts
 * @fileoverview Worker pool
 */

import { Worker } from "worker_threads";
import { pool } from "../db/pool";

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
  const worker = new Worker(require.resolve("./jobWorker.js"));
  worker.on("message", async (msg) => {
    if (msg.type === "request-job") {
      const client = await pool.connect();
      try {
        const job = await require("../services/jobsService").claimNextPendingJob(client);
        worker.postMessage({ type: "job", job });
      } finally {
        client.release();
      }
    }
  });
  worker.on("exit", (code) => {
    if (code !== 0) spawnWorker(); // respawn on crash
  });
}
