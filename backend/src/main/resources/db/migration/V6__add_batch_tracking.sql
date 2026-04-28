-- Add batch_quantity to gauges table (defaults to 1 for backwards compatibility)
ALTER TABLE gauges ADD COLUMN batch_quantity INT DEFAULT 1 NOT NULL;

-- Add rejected_quantity to nc_records table
ALTER TABLE nc_records ADD COLUMN rejected_quantity INT DEFAULT 1 NOT NULL;
