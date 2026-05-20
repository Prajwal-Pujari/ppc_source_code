-- =====================================================
-- V13: Calibration Observations Table
-- =====================================================

CREATE TABLE calibration_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gauge_operation_id UUID NOT NULL REFERENCES gauge_operations(id) ON DELETE CASCADE,
    gauge_id UUID NOT NULL REFERENCES gauges(id),
    unit_number INTEGER NOT NULL,
    nominal_go DECIMAL(10,4),
    nominal_nogo DECIMAL(10,4),
    specified_go_plus DECIMAL(10,4),
    specified_go_minus DECIMAL(10,4),
    specified_nogo_plus DECIMAL(10,4),
    specified_nogo_minus DECIMAL(10,4),
    wear_limit DECIMAL(10,4),
    observed_go DECIMAL(10,4),
    observed_nogo DECIMAL(10,4),
    result VARCHAR(20) DEFAULT 'PENDING' CHECK (result IN ('PENDING','PASS','FAIL')),
    remarks TEXT,
    recorded_by UUID REFERENCES users(id),
    recorded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cal_obs_gauge_op ON calibration_observations(gauge_operation_id);
CREATE INDEX idx_cal_obs_gauge ON calibration_observations(gauge_id);
