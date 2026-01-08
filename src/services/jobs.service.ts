/**
 * @file jobs.service.ts
 * @fileoverview Job service
 */

import { runQuery } from "../db/db.utils.js";
import { pool } from "../db/pool.js";
import { type Job, type JobType } from "../models/job.model.js";

/**
 * Queue a new job for processing.
 * @param projectId The ID of the project to which the job belongs.
 * @param type The type of the job.
 * @param inputFileIds The IDs of the input files for the job, or an empty array if no input files are required.
 * @returns The newly created job.
 * @throws Error if the job could not be created.
 */
export async function queueJob(projectId: number, type: JobType, inputFileIds: number[]): Promise<Job> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Validate ownership of all input files
    if (inputFileIds.length > 0) {
      const check = await client.query(
        `SELECT id FROM files 
         WHERE id = ANY($1::int[]) AND project_id = $2`,
        [inputFileIds, projectId]
      );

      if (check.rowCount !== inputFileIds.length) {
        throw new Error("One or more files do not belong to project");
      }
    }

    // Create/Insert new job
    const jobRes = await client.query(
      `INSERT INTO jobs(project_id, job_type, status)
       VALUES ($1, $2, 'PENDING')
       RETURNING *`,
      [projectId, type]
    );

    if (jobRes.rowCount === 0) {
      throw new Error("Failed to create job");
    }

    const job = jobRes.rows[0];

    // Batch insert input files into join/association/junction table.
    if (inputFileIds.length > 0) {
      await client.query(
        `INSERT INTO jobs_files(job_id, file_id)
         SELECT $1, unnest($2::int[])`,
        [job.id, inputFileIds]
      );
    }

    await client.query("COMMIT");
    return job;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Retrieves the next pending job from the database and marks it as 'PROCESSING'
 * @param {any} client - The database client to use for the transaction
 * @returns {Promise<Job | null>} - The next pending job, or null if none is found
 */
export async function getNextPendingJob(client: any): Promise<Job | null> {
  // Use a transaction and SKIP LOCKED to avoid contention among workers
  await client.query("BEGIN");

  const res = await client.query(
    `SELECT id, project_id, job_type
     FROM jobs
     WHERE status='PENDING'
     ORDER BY created_at
     FOR UPDATE SKIP LOCKED
     LIMIT 1`
  );
  if (res.rowCount === 0) {
    await client.query("ROLLBACK");
    return null;
  }
  const job = res.rows[0];
  await client.query(
    `UPDATE jobs
     SET status='PROCESSING', started_at=NOW()
     WHERE id=$1`,
    [job.id]
  );
  await client.query("COMMIT");
  return job;
}

/**
 * Updates the progress of a job that is currently in the 'PROCESSING' status.
 * @param {number} jobId - The ID of the job to update.
 * @param {number} progress - The new progress value (0-100) for the job.
 * @returns {Promise<void>} - A promise resolving to void when the update is complete.
 */
export async function updateJobProgress(jobId: number, progress: number) {
  await runQuery<Job>(
    `UPDATE jobs
     SET progress=$2
     WHERE id=$1 AND status='PROCESSING'`,
    [jobId, progress]
  );
}

/**
 * Marks a job as 'COMPLETED' and sets its progress to 100.
 * @param {number} jobId - The ID of the job to mark as completed.
 * @returns {Promise<void>} - A promise resolving to void when the update is complete.
 */
export async function completeJobWithOutput(jobId: number) {
  await runQuery<Job>(
    `UPDATE jobs
     SET status='COMPLETED', completed_at=NOW(), progress=100
     WHERE id=$1 AND status='PROCESSING'`,
    [jobId]
  );
}

/**
 * Marks a job as 'FAILED' and sets its error message.
 * @param {number} jobId - The ID of the job to mark as failed.
 * @param {string} message - The error message to associate with the job.
 * @returns {Promise<void>} - A promise resolving to void when the update is complete.
 */
export async function failJob(jobId: number, message: string) {
  await runQuery<Job>(
    `UPDATE jobs
     SET status='FAILED', completed_at=NOW(), error_message=$2
     WHERE id=$1 AND status IN ('PENDING','PROCESSING')`,
    [jobId, message]
  );
}
