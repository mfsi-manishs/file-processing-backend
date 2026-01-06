/**
 * @file Database connection pool
 * @description Creates a connection pool to the database
 */

import { Pool } from "pg";

/**
 * @description Creates a connection pool to the database
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
});
