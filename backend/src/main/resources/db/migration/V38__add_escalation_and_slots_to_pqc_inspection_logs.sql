-- Migration: V38__add_escalation_and_slots_to_pqc_inspection_logs.sql
-- Add hourly interval slot tracking and failure escalation to pqc_inspection_logs

ALTER TABLE pqc_inspection_logs
    ADD COLUMN IF NOT EXISTS slot_index INTEGER,
    ADD COLUMN IF NOT EXISTS is_escalated BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS escalated_to VARCHAR(100),
    ADD COLUMN IF NOT EXISTS escalation_reason TEXT,
    ADD COLUMN IF NOT EXISTS is_backfill BOOLEAN DEFAULT FALSE;
