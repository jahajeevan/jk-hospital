import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 20000
});

const formatApiError = (error) => {
  if (error.code === 'ERR_NETWORK' || !error.response) {
    return 'Cannot reach payment server. Run `npm run dev` in the project root so the backend starts on port 5001.';
  }
  return error.response?.data?.message || error.message || 'Request failed';
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
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

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('jk_token');
  if (token && !token.startsWith('local-')) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
export { formatApiError };
