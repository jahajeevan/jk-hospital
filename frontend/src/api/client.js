import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL || '/api';
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
        if (data?.token) sessionStorage.setItem('jk_token', data.token);
        if (data?.user) sessionStorage.setItem('jk_user', JSON.stringify(data.user));
        original.headers.Authorization = `Bearer ${data.token}`;
        return api(original);
      } catch {
        sessionStorage.removeItem('jk_token');
        sessionStorage.removeItem('jk_user');
      }
    }
    error.friendlyMessage = formatApiError(error);
    const message = error.response?.data?.message || '';
    if (message.toLowerCase().includes('jwt')) {
      sessionStorage.removeItem('jk_token');
      sessionStorage.removeItem('jk_user');
      localStorage.removeItem('jk_token');
      localStorage.removeItem('jk_user');
    }
    return Promise.reject(error);
  }
);

api.interceptors.request.use(async (config) => {
  const clerkToken = await window.jkGetClerkToken?.();
  const token = clerkToken || sessionStorage.getItem('jk_token');
  if (token && !token.startsWith('local-')) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
export { formatApiError };
