ALTER TABLE po_line_item_operations ADD COLUMN machine_master_id UUID REFERENCES machine_master(id);
ALTER TABLE po_line_item_operations ADD COLUMN cycle_time_mins NUMERIC(10, 2);
