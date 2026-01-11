/**
 * @file jobs-files.repo.ts
 * @fileoverview JobsFiles repository
 */

import type { PoolClient } from "pg";
import { runQuery } from "../db/db.utils.js";
import { getFilesFromRows, type File } from "../models/file.model.js";
import type { JobsFiles } from "../models/jobs-files.model.js";

/**
 * @class JobsFilesRepository
 * @description JobsFiles repository
 */
export class JobsFilesRepository {
  /**
   * Associates multiple files with a given job
   * @param jobId The ID of the job to associate files with
   * @param fileIds An array of file IDs to associate with the job
   * @param [client] Optional client to use for the transaction
   * @returns A promise resolving to an array of newly created jobs_files records
   */
  async addFiles(jobId: number, fileIds: number[], client?: PoolClient): Promise<JobsFiles[]> {
    const query = `INSERT INTO jobs_files (job_id, file_id)
     SELECT $1, UNNEST($2::int[]) RETURNING *`;
    const params = [jobId, fileIds];

    if (client) {
      return (await client.query(query, params)).rows;
    }
    return await runQuery<JobsFiles>(query, params);
  }

  /**
   * Retrieves all files associated with a given job
   * @param jobId The ID of the job to retrieve files for
   * @param client Optional client to use for the query
   * @returns A promise resolving to an array of files
   */
  async getJobFiles(jobId: number, client?: PoolClient): Promise<File[]> {
    const query = `SELECT f.* FROM public.files AS f
    JOIN public.jobs_files AS jf
      ON jf.file_id = f.id
    WHERE jf.job_id = $1;`;
    const params = [jobId];
    if (client) {
      return getFilesFromRows((await client.query(query, params)).rows);
    }
    return getFilesFromRows(await runQuery(query, params));
  }
}
