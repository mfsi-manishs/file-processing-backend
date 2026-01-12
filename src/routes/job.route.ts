/**
 * @file job.route.ts
 * @fileoverview Job routes
 */

import { Router } from "express";
import { ERR_MSG } from "../constants.js";
import { JobRepository } from "../repositories/job.repo.js";
import { queueJob } from "../services/jobs.service.js";

/**
 * @function filesRouter
 * @description Job routes
 * Exposes two endpoints for queuing a new job and for fetching all jobs of a project.
 * The POST endpoint takes the project ID, job type, and the ID of the input file (if any) as request body.
 * The GET endpoint takes the project ID and optionally the status of the job as query parameters.
 */
export default function filesRouter() {
  const router = Router();

  /**
   * Queues a new job and returns the newly created job record
   * Throws an error if the job could not be created
   * @param {number} projectId - The ID of the project to which the job belongs
   * @body {number[]} fileIds - The IDs of the input files for the job
   * @returns {Job} The newly created job
   * @throws {Error} If the job could not be created
   * @route POST /:projectId/jobs/zip
   * @group Jobs
   */
  router.post("/:projectId/jobs/zip", async (req, res) => {
    const projectId = Number(req.params.projectId);
    if (isNaN(projectId) || projectId <= 0) return res.status(400).json({ error: ERR_MSG.PROJECT_ID_IS_REQUIRED });

    const { fileIds } = req.body;
    if (!fileIds || fileIds.length === 0) return res.status(400).json({ error: ERR_MSG.FILE_ID_IS_REQUIRED });
    if (fileIds.length > 10) return res.status(400).json({ error: ERR_MSG.FILE_ID_LIMIT_EXCEEDED });

    try {
      const job = await queueJob(projectId, "ZIP_COMPRESSION", fileIds);
      return res.status(201).json(job);
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  });

  /**
   * Lists all jobs of a project.
   * If status is provided, only jobs with that status are returned
   * @param {number} projectId - The ID of the project
   * @query {string} status - The status of the job [OPTIONAL]
   * @returns {Job[]} An array of jobs
   * @route GET /:projectId/jobs
   * @group Jobs
   */
  router.get("/:projectId/jobs", async (req, res) => {
    const projectId = Number(req.params.projectId);
    if (isNaN(projectId) || projectId <= 0) return res.status(400).json({ error: ERR_MSG.PROJECT_ID_IS_REQUIRED });

    const status = req.query.status as string | undefined;
    if (status && !["PENDING", "PROCESSING", "COMPLETED", "FAILED"].includes(status)) {
      return res.status(400).json({ error: ERR_MSG.INVALID_JOB_STATUS });
    }

    try {
      const jobs = await new JobRepository().findByProject(projectId, status);
      return res.json(jobs);
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  return router;
}
