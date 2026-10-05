ALTER TABLE lpa_audit_log_answers
ADD COLUMN evidence_file_url VARCHAR(255),
ADD COLUMN target_closure_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN escalated_to VARCHAR(100),
ADD COLUMN approved_by VARCHAR(100);
