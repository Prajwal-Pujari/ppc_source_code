-- V41: Add First Piece and Last Piece Inspection Support
-- Adds checkboxes/flags to pqc_questions: is_first_piece, is_last_piece, is_in_process
-- Adds inspection_type to pqc_inspection_logs: FIRST_PIECE, IN_PROCESS, LAST_PIECE

ALTER TABLE pqc_questions
    ADD COLUMN IF NOT EXISTS is_first_piece BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS is_last_piece BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS is_in_process BOOLEAN DEFAULT TRUE;

ALTER TABLE pqc_inspection_logs
    ADD COLUMN IF NOT EXISTS inspection_type VARCHAR(30) DEFAULT 'IN_PROCESS';

CREATE INDEX IF NOT EXISTS idx_pqc_insp_logs_type 
    ON pqc_inspection_logs(gauge_operation_id, shift_id, inspection_type);

