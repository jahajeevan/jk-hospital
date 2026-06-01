import { SignIn, SignUp, useUser } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { Activity, MailCheck, ShieldCheck, Sparkles, UserPlus, Lock } from 'lucide-react';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';

const perks = [
  { icon: MailCheck, title: 'Email OTP', desc: 'Verified by Clerk' },
  { icon: ShieldCheck, title: 'Secure sessions', desc: 'Persistent login' },
  { icon: Sparkles, title: 'Live tokens', desc: 'Book and pay online' }
];

const clerkAppearance = {
  elements: {
    rootBox: 'w-full',
    cardBox: 'w-full shadow-none',
    card: 'w-full border-0 bg-transparent p-0 shadow-none',
    headerTitle: 'hidden',
    headerSubtitle: 'hidden',
    socialButtonsBlockButton:
      'rounded-xl border border-slate-200 bg-white/85 px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-medical-300 hover:bg-white hover:shadow-md',
    dividerLine: 'bg-slate-200',
    dividerText: 'text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400',
    formFieldLabel: 'text-xs font-bold uppercase tracking-wide text-slate-500',
    formFieldInput:
      'rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-ink shadow-sm outline-none transition focus:border-medical-400 focus:ring-4 focus:ring-medical-100',
    formButtonPrimary:
      'rounded-xl bg-gradient-to-r from-medical-600 to-blue-500 py-3 text-sm font-bold text-white shadow-[0_18px_40px_rgba(20,123,209,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(20,123,209,0.30)]',
    footerActionText: 'text-slate-500',
    footerActionLink: 'font-bold text-medical-600 hover:text-medical-700',
    identityPreviewText: 'text-ink',
    formResendCodeLink: 'font-bold text-medical-600',
    otpCodeFieldInput:
      'h-12 rounded-xl border border-slate-200 bg-white text-center text-lg font-bold text-ink shadow-sm focus:border-medical-400 focus:ring-4 focus:ring-medical-100',
    alert: 'rounded-xl border border-rose-200 bg-rose-50 text-rose-800',
    formFieldErrorText: 'text-rose-600',
    footer: 'hidden'
  },
  layout: {
    socialButtonsPlacement: 'top',
    socialButtonsVariant: 'block'
  },
  variables: {
    colorPrimary: '#147bd1',
    colorText: '#102033',
    borderRadius: '0.75rem'
  }
};

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const navigate = useNavigate();
  const { isSignedIn } = useUser();

  useEffect(() => {
    if (isSignedIn) {
      toast.success(isSignup ? 'Signup verified successfully' : 'Login successful');
      navigate('/dashboard', { replace: true });
    }
  }, [isSignedIn, isSignup, navigate]);

  return (
    <main className="auth-shell min-h-[calc(100vh-4rem)]">
      <motion.div className="auth-shell-grid">
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
              <span className="auth-visual-badge">{isSignup ? 'Create secure access' : 'Welcome back'}</span>
              <h1 className="auth-visual-title mt-4">
                {isSignup ? 'Your health journey starts here.' : 'Your care dashboard awaits.'}
              </h1>
              <p className="mt-4 max-w-md text-white/80">
                {isSignup
                  ? 'Sign up with Google or email, verify securely, and manage hospital visits from one polished dashboard.'
                  : 'Tokens, invoices, appointments, refunds, and AI visit preparation in one secure place.'}
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

        <section className="auth-form-panel">
          <div className="auth-form-inner liquid-glass liquid-glass-interactive">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <div className="auth-form-header">
                <span className="auth-form-icon">
                  {isSignup ? <UserPlus size={22} /> : <Lock size={22} />}
                </span>
                <div>
                  <h2 className="text-2xl font-bold text-ink">{isSignup ? 'Create account' : 'Sign in'}</h2>
                  <p className="text-sm text-slate-500">JK Hospital patient portal</p>
                </div>
              </div>

              <div className="mt-7">
                {isSignup ? (
                  <SignUp
                    path="/signup"
                    routing="path"
                    signInUrl="/login"
                    fallbackRedirectUrl="/dashboard"
                    appearance={clerkAppearance}
                  />
                ) : (
                  <SignIn
                    path="/login"
                    routing="path"
                    signUpUrl="/signup"
                    fallbackRedirectUrl="/dashboard"
                    appearance={clerkAppearance}
                  />
                )}
              </div>

              <p className="mt-6 text-center text-sm text-slate-600">
                {isSignup ? 'Already have an account?' : 'New to JK Hospital?'}{' '}
                <Link className="font-bold text-medical-600 hover:underline" to={isSignup ? '/login' : '/signup'}>
                  {isSignup ? 'Sign in' : 'Create account'}
                </Link>
              </p>
            </motion.div>
          </div>
        </section>
      </motion.div>
    </main>
  );
}
