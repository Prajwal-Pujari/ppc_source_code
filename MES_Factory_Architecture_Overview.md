# MES Factory Base Model Architecture Overview

This document serves as a comprehensive "Base Model" architecture map for the MES (Manufacturing Execution System) Factory application. You can use this file as context when prompting LLMs (like Gemini) to design new modules (e.g., PQC models) or customize the system for different clients.

---

## 1. High-Level Technology Stack

*   **Backend:** Java 17, Spring Boot 3.2.4 (Maven)
*   **Frontend:** React 18, TypeScript, Vite, React Query (Data Fetching), Zustand (State Management)
*   **Primary Database:** PostgreSQL 15 (Managed by Flyway Migrations V1-V7)
*   **Secondary Database:** MySQL 8 (Intended for Analytics / Machine Learning)
*   **In-Memory / Message Broker:** Redis 7 (Caching & Real-time WebSocket Pub/Sub)
*   **Object Storage:** MinIO (S3-compatible file storage for PDFs, images, and attachments)
*   **Deployment:** Docker Compose (Nginx reverse proxy for frontend, multi-stage builds)

---

## 2. Core Database Schema & Entities (PostgreSQL)

The primary database is designed around a "Batch Tracking" approach. 
When a Purchase Order (PO) is received, the system generates individual `Gauge` records (batches) based on the PO Line Item quantity.

### Core Tables
1.  **`users`**: Role-Based Access Control (`ADMIN`, `SUPERVISOR`, `WORKER`, `QUALITY_INSPECTOR`, `VIEWER`). Linked to a specific `Factory`.
2.  **`gauge_masters`**: The product catalog defining standard products (Gauges) the factory manufactures.
3.  **`operation_masters`**: A catalog of standardized manufacturing steps (e.g., Turning, Milling, Final Inspection).
4.  **`purchase_orders` & `po_line_items`**: Tracks customer orders. A single PO contains multiple Line Items. Each Line Item specifies a `GaugeMaster` and a `quantity`.
5.  **`gauges` (The "Job Card")**: Represents a physical batch being manufactured. Created automatically from a PO Line Item. Contains `batchQuantity`, `status`, and tracking IDs.
6.  **`gauge_operations`**: The heart of the routing system. A list of tasks assigned to workers to manufacture a `Gauge`. Tracks `assignedTo`, `completedBy`, `actualStart`, `actualEnd`, and `qualityParams` (JSONB).
7.  **`nc_records`**: Non-Conformance records. Tracks scrap, rework, or rejected items, linking back to the specific `Gauge` and `GaugeOperation`.

---

## 3. Backend Flow & Architecture

The Spring Boot backend is a RESTful monolith designed for high concurrency and real-time observability.

### Key Workflows:
1.  **Order Ingestion (`PurchaseOrderService`)**:
    *   Creates PO.
    *   Generates a sequence of `Gauge` records (Job Cards) based on the PO line items.
    *   Generates the sequential `GaugeOperation` routing steps based on standard procedures.
2.  **Shop Floor Execution (`GaugeOperationService`)**:
    *   Supervisors use `assignOperation` to route a task to a `WORKER`.
    *   Workers use `startOperation` (changes status to `IN_PROGRESS`).
    *   Workers use `completeOperation` (records `actualEnd`, captures `qualityParams` JSON data, and logs the `completedBy` user).
    *   *Auto-Routing*: Upon completion, the backend automatically sets the next operation in the sequence to `QUEUED`.
3.  **Quality & Non-Conformance (`NcRecordService`)**:
    *   If an item fails inspection, a `QUALITY_INSPECTOR` flags it.
    *   System generates an `NcRecord`. The gauge can be scrapped or routed for REWORK.
4.  **Real-Time Subsystem (`WebSocketConfig` & `MesEventPublisher`)**:
    *   STOMP over WebSockets pushes live updates to connected browsers.
    *   Redis Pub/Sub is used on the backend. This means if you scale the backend to multiple Docker containers, a WebSocket message sent by Server A will reach a user connected to Server B via the Redis bus.

---

## 4. Frontend Flow & UI Design

The React frontend emphasizes a modern, premium, "glassmorphism" aesthetic with high responsiveness.

### Key Concepts:
1.  **State Management**:
    *   **React Query**: Handles all API GET/POST requests. Caches responses to reduce server load and provides instant UI updates via `queryClient.invalidateQueries`.
    *   **Zustand**: Used for global UI state (e.g., `useNotificationStore` for toast popups, `useAuthStore` for JWT tokens).
2.  **Real-time Integration**:
    *   A global WebSocket hook listens to `/topic/factory/{factoryId}`. When a worker completes a task on the floor, the supervisor's dashboard updates *instantly* without refreshing the page.
3.  **UI Components & Theming**:
    *   `AppLayout.tsx`: The main shell containing the Sidebar and Top Header.
    *   Uses Vanilla CSS (`index.css`) with CSS Variables (`var(--copper-dark)`, `var(--charcoal)`) for a consistent, premium color palette rather than relying heavily on Tailwind.
    *   `lucide-react` is used for consistent iconography.

### Main User Flows:
*   **Dashboard (`DashboardPage.tsx`)**: Live overview of factory performance, active users, and recent activities.
*   **PO Management (`PurchaseOrderDetailPage.tsx`)**: Creates orders and views overall progress.
*   **Assign Operations (`AssignOperationsPage.tsx`)**: A Kanban/List view where supervisors drag-and-drop or select workers to assign tasks.
*   **My Tasks (`MyTasksPage.tsx`)**: The mobile-friendly view for floor workers to click "Start" and "Complete" on their assigned operations.
*   **Job Card View (`JobCardDetailPage.tsx`)**: Generates a printable, physical Job Card. Includes a QR code. When scanned by a mobile device, it opens the public `JobCardVerificationPage.tsx` to verify authenticity.

---

## 5. Instructions for Adding New Modules (Prompting Guide)

When asking an LLM to add a new module (e.g., **PQC - Process Quality Control**), provide them this document and specify the following constraints:

1.  **Database Expansion**:
    *   *Prompt*: "Create a new Flyway migration script `V8__add_pqc_tables.sql` mapping to new JPA entities. Link the PQC records to the existing `gauge_operations` table using UUID foreign keys."
2.  **Backend Logic**:
    *   *Prompt*: "Create `PqcService.java` following the existing pattern. Ensure you inject `MesEventPublisher` so that when a PQC check fails, a real-time WebSocket notification is pushed to the SUPERVISOR."
3.  **Frontend Design**:
    *   *Prompt*: "Create the React UI components for PQC using the existing CSS variables in `index.css`. Use React Query (`useQuery`, `useMutation`) for data fetching. Ensure the design matches the premium aesthetic of the `JobCardDetailPage`."
4.  **Docker Compatibility**:
    *   *Prompt*: "Ensure no new external infrastructure is required. If files must be saved, use the existing MinIO S3 integration. Do not use local disk storage, as containers are ephemeral."
