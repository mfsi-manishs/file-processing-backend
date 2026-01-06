/**
 * @file job.model.ts
 * @fileoverview Job model
 */

import type { File } from "./file.model";

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
  startedAt: Date;
  completedAt: Date;
  inputFiles: File[];
}
