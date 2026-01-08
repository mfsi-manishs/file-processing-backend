/**
 * @file utils.ts
 * @fileoverview Utility functions
 */

import archiver from "archiver";
import fs from "fs";
import path from "path";
import { Writable } from "stream";

/**
 * @interface ArchiveFile
 */
export interface ArchiveFile {
  /** Absolute or relative file path */
  path: string;

  /** Optional name inside the ZIP */
  name?: string;
}

/**
 * Archives files to a ZIP file.
 * @param files An array of files to be added to the ZIP archive.
 * @param output A writable stream to which the ZIP archive will be written.
 * @param options Optional settings for the archive.
 * @returns A promise that resolves once the archive is complete, or rejects if an error occurs.
 * @description options:
 * - compressionLevel: The level of compression to use for the ZIP archive (0-9). Defaults to 6.
 * - onProgress: A callback function that will be called with the progress of the archive in bytes.
 */
export async function archiveFiles(
  files: ArchiveFile[],
  output: Writable,
  options?: {
    compressionLevel?: number; // 0–9
    onProgress?: (bytes: number) => void;
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", {
      zlib: { level: options?.compressionLevel ?? 6 },
    });

    let isSettled = false;

    const handleReject = (err: Error) => {
      if (!isSettled) {
        isSettled = true;
        reject(err);
      }
    };

    const handleResolve = () => {
      if (!isSettled) {
        isSettled = true;
        resolve();
      }
    };

    // Handle archive errors
    archive.on("error", handleReject);
    archive.on("warning", (err) => {
      // ENOENT = missing file in archive
      if (err.code === "ENOENT") {
        handleReject(err);
      } else {
        console.warn("Archive warning:", err);
      }
    });

    // Optional progress tracking
    if (options?.onProgress) {
      archive.on("progress", (progress) => {
        options.onProgress!(Math.floor(progress.fs.processedBytes / progress.fs.totalBytes) * 100);
      });
    }

    // Pipe archive to output stream
    archive.pipe(output);

    // Add files
    for (const file of files) {
      if (!fs.existsSync(file.path)) {
        handleReject(new Error(`File not found: ${file.path}`));
        archive.abort();
        return;
      }

      archive.file(file.path, {
        name: file.name ?? path.basename(file.path),
      });
    }

    // Finalize
    archive.finalize().catch(handleReject);

    output.on("close", handleResolve);
    output.on("error", handleReject);
  });
}
