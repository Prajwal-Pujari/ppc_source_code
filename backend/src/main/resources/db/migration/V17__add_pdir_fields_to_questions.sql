ALTER TABLE pqc_questions ADD COLUMN checking_method VARCHAR(100);
ALTER TABLE pqc_questions ADD COLUMN show_in_pdir BOOLEAN DEFAULT true;
