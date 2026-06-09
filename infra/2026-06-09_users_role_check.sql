-- Run once on existing Supabase projects where the original users.role CHECK
-- was created before receptionist/pharmacist staff roles were added.

ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
ADD CONSTRAINT users_role_check
CHECK (role IN ('patient', 'doctor', 'admin', 'receptionist', 'pharmacist', 'staff'));
