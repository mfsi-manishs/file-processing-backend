/**
 * @file files.service.ts
 * @fileoverview File service
 */

import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import type { PoolClient } from "pg";
import { type File } from "../models/file.model.js";
import { FileRepository } from "../repositories/file.repo.js";

/**
 * Saves an uploaded file to the database and file system
 * @param projectId The ID of the project to which the file belongs
 * @param file The uploaded file
 * @param client The PostgreSQL client to use for the transaction
 * @returns The newly created file record
 * @throws Error if the file could not be saved
 */
export async function saveUploadedFile(projectId: number, file: Express.Multer.File, client: PoolClient): Promise<File> {
  const checksum = await hashFile(file.path);
  const storagePath = path.resolve(file.path);

  return new FileRepository().create(
    {
      projectId: projectId,
      fileName: file.originalname,
      filePath: storagePath,
      fileSize: file.size,
      fileType: file.mimetype,
      checksum: checksum,
      isOutput: false,
    },
    client
  );
}

/**
 * Computes the SHA-256 hash of a file
 * @param {string} p - the path to the file
 * @returns {Promise<string>} - a promise that resolves with the hash
 */
async function hashFile(p: string) {
  const hash = crypto.createHash("sha256");
  const fh = await fs.open(p, "r");
  const stream = fh.createReadStream();
  return new Promise<string>((resolve, reject) => {
    stream.on("data", (d) => hash.update(d));
    stream.on("end", async () => {
      await fh.close();
      resolve(hash.digest("hex"));
    });
    stream.on("error", reject);
  });
}
