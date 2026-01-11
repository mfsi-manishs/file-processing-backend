/**
 * @file job-worker.ts
 * @fileoverview Job worker
 */
import fs from "fs";
import path from "path";
import { parentPort } from "worker_threads";
import type { Job } from "../models/job.model.js";
import { FileRepository } from "../repositories/file.repo.js";
import { JobsFilesRepository } from "../repositories/jobs-files.repo.js";
import { hashFile } from "../services/files.service.js";
import { completeJobWithOutput, failJob, updateJobProgress } from "../services/jobs.service.js";
import { archiveFiles } from "../utils/utils.js";

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
async function processJob(job: Job) {
  // Get all files for the job from the database
  const jobFiles = await new JobsFilesRepository().getJobFiles(job.id);

  // Create ZIP output
  const outputPath = path.resolve(process.env.OUTPUT_DIR || "./outputs", `job-${job.id}.zip`);
  const outputDir = path.dirname(outputPath);
  await fs.promises.mkdir(outputDir, { recursive: true });
  const output = fs.createWriteStream(outputPath);

  await archiveFiles(
    jobFiles.map((f) => ({ name: f.fileName, path: f.filePath })),
    output,
    {
      compressionLevel: 6,
      onProgress: (percent: number) => {
        updateJobProgress(job.id, percent);
      },
    }
  );

  // Check output zip file and it's size
  const stats = fs.statSync(outputPath);
  if (stats.size === 0) {
    throw new Error("No output file created");
  }

  const checksum = await hashFile(outputPath);

  // Insert output file metadata
  const outputFile = await new FileRepository().create({
    projectId: job.projectId,
    fileName: `job-${job.id}.zip`,
    filePath: outputPath,
    fileSize: stats.size,
    fileType: "application/zip",
    checksum: checksum,
    isOutput: true,
  });

  await completeJobWithOutput(job.id, outputFile.id);
}

run().catch((err) => {
  console.error(err);
  // Let the worker exit to be respawned
  process.exit(1);
});
