/**
 * @file jobs-files.repo.ts
 * @fileoverview JobsFiles repository
 */

import { type Queryable } from "../db/db.utils.js";
import { pool } from "../db/pool.js";
import { getFilesFromRows, type File } from "../models/file.model.js";
import { getJobsFilesFromRows, type JobsFiles } from "../models/jobs-files.model.js";

/**
 * @class JobsFilesRepository
 * @description JobsFiles repository
 */
export class JobsFilesRepository {
  /**
   * Adds one or more files to a job.
   * @param jobId The ID of the job to add files to.
   * @param fileIds An array of file IDs to add to the job.
   * @param [db] Optional database client to use for the query. Defaults to the global pool.
   * @returns A promise resolving to an array of JobsFiles records.
   * @throws Error if the files could not be added to the job.
   */
  async addFiles(jobId: number, fileIds: number[], db: Queryable = pool): Promise<JobsFiles[]> {
    const query = `INSERT INTO jobs_files (job_id, file_id)
     SELECT $1, UNNEST($2::int[]) RETURNING *`;
    const params = [jobId, fileIds];
    const result = await db.query(query, params);
    const jobsFiles = getJobsFilesFromRows(result.rows);
    if (!jobsFiles || jobsFiles.length === 0) throw new Error("Failed to add files to job");
    return jobsFiles;
  }

  /**
   * Retrieves an array of files associated with a job.
   * @param jobId The ID of the job to retrieve files for.
   * @param [db] Optional database client to use for the query. Defaults to the global pool.
   * @returns A promise resolving to an array of file records associated with the job.
   * @throws Error if the files could not be retrieved.
   */
  async getJobFiles(jobId: number, db: Queryable = pool): Promise<File[]> {
    const query = `SELECT f.* FROM public.files AS f
    JOIN public.jobs_files AS jf
      ON jf.file_id = f.id
    WHERE jf.job_id = $1;`;
    const params = [jobId];
    const result = await db.query(query, params);
    const files = getFilesFromRows(result.rows);
    if (!files || files.length === 0) throw new Error("Failed to get job files");
    return files;
  }
}
