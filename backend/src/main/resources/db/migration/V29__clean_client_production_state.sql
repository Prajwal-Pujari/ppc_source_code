-- =====================================================
-- V29: Clean Production/Client Setup State
-- Ensures only admin user exists with new password hash,
-- and all dummy/test transactional records are wiped out while preserving IS 3455 master standards.
-- =====================================================

-- 1. Truncate all transactional/dummy shop floor tables created by test seeds
TRUNCATE TABLE activity_logs, calibration_observations, po_comments, po_line_item_operations, po_line_items, purchase_orders, nc_records, gauge_operations, gauges, customers CASCADE;

-- 2. Remove all non-admin users seeded in earlier migrations
DELETE FROM users WHERE username != 'admin';

-- 3. Ensure admin user has the exact required production password hash
UPDATE users 
SET password_hash = '$2a$12$enamBPhkTUxhiJuQOAANQOU.rpH6AuT8OT6rnklSZzXw.YHzpCsgq' 
WHERE username = 'admin';
