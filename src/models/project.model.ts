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
