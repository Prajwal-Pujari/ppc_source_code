ALTER TABLE report_configuration ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE report_configuration ADD COLUMN IF NOT EXISTS company_address TEXT;

UPDATE report_configuration 
SET company_name = '',
    company_address = ''
WHERE id = 'default-config';
