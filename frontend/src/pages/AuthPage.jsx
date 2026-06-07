import { SignIn, SignUp, useClerk, useUser } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { MailCheck, ShieldCheck, Sparkles, UserPlus, Lock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { authenticateUser, createUserSession } from '../utils/userStore.js';

const perks = [
  { icon: MailCheck, title: 'Email OTP', desc: 'Verified by Clerk' },
  { icon: ShieldCheck, title: 'Secure sessions', desc: 'Persistent login' },
  { icon: Sparkles, title: 'Live tokens', desc: 'Book and pay online' }
];

const demoAccounts = [
  ['Receptionist', 'receptionist@jkhospital.com', 'Reception@123'],
  ['Pharmacist', 'pharmacist@jkhospital.com', 'Pharmacy@123'],
  ['Dr Ravi Kumar', 'ravi@jkhospital.com', 'Doctor@123'],
  ['Dr Priya Sharma', 'priya@jkhospital.com', 'Doctor@123'],
  ['Dr Arjun Menon', 'arjun@jkhospital.com', 'Doctor@123']
];

const dashboardForRole = (role) => ({
  receptionist: '/receptionist',
  doctor: '/doctor-dashboard',
  pharmacist: '/pharmacist',
  admin: '/admin'
}[role] || '/dashboard');

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
  const isAdminLogin = mode === 'admin';
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useClerk();
  const { isSignedIn } = useUser();
  const { isAdmin, user } = useAuth();
  const handledAdminMismatch = useRef(false);
  const [localLogin, setLocalLogin] = useState({ email: '', password: '' });

  useEffect(() => {
    if (location.state?.adminDenied) {
      toast.error('You are not an admin. Please use the patient login.');
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state?.adminDenied, navigate]);

  useEffect(() => {
    if (isSignedIn && user) {
      if (isAdminLogin && !isAdmin) {
        if (handledAdminMismatch.current) return;
        handledAdminMismatch.current = true;

        const redirectToPatientLogin = async () => {
          await signOut();
          navigate('/login', {
            replace: true,
            state: { adminDenied: true }
          });
        };

        void redirectToPatientLogin();
        return;
      }

      toast.success(isSignup ? 'Signup verified successfully' : 'Login successful');
      navigate(isAdminLogin ? '/admin' : dashboardForRole(user.role), { replace: true });
    }
  }, [isSignedIn, isSignup, isAdminLogin, isAdmin, navigate, signOut, user]);

  const submitLocalLogin = async (event) => {
    event.preventDefault();
    try {
      const account = await authenticateUser(localLogin.email, localLogin.password);
      const session = await createUserSession(account);
      window.dispatchEvent(new Event('jk-auth-sync'));
      toast.success('Login successful');
      navigate(dashboardForRole(session.user.role), { replace: true });
    } catch (error) {
      toast.error(error.message || 'Invalid email or password');
    }
  };

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
            <Link to="/" className="auth-brand-link transition hover:scale-[1.01]">
              <BrandLogo markSize="lg" />
            </Link>
            <div className="mt-auto">
              <span className="auth-visual-badge">{isAdminLogin ? 'Staff entrance' : isSignup ? 'Create secure access' : 'Welcome back'}</span>
              <h1 className="auth-visual-title mt-4">
                {isAdminLogin ? 'Staff control room access.' : isSignup ? 'Your health journey starts here.' : 'Your care dashboard awaits.'}
              </h1>
              <p className="mt-4 max-w-md text-white/80">
                {isAdminLogin
                  ? 'Review tokens, appointments, doctors, refunds, and hospital operations from a dedicated admin portal.'
                  : isSignup
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
                  <h2 className="text-2xl font-bold text-ink">{isAdminLogin ? 'Admin sign in' : isSignup ? 'Create account' : 'Sign in'}</h2>
                  <p className="text-sm text-slate-500">{isAdminLogin ? 'JK Hospital staff portal' : 'JK Hospital patient portal'}</p>
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
                    path={isAdminLogin ? '/admin/login' : '/login'}
                    routing="path"
                    signUpUrl="/signup"
                    fallbackRedirectUrl={isAdminLogin ? '/admin' : '/dashboard'}
                    appearance={clerkAppearance}
                  />
                )}
              </div>

              {!isSignup && (
                <form onSubmit={submitLocalLogin} className="mt-6 rounded-2xl border border-medical-100 bg-white/80 p-4 shadow-sm">
                  <p className="text-sm font-bold text-ink">Staff/demo email login</p>
                  <div className="mt-3 grid gap-3">
                    <input
                      className="field"
                      type="email"
                      placeholder="Email"
                      value={localLogin.email}
                      onChange={(event) => setLocalLogin((value) => ({ ...value, email: event.target.value }))}
                    />
                    <input
                      className="field"
                      type="password"
                      placeholder="Password"
                      value={localLogin.password}
                      onChange={(event) => setLocalLogin((value) => ({ ...value, password: event.target.value }))}
                    />
                    <button type="submit" className="btn-primary w-full">Login with email/password</button>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-slate-500">
                    {demoAccounts.map(([label, email, password]) => (
                      <button
                        key={email}
                        type="button"
                        onClick={() => setLocalLogin({ email, password })}
                        className="block text-left font-semibold text-medical-700 hover:underline"
                      >
                        {label}: {email} / {password}
                      </button>
                    ))}
                  </div>
                </form>
              )}

              <p className="mt-6 text-center text-sm text-slate-600">
                {isAdminLogin ? 'Patient portal?' : isSignup ? 'Already have an account?' : 'New to JK Hospital?'}{' '}
                <Link className="font-bold text-medical-600 hover:underline" to={isAdminLogin ? '/login' : isSignup ? '/login' : '/signup'}>
                  {isAdminLogin ? 'Patient sign in' : isSignup ? 'Sign in' : 'Create account'}
                </Link>
              </p>
              {!isSignup && !isAdminLogin && (
                <p className="mt-3 text-center text-sm text-slate-500">
                  Staff member?{' '}
                  <Link className="font-bold text-medical-600 hover:underline" to="/admin/login">
                    Admin sign in
                  </Link>
                </p>
              )}
            </motion.div>
          </div>
        </section>
      </motion.div>
    </main>
  );
}
