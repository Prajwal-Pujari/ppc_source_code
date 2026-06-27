-- Add calibration approval and signature columns to gauges table
ALTER TABLE gauges ADD COLUMN IF NOT EXISTS is_calibration_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE gauges ADD COLUMN IF NOT EXISTS approved_by_admin_name VARCHAR(255);
ALTER TABLE gauges ADD COLUMN IF NOT EXISTS approved_by_admin_sign TEXT;
ALTER TABLE gauges ADD COLUMN IF NOT EXISTS calibrator_name VARCHAR(255);
ALTER TABLE gauges ADD COLUMN IF NOT EXISTS calibrator_sign TEXT;

-- Add customer_sr_number and manufacture_number to po_line_items table
ALTER TABLE po_line_items ADD COLUMN IF NOT EXISTS customer_sr_number VARCHAR(150);
ALTER TABLE po_line_items ADD COLUMN IF NOT EXISTS manufacture_number VARCHAR(150);
