/**
 * @file app.ts
 * @fileoverview Main application
 */

import express from "express";
import multer from "multer";
// import projectsRouter from "./routes/projects";
// import filesRouter from "./routes/files";
// import jobsRouter from "./routes/jobs";
import { startWorkerPool } from "./workers/worker-pool";

const app = express();
app.use(express.json());

const upload = multer({ dest: process.env.UPLOAD_DIR || "uploads/" });

// app.use("/projects", projectsRouter(upload));
// app.use("/projects", filesRouter(upload));
// app.use("/projects", jobsRouter);

startWorkerPool({ size: Number(process.env.WORKER_COUNT) || 2 });

app.listen(process.env.PORT || 3000, () => {
  console.log("API listening");
});
