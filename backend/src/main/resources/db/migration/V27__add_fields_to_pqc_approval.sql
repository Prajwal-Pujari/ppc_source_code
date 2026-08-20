ALTER TABLE pqc_shift_approvals 
ADD COLUMN IF NOT EXISTS quality_remark TEXT,
ADD COLUMN IF NOT EXISTS additional_note TEXT,
ADD COLUMN IF NOT EXISTS approver_designation VARCHAR(100);
