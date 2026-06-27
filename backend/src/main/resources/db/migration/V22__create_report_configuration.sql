CREATE TABLE IF NOT EXISTS report_configuration (
    id VARCHAR(36) PRIMARY KEY,
    customer_logo TEXT,
    doc_no VARCHAR(100),
    rev_no VARCHAR(100),
    issue_date VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO report_configuration (id, customer_logo, doc_no, rev_no, issue_date)
VALUES ('default-config', '', 'QMS/F/01', '00 / 01.01.2024', '01.01.2024')
ON CONFLICT (id) DO NOTHING;
