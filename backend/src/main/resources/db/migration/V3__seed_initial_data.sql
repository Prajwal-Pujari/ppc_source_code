-- =====================================================
-- V3: Seed Initial Data
-- =====================================================

-- 1. Insert the default factory
INSERT INTO factories (id, name, code, timezone, address, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Main Factory',
    'MFG',
    'Asia/Kolkata',
    'Main Factory Address',
    true
);

-- 2. Insert the admin user
-- Password: Admin@123 (bcrypt hash)
INSERT INTO users (id, factory_id, username, password_hash, full_name, role, is_active)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'admin',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'System Administrator',
    'ADMIN',
    true
);
