import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import Home from './pages/Home.jsx';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));
const AuthPage = lazy(() => import('./pages/AuthPage.jsx'));
const BookingPage = lazy(() => import('./pages/BookingPage.jsx'));
const CompleteProfilePage = lazy(() => import('./pages/CompleteProfilePage.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Doctors = lazy(() => import('./pages/Doctors.jsx'));
const PaymentPage = lazy(() => import('./pages/PaymentPage.jsx'));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const Services = lazy(() => import('./pages/Services.jsx'));
const SmartAiPage = lazy(() => import('./pages/SmartAiPage.jsx'));
const StaffDashboard = lazy(() => import('./pages/StaffDashboard.jsx'));

function ScreenLoader() {
  return (
    <div className="route-loader-shell">
      <div className="route-loader">
        <span />
        <p>Loading JK Hospital</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Suspense fallback={<ScreenLoader />}><AuthPage mode="login" /></Suspense>} />
        <Route path="/signup" element={<Suspense fallback={<ScreenLoader />}><AuthPage mode="signup" /></Suspense>} />
        <Route path="/admin/login" element={<Suspense fallback={<ScreenLoader />}><AuthPage mode="admin" /></Suspense>} />
        <Route path="/services" element={<Suspense fallback={<ScreenLoader />}><Services /></Suspense>} />
        <Route path="/ai" element={<Suspense fallback={<ScreenLoader />}><SmartAiPage /></Suspense>} />
        <Route path="/doctors" element={<Suspense fallback={<ScreenLoader />}><Doctors /></Suspense>} />
        <Route path="/staff" element={<Suspense fallback={<ScreenLoader />}><ProtectedRoute roles={['admin']}><StaffDashboard /></ProtectedRoute></Suspense>} />
        <Route path="/receptionist" element={<Suspense fallback={<ScreenLoader />}><ProtectedRoute roles={['receptionist', 'admin']}><StaffDashboard initialTab="reception" standalone /></ProtectedRoute></Suspense>} />
        <Route path="/doctor-dashboard" element={<Suspense fallback={<ScreenLoader />}><ProtectedRoute roles={['doctor', 'admin']}><StaffDashboard initialTab="doctor" standalone /></ProtectedRoute></Suspense>} />
        <Route path="/pharmacist" element={<Suspense fallback={<ScreenLoader />}><ProtectedRoute roles={['pharmacist', 'admin']}><StaffDashboard initialTab="pharmacy" standalone /></ProtectedRoute></Suspense>} />
        <Route path="/contact" element={<Suspense fallback={<ScreenLoader />}><Contact /></Suspense>} />
        <Route path="/complete-profile" element={<Suspense fallback={<ScreenLoader />}><ProtectedRoute allowIncompleteProfile><CompleteProfilePage /></ProtectedRoute></Suspense>} />
        <Route path="/book" element={<Suspense fallback={<ScreenLoader />}><ProtectedRoute><BookingPage /></ProtectedRoute></Suspense>} />
        <Route path="/payment" element={<Suspense fallback={<ScreenLoader />}><ProtectedRoute><PaymentPage /></ProtectedRoute></Suspense>} />
        <Route path="/payment-success" element={<Suspense fallback={<ScreenLoader />}><ProtectedRoute><PaymentSuccessPage /></ProtectedRoute></Suspense>} />
        <Route path="/appointments" element={<Suspense fallback={<ScreenLoader />}><ProtectedRoute><Dashboard /></ProtectedRoute></Suspense>} />
        <Route path="/profile/*" element={<Suspense fallback={<ScreenLoader />}><ProtectedRoute><ProfilePage /></ProtectedRoute></Suspense>} />
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<ScreenLoader />}>
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            </Suspense>
          }
        />
        <Route
          path="/admin"
          element={
            <Suspense fallback={<ScreenLoader />}>
              <ProtectedRoute admin>
                <AdminDashboard />
              </ProtectedRoute>
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}
