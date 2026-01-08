/**
 * @file file.repo.ts
 * @fileoverview File repository
 */

import { runQuery } from "../db/db.utils.js";
import { type File } from "../models/file.model.js";

/**
 * @class FileRepository
 * @description File repository
 */
export class FileRepository {
  /**
   * Creates a new file record in the database
   * @param {Omit<File, "id" | "created_at">} file - The file to be created
   * @returns {Promise<File>} - The newly created file record
   */
  async create(file: Omit<File, "id" | "uploadedAt">, client?: any): Promise<File> {
    const query = `
    INSERT INTO files(project_id, file_name, file_path, file_type, file_size, checksum, is_output)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`;
    const params = [file.projectId, file.fileName, file.filePath, file.fileType, file.fileSize, file.checksum ?? null, file.isOutput];
    let files = [];
    if (client) {
      files = await client.query(query, params);
      return files.rows[0] as File;
    } else {
      files = await runQuery<File>(query, params);
      return files[0] as File;
    }
  }

  /**
   * Lists all files belonging to a project
   * @param {number} projectId - The ID of the project
   * @returns {Promise<File[]>} - An array of file records belonging to the project
   */
  async listByProject(projectId: number): Promise<File[]> {
    const files = await runQuery<File>(
      `SELECT * FROM files
       WHERE project_id=$1
        ORDER BY uploaded_at DESC`,
      [projectId]
    );
    return files;
  }

  /**
   * Deletes a file record from the database
   * @param {number} projectId - The ID of the project to which the file belongs
   * @param {number} id - The ID of the file to be deleted
   * @returns {Promise<void>} - A promise that resolves when the file has been deleted
   */
  async delete(projectId: number, id: number): Promise<void> {
    await runQuery<void>(
      `DELETE FROM files
       WHERE id=$1 AND project_id=$2`,
      [id, projectId]
    );
  }
}
