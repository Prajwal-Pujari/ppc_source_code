# Tasks & Features Planned for the Future

This document serves as a central hub to track all future ideas, architectural plans, and features that we discuss but decide to implement at a later date. 

---

## 1. Automated Off-site Database Backups
**Status:** Planned for Production Deployment Phase
**Description:** Implement an automated system to backup the factory databases and securely transmit them to our central servers.
**Implementation Strategy:**
- Do not write custom Java code for this.
- Add dedicated backup containers (e.g., `prodrigestivill/postgres-backup-s3` and `databack/mysql-backup`) to the `docker-compose.prod.yml`.
- Configure a cron schedule (e.g., `@monthly` or `@weekly`).
- Automatically compress databases into `.sql.gz` and upload to Cloud Storage (AWS S3) or a secure FTP server.
- Configure Webhook alerts to notify us via Discord/Slack/Email if a backup fails.

## 2. Full "One-Click" Client Deployment (Dockerization)
**Status:** Planned for Production Deployment Phase
**Description:** Package the entire MES system (Frontend, Backend, and 4 Databases) into a single deployable unit so the client never has to manually install dependencies.
**Implementation Strategy:**
- Create `backend/Dockerfile` (Multi-stage: Maven build -> Java 17 Alpine run).
- Create `frontend/Dockerfile` (Multi-stage: Node build -> Nginx web server).
- Create `docker-compose.prod.yml` to orchestrate Postgres 17, MySQL 8, Redis, MinIO, Backend, and Frontend.
- Install Docker Engine natively on the client's Windows/Linux server.
- Run `docker-compose -f docker-compose.prod.yml up -d` to launch the entire factory system silently in the background.

## 3. PostgreSQL 17 Upgrade
**Status:** ✅ Completed for Local Development
**Description:** Upgraded the core database from version 15 to version 17 (using `postgres:17-alpine`) to take advantage of multi-tasking efficiencies and faster query processing. 
**Note:** Ensure any new client deployments use this version from the start to avoid volume incompatibility issues.

---

## 4. Advanced Production Quality Control (PQC) Module
**Status:** Planned as a Paid Extension/Add-on
**Description:** Implement a dedicated PQC inspection module where specific gauge parameters and tolerances are checked during dedicated inspection operations.
**Implementation Strategy:**
- Treat this as a modular, paid extension for advanced clients.
- Create an inspection report engine that ties directly into the base product's batch tracking.
- Allow defining dynamic control parameters (tolerances, min/max values) for specific operations.

---
*(Add any new ideas or future modules here as they come up during development!)*
