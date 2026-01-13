/**
 * @file file.routes.ts
 * @fileoverview File routes
 */

import { Router } from "express";
import fs from "fs";
import type { Multer } from "multer";
import { ERR_MSG } from "../constants.js";
import { runQueriesAsTransaction } from "../db/db.utils.js";
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
    if (isNaN(projectId) || projectId <= 0) return res.status(400).json({ error: ERR_MSG.PROJECT_ID_IS_REQUIRED });

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: ERR_MSG.NO_FILES });
    }

    try {
      const savedFiles = await runQueriesAsTransaction(async (client) => {
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
    if (isNaN(projectId) || projectId <= 0) return res.status(400).json({ error: ERR_MSG.PROJECT_ID_IS_REQUIRED });

    let files = [];
    try {
      files = await new FileRepository().listByProject(projectId);
    } catch (error: unknown) {
      return res.status(500).json({ error: (error as Error).message });
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
    if (isNaN(projectId) || projectId <= 0) return res.status(400).json({ error: ERR_MSG.PROJECT_ID_IS_REQUIRED });

    const fileId = Number(req.params.fileId);
    if (isNaN(fileId) || fileId <= 0) return res.status(400).json({ error: ERR_MSG.ID_IS_REQUIRED });

    try {
      const delFile = await runQueriesAsTransaction(async (client) => {
        const file = await new FileRepository().getById(projectId, fileId, client);
        if (!file) throw new Error(ERR_MSG.FILE_NOT_FOUND);
        try {
          await fs.unlink(file.filePath, (err) => {
            if (err) throw new Error(err.message);
          });
        } catch (error: any) {
          if (error.code !== "ENOENT") throw error;
        }
        let deletedFile;
        try {
          deletedFile = await new FileRepository().delete(projectId, fileId);
        } catch (error: unknown) {
          throw error;
        }
        return deletedFile;
      });
      if (!delFile) return res.status(404).json({ error: ERR_MSG.FILE_NOT_FOUND });
      return res.sendStatus(204);
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * Downloads a file of a project
   * Throws an error if the file could not be downloaded
   * @param {number} projectId - The ID of the project to which the file belongs
   * @param {number} fileId - The ID of the file to be downloaded
   * @returns {File[]} An array of file records
   * @throws {Error} If the file could not be downloaded
   * @route GET /:projectId/files/:fileId/download
   * @group Files
   */
  router.get("/:projectId/files/:fileId/download", async (req, res) => {
    const projectId = Number(req.params.projectId);
    if (isNaN(projectId) || projectId <= 0) return res.status(400).json({ error: ERR_MSG.PROJECT_ID_IS_REQUIRED });

    const fileId = Number(req.params.fileId);
    if (isNaN(fileId) || fileId <= 0) return res.status(400).json({ error: ERR_MSG.ID_IS_REQUIRED });

    let file;
    try {
      file = await new FileRepository().getById(projectId, fileId);
    } catch (error: unknown) {
      return res.status(500).json({ error: (error as Error).message });
    }
    if (!file) return res.status(404).json({ error: ERR_MSG.FILE_NOT_FOUND });

    return res.download(file.filePath, file.fileName, (err) => {
      if (err) {
        return res.status(500).json({ error: err });
      }
      return;
    });
  });

  return router;
}
