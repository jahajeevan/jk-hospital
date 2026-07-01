-- Additive columns to reconcile the clinical/pharmacy services with the live
-- schema. All nullable/defaulted and idempotent (ADD COLUMN IF NOT EXISTS), so
-- safe to run against production without touching existing rows.
--
-- Context: several services were written against columns that never existed.
-- Where the concept was genuinely missing (bill status, soft-delete of a
-- medical record, the dispensed medicine name on a bill line), we add the
-- column here; where it was only a NAME mismatch (rate->unit_price,
-- amount->total, document_url->file_path, prescription_medicines soft-delete),
-- the service code was aligned to the existing columns instead.

-- Pharmacy bills: status is distinct from payment_method (cash/card), and the
-- service/controller manage it (createBill, updateBillStatus, status filters).
ALTER TABLE public.pharmacy_bills ADD COLUMN IF NOT EXISTS payment_status VARCHAR NOT NULL DEFAULT 'pending';
ALTER TABLE public.pharmacy_bills ADD COLUMN IF NOT EXISTS notes TEXT;

-- Pharmacy bill line items: keep the dispensed medicine name on the bill so it
-- survives even if the inventory row is later edited/deleted (invoices freeze
-- their description). inventory_id remains the FK when known.
ALTER TABLE public.pharmacy_bill_items ADD COLUMN IF NOT EXISTS medicine_name VARCHAR;

-- Medical records: PHI should be soft-deleted, matching prescriptions (which
-- already have deleted_at) and the service's existing filters/delete path.
ALTER TABLE public.medical_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
