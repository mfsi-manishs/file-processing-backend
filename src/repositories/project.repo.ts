/**
 * @file project.repo.ts
 * @fileoverview Project repository
 */

import { runQuery } from "../db/db.utils.js";
import { type Project } from "../models/project.model.js";

/**
 * @class ProjectRepository
 * @description Project repository
 */
export class ProjectRepository {
  /**
   * Creates a new project record in the database
   * @param {string} name - The name of the project
   * @param {string} [description] - The description of the project
   * @returns {Promise<Project>} - The newly created project record
   */
  async create(name: string, description?: string): Promise<Project> {
    const projects = await runQuery<Project>(
      `INSERT INTO projects(name, description) 
        VALUES ($1,$2) RETURNING *`,
      [name, description ?? null]
    );
    return projects[0] as Project;
  }

  /**
   * Finds a project by its ID.
   * @param {number} id - The ID of the project to find.
   * @returns {Promise<Project | null>} - The project record if found, otherwise null.
   */
  async getById(id: number, include?: string): Promise<Project | (Project & number)> {
    if (include && include === "fileCount") {
      const results = await runQuery<Project & number>(
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
      if (results.length === 0) throw new Error("Not found");
      return results[0] as Project & number;
    } else {
      const projects = await runQuery<Project>(
        `SELECT * FROM projects
         WHERE id=$1`,
        [id]
      );
      if (projects.length === 0) throw new Error("Not found");
      return projects[0] as Project;
    }
  }

  /**
   * Lists all projects in the database in descending order of creation time.
   * @returns {Promise<Project[]>} - An array of project records.
   */
  async list(): Promise<Project[]> {
    return await runQuery<Project>(
      `SELECT * FROM projects
       ORDER BY created_at DESC`
    );
  }

  /**
   * Updates a project record in the database.
   * @param {number} id - The ID of the project to update.
   * @param {string} name - The new name of the project.
   * @param {string} [description] - The new description of the project, or undefined if no description update is needed.
   * @returns {Promise<Project[]>} - The updated project record if the update was successful, otherwise null.
   */
  async update(id: number, name: string, description?: string): Promise<Project[]> {
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
      throw new Error("No fields provided for update");
    }

    const query = `
      UPDATE projects 
      SET ${updates.join(", ")} 
      WHERE id = $1 
      RETURNING *`;

    const projects = await runQuery<Project>(query, values);
    if (projects.length === 0) {
      throw new Error("Project not updated or found");
    }

    return projects;
  }

  /**
   * Deletes a project record from the database.
   * @param {number} id - The ID of the project to delete.
   * @returns {Promise<void>} - A promise that resolves when the project has been deleted.
   */
  async delete(id: number): Promise<void> {
    await runQuery<Project>(
      `DELETE FROM projects
       WHERE id=$1`,
      [id]
    );
  }
}
