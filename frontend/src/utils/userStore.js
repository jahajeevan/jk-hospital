/**
 * User authentication utilities (Clerk-based, no localStorage)
 */

export const authenticateUser = async (email, password) => {
  // Authentication is handled by Clerk
  console.log('Authentication handled by Clerk:', email);
  return { email, authenticated: true };
};

// Session is managed by Clerk context, no localStorage needed
export const createUserSession = (user) => {
  console.log('User session managed by Clerk:', user);
  return user;
};

export const readUserSession = () => {
  // Session is managed by AuthContext + Clerk
  return null;
};

export const clearUserSession = () => {
  // Session cleared by Clerk signOut
  console.log('User session cleared by Clerk');
};
