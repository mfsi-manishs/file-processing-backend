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
  async findById(id: number): Promise<Project | null> {
    const projects = await runQuery<Project>(
      `SELECT * FROM projects
       WHERE id=$1`,
      [id]
    );
    return projects[0] || null;
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
   * @returns {Promise<Project>} - The updated project record if the update was successful, otherwise null.
   */
  async update(id: number, name: string, description?: string): Promise<Project> {
    const projects = await runQuery<Project>(
      `UPDATE projects SET name=$2, description=$3
       WHERE id=$1 RETURNING *`,
      [id, name, description ?? null]
    );
    return projects[0] as Project;
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
