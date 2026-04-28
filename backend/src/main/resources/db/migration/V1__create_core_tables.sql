-- =====================================================
-- V1: Core PostgreSQL Schema for MES Factory
-- =====================================================

-- 1. Factories
CREATE TABLE factories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    timezone VARCHAR(100) DEFAULT 'Asia/Kolkata',
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true
);

-- 2. Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factory_id UUID REFERENCES factories(id),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    employee_code VARCHAR(50),
    email VARCHAR(255),
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN','SUPERVISOR','WORKER','QUALITY_INSPECTOR','VIEWER')),
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Customers
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factory_id UUID REFERENCES factories(id),
    name VARCHAR(255) NOT NULL,
    gst_number VARCHAR(50),
    address TEXT,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true
);
ALTER TABLE customers ADD CONSTRAINT uq_customers_factory_name UNIQUE (factory_id, name);

-- 4. Operation Master
CREATE TABLE operation_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factory_id UUID REFERENCES factories(id),
    operation_name VARCHAR(255) NOT NULL,
    operation_code VARCHAR(50) NOT NULL,
    department VARCHAR(100),
    standard_time_hours DECIMAL(6,2),
    skill_level VARCHAR(50),
    instructions TEXT,
    is_outsourced BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true
);
ALTER TABLE operation_master ADD CONSTRAINT uq_operation_master_factory_code UNIQUE (factory_id, operation_code);

-- 5. Gauge Master
CREATE TABLE gauge_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factory_id UUID REFERENCES factories(id),
    gauge_type_name VARCHAR(255) NOT NULL,
    category_code VARCHAR(50),
    default_material_grade VARCHAR(100),
    unit_of_measurement VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true
);

-- 6. Gauge Master Operations (default operation sequence)
CREATE TABLE gauge_master_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gauge_master_id UUID REFERENCES gauge_master(id) ON DELETE CASCADE,
    operation_master_id UUID REFERENCES operation_master(id),
    sequence_order INTEGER NOT NULL,
    is_mandatory BOOLEAN DEFAULT true
);
ALTER TABLE gauge_master_operations ADD CONSTRAINT uq_gauge_master_ops_seq UNIQUE (gauge_master_id, sequence_order);

-- 7. Purchase Orders
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factory_id UUID REFERENCES factories(id),
    po_number VARCHAR(100) NOT NULL,
    customer_id UUID REFERENCES customers(id),
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    priority VARCHAR(20) DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL','HIGH','URGENT')),
    status VARCHAR(30) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED')),
    special_instructions TEXT,
    document_path VARCHAR(500),
    total_gauges INTEGER DEFAULT 0,
    completed_gauges INTEGER DEFAULT 0,
    rejected_gauges INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    confirmed_by UUID REFERENCES users(id),
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE purchase_orders ADD CONSTRAINT uq_po_factory_number UNIQUE (factory_id, po_number);

-- 8. PO Line Items
CREATE TABLE po_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    gauge_master_id UUID REFERENCES gauge_master(id),
    nominal_size DECIMAL(10,4) NOT NULL,
    size_unit VARCHAR(20) DEFAULT 'mm',
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    material_grade_override VARCHAR(100),
    line_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. PO Line Item Operations (custom operation sequence per line item)
CREATE TABLE po_line_item_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_line_item_id UUID REFERENCES po_line_items(id) ON DELETE CASCADE,
    operation_master_id UUID REFERENCES operation_master(id),
    sequence_order INTEGER NOT NULL,
    is_mandatory BOOLEAN DEFAULT true
);

-- 10. Gauges (individual job cards)
CREATE TABLE gauges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factory_id UUID REFERENCES factories(id),
    serial_number VARCHAR(150) UNIQUE NOT NULL,
    purchase_order_id UUID REFERENCES purchase_orders(id),
    po_line_item_id UUID REFERENCES po_line_items(id),
    gauge_master_id UUID REFERENCES gauge_master(id),
    gauge_type_name VARCHAR(255) NOT NULL,
    nominal_size DECIMAL(10,4) NOT NULL,
    size_unit VARCHAR(20) DEFAULT 'mm',
    material_grade VARCHAR(100),
    status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('PENDING','IN_PRODUCTION','ON_HOLD','COMPLETED','REJECTED')),
    current_operation_id UUID,
    rejection_count INTEGER DEFAULT 0,
    qr_code_path VARCHAR(500),
    history_card_path VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Gauge Operations
CREATE TABLE gauge_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gauge_id UUID REFERENCES gauges(id) ON DELETE CASCADE,
    operation_master_id UUID REFERENCES operation_master(id),
    operation_name VARCHAR(255) NOT NULL,
    sequence_order INTEGER NOT NULL,
    status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('PENDING','QUEUED','IN_PROGRESS','COMPLETED','SKIPPED','REWORK')),
    assigned_to UUID REFERENCES users(id),
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ,
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    remarks TEXT,
    quality_params JSONB,
    rework_of UUID REFERENCES gauge_operations(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12. NC Records
CREATE TABLE nc_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gauge_id UUID REFERENCES gauges(id),
    gauge_operation_id UUID REFERENCES gauge_operations(id),
    rejection_category VARCHAR(100) NOT NULL CHECK (rejection_category IN ('DIMENSIONAL_ERROR','SURFACE_DEFECT','MATERIAL_DEFECT','OPERATOR_ERROR','MACHINE_ISSUE','TOOLING_WEAR','OTHER')),
    rejection_reason TEXT NOT NULL,
    action_taken VARCHAR(30) NOT NULL CHECK (action_taken IN ('REWORK','SCRAP','ACCEPT_WITH_DEVIATION')),
    deviation_note TEXT,
    initiated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Activity Logs
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factory_id UUID REFERENCES factories(id),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    performed_by UUID REFERENCES users(id),
    performed_at TIMESTAMPTZ DEFAULT now(),
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- 14. PO Comments
CREATE TABLE po_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID REFERENCES purchase_orders(id),
    comment TEXT NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- Indexes
-- =====================================================
CREATE INDEX idx_gauges_po_id ON gauges(purchase_order_id);
CREATE INDEX idx_gauges_status ON gauges(status);
CREATE INDEX idx_gauge_operations_gauge_id ON gauge_operations(gauge_id);
CREATE INDEX idx_gauge_operations_assigned_to ON gauge_operations(assigned_to);
CREATE INDEX idx_gauge_operations_status ON gauge_operations(status);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_performed_by ON activity_logs(performed_by);
CREATE INDEX idx_activity_logs_performed_at ON activity_logs(performed_at);
