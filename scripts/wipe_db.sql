-- ======================================================================
-- MES Factory - Database Wipe Script
-- Truncates all transactional & master data while preserving:
--   1. flyway_schema_history (schema migrations)
--   2. factories (default Main Factory)
--   3. admin user (in users table)
-- ======================================================================

DO $$ 
DECLARE 
    stmt text; 
BEGIN 
    SELECT 'TRUNCATE TABLE ' || string_agg(quote_ident(tablename), ', ') || ' CASCADE;' 
    INTO stmt 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename NOT IN ('users', 'factories', 'flyway_schema_history'); 
    
    IF stmt IS NOT NULL THEN 
        EXECUTE stmt; 
    END IF; 
END $$; 

-- Delete all users except 'admin'
DELETE FROM users WHERE username != 'admin';

