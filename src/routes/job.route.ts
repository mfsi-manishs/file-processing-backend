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
   */
  router.post("/:projectId/jobs", async (req, res) => {
    const projectId = Number(req.params.projectId);
    const { type, input_file_id } = req.body;
    try {
      const job = await queueJob(projectId, type, input_file_id);
      res.status(201).json(job);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  /**
   * Lists all jobs belonging to a project
   * Optional query parameter `status` to filter by status
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
