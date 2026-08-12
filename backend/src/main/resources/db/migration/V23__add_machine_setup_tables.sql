ALTER TABLE gauge_master_operations ADD COLUMN setup_time_mins numeric(10,2) DEFAULT 0;

ALTER TABLE po_line_item_operations ADD COLUMN setup_time_mins numeric(10,2) DEFAULT 0;
ALTER TABLE po_line_item_operations ADD COLUMN setup_status varchar(30) DEFAULT 'PENDING';
ALTER TABLE po_line_item_operations ADD COLUMN setup_completed_at timestamp with time zone;
ALTER TABLE po_line_item_operations ADD COLUMN setup_completed_by uuid REFERENCES users(id);

CREATE TABLE machine_setup_question_sets (
    id UUID PRIMARY KEY,
    machine_master_id UUID NOT NULL REFERENCES machine_master(id),
    operation_master_id UUID NOT NULL REFERENCES operation_master(id),
    gauge_master_id UUID REFERENCES gauge_master(id),
    factory_id UUID NOT NULL REFERENCES factories(id),
    name varchar(255) NOT NULL,
    is_active boolean DEFAULT true,
    created_by uuid REFERENCES users(id),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE machine_setup_questions (
    id uuid NOT NULL PRIMARY KEY,
    question_set_id uuid NOT NULL REFERENCES machine_setup_question_sets(id),
    sequence_order int NOT NULL,
    question_text text NOT NULL,
    question_type varchar(30) NOT NULL,
    expected_answer varchar(255),
    unit varchar(30),
    min_value numeric,
    max_value numeric,
    choices jsonb,
    is_critical boolean DEFAULT false,
    checking_method varchar(255)
);

CREATE TABLE machine_setup_logs (
    id uuid NOT NULL PRIMARY KEY,
    factory_id uuid NOT NULL REFERENCES factories(id),
    po_line_item_operation_id uuid NOT NULL REFERENCES po_line_item_operations(id),
    machine_setup_question_set_id uuid NOT NULL REFERENCES machine_setup_question_sets(id),
    worker_id uuid NOT NULL REFERENCES users(id),
    log_time timestamp with time zone NOT NULL,
    remarks text,
    is_passed boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE machine_setup_log_answers (
    id uuid NOT NULL PRIMARY KEY,
    machine_setup_log_id uuid NOT NULL REFERENCES machine_setup_logs(id),
    question_id uuid NOT NULL REFERENCES machine_setup_questions(id),
    answer_value text,
    is_compliant boolean
);
