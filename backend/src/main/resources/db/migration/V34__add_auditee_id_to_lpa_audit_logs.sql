ALTER TABLE lpa_audit_logs ADD COLUMN auditee_id UUID;
ALTER TABLE lpa_audit_logs ADD CONSTRAINT fk_lpa_audit_logs_auditee FOREIGN KEY (auditee_id) REFERENCES users(id) ON DELETE SET NULL;
