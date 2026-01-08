/**
 * @file file.routes.ts
 * @fileoverview File routes
 */

import { Router } from "express";
import type { Multer } from "multer";
import { runQuery } from "../db/db.utils.js";
import { saveUploadedFile } from "../services/files.service.js";

/**
 * Returns an Express router with two endpoints:
 * - POST /api/projects/:projectId/files to upload a file to a project
 * - GET /api/projects/:projectId/files to list files of a project
 * @param {Multer} upload
 * @returns {Router}
 */
export default function filesRouter(upload: Multer) {
  const router = Router();

  /**
   * Uploads a file to a project and returns the newly created file record
   */
  router.post("/:projectId/files", upload.single("file"), async (req, res) => {
    const projectId = Number(req.params.projectId);
    if (!req.file) return res.status(400).json({ error: "No file" });
    try {
      const file = await saveUploadedFile(projectId, req.file);
      return res.status(201).json(file);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  /**
   * Lists all files belonging to a project
   */
  router.get("/:projectId/files", async (req, res) => {
    const projectId = Number(req.params.projectId);
    const files = await runQuery<File>(
      `SELECT * FROM files
       WHERE project_id=$1 ORDER BY created_at DESC`,
      [projectId]
    );
    res.json(files);
  });

  return router;
}
