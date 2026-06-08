import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Lock, Mail } from 'lucide-react';
import api from '../api/client.js';

export default function DoctorLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password
      });

      const user = response.data?.user;
      if (user?.role !== 'doctor') {
        toast.error('This account is not authorized as a doctor');
        setIsLoading(false);
        return;
      }

      // Store doctor login token in sessionStorage
      sessionStorage.setItem('jk_doctor_token', response.data?.token || '');
      sessionStorage.setItem('jk_doctor_user', JSON.stringify(user));

      toast.success('Login successful');
      navigate('/doctor-dashboard');
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || error.message || 'Login failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-medical-50 to-blue-50 p-4">
      <div className="glass w-full max-w-md rounded-2xl p-8 dark:bg-slate-900/50">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex rounded-full bg-medical-100 p-3 dark:bg-medical-900/30">
            <Lock className="text-medical-600 dark:text-medical-300" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Doctor Login</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">JK Hospital Staff Portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              <Mail size={16} className="inline mr-2" />
              Hospital Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@jkhospital.com"
              className="field w-full"
              required
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Email provided by admin during registration
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              <Lock size={16} className="inline mr-2" />
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="field w-full"
              required
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Password set during your account creation
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Logging in...' : 'Login to Dashboard'}
          </button>
        </form>

        <div className="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <p className="text-xs text-blue-800 dark:text-blue-300">
            <strong>New doctor?</strong> Your hospital email and password are provided by the admin when you're added to the system.
            Contact admin if you haven't received your credentials.
          </p>
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm font-medium text-medical-600 hover:text-medical-700 dark:text-medical-400">
            ← Back to homepage
          </a>
        </div>
      </div>
    </main>
  );
}
