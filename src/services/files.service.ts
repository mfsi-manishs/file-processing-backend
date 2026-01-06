/**
 * @file files.service.ts
 * @fileoverview File service
 */

import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { pool } from "../db/pool";

/**
 * Saves an uploaded file to the database and file system
 * @param projectId The ID of the project to which the file belongs
 * @param file The uploaded file
 * @returns The newly created file record
 * @throws Error if the file could not be saved
 */
export async function saveUploadedFile(projectId: number, file: Express.Multer.File) {
  const checksum = await hashFile(file.path);
  const storagePath = path.resolve(file.path); // or move to final location
  const res = await pool.query(
    `INSERT INTO files(project_id, file_name, file_path, file_type, file_size, checksum)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [projectId, file.originalname, storagePath, file.mimetype, file.size, checksum]
  );
  return res.rows[0];
}

/**
 * Computes the SHA-256 hash of a file
 * @param {string} p - the path to the file to be hashed
 * @returns {Promise<string>} - a promise resolving to the hex string representation of the hash
 * @throws {Error} - an error occurred while reading the file
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
