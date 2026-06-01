import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';

export const useAsyncAction = (action, { successMessage } = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const result = await action(...args);
        if (successMessage) toast.success(successMessage);
        return result;
      } catch (err) {
        const message = err.friendlyMessage || err.message || 'Request failed';
        setError(message);
        toast.error(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [action, successMessage]
  );

  return { run, loading, error };
};

