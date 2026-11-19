-- V43: Update LPA Default Frequency to Numbers (Days) instead of Daily/Weekly/Monthly

-- 1. Update existing lpa_question_sets default_frequency from text names to number of days
UPDATE lpa_question_sets 
SET default_frequency = '1' 
WHERE default_frequency IS NULL 
   OR UPPER(default_frequency) = 'DAILY' 
   OR UPPER(default_frequency) = 'SHIFT_WISE';

UPDATE lpa_question_sets 
SET default_frequency = '7' 
WHERE UPPER(default_frequency) = 'WEEKLY';

UPDATE lpa_question_sets 
SET default_frequency = '30' 
WHERE UPPER(default_frequency) = 'MONTHLY';

UPDATE lpa_question_sets 
SET default_frequency = '90' 
WHERE UPPER(default_frequency) = 'QUARTERLY';

UPDATE lpa_question_sets 
SET default_frequency = '365' 
WHERE UPPER(default_frequency) = 'YEARLY';

-- Set default value of default_frequency column to '1'
ALTER TABLE lpa_question_sets ALTER COLUMN default_frequency SET DEFAULT '1';

-- 2. Update existing lpa_schedules frequency from text names to number of days
UPDATE lpa_schedules 
SET frequency = '1' 
WHERE frequency IS NULL 
   OR UPPER(frequency) = 'DAILY' 
   OR UPPER(frequency) = 'SHIFT_WISE';

UPDATE lpa_schedules 
SET frequency = '7' 
WHERE UPPER(frequency) = 'WEEKLY';

UPDATE lpa_schedules 
SET frequency = '30' 
WHERE UPPER(frequency) = 'MONTHLY';

UPDATE lpa_schedules 
SET frequency = '90' 
WHERE UPPER(frequency) = 'QUARTERLY';

UPDATE lpa_schedules 
SET frequency = '365' 
WHERE UPPER(frequency) = 'YEARLY';

-- Set default value of frequency column to '1'
ALTER TABLE lpa_schedules ALTER COLUMN frequency SET DEFAULT '1';

