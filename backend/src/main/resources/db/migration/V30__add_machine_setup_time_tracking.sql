ALTER TABLE machine_setup_logs ADD COLUMN total_time_seconds integer DEFAULT 0;
ALTER TABLE machine_setup_log_answers ADD COLUMN time_taken_seconds integer DEFAULT 0;
