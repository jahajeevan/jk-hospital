-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  email VARCHAR NOT NULL UNIQUE,
  clerk_id VARCHAR UNIQUE,
  phone VARCHAR,
  password VARCHAR NOT NULL,
  role VARCHAR NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'doctor', 'admin', 'receptionist', 'pharmacist', 'staff')),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  password_changed_at TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  last_login_ip VARCHAR,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  otp_code VARCHAR,
  otp_expires_at TIMESTAMP WITH TIME ZONE,
  reset_otp_code VARCHAR,
  reset_otp_expires_at TIMESTAMP WITH TIME ZONE,
  devices JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS users_role_active_idx ON public.users (role, is_active);
CREATE INDEX IF NOT EXISTS users_deleted_at_idx ON public.users (deleted_at);
CREATE INDEX IF NOT EXISTS users_clerk_id_idx ON public.users (clerk_id);

-- 2. Doctors Table
CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  specialty VARCHAR NOT NULL,
  bio TEXT,
  fee NUMERIC NOT NULL DEFAULT 500,
  avatar VARCHAR,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  unavailable_dates DATE[] DEFAULT '{}'::DATE[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS doctors_specialty_available_idx ON public.doctors (specialty, is_available);
CREATE INDEX IF NOT EXISTS doctors_deleted_at_idx ON public.doctors (deleted_at);

-- 3. Doctor Slots Table
CREATE TABLE IF NOT EXISTS public.doctor_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  label VARCHAR NOT NULL,
  start_time VARCHAR NOT NULL,
  end_time VARCHAR NOT NULL,
  token_limit INTEGER NOT NULL DEFAULT 10,
  fee NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  available_from TIMESTAMP WITH TIME ZONE,
  available_until TIMESTAMP WITH TIME ZONE,
  advance_booking_minutes INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS doctor_slots_doctor_id_idx ON public.doctor_slots (doctor_id);

-- 4. Appointments Table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
  slot_id UUID NOT NULL REFERENCES public.doctor_slots(id) ON DELETE RESTRICT,
  slot_label VARCHAR NOT NULL,
  appointment_date DATE NOT NULL,
  token_number INTEGER NOT NULL,
  queue_position INTEGER NOT NULL,
  estimated_wait_minutes INTEGER NOT NULL DEFAULT 0,
  patient_name VARCHAR,
  patient_age INTEGER,
  patient_gender VARCHAR,
  patient_phone VARCHAR,
  patient_email VARCHAR,
  symptoms TEXT,
  status VARCHAR NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'approved', 'rejected', 'cancelled', 'completed', 'rescheduled')),
  invoice_number VARCHAR,
  cancellation_reason TEXT,
  cancellation_explanation TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS appointments_patient_date_idx ON public.appointments (patient_id, appointment_date DESC);
CREATE INDEX IF NOT EXISTS appointments_doctor_date_status_idx ON public.appointments (doctor_id, appointment_date, status);
CREATE INDEX IF NOT EXISTS appointments_status_created_idx ON public.appointments (status, created_at DESC);

-- Unique index to prevent double booking of slot by same patient on same date
CREATE UNIQUE INDEX IF NOT EXISTS appointments_patient_doctor_date_slot_uniq_idx
  ON public.appointments (patient_id, doctor_id, appointment_date, slot_id)
  WHERE status IN ('pending', 'confirmed', 'approved', 'completed', 'rescheduled') AND deleted_at IS NULL;

-- Unique index to prevent duplicate tokens for a slot on a date
CREATE UNIQUE INDEX IF NOT EXISTS appointments_doctor_date_slot_token_uniq_idx
  ON public.appointments (doctor_id, appointment_date, slot_id, token_number)
  WHERE status IN ('pending', 'confirmed', 'approved', 'completed', 'rescheduled') AND deleted_at IS NULL;

-- 5. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  method VARCHAR NOT NULL DEFAULT 'upi' CHECK (method IN ('upi', 'stripe', 'razorpay')),
  upi_id VARCHAR,
  currency VARCHAR NOT NULL DEFAULT 'INR',
  stripe_session_id VARCHAR,
  stripe_payment_intent_id VARCHAR,
  razorpay_order_id VARCHAR,
  razorpay_payment_id VARCHAR,
  razorpay_payment_method VARCHAR,
  transaction_id VARCHAR NOT NULL UNIQUE,
  status VARCHAR NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'refunded', 'pending')),
  paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  failure_reason TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS payments_patient_created_idx ON public.payments (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_status_created_idx ON public.payments (status, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_stripe_session_idx ON public.payments (stripe_session_id);
CREATE INDEX IF NOT EXISTS payments_razorpay_order_idx ON public.payments (razorpay_order_id);

-- Alter Appointments table to link payment_id back to Payments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL;

-- 6. Refund Requests Table
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  emergency_explanation TEXT,
  proof_url VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS refund_requests_patient_created_idx ON public.refund_requests (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS refund_requests_status_created_idx ON public.refund_requests (status, created_at DESC);

-- 7. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR NOT NULL DEFAULT 'system' CHECK (type IN ('appointment', 'payment', 'refund', 'system')),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS notifications_user_read_created_idx ON public.notifications (user_id, read, created_at DESC);

-- 8. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action VARCHAR NOT NULL,
  resource VARCHAR NOT NULL,
  resource_id VARCHAR,
  request_id VARCHAR,
  ip VARCHAR,
  user_agent VARCHAR,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_created_idx ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx ON public.audit_logs (resource);

-- 9. Refresh Tokens Table
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash VARCHAR NOT NULL UNIQUE,
  family_id VARCHAR NOT NULL,
  device_id VARCHAR,
  user_agent VARCHAR,
  ip VARCHAR,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  replaced_by VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS refresh_tokens_user_idx ON public.refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_family_idx ON public.refresh_tokens (family_id);
