-- Add customer_sr_number and manufacture_number to purchase_orders and gauges tables
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS customer_sr_number VARCHAR(150);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS manufacture_number VARCHAR(150);

ALTER TABLE gauges ADD COLUMN IF NOT EXISTS customer_sr_number VARCHAR(150);
ALTER TABLE gauges ADD COLUMN IF NOT EXISTS manufacture_number VARCHAR(150);
