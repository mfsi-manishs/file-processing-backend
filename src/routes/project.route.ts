/**
 * @file project.route.ts
 * @fileoverview Project routes
 */

import { Router } from "express";
import fs from "fs";
import { ERR_MSG } from "../constants.js";
import { runQueriesAsTransaction } from "../db/db.utils.js";
import type { Project } from "../models/project.model.js";
import { FileRepository } from "../repositories/file.repo.js";
import { ProjectRepository } from "../repositories/project.repo.js";

/**
 * Returns an Express router with two endpoints:
 * - POST /api/projects to create a new project
 * - GET /api/projects/:id to get a project by its ID
 * @returns {Router}
 */
export default function projectsRouter() {
  const router = Router();
  const projectRepo = new ProjectRepository();

  /**
   * Creates a new project and returns the newly created project record
   */
  router.post("/", async (req, res) => {
    const { name, description } = req.body;
    if (!name || name.length <= 2) return res.status(400).json({ error: ERR_MSG.NAME_IS_REQUIRED });
    let project: Project | null = null;
    try {
      project = await projectRepo.create(name, description);
    } catch (error: unknown) {
      return res.status(500).json({ error: (error as Error).message });
    }
    return res.status(201).json(project);
  });

  /**
   * List all Projects
   */
  // @ts-ignore
  router.get("/", async (req, res) => {
    let projects: Project[] = [];
    try {
      projects = await projectRepo.list();
    } catch (error: unknown) {
      return res.status(500).json({ error: (error as Error).message });
    }
    res.json(projects);
  });

  /**
   * Returns a project by its ID
   * Optional query parameter `include=fileCount` to include the number of files in the project in query result.
   */
  router.get("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const include = req.query.include;

    if (isNaN(id) || id <= 0) return res.status(400).json({ error: ERR_MSG.ID_IS_REQUIRED });

    let project: Project | (Project & number) | null = null;
    try {
      project = await projectRepo.getById(id, include as string | undefined);
    } catch (error: unknown) {
      return res.status(500).json({ error: (error as Error).message });
    }
    if (!project) return res.status(404).json({ error: ERR_MSG.NOT_FOUND_IN_DB });
    return res.json(project);
  });

  /**
   * Update Project
   */
  router.put("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { name, description } = req.body;
    if (isNaN(id) || id <= 0) return res.status(400).json({ error: ERR_MSG.ID_IS_REQUIRED });
    if (!name && !description) return res.status(400).json({ error: ERR_MSG.NAME_OR_DESCRIPTION_IS_REQUIRED });
    if (name !== undefined && name.length <= 2) return res.status(400).json({ error: ERR_MSG.INVALID_NAME });
    if (description !== undefined && description.length <= 2) return res.status(400).json({ error: ERR_MSG.INVALID_DESCRIPTION });

    let projects = [];
    try {
      projects = await projectRepo.update(id, name, description);
    } catch (error: unknown) {
      return res.status(400).json({ error: (error as Error).message });
    }

    if (!projects.length) return res.status(404).json({ error: ERR_MSG.NOT_FOUND_IN_DB });
    return res.json(projects[0]);
  });

  /**
   * Delete Project
   */
  router.delete("/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) return res.status(400).json({ error: ERR_MSG.ID_IS_REQUIRED });

    try {
      const deletedProject = runQueriesAsTransaction(async (client) => {
        // Get all file paths for this project
        const files = await new FileRepository().listByProject(id, client);

        // Delete physical files from disk
        for (const file of files) {
          try {
            await fs.unlink(file.filePath, (err) => {
              if (err) throw err;
              console.log(`${file.filePath} deleted`);
            });
          } catch (error: any) {
            if (error.code !== "ENOENT") throw error;
          }
        }
        // Delete from DB (Foreign Keys with ON DELETE CASCADE handle file records)
        let delProj;
        try {
          delProj = await projectRepo.delete(id);
        } catch (error: unknown) {
          throw error;
        }
        return delProj;
      });
      if (!deletedProject) return res.status(404).json({ error: ERR_MSG.NOT_FOUND_IN_DB });
      return res.sendStatus(204);
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  return router;
}
