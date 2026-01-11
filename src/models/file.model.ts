/**
 * @file file.model.ts
 * @fileoverview File model
 */
export interface File {
  id: number;
  projectId: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  checksum: string;
  isOutput: Boolean;
  uploadedAt: Date;
}

export const getFilesFromRows = (rows: any[]): File[] => {
  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    fileName: row.file_name,
    filePath: row.file_path,
    fileSize: row.file_size,
    fileType: row.file_type,
    checksum: row.checksum,
    isOutput: row.is_output,
    uploadedAt: new Date(row.uploaded_at),
  }));
};
