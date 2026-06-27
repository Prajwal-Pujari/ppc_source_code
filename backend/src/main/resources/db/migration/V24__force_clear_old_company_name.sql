UPDATE report_configuration 
SET company_name = '', 
    company_address = '' 
WHERE company_name ILIKE '%Precision Gauge%';
