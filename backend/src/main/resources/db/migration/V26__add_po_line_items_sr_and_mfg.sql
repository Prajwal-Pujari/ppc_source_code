-- Add customer_sr_number and manufacture_number to po_line_items table
ALTER TABLE po_line_items ADD COLUMN IF NOT EXISTS customer_sr_number VARCHAR(150);
ALTER TABLE po_line_items ADD COLUMN IF NOT EXISTS manufacture_number VARCHAR(150);
