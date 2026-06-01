import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, admin = false, roles = [], allowIncompleteProfile = false }) {
  const { user, isAdmin, needsProfileCompletion } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (needsProfileCompletion && !allowIncompleteProfile) return <Navigate to="/complete-profile" replace />;
  if (admin && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (roles.length && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}
