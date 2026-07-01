import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import { useAuth } from '../context/AuthContext.jsx';

function AdminAccessDenied() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useClerk();

  useEffect(() => {
    const redirectToPatientLogin = async () => {
      await signOut();
      navigate('/login', {
        replace: true,
        state: {
          adminDenied: true,
          from: location.pathname
        }
      });
    };

    void redirectToPatientLogin();
  }, [location.pathname, navigate, signOut]);

  return (
    <div className="route-loader-shell min-h-screen">
      <div className="route-loader">
        <span />
        <p>Checking admin access</p>
      </div>
    </div>
  );
}

export default function ProtectedRoute({ children, admin = false, roles = [], allowIncompleteProfile = false }) {
  const { user, isAdmin, needsProfileCompletion } = useAuth();

  // `user` already reflects a server-verified identity (Clerk session or a
  // /auth/me-checked local staff token) — never trust a raw sessionStorage
  // read here, since that value is editable client-side.
  const currentUser = user;

  if (!currentUser) {
    if (admin) return <Navigate to="/admin/login" replace />;
    if (roles.some((role) => ['admin', 'doctor', 'receptionist', 'pharmacist', 'staff'].includes(role))) {
      return <Navigate to="/admin/login" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  if (admin) {
    if (!isAdmin && currentUser.role !== 'admin') return <AdminAccessDenied />;
    return children;
  }

  if (needsProfileCompletion && !allowIncompleteProfile) {
    return <Navigate to="/complete-profile" replace />;
  }

  if (roles.length && !roles.includes(currentUser.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
