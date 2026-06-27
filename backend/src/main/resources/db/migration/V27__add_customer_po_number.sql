-- Add customer_po_number to purchase_orders table
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS customer_po_number VARCHAR(100);
