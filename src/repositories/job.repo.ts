/**
 * @file job.repo.ts
 * @fileoverview Job repository
 */

import { pool } from "../db/pool";
import { type Job } from "../models/job.model";

/**
 * @class JobRepository
 * @description Job repository
 */
export class JobRepository {
  /**
   * Create a new job and its associated input files.
   * @param projectId The ID of the project to which the job belongs.
   * @param type The type of the job.
   * @param inputFileIds The IDs of the input files for the job.
   * @returns The newly created job.
   * @throws Error if the job could not be created.
   */
  async create(projectId: number, type: string, inputFileIds: number[]): Promise<Job> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const jobRes = await client.query(
        `INSERT INTO jobs(project_id, type, status)
         VALUES ($1, $2, 'PENDING')
         RETURNING *`,
        [projectId, type]
      );

      const job = jobRes.rows[0];

      // Batch insert all file IDs at once
      await client.query(
        `INSERT INTO job_input_files(job_id, file_id)
         SELECT $1, unnest($2::int[])`,
        [job.id, inputFileIds]
      );

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
   * Finds all active jobs for a project.
   * @param projectId The ID of the project.
   * @returns A promise resolving to an array of active jobs.
   */
  async findActiveByProject(projectId: number): Promise<Job[]> {
    const res = await pool.query(`SELECT * FROM jobs WHERE project_id=$1 AND status IN ('PENDING','PROCESSING')`, [projectId]);
    return res.rows;
  }

  /**
   * Updates the status and progress of a job.
   * @param jobId The ID of the job to update.
   * @param status The new status of the job.
   * @param progress The new progress of the job, or undefined if no progress update is needed.
   * @returns A promise resolving to void when the update is complete.
   */
  async updateStatus(jobId: number, status: string, progress?: number): Promise<void> {
    await pool.query(`UPDATE jobs SET status=$2, progress=COALESCE($3, progress) WHERE id=$1`, [jobId, status, progress ?? null]);
  }
}
