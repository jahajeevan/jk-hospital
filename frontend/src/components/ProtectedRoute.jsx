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
  
  // Check for doctor token in sessionStorage
  const doctorUser = sessionStorage.getItem('jk_doctor_user') ? 
    JSON.parse(sessionStorage.getItem('jk_doctor_user')) : null;
  
  const currentUser = user || doctorUser;
  
  if (!currentUser) {
    if (admin) return <Navigate to="/admin/login" replace />;
    if (roles.includes('doctor')) return <Navigate to="/doctor/login" replace />;
    return <Navigate to="/login" replace />;
  }

  if (admin) {
    if (!isAdmin) return <AdminAccessDenied />;
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
