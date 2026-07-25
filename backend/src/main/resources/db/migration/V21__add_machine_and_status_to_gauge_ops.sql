ALTER TABLE gauge_operations ADD COLUMN machine_master_id UUID REFERENCES machine_master(id);
ALTER TABLE gauge_operations ADD COLUMN cycle_time_mins NUMERIC(10,2);
ALTER TABLE machine_master ADD COLUMN current_status VARCHAR(30) DEFAULT 'AVAILABLE';
