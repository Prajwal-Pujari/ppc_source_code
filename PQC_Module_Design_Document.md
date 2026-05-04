# Production Quality Control (PQC) Module — Design Document

## 1. Overview & Business Model
PQC is a paid add-on module that sits on top of the base MES. It shares all existing entities — `GaugeMaster`, `OperationMaster`, `PurchaseOrders`, `Gauges` — and adds a dedicated quality inspection layer on top of the manufacturing workflow. 
Customers who don't pay for PQC get the standard job tracking. Customers who pay unlock inspection tracking, hourly production monitoring, dynamic shift tracking, NC analysis, and reporting dashboards.

A simple `pqc_enabled` boolean flag on the `Factory` entity (or a subscriptions table) controls access. All PQC endpoints and UI routes check this flag. The base system remains completely unaffected.

## 2. Core Concept
In the base system, a worker completes an operation (e.g., Turning) and marks it done. PQC adds a layer on top: after production runs, a Quality Inspector records how many parts were produced, how many passed, how many were rejected, and why — for every operation, tracked at a frequency you configure (hourly, every 2 hours, per shift, etc.).
Think of it as a Production + Quality Log tied to each Gauge Operation, where you can replay exactly what happened hour by hour, and **shift by shift**, during a manufacturing run.

## 3. New Database Tables (PostgreSQL)

### `factory_shifts` (NEW - For Dynamic Shift Management)
Allows each factory to define their own custom production shifts (e.g., "Morning Shift", "Night Shift", "General Shift") with specific start and end times.
*   `id` (UUID)
*   `factory_id` (FK → factories)
*   `shift_name` (VARCHAR - e.g., "First Shift")
*   `start_time` (TIME)
*   `end_time` (TIME)
*   `is_active` (BOOLEAN)

### `pqc_inspection_plans`
Defines the inspection schedule for a specific GaugeMaster + Operation combination.
*   `id`
*   `gauge_master_id` (FK → gauge_masters)
*   `operation_master_id` (FK → operation_masters)
*   `inspection_frequency` — ENUM: HOURLY, EVERY_2_HOURS, EVERY_4_HOURS, PER_SHIFT, ON_DEMAND
*   `sample_size` — how many parts to inspect per check (e.g., 5 out of 100)
*   `critical_params` — JSONB (inspection checkpoints, tolerance limits, measurement criteria)
*   `created_by`, `created_at`

### `pqc_inspection_logs`
The main record — one row per inspection event.
*   `id`
*   `gauge_operation_id` (FK → gauge_operations)
*   `gauge_id` (FK → gauges)
*   `inspection_plan_id` (FK → pqc_inspection_plans)
*   `inspector_id` (FK → users)
*   `log_time` — when this inspection was recorded
*   **`shift_id`** — (FK → factory_shifts) Tracks exactly which shift produced these parts
*   `planned_qty` — how many parts were supposed to be produced by this checkpoint
*   `actual_qty` — how many were actually produced
*   `passed_qty` — passed inspection
*   `rejected_qty` — failed inspection
*   `rework_qty` — sent for rework (subset of rejected)
*   `scrap_qty` — scrapped (subset of rejected)
*   `rejection_reasons` — JSONB array (e.g., `[{"reason": "Dimensional out of tolerance", "count": 3}]`)
*   `measurement_data` — JSONB (actual measured values for critical params)
*   `remarks` — free text

### `pqc_rejection_codes`
A master list of standardized rejection reasons per factory.
*   `id`, `factory_id`, `code`, `description`, `category` (ENUM), `is_active`

### `pqc_subscriptions`
Controls which factories have PQC enabled.
*   `id`, `factory_id`, `plan` (ENUM), `valid_from`, `valid_until`, `is_active`

---

## 4. How It Integrates With the Base System
*   **GaugeMaster** — PQC inspection plans are attached to GaugeMaster + Operation pairs. No changes to GaugeMaster itself.
*   **GaugeOperation** — When an operation is IN_PROGRESS, PQC inspections can be logged against it. The operation flow (assign → start → complete) is unchanged.
*   **NC Records** — PQC rejections that require formal disposition automatically generate an `nc_record` using the existing `NcRecordService`. PQC doesn't replace NC — it feeds it.
*   **Users** — The existing `QUALITY_INSPECTOR` role is used. No new roles needed.
*   **WebSocket** — PQC inspection events are published via the existing `MesEventPublisher` to the factory topic so dashboards update live.

---

## 5. Backend Services

### `FactoryShiftService` (NEW)
*   Create, update, and retrieve active shifts for a factory.
*   `getCurrentShift(factoryId, time)`: Utility method to automatically determine the active shift based on the current clock time during an inspection.

### `PqcInspectionPlanService`
*   Create/update inspection plans for GaugeMaster + Operation pairs.
*   Retrieve active plan for a given gauge operation.
*   Schedule reminders/alerts when an inspection is overdue.

### `PqcInspectionLogService`
*   `logInspection()` — core method. Validates quantities, automatically maps the `log_time` to the correct `shift_id` based on active factory shifts. Auto-creates NC Record if `rejected_qty > 0`. Publishes WebSocket event on save.
*   `getLogsForGaugeOperation(id)` — returns the full hourly/shift timeline for a job.
*   `getLogsForDateRange(factoryId, from, to)` — used by reports.

### `PqcReportService`
*   `getDailyReport()` / `getWeeklyReport()` / `getMonthlyReport()` — Now includes **Shift-Wise Aggregation** (e.g., comparing Morning Shift vs Night Shift performance).
*   Returns: total planned, total actual, total passed, total rejected, rejection rate %, top rejection reasons, worst-performing operations, shift-wise summary.

---

## 6. Frontend Pages & Components

### A. Factory Configuration & Shifts (Admin)
*   **Route:** `/settings/shifts`
*   A new settings page where Factory Admins can define their custom shifts (Name, Start Time, End Time). 

### B. Inspection Plan Setup (Admin/Supervisor)
*   **Route:** `/pqc/plans`
*   A configuration page where supervisors define inspection schedules for GaugeMasters.

### C. Inspector Live Entry (Quality Inspector)
*   **Route:** `/pqc/inspect`
*   The main working screen for the floor inspector. Shows all IN_PROGRESS gauge operations.
*   Includes a dropdown to confirm/override the **Current Shift** (auto-selected based on server time).
*   Quick-entry form: actual qty, pass qty, reject qty broken down by reason code.

### D. Job Card Inspection Timeline
*   **Route:** `/pqc/gauge/:gaugeId`
*   Timeline view showing every inspection log for each operation on this specific gauge, hour by hour and shift by shift.

### E. Analytics & Reports
*   **Routes:** `/pqc/reports/daily`, `/pqc/reports/weekly`, `/pqc/reports/monthly`
*   Summary cards & tables. **Crucially, includes a Shift Performance comparison chart** allowing management to see which shifts produce the highest quality or the most defects.

### F. PQC Summary Dashboard
*   **Route:** `/pqc/dashboard`
*   Live rejection rate gauge, today's production progress vs plan, shift-wise progress, active inspections, and alerts.

---

## 7. UI/UX Principles for PQC Pages
*   Match the existing "glassmorphism" aesthetic and copper/charcoal palette from the base app.
*   Inspector entry form must be fast — minimum taps/clicks to log an inspection.
*   Color coding throughout: green for passed, amber for rework, red for scrap/rejected.
*   The summary dashboard should be printable / exportable to PDF for shift handovers.

---

## 8. API Endpoints (Updated)

*   `GET/POST /api/settings/shifts` → Manage dynamic factory shifts
*   `POST /api/pqc/plans` → Create inspection plan
*   `GET /api/pqc/plans` → Get plan
*   `POST /api/pqc/inspections` → Log an inspection (payload includes `shiftId`)
*   `GET /api/pqc/reports/daily` → Daily report (returns shift-wise breakdowns)
*   `GET /api/pqc/rejection-codes` → List rejection codes
*   `GET /api/pqc/subscription/status` → Check if PQC is active

---

## 9. Feature Flag / Gating
*   All `/pqc/**` routes on the frontend check `factory.pqcEnabled` from the auth store.
*   The base sidebar shows a locked PQC section with an "Upgrade" badge for non-subscribers.

---

## 10. Flyway Migration (V8)
Add as `V8__add_pqc_tables.sql`:
1.  `factory_shifts` table
2.  `pqc_subscriptions` table
3.  `pqc_rejection_codes` table
4.  `pqc_inspection_plans` table
5.  `pqc_inspection_logs` table (with FK to `factory_shifts`)
6.  Indexes on `log_time`, `shift_id`, `gauge_operation_id`.
