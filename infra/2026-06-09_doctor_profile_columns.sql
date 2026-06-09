-- Run this once in the Supabase SQL editor for an existing live database.
-- New databases already receive these columns from infra/supabase_schema.sql.

ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS department VARCHAR,
  ADD COLUMN IF NOT EXISTS specialization VARCHAR,
  ADD COLUMN IF NOT EXISTS qualification VARCHAR,
  ADD COLUMN IF NOT EXISTS experience VARCHAR;

UPDATE public.doctors
SET
  department = COALESCE(NULLIF(department, ''), specialty),
  specialization = COALESCE(NULLIF(specialization, ''), specialty),
  qualification = COALESCE(NULLIF(qualification, ''), 'MBBS, MD'),
  experience = COALESCE(NULLIF(experience, ''), '')
WHERE deleted_at IS NULL;
