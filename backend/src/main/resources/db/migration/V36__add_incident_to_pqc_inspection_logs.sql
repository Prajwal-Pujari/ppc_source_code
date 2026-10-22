ALTER TABLE pqc_inspection_logs
    ADD COLUMN IF NOT EXISTS incident_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS incident_duration_mins INTEGER,
    ADD COLUMN IF NOT EXISTS incident_remarks TEXT;
