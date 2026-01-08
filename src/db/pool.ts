/**
 * @file pool.ts
 * @fileoverview Database connection pool
 */

import { Pool } from "pg";

// Validate required environment variables
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

export const pool = new Pool({
  connectionString: String(process.env.DATABASE_URL),
  max: 20, // max clients in pool
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
});

// Log unexpected errors from idle clients
pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client:", err);
});

// Log unexpected errors from non-idle clients
pool.on("connect", (client) => {
  client.on("error", (err) => console.error("Unexpected error on PostgreSQL client:", err));
});

// Log successful connection
pool.on("connect", () => console.log("Connected to PostgreSQL database..."));
