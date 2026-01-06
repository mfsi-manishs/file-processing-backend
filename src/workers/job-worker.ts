/**
 * @file job-worker.ts
 * @fileoverview Job worker
 */
import fs from "fs";
import path from "path";
import { parentPort } from "worker_threads";
import { pool } from "../db/pool";
import { completeJobWithOutput, failJob, updateJobProgress } from "../services/jobs.service";

/**
 * Runs the job worker.
 * Requests a job from the main thread and processes it when received.
 * If the job fails, fails the job and requests another one.
 * If no job is received, waits a bit and requests again.
 * Keeps requesting jobs until the worker is terminated.
 */
async function run() {
  parentPort!.postMessage({ type: "request-job" });

  parentPort!.on("message", async (msg) => {
    if (msg.type === "job") {
      if (!msg.job) {
        // No job; wait a bit and request again
        setTimeout(() => parentPort!.postMessage({ type: "request-job" }), 1000);
        return;
      }
      const job = msg.job;
      try {
        await processJob(job);
      } catch (e: any) {
        await failJob(job.id, e.message || "Unknown error");
      } finally {
        setImmediate(() => parentPort!.postMessage({ type: "request-job" }));
      }
    }
  });
}

/**
 * Process a job by compressing project files to ZIP, or based on job.type.
 * Simulates work by updating job progress at 10% and 80%.
 * Gathers files for the project, creates a ZIP file, and inserts output file metadata.
 * @param job The job to process.
 */
async function processJob(job: any) {
  // Simulate work: compress project files to ZIP, or based on job.type
  await updateJobProgress(job.id, 10);

  // Gather files for project
  const filesRes = await pool.query(
    `SELECT id, filename, storage_path FROM files
     WHERE project_id=$1 AND is_output=false`,
    [job.project_id]
  );

  // Create ZIP (pseudo): write a tar/zip file
  const outputPath = path.resolve(process.env.OUTPUT_DIR || "outputs", `job-${job.id}.zip`);
  // Create ZIP using a library like archiver; here simplified
  fs.writeFileSync(outputPath, Buffer.from("ZIP-CONTENT")); // placeholder

  await updateJobProgress(job.id, 80);

  // Insert output file metadata
  const fileRes = await pool.query(
    `INSERT INTO files(project_id, filename, storage_path, mime_type, size_bytes, is_output)
     VALUES ($1,$2,$3,'application/zip', $4, true)
     RETURNING id`,
    [job.project_id, `job-${job.id}.zip`, outputPath, 12] // replace size with actual
  );

  await completeJobWithOutput(job.id);
}

run().catch((err) => {
  // Let the worker exit to be respawned
  process.exit(1);
});
