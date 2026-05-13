ALTER TABLE pqc_question_sets ADD COLUMN gauge_master_id UUID REFERENCES gauge_master(id);
