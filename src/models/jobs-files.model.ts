export interface JobsFiles {
  id: number;
  jobId: number;
  fileId: number;
}

export const getJobsFilesFromRows = (rows: any[]): JobsFiles[] => {
  return rows.map((row) => ({
    id: row.id,
    jobId: row.job_id,
    fileId: row.file_id,
  }));
};
