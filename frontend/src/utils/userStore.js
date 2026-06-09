/**
 * User authentication utilities (Clerk-based, no localStorage)
 */

export const authenticateUser = async (email, password) => {
  // Authentication is handled by Clerk
  console.log('Authentication handled by Clerk:', email);
  return { email, authenticated: true };
};

export const createUserSession = (user) => {
  sessionStorage.setItem('jk_doctor_user', JSON.stringify(user));
  return user;
};

export const readUserSession = () => {
  try {
    return JSON.parse(sessionStorage.getItem('jk_doctor_user') || 'null');
  } catch {
    return null;
  }
};

export const clearUserSession = () => {
  sessionStorage.removeItem('jk_doctor_token');
  sessionStorage.removeItem('jk_doctor_user');
};
