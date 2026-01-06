/**
 * @file file.repo.ts
 * @fileoverview File repository
 */

import { pool } from "../db/pool";
import { type File } from "../models/file.model";

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
  async create(file: Omit<File, "id" | "created_at">): Promise<File> {
    const res = await pool.query(
      `INSERT INTO files(project_id, file_name, file_path, file_type, file_size, checksum, is_output)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [file.projectId, file.fileName, file.filePath, file.fileType, file.fileSize, file.checksum ?? null, file.isOutput]
    );
    return res.rows[0];
  }

  /**
   * Lists all files belonging to a project
   * @param {number} projectId - The ID of the project
   * @returns {Promise<File[]>} - An array of file records belonging to the project
   */
  async listByProject(projectId: number): Promise<File[]> {
    const res = await pool.query(`SELECT * FROM files WHERE project_id=$1 ORDER BY created_at DESC`, [projectId]);
    return res.rows;
  }
}
