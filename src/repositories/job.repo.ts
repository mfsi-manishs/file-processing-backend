/**
 * @file job.repo.ts
 * @fileoverview Job repository
 */

import { type Queryable } from "../db/db.utils.js";
import { pool } from "../db/pool.js";
import { getJobFromRows, type Job, type JobType } from "../models/job.model.js";

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
  async createAndAddFiles(projectId: number, type: string, inputFileIds: number[]): Promise<Job> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const jobRes = await client.query(
        `INSERT INTO jobs(project_id, job_type, status)
         VALUES ($1, $2, 'PENDING')
         RETURNING *`,
        [projectId, type]
      );

      const job = jobRes.rows[0];

      // Batch insert all file IDs at once
      await client.query(
        `INSERT INTO jobs_files(job_id, file_id)
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
   * Creates a new job with the given project ID and job type.
   * @param projectId The ID of the project to which the job belongs.
   * @param jobType The type of the job.
   * @param db Optional database client to use for the query. Defaults to the global pool.
   * @returns A promise resolving to the newly created job.
   * @throws Error if the job could not be created.
   */
  async create(projectId: number, jobType: JobType, db: Queryable = pool): Promise<Job> {
    const query = `INSERT INTO jobs(project_id, job_type, status)
                   VALUES ($1, $2, 'PENDING')
                   RETURNING *`;
    const params = [projectId, jobType];
    const result = await db.query(query, params);
    const job = getJobFromRows(result.rows)[0];
    if (!job) throw new Error("Failed to create job");
    return job;
  }

  /**
   * Finds all active jobs for a given project.
   * @param projectId The ID of the project to find active jobs for.
   * @param db Optional database client to use for the query. Defaults to the global pool.
   * @returns A promise resolving to an array of active jobs for the given project.
   * @throws Error if no active jobs could be found.
   */
  async findActiveByProject(projectId: number, db: Queryable = pool): Promise<Job[]> {
    const result = await db.query(
      `SELECT * FROM jobs
       WHERE project_id=$1 AND status IN ('PENDING','PROCESSING')`,
      [projectId]
    );
    const jobs = getJobFromRows(result.rows);
    if (!jobs || jobs.length === 0) throw new Error("Failed to find active jobs");
    return jobs;
  }

  /**
   * Finds all jobs for a given project, optionally filtered by status.
   * @param projectId The ID of the project to find jobs for.
   * @param [status] Optional status to filter the jobs by.
   * @param [db] Optional database client to use for the query. Defaults to the global pool.
   * @returns A promise resolving to an array of jobs for the given project.
   * @throws Error if no jobs could be found.
   */
  async findByProject(projectId: number, status?: string, db: Queryable = pool): Promise<Job[]> {
    const params: [number, string?] = [projectId];
    let where = "project_id = $1";
    if (status) {
      where += " AND status = $2";
      params.push(status);
    }

    const result = await db.query(
      `SELECT * FROM jobs
      WHERE ${where} ORDER BY created_at DESC`,
      params
    );
    const jobs = getJobFromRows(result.rows);
    if (!jobs || jobs.length === 0) throw new Error("Failed to find jobs");
    return jobs;
  }

  /**
   * Retrieves the next pending job from the database and marks it as 'PROCESSING'
   * @param [db] Optional database client to use for the query. Defaults to the global pool.
   * @returns A promise resolving to the next pending job, or an empty array if none is found.
   * @throws Error if the job could not be found or updated.
   */
  async getPendingJobs(db: Queryable = pool): Promise<Job[]> {
    const result = await db.query(
      `SELECT * FROM jobs
       WHERE status='PENDING'
       ORDER BY created_at
       FOR UPDATE SKIP LOCKED
       LIMIT 1`
    );
    const jobs = getJobFromRows(result.rows);
    if (!jobs) throw new Error("Failed to find pending jobs");
    return jobs;
  }

  /**
   * Updates the status and progress of a job with gien ID and status 'PROCESSING'.
   * @param projectId The ID of the project to find jobs for.
   * @param jobId The ID of the job to update.
   * @param progress Optional progress value to update the job with.
   * @param db Optional database client to use for the query. Defaults to the global pool.
   * @returns A promise resolving to the updated job.
   * @throws Error if the job could not be updated.
   */
  async updateJobProgress(projectId: number, jobId: number, progress?: number, db: Queryable = pool): Promise<Job> {
    const result = await db.query(
      `UPDATE jobs SET progress=COALESCE($3, progress)
       WHERE project_id=$1 AND id=$2 AND status='PROCESSING'
       RETURNING *`,
      [projectId, jobId, progress ?? null]
    );
    const job = getJobFromRows(result.rows)[0];
    if (!job) throw new Error("Failed to update job");
    return job;
  }

  /**
   * Marks a job as 'PROCESSING' and sets its start time to the current timestamp.
   * @param projectId The ID of the project to which the job belongs.
   * @param jobId The ID of the job to update.
   * @param db Optional database client to use for the query. Defaults to the global pool.
   * @returns A promise resolving to the updated job.
   * @throws Error if the job could not be updated.
   */
  async updateStatusStarted(projectId: number, jobId: number, db: Queryable = pool): Promise<Job> {
    const result = await db.query(
      `UPDATE jobs SET status='PROCESSING', started_at=NOW()
       WHERE project_id=$1 AND id=$2
       RETURNING *`,
      [projectId, jobId]
    );
    const job = getJobFromRows(result.rows)[0];
    if (!job) throw new Error("Failed to update job");
    return job;
  }

  /**
   * Marks a job as 'COMPLETED' and sets its completion time to the current timestamp and its progress to 100.
   * @param projectId The ID of the project to which the job belongs.
   * @param jobId The ID of the job to update.
   * @param outputFileId The ID of the output file associated with the job.
   * @param [db] Optional database client to use for the query. Defaults to the global pool.
   * @returns A promise resolving to the updated job.
   * @throws Error if the job could not be updated.
   */
  async updateStatusCompleted(projectId: number, jobId: number, outputFileId: number, db: Queryable = pool): Promise<Job> {
    const result = await db.query(
      `UPDATE jobs SET status='COMPLETED', completed_at=NOW(), progress=100, output_file_id=$3
       WHERE project_id=$1 AND id=$2
       RETURNING *`,
      [projectId, jobId, outputFileId]
    );
    const job = getJobFromRows(result.rows)[0];
    if (!job) throw new Error("Failed to update job");
    return job;
  }

  /**
   * Marks a job as 'FAILED' and sets its completion time to the current timestamp and its error message.
   * @param projectId The ID of the project to which the job belongs.
   * @param jobId The ID of the job to update.
   * @param message The error message to associate with the job.
   * @param [db] Optional database client to use for the query. Defaults to the global pool.
   * @returns A promise resolving to the updated job.
   * @throws Error if the job could not be updated.
   */
  async updateStatusFailed(projectId: number, jobId: number, message: string, db: Queryable = pool): Promise<Job> {
    const result = await db.query(
      `UPDATE jobs SET status='FAILED', completed_at=NOW(), error_message=$3
       WHERE project_id=$1 AND id=$2 AND status IN ('PENDING','PROCESSING')
       RETURNING *`,
      [projectId, jobId, message]
    );
    const job = getJobFromRows(result.rows)[0];
    if (!job) throw new Error("Failed to update job");
    return job;
  }
}
