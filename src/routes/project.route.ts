/**
 * @file project.route.ts
 * @fileoverview Project routes
 */

import { Router } from "express";
import { runQuery } from "../db/db.utils.js";
import type { Project } from "../models/project.model.js";

/**
 * Returns an Express router with two endpoints:
 * - POST /api/projects to create a new project
 * - GET /api/projects/:id to get a project by its ID
 * @returns {Router}
 */
export default function projectsRouter() {
  const router = Router();

  /**
   * Creates a new project and returns the newly created project record
   */
  router.post("/", async (req, res) => {
    const { name, description } = req.body;
    const projects = await runQuery<Project>(
      `INSERT INTO projects(name, description)
       VALUES ($1,$2) RETURNING *`,
      [name, description ?? null]
    );
    res.status(201).json(projects[0]);
  });

  /**
   * Returns a project by its ID
   * Optional query parameter `include=fileCount` to include the number of files in the project in query result.
   */
  router.get("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const include = req.query.include;
    if (include === "fileCount") {
      const results = await runQuery<Project & number>(
        `SELECT p.*, COALESCE(fc.file_count,0) AS file_count
         FROM projects p
         LEFT JOIN (
           SELECT project_id, COUNT(*) AS file_count
           FROM files GROUP BY project_id
         ) fc ON fc.project_id = p.id
         WHERE p.id = $1`,
        [id]
      );
      if (!results.length) return res.status(404).json({ error: "Not found" });
      return res.json(results[0]);
    } else {
      const projects = await runQuery<Project>(`SELECT * FROM projects WHERE id=$1`, [id]);
      if (!projects.length) return res.status(404).json({ error: "Not found" });
      return res.json(projects[0]);
    }
  });

  return router;
}
