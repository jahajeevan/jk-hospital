-- Clinical & pharmacy tables, brought under version control.
--
-- These tables were created ad hoc in the Supabase dashboard, so they existed
-- in production with no schema-as-code. This file documents them EXACTLY as
-- they exist in the live "Hospital Token System" project (verified against
-- information_schema on 2026-07-01), so a fresh environment matches prod.
--
-- CREATE TABLE IF NOT EXISTS is intentional: a no-op where the table already
-- exists (production) and a create where it does not (fresh clone / CI). It
-- will NOT alter columns on an existing table.
--
-- DRIFT RESOLVED 2026-07-01:
--   * pharmacy_inventory: service aligned to these columns.
--   * pharmacy_bills: added payment_status + notes (see
--     2026-07-01_clinical_columns_alignment.sql) — reflected below.
--   * pharmacy_bill_items: added medicine_name; service maps rate->unit_price,
--     amount->total — reflected below.
--   * medical_records: added deleted_at — reflected below.
--   * medical_documents: service maps document_url->file_path (+file_name).
--   * prescription_medicines: service now hard-deletes on list replace.

-- 1. Medical records
CREATE TABLE IF NOT EXISTS public.medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  prescription_id UUID,
  type VARCHAR,
  title VARCHAR NOT NULL,
  source_text TEXT,
  ai_summary TEXT,
  pdf_url VARCHAR,
  pdf_ready BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS medical_records_patient_created_idx ON public.medical_records (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS medical_records_appointment_idx ON public.medical_records (appointment_id);

-- 2. Medical documents (files attached to a record)
CREATE TABLE IF NOT EXISTS public.medical_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id UUID NOT NULL REFERENCES public.medical_records(id) ON DELETE CASCADE,
  file_name VARCHAR NOT NULL,
  file_path VARCHAR,
  file_type VARCHAR,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS medical_documents_record_idx ON public.medical_documents (medical_record_id);

-- 3. Prescriptions
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  symptoms TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS prescriptions_appointment_idx ON public.prescriptions (appointment_id);
CREATE INDEX IF NOT EXISTS prescriptions_patient_created_idx ON public.prescriptions (patient_id, created_at DESC);

-- 4. Prescription medicines (dosage columns are free-text, e.g. "1", "1/2")
CREATE TABLE IF NOT EXISTS public.prescription_medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  medicine_name VARCHAR NOT NULL,
  morning VARCHAR,
  afternoon VARCHAR,
  night VARCHAR,
  days INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prescription_medicines_prescription_idx ON public.prescription_medicines (prescription_id);

-- 5. Pharmacy bills
CREATE TABLE IF NOT EXISTS public.pharmacy_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number VARCHAR NOT NULL UNIQUE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pharmacist_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payment_method VARCHAR,
  payment_status VARCHAR NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pharmacy_bills_appointment_idx ON public.pharmacy_bills (appointment_id);
CREATE INDEX IF NOT EXISTS pharmacy_bills_patient_created_idx ON public.pharmacy_bills (patient_id, created_at DESC);

-- 6. Pharmacy bill line items
CREATE TABLE IF NOT EXISTS public.pharmacy_bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.pharmacy_bills(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.pharmacy_inventory(id) ON DELETE SET NULL,
  medicine_name VARCHAR,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pharmacy_bill_items_bill_idx ON public.pharmacy_bill_items (bill_id);

-- 7. Pharmacy inventory (stock managed by pharmacist/admin)
CREATE TABLE IF NOT EXISTS public.pharmacy_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  batch_number VARCHAR,
  expiry_date DATE,
  purchase_price NUMERIC,
  selling_price NUMERIC,
  current_stock INTEGER DEFAULT 0,
  minimum_stock_level INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pharmacy_inventory_name_idx ON public.pharmacy_inventory (name);

-- RLS is already enabled on these tables in production. Enabling again is
-- idempotent and ensures fresh environments get the same defense-in-depth
-- posture (service-role backend bypasses RLS; anon/authenticated get nothing
-- without explicit policies).
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_inventory ENABLE ROW LEVEL SECURITY;
