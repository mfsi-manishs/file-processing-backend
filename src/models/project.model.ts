/**
 * @file project.model.ts
 * @fileoverview Project model
 */

/**
 * @interface Project
 */
export interface Project {
  id: number;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Maps database query results to an array of Project objects.
 * @param {any[]} rows - The database query results.
 * @returns {Project[]} - An array of Project objects.
 */
export const getProjectsFromRows = (rows: any[]): Project[] => {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));
};

export const getProjectsWithFilesFromRows = (rows: any[]): (Project & { fileCount: number })[] => {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    fileCount: row.file_count,
  })) as (Project & { fileCount: number })[];
};
