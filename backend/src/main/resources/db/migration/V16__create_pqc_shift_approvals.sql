CREATE TABLE pqc_shift_approvals (
    id UUID PRIMARY KEY,
    gauge_id UUID NOT NULL,
    shift_id UUID NOT NULL,
    inspection_date VARCHAR(50) NOT NULL,
    inspector_name VARCHAR(100) NOT NULL,
    signature TEXT,
    approved_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    FOREIGN KEY (gauge_id) REFERENCES gauges(id) ON DELETE CASCADE,
    FOREIGN KEY (shift_id) REFERENCES factory_shifts(id) ON DELETE CASCADE,
    
    CONSTRAINT uk_gauge_shift_date UNIQUE (gauge_id, shift_id, inspection_date)
);
