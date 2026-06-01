import { motion } from 'framer-motion';
import { ArrowRight, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { cleanIndianMobile, isValidIndianMobile } from '../utils/validation.js';

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const { clerkUser, user, needsProfileCompletion } = useAuth();
  const existingProfile = clerkUser?.unsafeMetadata?.hospitalProfile || {};
  const [form, setForm] = useState({
    firstName: existingProfile.firstName || clerkUser?.firstName || '',
    lastName: existingProfile.lastName || clerkUser?.lastName || '',
    phone: existingProfile.phone || user?.phone || ''
  });
  const [saving, setSaving] = useState(false);

  const fullName = useMemo(() => [form.firstName, form.lastName].filter(Boolean).join(' ').trim(), [form.firstName, form.lastName]);

  useEffect(() => {
    if (user && !needsProfileCompletion) navigate('/dashboard', { replace: true });
  }, [user, needsProfileCompletion, navigate]);

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === 'phone' ? cleanIndianMobile(value) : value
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.firstName.trim()) return toast.error('First name is required');
    if (!isValidIndianMobile(form.phone)) return toast.error('Enter a valid 10-digit Indian mobile number');
    setSaving(true);
    try {
      await clerkUser.update({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        unsafeMetadata: {
          ...(clerkUser.unsafeMetadata || {}),
          hospitalProfile: {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            fullName,
            phone: form.phone
          }
        }
      });
      await clerkUser.reload();
      toast.success('Profile completed');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast.error(error.errors?.[0]?.message || error.message || 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="hospital-bg min-h-[calc(100vh-4rem)] py-12">
      <div className="container-pad grid min-h-[70vh] place-items-center">
        <motion.form
          onSubmit={submit}
          className="glass w-full max-w-xl rounded-2xl p-7 shadow-[0_30px_90px_rgba(8,47,73,0.12)]"
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-medical-600 to-emerald-500 text-white shadow-soft">
              <ShieldCheck size={24} />
            </span>
            <div>
              <p className="font-semibold text-medical-600">Required hospital profile</p>
              <h1 className="mt-1 text-3xl font-bold text-ink">Complete your details</h1>
              <p className="mt-2 text-sm text-slate-600">
                This is required for appointment tokens, payment contact, queue updates, and hospital staff verification.
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <label className="auth-field">
              <span className="inline-flex items-center gap-2"><UserRound size={15} /> First name</span>
              <input className="field" name="firstName" value={form.firstName} onChange={update} required placeholder="First name" />
            </label>
            <label className="auth-field">
              <span>Last name</span>
              <input className="field" name="lastName" value={form.lastName} onChange={update} placeholder="Last name" />
            </label>
            <label className="auth-field sm:col-span-2">
              <span className="inline-flex items-center gap-2"><Phone size={15} /> Mobile number</span>
              <input
                className="field"
                name="phone"
                inputMode="numeric"
                maxLength={10}
                value={form.phone}
                onChange={update}
                required
                placeholder="10-digit mobile number"
              />
            </label>
          </div>

          <button type="submit" disabled={saving} className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? 'Saving profile...' : 'Continue to dashboard'}
            {!saving && <ArrowRight size={18} />}
          </button>
        </motion.form>
      </div>
    </main>
  );
}
