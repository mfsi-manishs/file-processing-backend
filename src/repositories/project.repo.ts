/**
 * @file project.repo.ts
 * @fileoverview Project repository
 */

import { ERR_MSG } from "../constants.js";
import { type Queryable } from "../db/db.utils.js";
import { pool } from "../db/pool.js";
import { getProjectsFromRows, getProjectsWithFilesFromRows, type Project } from "../models/project.model.js";

/**
 * @class ProjectRepository
 * @description Project repository
 */
export class ProjectRepository {
  /**
   * Creates a new project record in the database
   * @param {string} name - The name of the project
   * @param {string} [description] - The description of the project
   * @param {Queryable} [db] - The PostgreSQL client to use for the transaction
   * @returns {Promise<Project>} - The newly created project record if the creation was successful
   * @throws {Error} if the project could not be created
   */
  async create(name: string, description?: string, db: Queryable = pool): Promise<Project> {
    const result = await db.query(
      `INSERT INTO projects(name, description) 
        VALUES ($1,$2) RETURNING *`,
      [name, description ?? null]
    );

    const project = getProjectsFromRows(result.rows)[0];
    if (!project) {
      throw new Error(ERR_MSG.FAILED_TO_CREATE_PROJECT_IN_DB);
    }
    return project;
  }

  /**
   * Finds a project by its ID.
   * @param {number} id - The ID of the project to find.
   * @param {string} [include] - The field to include in the result.
   * If "fileCount" is specified, the result will include the count of files in the project.
   * @param {Queryable} [db] - The PostgreSQL client to use for the transaction
   * @returns {Promise<Project | (Project & number)>} - The project record if found.
   * @throws {Error} if the project could not be found.
   */
  async getById(id: number, include?: string, db: Queryable = pool): Promise<Project | (Project & number)> {
    if (include && include === "fileCount") {
      const results = await db.query(
        `SELECT p.*, COALESCE(fc.file_count,0) AS file_count
         FROM projects p
         LEFT JOIN (
           SELECT project_id, COUNT(*) AS file_count
           FROM files WHERE is_output = false
            GROUP BY project_id
         ) fc ON fc.project_id = p.id
         WHERE p.id = $1`,
        [id]
      );
      const project = getProjectsWithFilesFromRows(results.rows)[0];
      if (!project) throw new Error(ERR_MSG.NOT_FOUND_IN_DB);
      return project;
    } else {
      const result = await db.query(
        `SELECT * FROM projects
         WHERE id=$1`,
        [id]
      );
      const project = getProjectsFromRows(result.rows)[0];
      if (!project) throw new Error(ERR_MSG.NOT_FOUND_IN_DB);
      return project;
    }
  }

  /**
   * Lists all projects in the database in descending order of creation time.
   * @param {Queryable} [db] - The PostgreSQL client to use for the transaction
   * @returns {Promise<Project[]>} - An array of project records.
   * @throws {Error} If no projects are found.
   */
  async list(db: Queryable = pool): Promise<Project[]> {
    const result = await db.query(
      `SELECT * FROM projects
       ORDER BY created_at DESC`
    );
    const projects = getProjectsFromRows(result.rows);
    if (projects.length === 0) {
      throw new Error(ERR_MSG.NO_PROJECTS_FOUND_IN_DB);
    }
    return projects;
  }

  /**
   * Updates a project record in the database.
   * @param {number} id - The ID of the project to update.
   * @param {string} name - The new name of the project.
   * @param {string} [description] - The new description of the project, or undefined if no description update is needed.
   * @param {Queryable} [db] - The PostgreSQL client to use for the transaction
   * @returns {Promise<Project[]>} - The updated project record if the update was successful.
   * @throws {Error} If the project record could not be found or updated.
   */
  async update(id: number, name: string, description?: string, db: Queryable = pool): Promise<Project[]> {
    const updates: string[] = [];
    const values: any[] = [id];

    // Dynamically add name if provided
    if (name !== undefined) {
      values.push(name);
      updates.push(`name = $${values.length}`);
    }

    // Dynamically add description ONLY if it exists in req.body
    if (description !== undefined) {
      values.push(description);
      updates.push(`description = $${values.length}`);
    }

    // Always update the timestamp
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      // Only updated_at is present
      throw new Error(ERR_MSG.NO_FIELDS_PROVIDED_FOR_UPDATE);
    }

    const query = `
      UPDATE projects 
      SET ${updates.join(", ")} 
      WHERE id = $1 
      RETURNING *`;

    const result = await db.query(query, values);
    const projects = getProjectsFromRows(result.rows);
    if (projects.length === 0) {
      throw new Error(ERR_MSG.PROJECT_NOT_UPDATED_OR_FOUND_IN_DB);
    }

    return projects;
  }

  /**
   * Deletes a project record from the database.
   * @param {number} id - The ID of the project to delete.
   * @param {Queryable} [db] - The PostgreSQL client to use for the transaction.
   * @returns {Promise<Project>} - A promise that resolves with the deleted project record if the deletion was successful.
   * @throws {Error} If the project record could not be found or deleted.
   */
  async delete(id: number, db: Queryable = pool): Promise<Project> {
    const result = await db.query(
      `DELETE FROM projects
       WHERE id=$1
       RETURNING *`,
      [id]
    );
    const project = getProjectsFromRows(result.rows)[0];
    if (!project) {
      throw new Error(ERR_MSG.PROJECT_NOT_DELETED_OR_FOUND_IN_DB);
    }
    return project;
  }
}
