import { ShieldCheck, LockKeyhole, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo.jsx';

export default function AccessPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || 'Invalid password.');
        return;
      }

      const redirectTo = typeof data?.redirectTo === 'string' ? data.redirectTo : '/';
      navigate(redirectTo, { replace: true });
      window.location.assign(redirectTo);
    } catch {
      setError('Unable to verify the password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="hospital-bg grid min-h-screen place-items-center px-4 py-10 text-ink">
      <section className="relative z-10 w-full max-w-md">
        <div className="mb-7 flex justify-center">
          <BrandLogo markSize="md" />
        </div>

        <form onSubmit={handleSubmit} className="liquid-glass rounded-lg p-6 shadow-2xl sm:p-8">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 grid size-12 place-items-center rounded-lg border border-white/80 bg-white/70 text-medical-600 shadow-sm">
              <ShieldCheck size={24} />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-medical-600">Private access</p>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-ink sm:text-3xl">Enter site password</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              JK Hospital is protected while the website is being prepared.
            </p>
          </div>

          <label htmlFor="site-password" className="mb-2 block text-sm font-semibold text-slate-700">
            Password
          </label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              id="site-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter access password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-white/80 bg-white/75 py-3 pl-11 pr-4 text-sm font-medium text-ink shadow-inner outline-none transition placeholder:text-slate-400 focus:border-medical-400 focus:ring-4 focus:ring-medical-500/10"
            />
          </div>

          {error ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="btn-primary mt-5 w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <LoaderCircle className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
            {loading ? 'Verifying...' : 'Continue'}
          </button>
        </form>
      </section>
    </main>
  );
}
