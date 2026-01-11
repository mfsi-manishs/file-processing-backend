/**
 * @file job.route.ts
 * @fileoverview Job routes
 */

import { Router } from "express";
import { runQuery } from "../db/db.utils.js";
import type { Job } from "../models/job.model.js";
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
    const { fileIds } = req.body;
    try {
      const job = await queueJob(projectId, "ZIP_COMPRESSION", fileIds);
      res.status(201).json(job);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
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
    const status = req.query.status as string | undefined;
    const params: [number, string?] = [projectId];
    let where = "project_id = $1";
    if (status) {
      where += " AND status = $2";
      params.push(status);
    }

    const jobs = await runQuery<Job>(
      `SELECT * FROM jobs
       WHERE ${where} ORDER BY created_at DESC`,
      params
    );
    res.json(jobs);
  });

  return router;
}
