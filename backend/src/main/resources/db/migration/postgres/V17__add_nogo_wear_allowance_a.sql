ALTER TABLE po_line_items
    ADD COLUMN IF NOT EXISTS nogo_wear_allowance_a NUMERIC(10, 4);
