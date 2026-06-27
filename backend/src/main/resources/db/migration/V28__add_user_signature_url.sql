-- Add signature_url to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS signature_url TEXT;
