-- Defense-in-depth: enable Row Level Security on every table.
--
-- This backend (backend/src/config/supabase.js) always connects with the
-- Supabase *service role* key, which bypasses RLS by design (BYPASSRLS).
-- The frontend never talks to Supabase directly — every authorization
-- decision is made by Express middleware (see backend/src/config/permissions.js).
--
-- So enabling RLS here does not change how the app behaves today. What it
-- does is remove the single point of failure: if the anon/publishable key
-- ever leaked, a future feature added a direct client-to-Supabase call, or an
-- Express permission check was missed, RLS becomes the last line of defense.
-- With RLS ON and no policies for `anon`/`authenticated`, those roles get
-- zero access by default — only `service_role` (used exclusively by the
-- backend) can read or write.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Doctor listings and slot availability are meant to be publicly browsable
-- (patients see doctors/slots before logging in), so allow anonymous SELECT
-- on those two tables only. Everything else (including writes to
-- doctors/doctor_slots) stays service-role-only.
CREATE POLICY doctors_public_read ON public.doctors
  FOR SELECT TO anon, authenticated USING (deleted_at IS NULL);

CREATE POLICY doctor_slots_public_read ON public.doctor_slots
  FOR SELECT TO anon, authenticated USING (true);

-- The remaining tables (users, appointments, payments, refund_requests,
-- notifications, audit_logs, refresh_tokens) hold PHI, financial data, or
-- session secrets and get no anon/authenticated policies at all — RLS with
-- no matching policy denies access by default for those roles.

-- Clinical tables created ad hoc outside version control (see
-- docs follow-up: bring these into a tracked migration with full column
-- definitions). Enable RLS on them too if they already exist, without
-- failing this migration if they don't.
DO $$
DECLARE
  clinical_table text;
BEGIN
  FOREACH clinical_table IN ARRAY ARRAY[
    'medical_records', 'medical_documents',
    'prescriptions', 'prescription_medicines',
    'pharmacy_bills', 'pharmacy_bill_items', 'pharmacy_inventory'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = clinical_table
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', clinical_table);
    END IF;
  END LOOP;
END $$;
