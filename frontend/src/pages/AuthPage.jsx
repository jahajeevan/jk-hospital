import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Info,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  MailCheck,
  ShieldCheck,
  Sparkles,
  UserPlus
} from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { findUser, initUserStore, updateUserPassword } from '../utils/userStore.js';

const perks = [
  { icon: MailCheck, title: 'Email OTP', desc: 'Verified signup in 3 steps' },
  { icon: ShieldCheck, title: 'Encrypted records', desc: 'Secure on your device' },
  { icon: Sparkles, title: 'Live tokens', desc: 'Slot fee · Razorpay pay' }
];

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const navigate = useNavigate();
  const { login, signup, loading } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [signupStep, setSignupStep] = useState('email');
  const [otp, setOtp] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState('email');
  const [resetOtp, setResetOtp] = useState('');
  const [resetForm, setResetForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [authNotice, setAuthNotice] = useState('');

  useEffect(() => {
    void initUserStore();
  }, []);

  const update = (event) => {
    setAuthNotice('');
    setForm((value) => ({ ...value, [event.target.name]: event.target.value }));
  };
  const normalizeEmail = (email = '') => email.trim().toLowerCase();
  const demoHint = 'No patient account exists for this email yet. Create an account first, or try patient@jkhospital.local with Patient@12345.';

  const requestOtp = async (email, purpose) => {
    await api.post('/local-mail/request-otp', { email: normalizeEmail(email), purpose });
  };

  const verifyOtp = async (email, code, purpose) => {
    await api.post('/local-mail/verify-otp', { email: normalizeEmail(email), otp: code, purpose });
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      if (isSignup) {
        if (signupStep === 'email') {
          const email = normalizeEmail(form.email);
          if (await findUser(email)) {
            toast.error('Email already registered');
            return;
          }
          await requestOtp(email, 'signup verification');
          setForm((value) => ({ ...value, email }));
          toast.success('OTP sent to your email');
          setSignupStep('otp');
          return;
        }
        if (signupStep === 'otp') {
          await verifyOtp(form.email, otp, 'signup verification');
          toast.success('OTP verified');
          setSignupStep('password');
          return;
        }
        if (form.password !== form.confirmPassword) {
          toast.error('Passwords do not match');
          return;
        }
        await signup(form);
      } else {
        await login({ email: form.email, password: form.password });
      }
      navigate('/dashboard');
    } catch (error) {
      const message = error.friendlyMessage || error.response?.data?.message || error.message || 'Authentication failed';
      if (!isSignup && /email|password|not found|invalid/i.test(message)) {
        setAuthNotice(demoHint);
      }
      toast.error(message);
    }
  };

  const sendResetOtp = async () => {
    const email = normalizeEmail(resetForm.email);
    if (!email) return toast.error('Enter your registered email');
    if (!(await findUser(email))) {
      setAuthNotice(demoHint);
      return toast.error('Email is not registered yet');
    }
    await requestOtp(email, 'password reset');
    setResetOtp('');
    setResetStep('otp');
    toast.success('Reset OTP sent');
  };

  const verifyResetOtp = async () => {
    await verifyOtp(resetForm.email, resetOtp, 'password reset');
    setResetStep('password');
    toast.success('OTP verified');
  };

  const resetPassword = async () => {
    if (resetForm.password.length < 8) return toast.error('Password must be at least 8 characters');
    if (resetForm.password !== resetForm.confirmPassword) return toast.error('Passwords do not match');
    await updateUserPassword(resetForm.email, resetForm.password);
    toast.success('Password updated. Please login.');
    setResetOpen(false);
    setResetStep('email');
    setResetForm({ email: '', password: '', confirmPassword: '' });
  };

  const signupSteps = [
    ['email', 'Email', Mail],
    ['otp', 'Verify', ShieldCheck],
    ['password', 'Profile', UserPlus]
  ];

  return (
    <main className="auth-shell min-h-[calc(100vh-4rem)]">
      <motion.div className="auth-shell-grid">
        {/* Visual panel */}
        <section className="auth-visual">
          <div className="auth-visual-bg">
            <img
              src="https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?auto=format&fit=crop&w=1200&q=80"
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <div className="auth-visual-overlay" />
          <div className="auth-visual-content">
            <Link to="/" className="inline-flex items-center gap-2 text-white/90 transition hover:text-white">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 backdrop-blur">
                <Activity size={20} />
              </span>
              <span className="font-bold">JK Hospital</span>
            </Link>
            <div className="mt-auto">
              <span className="auth-visual-badge">{isSignup ? 'Join thousands of patients' : 'Welcome back'}</span>
              <h1 className="auth-visual-title mt-4">
                {isSignup ? 'Your health journey starts here.' : 'Your care dashboard awaits.'}
              </h1>
              <p className="mt-4 max-w-md text-white/80">
                {isSignup
                  ? 'Book OP tokens, pay online, and track every visit — designed to feel as smooth as the best apps you use daily.'
                  : 'Tokens, invoices, appointments, and refunds — everything in one secure place.'}
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {perks.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="liquid-glass liquid-glass-on-image rounded-2xl p-4">
                    <Icon size={20} className="text-emerald-300" />
                    <p className="mt-2 text-sm font-bold text-white">{title}</p>
                    <p className="mt-1 text-xs text-white/70">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Form panel */}
        <section className="auth-form-panel">
          <div className="auth-form-inner liquid-glass liquid-glass-interactive">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="auth-form-header">
                <span className="auth-form-icon">
                  {isSignup ? <UserPlus size={22} /> : <Lock size={22} />}
                </span>
                <div>
                  <h2 className="text-2xl font-bold text-ink">{isSignup ? 'Create account' : 'Sign in'}</h2>
                  <p className="text-sm text-slate-500">JK Hospital patient portal</p>
                </div>
              </div>

              {isSignup && (
                <div className="auth-stepper mt-6">
                  {signupSteps.map(([key, label, Icon], index) => {
                    const active = signupStep === key;
                    const done =
                      (key === 'email' && ['otp', 'password'].includes(signupStep)) ||
                      (key === 'otp' && signupStep === 'password');
                    return (
                      <motion.div
                        key={key}
                        className={`auth-step ${active ? 'auth-step-active' : ''} ${done ? 'auth-step-done' : ''}`}
                      >
                        <span className="auth-step-num">
                          {done ? '✓' : index + 1}
                        </span>
                        <Icon size={14} className="hidden sm:block" />
                        <span>{label}</span>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              <form onSubmit={submit} className="mt-6 space-y-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={isSignup ? signupStep : 'login'}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    {isSignup && signupStep === 'email' && (
                      <label className="auth-field">
                        <span>Email address</span>
                        <input className="field" name="email" type="email" placeholder="you@email.com" value={form.email} onChange={update} required autoComplete="email" />
                      </label>
                    )}
                    {isSignup && signupStep === 'otp' && (
                      <label className="auth-field">
                        <span>6-digit OTP</span>
                        <input
                          className="field text-center text-2xl font-bold tracking-[0.35em]"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="000000"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          required
                        />
                        <p className="text-xs text-slate-500">Sent to {form.email}</p>
                      </label>
                    )}
                    {isSignup && signupStep === 'password' && (
                      <>
                        <label className="auth-field">
                          <span>Full name</span>
                          <input className="field" name="name" placeholder="Your name" value={form.name} onChange={update} required />
                        </label>
                        <label className="auth-field">
                          <span>Phone (optional)</span>
                          <input className="field" name="phone" placeholder="10-digit mobile" value={form.phone} onChange={update} />
                        </label>
                        <label className="auth-field">
                          <span>Password</span>
                          <div className="relative">
                            <input className="field pr-12" name="password" type={showPass ? 'text' : 'password'} placeholder="Min. 8 characters" value={form.password} onChange={update} required />
                            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShowPass((v) => !v)} aria-label="Toggle password">
                              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </label>
                        <label className="auth-field">
                          <span>Confirm password</span>
                          <input className="field" name="confirmPassword" type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={update} required />
                        </label>
                      </>
                    )}
                    {!isSignup && (
                      <>
                        <label className="auth-field">
                          <span>Email</span>
                          <input className="field" name="email" type="email" placeholder="you@email.com" value={form.email} onChange={update} required autoComplete="email" />
                        </label>
                        <label className="auth-field">
                          <span>Password</span>
                          <div className="relative">
                            <input className="field pr-12" name="password" type={showPass ? 'text' : 'password'} placeholder="Your password" value={form.password} onChange={update} required autoComplete="current-password" />
                            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShowPass((v) => !v)} aria-label="Toggle password">
                              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </label>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>

                <button disabled={loading} className="btn-primary btn-lg w-full">
                  {loading ? (
                    'Please wait...'
                  ) : isSignup ? (
                    signupStep === 'email' ? (
                      <>Send OTP <ArrowRight size={18} /></>
                    ) : signupStep === 'otp' ? (
                      <>Verify OTP <ArrowRight size={18} /></>
                    ) : (
                      <>Create account <ArrowRight size={18} /></>
                    )
                  ) : (
                    <>Sign in <ArrowRight size={18} /></>
                  )}
                </button>
              </form>

              <AnimatePresence>
                {authNotice && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="auth-notice mt-4"
                  >
                    <Info size={17} />
                    <p>{authNotice}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {!isSignup && (
                <div className="liquid-glass mt-5 rounded-2xl p-4">
                  <button
                    type="button"
                    onClick={() => {
                      setResetOpen((v) => !v);
                      setResetForm((value) => ({ ...value, email: normalizeEmail(value.email || form.email) }));
                    }}
                    className="flex w-full items-center justify-between text-sm font-bold text-medical-600"
                  >
                    <span className="inline-flex items-center gap-2"><KeyRound size={16} /> Forgot password?</span>
                    <span>{resetOpen ? 'Close' : 'Reset'}</span>
                  </button>
                  {resetOpen && (
                    <div className="mt-4 space-y-3">
                      {resetStep === 'email' && (
                        <>
                          <input className="field" type="email" placeholder="Registered email" value={resetForm.email} onChange={(e) => setResetForm((v) => ({ ...v, email: e.target.value }))} />
                          <button type="button" onClick={sendResetOtp} className="btn-secondary w-full">Send reset OTP</button>
                        </>
                      )}
                      {resetStep === 'otp' && (
                        <>
                          <input className="field text-center text-xl font-bold tracking-[0.35em]" maxLength={6} value={resetOtp} onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" />
                          <button type="button" onClick={verifyResetOtp} className="btn-secondary w-full">Verify OTP</button>
                        </>
                      )}
                      {resetStep === 'password' && (
                        <>
                          <input className="field" type="password" placeholder="New password" value={resetForm.password} onChange={(e) => setResetForm((v) => ({ ...v, password: e.target.value }))} />
                          <input className="field" type="password" placeholder="Confirm password" value={resetForm.confirmPassword} onChange={(e) => setResetForm((v) => ({ ...v, confirmPassword: e.target.value }))} />
                          <button type="button" onClick={resetPassword} className="btn-secondary w-full">Save new password</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              <p className="mt-8 text-center text-sm text-slate-600">
                {isSignup ? 'Already have an account?' : 'New to JK Hospital?'}{' '}
                <Link className="font-bold text-medical-600 hover:underline" to={isSignup ? '/login' : '/signup'}>
                  {isSignup ? 'Sign in' : 'Create account'}
                </Link>
              </p>
              <p className="mt-4 text-center">
                <Link to="/" className="text-xs font-semibold text-slate-400 hover:text-medical-600">
                  ← Back to home
                </Link>
              </p>
            </motion.div>
          </div>
        </section>
      </motion.div>
    </main>
  );
}
