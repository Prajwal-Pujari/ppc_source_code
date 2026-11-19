-- V42: Dedicated Question Sets for First Piece and Last Piece Inspection
-- Independent from the regular in-process question sets

CREATE TABLE IF NOT EXISTS piece_question_sets (
    id UUID PRIMARY KEY,
    piece_type VARCHAR(30) NOT NULL, -- 'FIRST_PIECE', 'LAST_PIECE', 'BOTH'
    operation_master_id UUID NOT NULL REFERENCES operation_master(id),
    gauge_master_id UUID REFERENCES gauge_master(id),
    factory_id UUID NOT NULL REFERENCES factories(id),
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS piece_questions (
    id UUID PRIMARY KEY,
    piece_question_set_id UUID NOT NULL REFERENCES piece_question_sets(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(30) NOT NULL,  -- PASS_FAIL, NUMERIC, TEXT, CHOICE
    expected_answer VARCHAR(255),
    unit VARCHAR(30),
    min_value DECIMAL(10,4),
    max_value DECIMAL(10,4),
    choices JSONB,
    is_critical BOOLEAN DEFAULT false,
    checking_method VARCHAR(100),
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_piece_qs_op_type ON piece_question_sets(operation_master_id, piece_type);
CREATE INDEX IF NOT EXISTS idx_piece_qs_factory ON piece_question_sets(factory_id);
CREATE INDEX IF NOT EXISTS idx_piece_q_set_seq ON piece_questions(piece_question_set_id, sequence_order);

-- Seed default piece checklists for factory operations (CUT, TURN, MILL)
DO $$
DECLARE
    v_factory_id UUID;
    v_admin_id UUID;
    v_cutting_op_id UUID;
    v_turning_op_id UUID;
    v_milling_op_id UUID;
    v_qs_turn_fp UUID;
    v_qs_turn_lp UUID;
    v_qs_mill_fp UUID;
BEGIN
    SELECT id INTO v_factory_id FROM factories LIMIT 1;
    SELECT id INTO v_admin_id FROM users WHERE username = 'admin' LIMIT 1;

    SELECT id INTO v_turning_op_id FROM operation_master WHERE operation_code = 'TURN' LIMIT 1;
    SELECT id INTO v_milling_op_id FROM operation_master WHERE operation_code = 'MILL' LIMIT 1;

    -- Turning: 1st Piece Checklist
    IF v_factory_id IS NOT NULL AND v_turning_op_id IS NOT NULL THEN
        v_qs_turn_fp := gen_random_uuid();
        INSERT INTO piece_question_sets (id, piece_type, operation_master_id, factory_id, name, created_by)
        VALUES (v_qs_turn_fp, 'FIRST_PIECE', v_turning_op_id, v_factory_id, 'Turning 1st Piece Setup Verification', v_admin_id);

        INSERT INTO piece_questions (id, piece_question_set_id, sequence_order, question_text, question_type, expected_answer, unit, min_value, max_value, checking_method, is_critical) VALUES
        (gen_random_uuid(), v_qs_turn_fp, 1, 'Initial outer diameter verification', 'NUMERIC', NULL, 'mm', 24.9900, 25.0100, 'Vernier Caliper / Micrometer', true),
        (gen_random_uuid(), v_qs_turn_fp, 2, 'Chuck clamping pressure & concentricity', 'PASS_FAIL', 'PASS', NULL, NULL, NULL, 'Dial Indicator', true),
        (gen_random_uuid(), v_qs_turn_fp, 3, 'Tool nose radius and insert condition', 'PASS_FAIL', 'PASS', NULL, NULL, NULL, 'Visual / Eyepiece', true),
        (gen_random_uuid(), v_qs_turn_fp, 4, 'Surface finish (Ra) of first unit', 'NUMERIC', NULL, 'Ra', 0.0000, 1.6000, 'Surface Roughness Tester', false);

        -- Turning: Last Piece Checklist
        v_qs_turn_lp := gen_random_uuid();
        INSERT INTO piece_question_sets (id, piece_type, operation_master_id, factory_id, name, created_by)
        VALUES (v_qs_turn_lp, 'LAST_PIECE', v_turning_op_id, v_factory_id, 'Turning Last Piece End-of-Shift Verification', v_admin_id);

        INSERT INTO piece_questions (id, piece_question_set_id, sequence_order, question_text, question_type, expected_answer, unit, min_value, max_value, checking_method, is_critical) VALUES
        (gen_random_uuid(), v_qs_turn_lp, 1, 'Final outer diameter verification', 'NUMERIC', NULL, 'mm', 24.9900, 25.0100, 'Micrometer', true),
        (gen_random_uuid(), v_qs_turn_lp, 2, 'Insert wear / chipping inspection', 'PASS_FAIL', 'PASS', NULL, NULL, NULL, 'Visual Inspection', true),
        (gen_random_uuid(), v_qs_turn_lp, 3, 'End of shift thermal drift / dimensional stability', 'PASS_FAIL', 'PASS', NULL, NULL, NULL, 'Caliper / Gauge', true);
    END IF;

    -- Milling: 1st Piece Checklist
    IF v_factory_id IS NOT NULL AND v_milling_op_id IS NOT NULL THEN
        v_qs_mill_fp := gen_random_uuid();
        INSERT INTO piece_question_sets (id, piece_type, operation_master_id, factory_id, name, created_by)
        VALUES (v_qs_mill_fp, 'FIRST_PIECE', v_milling_op_id, v_factory_id, 'Milling 1st Piece Setup Verification', v_admin_id);

        INSERT INTO piece_questions (id, piece_question_set_id, sequence_order, question_text, question_type, expected_answer, unit, min_value, max_value, checking_method, is_critical) VALUES
        (gen_random_uuid(), v_qs_mill_fp, 1, 'Slot width of first piece', 'NUMERIC', NULL, 'mm', 11.9800, 12.0200, 'Depth Micrometer', true),
        (gen_random_uuid(), v_qs_mill_fp, 2, 'Fixture alignment and clamp torque', 'PASS_FAIL', 'PASS', NULL, NULL, NULL, 'Torque Wrench', true),
        (gen_random_uuid(), v_qs_mill_fp, 3, 'Burr check on milled edges', 'PASS_FAIL', 'PASS', NULL, NULL, NULL, 'Visual / Tactile', false);
    END IF;
END $$;

