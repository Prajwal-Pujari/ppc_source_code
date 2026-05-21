-- Add higher_size and lower_size columns to calibration_observations
-- These store the original workpiece size limits from the Purchase Order line item

ALTER TABLE calibration_observations ADD COLUMN IF NOT EXISTS higher_size NUMERIC(10, 4);
ALTER TABLE calibration_observations ADD COLUMN IF NOT EXISTS lower_size NUMERIC(10, 4);
