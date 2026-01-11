/**
 * @file file.repo.ts
 * @fileoverview File repository
 */

import { type Queryable } from "../db/db.utils.js";
import { pool } from "../db/pool.js";
import { getFilesFromRows, type File } from "../models/file.model.js";

/**
 * @class FileRepository
 * @description File repository
 */
export class FileRepository {
  /**
   * Creates a new file record in the database
   * @param {Omit<File, "id" | "uploadedAt">} file - The file to be created
   * @param {Queryable} [db] - The PostgreSQL client to use for the transaction
   * @returns {Promise<File>} The newly created file record
   * @throws {Error} If the file could not be created
   */
  async create(file: Omit<File, "id" | "uploadedAt">, db: Queryable = pool): Promise<File> {
    const query = `
    INSERT INTO files(project_id, file_name, file_path, file_type, file_size, checksum, is_output)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`;
    const params = [file.projectId, file.fileName, file.filePath, file.fileType, file.fileSize, file.checksum ?? null, file.isOutput];
    const result = await db.query(query, params);
    const f = getFilesFromRows(result.rows)[0];
    if (!f) throw new Error("Failed to create file");
    return f;
  }

  /**
   * Lists all files of a project
   * @param {number} projectId - The ID of the project
   * @param {Queryable} [db] - The PostgreSQL client to use for the transaction
   * @returns {Promise<File[]>} - An array of file records belonging to the project
   * @throws {Error} If the files could not be listed
   */
  async listByProject(projectId: number, db: Queryable = pool): Promise<File[]> {
    const result = await db.query(
      `SELECT * FROM files
       WHERE project_id=$1
        ORDER BY uploaded_at DESC`,
      [projectId]
    );
    const files = getFilesFromRows(result.rows);
    if (!files) throw new Error("Failed to list files");
    return files;
  }

  /**
   * Deletes a file record from the database.
   * @param {number} projectId - The ID of the project to which the file belongs.
   * @param {number} id - The ID of the file to delete.
   * @param {Queryable} [db] - The PostgreSQL client to use for the transaction.
   * @returns {Promise<File>} - The deleted file record if the deletion was successful.
   * @throws {Error} If the file record could not be found or deleted.
   */
  async delete(projectId: number, id: number, db: Queryable = pool): Promise<File> {
    const result = await db.query(
      `DELETE FROM files
       WHERE id=$1 AND project_id=$2
       RETURNING *`,
      [id, projectId]
    );
    const file = getFilesFromRows(result.rows)[0];
    if (!file) throw new Error("Failed to delete file");
    return file;
  }

  /**
   * Lists all files belonging to a project and having the given IDs.
   * @param {number} projectId - The ID of the project.
   * @param {number[]} fileIds - The IDs of the files to be listed.
   * @param {Queryable} [db] - The PostgreSQL client to use for the transaction.
   * @returns {Promise<File[]>} - An array of file records belonging to the project and having the given IDs.
   * @throws {Error} If the files could not be listed.
   */
  async listByFiles(projectId: number, fileIds: number[], db: Queryable = pool): Promise<File[]> {
    const query = `SELECT * FROM files
     WHERE project_id=$1 AND id = ANY($2::int[])`;
    const params = [projectId, fileIds];
    const result = await db.query(query, params);
    const files = getFilesFromRows(result.rows);
    if (!files) throw new Error("Failed to list files");
    return files;
  }
}
