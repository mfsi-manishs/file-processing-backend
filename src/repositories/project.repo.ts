/**
 * @file project.repo.ts
 * @fileoverview Project repository
 */

import { pool } from "../db/pool";
import { type Project } from "../models/project.model";

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
    const res = await pool.query(
      `INSERT INTO projects(name, description) 
        VALUES ($1,$2) RETURNING *`,
      [name, description ?? null]
    );
    return res.rows[0];
  }

  /**
   * Finds a project by its ID.
   * @param {number} id - The ID of the project to find.
   * @returns {Promise<Project | null>} - The project record if found, otherwise null.
   */
  async findById(id: number): Promise<Project | null> {
    const res = await pool.query(`SELECT * FROM projects WHERE id=$1`, [id]);
    return res.rows[0] || null;
  }

  /**
   * Lists all projects in the database in descending order of creation time.
   * @returns {Promise<Project[]>} - An array of project records.
   */
  async list(): Promise<Project[]> {
    const res = await pool.query(`SELECT * FROM projects ORDER BY created_at DESC`);
    return res.rows;
  }
}
