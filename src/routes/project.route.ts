/**
 * @file project.route.ts
 * @fileoverview Project routes
 */

import { Router } from "express";
import type { Project } from "../models/project.model.js";
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

    let project: Project | (Project & number) | null = null;
    try {
      project = await projectRepo.getById(id, include as string | undefined);
    } catch (error: unknown) {
      return res.status(500).json({ error: (error as Error).message });
    }
    if (!project) return res.status(404).json({ error: "Not found" });
    return res.json(project);
  });

  /**
   * Update Project
   */
  router.put("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { name, description } = req.body;
    let projects = [];
    try {
      projects = await projectRepo.update(id, name, description);
    } catch (error: unknown) {
      return res.status(400).json({ error: (error as Error).message });
    }

    if (!projects.length) return res.status(404).json({ error: "Not found" });
    return res.json(projects[0]);
  });

  return router;
}
