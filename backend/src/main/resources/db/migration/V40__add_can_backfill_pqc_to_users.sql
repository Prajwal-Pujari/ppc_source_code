-- V40: Add can_backfill_pqc flag to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_backfill_pqc BOOLEAN DEFAULT FALSE;
