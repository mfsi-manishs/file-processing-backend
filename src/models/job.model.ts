/**
 * @file job.model.ts
 * @fileoverview Job model
 */

import type { File } from "./file.model.js";

/**
 * @enum JobType
 */
export type JobType = "ZIP_COMPRESSION" | "OTHERS";

/**
 * @enum JobStatus
 */
export type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

/**
 * @interface Job
 */
export interface Job {
  id: number;
  projectId: number;
  jobType: JobType;
  status: string;
  progress: number;
  errorMessage: string;
  outputFileId: number;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  inputFiles: File[];
}

export const getJobFromRows = (rows: any[]): Job[] => {
  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    jobType: row.job_type,
    status: row.status,
    progress: row.progress,
    errorMessage: row.error_message,
    outputFileId: row.output_file_id,
    createdAt: new Date(row.created_at),
    startedAt: row.started_at ? new Date(row.started_at) : null,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    inputFiles: row.input_files,
  }));
};
