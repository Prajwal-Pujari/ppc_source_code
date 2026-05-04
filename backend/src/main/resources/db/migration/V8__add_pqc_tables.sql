-- V8: Add PQC Module Tables

CREATE TABLE factory_shifts (
    id UUID PRIMARY KEY,
    factory_id UUID NOT NULL REFERENCES factories(id),
    shift_name VARCHAR(255) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE pqc_rejection_codes (
    id UUID PRIMARY KEY,
    factory_id UUID NOT NULL REFERENCES factories(id),
    code VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE pqc_inspection_plans (
    id UUID PRIMARY KEY,
    gauge_master_id UUID NOT NULL REFERENCES gauge_master(id),
    operation_master_id UUID NOT NULL REFERENCES operation_master(id),
    inspection_frequency VARCHAR(50) NOT NULL,
    sample_size INTEGER NOT NULL,
    critical_params JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pqc_inspection_logs (
    id UUID PRIMARY KEY,
    gauge_operation_id UUID NOT NULL REFERENCES gauge_operations(id),
    gauge_id UUID NOT NULL REFERENCES gauges(id),
    inspection_plan_id UUID REFERENCES pqc_inspection_plans(id),
    inspector_id UUID NOT NULL REFERENCES users(id),
    log_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    shift_id UUID REFERENCES factory_shifts(id),
    planned_qty INTEGER NOT NULL DEFAULT 0,
    actual_qty INTEGER NOT NULL DEFAULT 0,
    passed_qty INTEGER NOT NULL DEFAULT 0,
    rejected_qty INTEGER NOT NULL DEFAULT 0,
    rework_qty INTEGER NOT NULL DEFAULT 0,
    scrap_qty INTEGER NOT NULL DEFAULT 0,
    rejection_reasons JSONB,
    measurement_data JSONB,
    remarks TEXT
);

CREATE INDEX idx_pqc_logs_operation_time ON pqc_inspection_logs(gauge_operation_id, log_time);
CREATE INDEX idx_pqc_logs_gauge_time ON pqc_inspection_logs(gauge_id, log_time);
CREATE INDEX idx_pqc_logs_shift ON pqc_inspection_logs(shift_id);
