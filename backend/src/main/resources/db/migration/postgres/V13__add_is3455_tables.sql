CREATE TABLE is3455_tolerances (
    id UUID PRIMARY KEY,
    tolerance_type VARCHAR(20) NOT NULL, -- 'PLUG', 'SNAP'
    nominal_size_min NUMERIC(10, 4) NOT NULL,
    nominal_size_max NUMERIC(10, 4) NOT NULL,
    workpiece_tolerance_min NUMERIC(10, 4) NOT NULL,
    workpiece_tolerance_max NUMERIC(10, 4) NOT NULL,
    gauge_tolerance_h NUMERIC(10, 4) NOT NULL,
    wear_allowance_y NUMERIC(10, 4) NOT NULL,
    gauge_allowance_z NUMERIC(10, 4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_is3455_lookup ON is3455_tolerances (tolerance_type, nominal_size_min, nominal_size_max, workpiece_tolerance_min, workpiece_tolerance_max);

ALTER TABLE po_line_items
    ADD COLUMN tolerance_type VARCHAR(20),
    ADD COLUMN higher_size NUMERIC(10, 4),
    ADD COLUMN lower_size NUMERIC(10, 4),
    ADD COLUMN workpiece_tolerance_t NUMERIC(10, 4),
    ADD COLUMN gauge_tolerance_h NUMERIC(10, 4),
    ADD COLUMN wear_allowance_y NUMERIC(10, 4),
    ADD COLUMN gauge_allowance_z NUMERIC(10, 4),
    ADD COLUMN wear_limit NUMERIC(10, 4),
    ADD COLUMN go_size NUMERIC(10, 4),
    ADD COLUMN nogo_size NUMERIC(10, 4);
