CREATE TABLE system_audit_question_sets (
    id UUID PRIMARY KEY,
    factory_id UUID NOT NULL REFERENCES factories(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    reference_standard VARCHAR(255),
    department_scoping VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE system_audit_questions (
    id UUID PRIMARY KEY,
    question_set_id UUID NOT NULL REFERENCES system_audit_question_sets(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    requirement_clause VARCHAR(255),
    sequence_order INTEGER NOT NULL,
    is_critical BOOLEAN DEFAULT false
);

CREATE TABLE supplier_audit_question_sets (
    id UUID PRIMARY KEY,
    factory_id UUID NOT NULL REFERENCES factories(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    supplier_category VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE supplier_audit_questions (
    id UUID PRIMARY KEY,
    question_set_id UUID NOT NULL REFERENCES supplier_audit_question_sets(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    category VARCHAR(255),
    sequence_order INTEGER NOT NULL,
    is_critical BOOLEAN DEFAULT false
);
