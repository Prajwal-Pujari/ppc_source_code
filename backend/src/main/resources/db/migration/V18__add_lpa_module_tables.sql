-- Add module enable flags to factories
ALTER TABLE factories ADD COLUMN IF NOT EXISTS mes_enabled BOOLEAN DEFAULT true;
ALTER TABLE factories ADD COLUMN IF NOT EXISTS pqc_enabled BOOLEAN DEFAULT true;
ALTER TABLE factories ADD COLUMN IF NOT EXISTS lpa_enabled BOOLEAN DEFAULT true;

-- Create LPA Question Sets Table
CREATE TABLE IF NOT EXISTS lpa_question_sets (
    id UUID PRIMARY KEY,
    factory_id UUID NOT NULL REFERENCES factories(id),
    audit_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    operation_master_id UUID REFERENCES operation_master(id),
    gauge_master_id UUID REFERENCES gauge_master(id),
    machine_master_id UUID REFERENCES machine_master(id),
    default_frequency VARCHAR(50) DEFAULT 'DAILY',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create LPA Questions Table
CREATE TABLE IF NOT EXISTS lpa_questions (
    id UUID PRIMARY KEY,
    question_set_id UUID NOT NULL REFERENCES lpa_question_sets(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(30) NOT NULL,
    expected_answer VARCHAR(255),
    unit VARCHAR(30),
    min_value NUMERIC(10, 4),
    max_value NUMERIC(10, 4),
    choices JSONB,
    is_critical BOOLEAN DEFAULT false,
    checking_method VARCHAR(100),
    reaction_plan TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Create LPA Schedules Table
CREATE TABLE IF NOT EXISTS lpa_schedules (
    id UUID PRIMARY KEY,
    factory_id UUID NOT NULL REFERENCES factories(id),
    audit_type VARCHAR(50) NOT NULL,
    question_set_id UUID NOT NULL REFERENCES lpa_question_sets(id),
    operation_master_id UUID REFERENCES operation_master(id),
    gauge_master_id UUID REFERENCES gauge_master(id),
    machine_master_id UUID REFERENCES machine_master(id),
    assigned_to_id UUID REFERENCES users(id),
    assigned_role VARCHAR(50),
    frequency VARCHAR(50) NOT NULL DEFAULT 'DAILY',
    next_due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
    last_completed_at TIMESTAMP WITH TIME ZONE,
    last_score_percentage NUMERIC(5, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Create LPA Audit Logs Table
CREATE TABLE IF NOT EXISTS lpa_audit_logs (
    id UUID PRIMARY KEY,
    factory_id UUID NOT NULL REFERENCES factories(id),
    audit_type VARCHAR(50) NOT NULL,
    question_set_id UUID NOT NULL REFERENCES lpa_question_sets(id),
    schedule_id UUID REFERENCES lpa_schedules(id),
    operation_master_id UUID REFERENCES operation_master(id),
    gauge_master_id UUID REFERENCES gauge_master(id),
    machine_master_id UUID REFERENCES machine_master(id),
    audited_by_id UUID NOT NULL REFERENCES users(id),
    shift_name VARCHAR(50),
    audit_date TIMESTAMP WITH TIME ZONE NOT NULL,
    score_percentage NUMERIC(5, 2),
    total_questions INTEGER,
    conforming_count INTEGER,
    non_conforming_count INTEGER,
    na_count INTEGER,
    overall_status VARCHAR(30) DEFAULT 'PASS',
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create LPA Audit Log Answers Table
CREATE TABLE IF NOT EXISTS lpa_audit_log_answers (
    id UUID PRIMARY KEY,
    audit_log_id UUID NOT NULL REFERENCES lpa_audit_logs(id) ON DELETE CASCADE,
    question_id UUID NOT NULL,
    question_text TEXT,
    sequence_order INTEGER,
    is_critical BOOLEAN DEFAULT false,
    status VARCHAR(30) NOT NULL,
    actual_value VARCHAR(255),
    remarks TEXT,
    corrective_action TEXT,
    assigned_action_owner VARCHAR(100),
    action_status VARCHAR(30) DEFAULT 'OPEN'
);
