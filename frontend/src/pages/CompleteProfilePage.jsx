import { motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, BellRing, FileCheck2, Phone, ShieldCheck, UserRound } from 'lucide-react';
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
    <main className="profile-completion-page min-h-[calc(100vh-4rem)] py-10">
      <div className="container-pad grid min-h-[72vh] place-items-center">
        <motion.form
          onSubmit={submit}
          className="profile-completion-card"
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="profile-completion-hero">
            <div className="profile-completion-orb">
              <ShieldCheck size={28} />
            </div>
            <span>Required hospital profile</span>
            <h1>Complete your details</h1>
            <p>
              This profile powers token booking, queue alerts, payment contact, and hospital staff verification.
            </p>
          </div>

          <div className="profile-benefits">
            {[
              [BadgeCheck, 'Verified patient identity'],
              [BellRing, 'Queue and visit alerts'],
              [FileCheck2, 'Invoices and records']
            ].map(([Icon, label]) => (
              <span key={label}><Icon size={15} /> {label}</span>
            ))}
          </div>

          <div className="profile-form-grid">
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

          <button type="submit" disabled={saving} className="profile-submit-button disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? 'Saving profile...' : 'Continue to dashboard'}
            {!saving && <ArrowRight size={18} />}
          </button>
        </motion.form>
      </div>
    </main>
  );
}
