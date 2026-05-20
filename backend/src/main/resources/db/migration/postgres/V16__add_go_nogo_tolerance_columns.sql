ALTER TABLE po_line_items
    ADD COLUMN IF NOT EXISTS go_tol_plus NUMERIC(10, 4),
    ADD COLUMN IF NOT EXISTS go_tol_minus NUMERIC(10, 4),
    ADD COLUMN IF NOT EXISTS nogo_tol_plus NUMERIC(10, 4),
    ADD COLUMN IF NOT EXISTS nogo_tol_minus NUMERIC(10, 4);
