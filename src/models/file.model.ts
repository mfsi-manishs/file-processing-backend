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
