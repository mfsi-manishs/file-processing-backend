import type { PoolClient } from "pg";
import { pool } from "./pool.js";

/**
 * Runs a query safely with centralized error handling.
 * @template T The type of the rows returned by the query
 * @param {string} query The SQL query string
 * @param {any[]} [params] The query parameters
 * @returns {Promise<T[]>} A promise resolving to an array of rows from the query
 * @throws {Error} If the query fails, an error is thrown with a descriptive message
 *
 * The following PostgreSQL error codes are handled and thrown as separate errors:
 * - 23505 (unique_violation): Duplicate entry not allowed
 * - 23503 (foreign_key_violation): Invalid reference to another table
 * - 23502 (not_null_violation): Missing required field
 * All other errors are thrown as a generic "Database operation failed" error
 */
export async function runQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
  try {
    const res = await pool.query(query, params);
    return res.rows as T[];
  } catch (err: any) {
    // Handle common Postgres error codes
    switch (err.code) {
      case "23505": // unique_violation
        throw new Error("Duplicate entry not allowed");
      case "23503": // foreign_key_violation
        throw new Error("Invalid reference to another table");
      case "23502": // not_null_violation
        throw new Error("Missing required field");
      default:
        console.error("Database error:", err);
        throw new Error("Database operation failed");
    }
  }
}

/**
 * Runs a transaction safely with centralized error handling.
 * @template T The type of the value returned by the callback
 * @param {((client: any) => Promise<T>)} callback The transaction to be executed
 * @returns {Promise<T>} A promise resolving to the value returned by the callback
 * @throws {Error} If the transaction fails, an error is thrown with a descriptive message
 *
 * The transaction is executed in a single database connection.
 * If any error occurs during the transaction, the transaction is rolled back,
 * and an error is thrown. The error is logged to the console for debugging purposes.
 * The database connection is released after the transaction is completed, regardless of whether an error occurred or not.
 */
export async function runTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Transaction failed:", err);
    throw new Error("Database transaction failed");
  } finally {
    client.release();
  }
}
