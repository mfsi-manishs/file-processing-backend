# file-processing-backend
**A Project-Centric File Processing Backend using Node.js**

## **Objective**

Build a Node.js backend system where **Projects** are the primary domain entity.

Each project owns **files** and **processing jobs**.

The system must expose REST APIs for project management, file uploads, background processing using **Worker Threads**, and **database with schema** that supports these operations efficiently.

## **Core Domain Model**

```
Project
 ├── Files
 └── Jobs (background processing)
```

---

## **API Requirements**

*(All APIs must remain scoped to a Project)*

### **Project APIs**

- Create Project
- Get Project details
- Update Project
- Delete Project (cascade delete related data)

### **File APIs (Project-scoped)**

- Upload multiple files to a project
- List files of a project
- Delete a file from a project

### **Job APIs (Project-scoped)**

- Create ZIP compression job for project files
- Fetch job status & progress
- Download processed output

---

## **Database Design Requirement (Mandatory)**

The database schema designed must support the above APIs and must be justifiable.

### **Expectations**

- Identify required tables / collections
- Define relationships between entities
- Decide where metadata vs binary data should live
- Consider indexing and query patterns
- Support job progress tracking

---

## **Database Design Hints (Not Solutions)**

### **1. Entity Separation**

- **Projects**, **Files**, and **Jobs** should be modeled as **separate entities**.
- Avoid embedding everything into a single table or document.

### **2. Ownership & Relationships**

- Every file must belong to **exactly one project**.
- Every job must belong to **exactly one project**.
- A job may produce **one output file** (ZIP).

> Hint: Think in terms of project_id as a foreign key or partition key.
> 

### **3. File Storage Strategy**

- **Do NOT store raw file binaries in the database**.
- Store only:
    - file path
    - size
    - type
    - checksum (optional)
- Actual files should live on disk or object storage.

### **4. Job Lifecycle Tracking**

- Jobs should track:
    - status (PENDING, PROCESSING, COMPLETED, FAILED)
    - progress percentage
    - timestamps (created, started, completed)
- Status updates must be safe for concurrent access.

### **5. Query Patterns (Think Before Designing)**

Design schema so these queries are efficient:

- Fetch project with file count
- List files for a project
- Get all active jobs for a project
- Validate file ownership before processing

### **6. Indexing Hints**

- Index by project_id
- Index job status for monitoring
- Avoid full-table scans for common operations

---

## **Worker Threads Requirement**

- Database must support **safe job state updates** from worker threads.
- Workers must not directly access HTTP context.
- Communication should happen via messages + DB updates.

## **API Examples – Project-Centric File Processing System**

## **1. Project APIs**

### **1.1 Create Project**

**POST** /api/projects

**Request**

```
{
  "name": "Video Assets Processing",
  "description": "Handles raw media uploads and compression"
}
```

**Response**

```
{
  "id": "proj_1001",
  "name": "Video Assets Processing",
  "description": "Handles raw media uploads and compression",
  "createdAt": "2025-01-15T10:30:00Z"
}
```

### **1.2 Get Project Details**

**GET** /api/projects/proj_1001

**Response**

```
{
  "id": "proj_1001",
  "name": "Video Assets Processing",
  "description": "Handles raw media uploads and compression",
  "filesCount": 3,
  "jobsCount": 1,
  "createdAt": "2025-01-15T10:30:00Z"
}
```

### **1.3 Update Project**

**PUT** /api/projects/proj_1001

**Request**

```
{
  "description": "Updated project description"
}
```

**Response**

```
{
  "message": "Project updated successfully"
}
```

### **1.4 Delete Project**

**DELETE** /api/projects/proj_1001

**Response**

```
{
  "message": "Project and all associated files and jobs deleted"
}
```

## **2. File APIs (Project-Scoped)**

### **2.1 Upload Files to Project**

**POST** /api/projects/proj_1001/files

Content-Type: multipart/form-data

**Request**

```
files: video1.mp4
files: thumbnail.png
```

**Response**

```
{
  "projectId": "proj_1001",
  "files": [
    {
      "fileId": "file_201",
      "name": "video1.mp4",
      "size": 104857600,
      "type": "video/mp4",
      "uploadedAt": "2025-01-15T10:35:00Z"
    },
    {
      "fileId": "file_202",
      "name": "thumbnail.png",
      "size": 20480,
      "type": "image/png",
      "uploadedAt": "2025-01-15T10:35:00Z"
    }
  ]
}
```

### **2.2 List Project Files**

**GET** /api/projects/proj_1001/files

**Response**

```
[
  {
    "fileId": "file_201",
    "name": "video1.mp4",
    "size": 104857600
  },
  {
    "fileId": "file_202",
    "name": "thumbnail.png",
    "size": 20480
  }
]
```

### **2.3 Delete File from Project**

**DELETE** /api/projects/proj_1001/files/file_202

**Response**

```
{
  "message": "File deleted successfully"
}
```

## **3. Job APIs (Worker Thread Based)**

### **3.1 Create ZIP Compression Job**

**POST** /api/projects/proj_1001/jobs/zip

> ZIP creation
> 
> 
> **must execute inside a Worker Thread**
> 

**Request**

```
{
  "fileIds": ["file_201", "file_202"]
}
```

**Response (Immediate)**

```
{
  "jobId": "job_301",
  "projectId": "proj_1001",
  "type": "ZIP_COMPRESSION",
  "status": "PROCESSING",
  "createdAt": "2025-01-15T10:40:00Z"
}
```

### **3.2 Get Job Status**

**GET** /api/projects/proj_1001/jobs/job_301

**Response (In Progress)**

```
{
  "jobId": "job_301",
  "status": "PROCESSING",
  "progress": 70,
  "startedAt": "2025-01-15T10:40:10Z"
}
```

**Response (Completed)**

```
{
  "jobId": "job_301",
  "status": "COMPLETED",
  "progress": 100,
  "outputFileId": "file_zip_901",
  "completedAt": "2025-01-15T10:42:00Z"
}
```

### **3.3 Job Failure Example**

**Response**

```
{
  "jobId": "job_301",
  "status": "FAILED",
  "error": "One or more files not found for this project"
}
```

## **4. Download Output File**

### **Download ZIP File**

**GET** /api/projects/proj_1001/files/file_zip_901/download

**Response**

```
HTTP/1.1 200 OK
Content-Type: application/zip
Content-Disposition: attachment; filename="proj_1001_files.zip"
```

(Binary stream)

## **5. Validation & Error Scenarios**

### **File Does Not Belong to Project**

**Request**

```
{
  "fileIds": ["file_999"]
}
```

**Response**

```
{
  "error": "File does not belong to this project"
}
```

### **Project Not Found**

**GET** /api/projects/proj_9999

**Response**

```
{
  "error": "Project not found"
}
```
