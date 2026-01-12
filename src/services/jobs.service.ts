/**
 * @file jobs.service.ts
 * @fileoverview Job service
 */

import { runQueriesAsTransaction } from "../db/db.utils.js";
import { type Job, type JobType } from "../models/job.model.js";
import { FileRepository } from "../repositories/file.repo.js";
import { JobRepository } from "../repositories/job.repo.js";
import { JobsFilesRepository } from "../repositories/jobs-files.repo.js";

/**
 * Queue a new job for processing.
 * @param projectId The ID of the project to which the job belongs.
 * @param type The type of the job.
 * @param inputFileIds The IDs of the input files for the job, or an empty array if no input files are required.
 * @returns The newly created job.
 * @throws Error if the job could not be created.
 */
export async function queueJob(projectId: number, type: JobType, inputFileIds: number[]): Promise<Job> {
  try {
    const job = await runQueriesAsTransaction(async (client) => {
      // Validate ownership of all input files
      const files = await new FileRepository().listByFiles(projectId, inputFileIds, client);
      if (files.length !== inputFileIds.length) {
        throw new Error("One or more files do not belong to project");
      }

      // Create/Insert new job
      const job = await new JobRepository().create(projectId, type, client);

      // Batch insert input files into join/association/junction table.
      if (inputFileIds.length > 0) {
        await new JobsFilesRepository().addFiles(job.id, inputFileIds, client);
      }
      return job;
    });
    return job;
  } catch (error) {
    throw error;
  }
}

/**
 * Retrieves the next pending job from the database and marks it as 'PROCESSING'
 * @returns {Promise<Job | null>} - The next pending job, or null if none is found
 */
export async function getNextPendingJob(): Promise<Job | null> {
  try {
    return await runQueriesAsTransaction(async (client) => {
      const jobs = await new JobRepository().getPendingJobs(client);
      if (jobs.length === 0) return null;
      const job = jobs[0];
      if (!job) return null;
      await new JobRepository().updateStatusStarted(job.projectId, job.id, client);
      return job;
    });
  } catch (error) {
    return null;
  }
}

/**
 * Updates the progress of a job that is currently in the 'PROCESSING' status.
 * @param projectId The ID of the project to which the job belongs.
 * @param {number} jobId - The ID of the job to update.
 * @param {number} progress - The new progress value (0-100) for the job.
 * @returns {Promise<void>} - A promise resolving to void when the update is complete.
 */
export async function updateJobProgress(projectId: number, jobId: number, progress: number) {
  await new JobRepository().updateJobProgress(projectId, jobId, progress);
}

/**
 * Marks a job as 'COMPLETED' and sets its completion time to the current timestamp, its progress to 100, and its output file ID.
 * @param projectId The ID of the project to which the job belongs.
 * @param jobId The ID of the job to complete.
 * @param outputFileId The ID of the output file associated with the job.
 * @returns {Promise<void>} - A promise resolving to void when the update is complete.
 * @throws Error if the job could not be completed.
 */
export async function completeJobWithOutput(projectId: number, jobId: number, outputFileId: number) {
  await new JobRepository().updateStatusCompleted(projectId, jobId, outputFileId);
}

/**
 * Marks a job as 'FAILED' and sets its error message.
 * @param projectId The ID of the project to which the job belongs.
 * @param {number} jobId - The ID of the job to mark as failed.
 * @param {string} message - The error message to associate with the job.
 * @returns {Promise<void>} - A promise resolving to void when the update is complete.
 */
export async function failJob(projectId: number, jobId: number, message: string) {
  await new JobRepository().updateStatusFailed(projectId, jobId, message);
}
