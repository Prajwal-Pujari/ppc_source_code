ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_password VARCHAR(255);

-- Set default initial passwords for existing accounts
UPDATE users SET assigned_password = 'Test@123' WHERE assigned_password IS NULL;
UPDATE users SET assigned_password = 'Admin@123' WHERE username = 'admin';
