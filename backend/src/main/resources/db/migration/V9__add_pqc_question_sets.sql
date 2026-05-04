-- V9: PQC Question Sets + Inspection Answers

-- Question Sets: one set per operation type
CREATE TABLE pqc_question_sets (
    id UUID PRIMARY KEY,
    operation_master_id UUID NOT NULL REFERENCES operation_master(id),
    factory_id UUID NOT NULL REFERENCES factories(id),
    name VARCHAR(255) NOT NULL,
    inspection_frequency VARCHAR(50) DEFAULT '1/Hr',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Individual questions within a set
CREATE TABLE pqc_questions (
    id UUID PRIMARY KEY,
    question_set_id UUID NOT NULL REFERENCES pqc_question_sets(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(30) NOT NULL,  -- PASS_FAIL, NUMERIC, TEXT, CHOICE
    expected_answer VARCHAR(255),
    unit VARCHAR(30),
    min_value DECIMAL(10,4),
    max_value DECIMAL(10,4),
    choices JSONB,
    is_critical BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_pqc_qs_operation ON pqc_question_sets(operation_master_id);
CREATE INDEX idx_pqc_q_set ON pqc_questions(question_set_id, sequence_order);

-- Add question_answers column to inspection logs
ALTER TABLE pqc_inspection_logs ADD COLUMN question_answers JSONB;

-- Seed sample question sets (uses the first factory and first few operations)
DO $$
DECLARE
    v_factory_id UUID;
    v_admin_id UUID;
    v_cutting_op_id UUID;
    v_turning_op_id UUID;
    v_milling_op_id UUID;
    v_qs_cutting UUID;
    v_qs_turning UUID;
    v_qs_milling UUID;
BEGIN
    -- Get first factory
    SELECT id INTO v_factory_id FROM factories LIMIT 1;
    SELECT id INTO v_admin_id FROM users WHERE username = 'admin' LIMIT 1;

    -- Get operations
    SELECT id INTO v_cutting_op_id FROM operation_master WHERE operation_code = 'CUT' LIMIT 1;
    SELECT id INTO v_turning_op_id FROM operation_master WHERE operation_code = 'TURN' LIMIT 1;
    SELECT id INTO v_milling_op_id FROM operation_master WHERE operation_code = 'MILL' LIMIT 1;

    -- Only seed if we have the data
    IF v_factory_id IS NOT NULL AND v_cutting_op_id IS NOT NULL THEN
        -- Cutting Question Set
        v_qs_cutting := gen_random_uuid();
        INSERT INTO pqc_question_sets (id, operation_master_id, factory_id, name, inspection_frequency, created_by)
        VALUES (v_qs_cutting, v_cutting_op_id, v_factory_id, 'Cutting Inspection Checklist', '1/Hr', v_admin_id);

        INSERT INTO pqc_questions (id, question_set_id, sequence_order, question_text, question_type, expected_answer, is_critical) VALUES
        (gen_random_uuid(), v_qs_cutting, 1, 'Is the cut length within tolerance?', 'PASS_FAIL', 'PASS', true),
        (gen_random_uuid(), v_qs_cutting, 2, 'Surface finish quality acceptable?', 'PASS_FAIL', 'PASS', true),
        (gen_random_uuid(), v_qs_cutting, 3, 'Any visible burrs on cut edge?', 'PASS_FAIL', 'FAIL', false),
        (gen_random_uuid(), v_qs_cutting, 4, 'Material grade matches specification?', 'PASS_FAIL', 'PASS', true);
    END IF;

    IF v_factory_id IS NOT NULL AND v_turning_op_id IS NOT NULL THEN
        -- Turning Question Set
        v_qs_turning := gen_random_uuid();
        INSERT INTO pqc_question_sets (id, operation_master_id, factory_id, name, inspection_frequency, created_by)
        VALUES (v_qs_turning, v_turning_op_id, v_factory_id, 'Turning Inspection Checklist', '1/Hr', v_admin_id);

        INSERT INTO pqc_questions (id, question_set_id, sequence_order, question_text, question_type, expected_answer, unit, min_value, max_value, is_critical) VALUES
        (gen_random_uuid(), v_qs_turning, 1, 'Outer diameter within tolerance?', 'NUMERIC', NULL, 'mm', 24.9900, 25.0100, true),
        (gen_random_uuid(), v_qs_turning, 2, 'Surface roughness (Ra) acceptable?', 'NUMERIC', NULL, 'Ra', 0.0000, 1.6000, true),
        (gen_random_uuid(), v_qs_turning, 3, 'Concentricity check passed?', 'PASS_FAIL', 'PASS', NULL, NULL, NULL, true),
        (gen_random_uuid(), v_qs_turning, 4, 'Tool marks visible?', 'CHOICE', NULL, NULL, NULL, NULL, false);

        -- Add choices for the CHOICE type question
        UPDATE pqc_questions SET choices = '["None","Minor - Acceptable","Moderate - Needs Rework","Severe - Scrap"]'::jsonb
        WHERE question_set_id = v_qs_turning AND sequence_order = 4;
    END IF;

    IF v_factory_id IS NOT NULL AND v_milling_op_id IS NOT NULL THEN
        -- Milling Question Set
        v_qs_milling := gen_random_uuid();
        INSERT INTO pqc_question_sets (id, operation_master_id, factory_id, name, inspection_frequency, created_by)
        VALUES (v_qs_milling, v_milling_op_id, v_factory_id, 'Milling Inspection Checklist', '2/Hr', v_admin_id);

        INSERT INTO pqc_questions (id, question_set_id, sequence_order, question_text, question_type, expected_answer, is_critical) VALUES
        (gen_random_uuid(), v_qs_milling, 1, 'Slot width within specification?', 'PASS_FAIL', 'PASS', true),
        (gen_random_uuid(), v_qs_milling, 2, 'Depth of cut matches drawing?', 'PASS_FAIL', 'PASS', true),
        (gen_random_uuid(), v_qs_milling, 3, 'Any chatter marks on surface?', 'PASS_FAIL', 'FAIL', false);
    END IF;
END $$;
