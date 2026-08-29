CREATE TABLE vision_inspection_results (
    id UUID PRIMARY KEY,
    part_id VARCHAR(255) NOT NULL,
    data_matrix VARCHAR(255),
    overall_result VARCHAR(50) NOT NULL,
    inspection_method VARCHAR(100),
    inspected_at TIMESTAMP WITH TIME ZONE,
    defects_found INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE vision_inspection_checkpoints (
    id UUID PRIMARY KEY,
    result_id UUID NOT NULL,
    checkpoint_id VARCHAR(100),
    checkpoint_name VARCHAR(255) NOT NULL,
    balloon VARCHAR(100),
    expected_class VARCHAR(100),
    ai_class VARCHAR(100),
    ai_confidence DOUBLE PRECISION,
    result VARCHAR(50) NOT NULL,
    defect_type VARCHAR(255),
    CONSTRAINT fk_vision_inspection_result
        FOREIGN KEY (result_id)
        REFERENCES vision_inspection_results (id)
        ON DELETE CASCADE
);
