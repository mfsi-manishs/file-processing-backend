/**
 * @file app.ts
 * @fileoverview Main application
 */

import "./env.js"; // First import environment variables

import express from "express";
import morgan from "morgan";
import multer from "multer";
import filesRouter from "./routes/file.routes.js";
import jobsRouter from "./routes/job.route.js";
import projectsRouter from "./routes/project.route.js";
import { startWorkerPool } from "./workers/worker-pool.js";

const app = express();

// Configure Morgan middleware to log requests
app.use(morgan(":date[iso] :method :url :status - :response-time ms"));

// Configure body parsing middleware
app.use(express.json());

// Configure file upload middleware
const upload = multer({ dest: process.env.UPLOAD_DIR || "uploads/", limits: { fileSize: 10 * 1024 * 1024, files: 10 } });

app.get("/", (req, res) => {
  console.log(`request: ${req.method} ${req.url}`);
  res.send("File Processing API is running...");
});

// Register routes
app.use("/api/projects", projectsRouter());
app.use("/api/projects", filesRouter(upload));
app.use("/api/projects", jobsRouter());

startWorkerPool({ size: Number(process.env.WORKER_COUNT) || 2 });

// Start the server
app.listen(process.env.PORT || 3000, () => {
  console.log(`API listening on port: ${process.env.PORT || 3000}...`);
});
