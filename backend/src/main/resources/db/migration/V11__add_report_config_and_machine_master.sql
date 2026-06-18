-- =====================================================
-- V11: Report Configuration and Machine Master
-- =====================================================

-- 1. Report Configuration
CREATE TABLE report_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factory_id UUID REFERENCES factories(id),
    customer_logo TEXT,
    doc_no VARCHAR(100),
    rev_no VARCHAR(100),
    issue_date VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Machine Master
CREATE TABLE machine_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factory_id UUID REFERENCES factories(id),
    machine_name VARCHAR(255) NOT NULL,
    machine_code VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE machine_master ADD CONSTRAINT uq_machine_master_factory_code UNIQUE (factory_id, machine_code);
