import axios from 'axios';

const LOCAL_API_HOSTS = new Set(['localhost', '127.0.0.1']);

const isLocalHostname = (hostname) =>
  LOCAL_API_HOSTS.has(hostname) || hostname.endsWith('.local');

const inferProductionApiUrl = () => {
  if (typeof window === 'undefined') return '/api';
  const { hostname, protocol } = window.location;
  if (isLocalHostname(hostname)) return '/api';
  const domain = hostname.startsWith('www.') ? hostname.slice(4) : hostname;
  return `${protocol}//api.${domain}/api`;
};

/** Strip accidental `.env` paste values like `VITE_API_URL=https://...`. */
const sanitizeConfiguredApiUrl = (value) => {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('VITE_API_URL=')) {
    return trimmed.slice('VITE_API_URL='.length).trim();
  }
  return trimmed;
};

const isAbsoluteHttpUrl = (value) => /^https?:\/\//i.test(value);

const resolveApiUrl = () => {
  const configuredApiUrl = sanitizeConfiguredApiUrl(import.meta.env.VITE_API_URL);
  const onProductionHost =
    typeof window !== 'undefined' && !isLocalHostname(window.location.hostname);

  if (onProductionHost) {
    if (!configuredApiUrl || configuredApiUrl === '/api' || !isAbsoluteHttpUrl(configuredApiUrl)) {
      return inferProductionApiUrl();
    }
    return configuredApiUrl;
  }

  return configuredApiUrl || '/api';
};

const rawApiUrl = resolveApiUrl();
const normalizedApiUrl = rawApiUrl === '/api' || rawApiUrl.endsWith('/api')
  ? rawApiUrl
  : `${rawApiUrl.replace(/\/$/, '')}/api`;

const api = axios.create({
  baseURL: normalizedApiUrl,
  timeout: 20000,
  withCredentials: true
});

const formatApiError = (error) => {
  if (error.code === 'ERR_NETWORK' || !error.response) {
    if (normalizedApiUrl !== '/api') {
      return `Cannot reach JK Hospital API at ${normalizedApiUrl}. Check that the backend is deployed and CORS allows this website.`;
    }
    return 'Cannot reach JK Hospital server. Run `npm run dev` in the project root so the backend starts on port 5001.';
  }
  return error.response?.data?.message || error.message || 'Request failed';
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original?._retry && !original?.url?.includes('/auth/refresh')) {
      original._retry = true;
      try {
        const { data } = await api.post('/auth/refresh');
        const newClerkToken = await window.jkGetClerkToken?.();
        if (newClerkToken) {
          original.headers.Authorization = `Bearer ${newClerkToken}`;
          return api(original);
        }
      } catch {
        // Token refresh failed, user needs to re-authenticate via Clerk
        console.error('Failed to refresh Clerk token');
      }
    }
    error.friendlyMessage = formatApiError(error);
    return Promise.reject(error);
  }
);

api.interceptors.request.use(async (config) => {
  const requestPath = String(config.url || '');
  const browserPath = typeof window === 'undefined' ? '' : window.location.pathname;
  const staffToken = sessionStorage.getItem('jk_doctor_token');

  const staffPage =
    browserPath.startsWith('/admin') ||
    browserPath.startsWith('/receptionist') ||
    browserPath.startsWith('/doctor-dashboard') ||
    browserPath.startsWith('/pharmacist');

  let localSessionUser = null;
  try {
    localSessionUser = JSON.parse(sessionStorage.getItem('jk_doctor_user') || 'null');
  } catch {
    localSessionUser = null;
  }

  const staffApi =
    requestPath.startsWith('/admin') ||
    requestPath.startsWith('/audit-logs') ||
    requestPath.startsWith('/pharmacy-inventory') ||
    requestPath.startsWith('/notifications') ||
    requestPath.includes('/workflow') ||
    requestPath.includes('/prescription');

  const doctorAppointmentsApi =
    requestPath.startsWith('/appointments/mine') &&
    staffPage &&
    localSessionUser?.role === 'doctor';

  if (staffToken && localSessionUser?.role && staffPage && (staffApi || doctorAppointmentsApi)) {
    config.headers.Authorization = `Bearer ${staffToken}`;
    return config;
  }

  const clerkToken = await window.jkGetClerkToken?.();
  if (clerkToken && !clerkToken.startsWith('local-')) {
    config.headers.Authorization = `Bearer ${clerkToken}`;
  }
  return config;
});

export default api;
export { formatApiError };
