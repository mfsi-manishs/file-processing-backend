/**
 * @file file.routes.ts
 * @fileoverview File routes
 */

import { Router } from "express";
import fs from "fs";
import type { Multer } from "multer";
import { runTransaction } from "../db/db.utils.js";
import { FileRepository } from "../repositories/file.repo.js";
import { saveUploadedFile } from "../services/files.service.js";

/**
 * Returns an Express router with two endpoints:
 * - POST /api/projects/:projectId/files to upload a file to a project
 * - GET /api/projects/:projectId/files to list files of a project
 * - DELETE /api/projects/:projectId/files/:fileId to delete a file of a project
 * @param {Multer} upload The Multer middleware for file upload
 * @returns {Router} The Express router
 */
export default function filesRouter(upload: Multer) {
  const router = Router();

  /**
   * Uploads a file to a project
   * Throws an error if the file could not be uploaded
   * @param {number} projectId - The ID of the project to which the file belongs
   * @body {file} files - The files to be uploaded
   * @returns {File[]} An array of file records
   * @throws {Error} If the file could not be uploaded
   * @route POST /:projectId/files
   * @group Files
   */
  router.post("/:projectId/files", upload.array("file", 10), async (req, res) => {
    const projectId = Number(req.params.projectId);
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files" });
    }

    try {
      const savedFiles = await runTransaction(async (client) => {
        return Promise.all(files.map((file) => saveUploadedFile(projectId, file, client)));
      });
      return res.status(201).json(savedFiles);
    } catch (e: any) {
      files.forEach((f) => fs.unlink(f.path, () => {})); // cleanup
      return res.status(500).json({ error: e.message });
    }
  });

  /**
   * Lists all files of a project
   * @param {number} projectId - The ID of the project
   * @returns {File[]} An array of file records
   * @route GET /:projectId/files
   * @group Files
   */
  router.get("/:projectId/files", async (req, res) => {
    const projectId = Number(req.params.projectId);
    let files = [];
    try {
      files = await new FileRepository().listByProject(projectId);
    } catch (error: unknown) {
      return res.status(500).json({ error: error });
    }
    return res.json(files);
  });

  /**
   * Deletes a file of a project
   * Throws an error if the file could not be deleted
   * @param {number} projectId - The ID of the project to which the file belongs
   * @param {number} fileId - The ID of the file to be deleted
   * @returns {File[]} An array of file records
   * @throws {Error} If the file could not be deleted
   * @route DELETE /:projectId/files/:fileId
   * @group Files
   */
  router.delete("/:projectId/files/:fileId", async (req, res) => {
    const projectId = Number(req.params.projectId);
    const fileId = Number(req.params.fileId);
    let files = [];
    try {
      files = await new FileRepository().delete(projectId, fileId);
    } catch (error: unknown) {
      return res.status(500).json({ error: error });
    }
    return res.json(files);
  });

  return router;
}
