import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import Home from './pages/Home.jsx';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));
const AuthPage = lazy(() => import('./pages/AuthPage.jsx'));
const BookingPage = lazy(() => import('./pages/BookingPage.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Doctors = lazy(() => import('./pages/Doctors.jsx'));
const PaymentPage = lazy(() => import('./pages/PaymentPage.jsx'));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage.jsx'));
const Services = lazy(() => import('./pages/Services.jsx'));

function ScreenLoader() {
  return (
    <div className="container-pad grid min-h-[40vh] place-items-center py-16">
      <div className="cinematic-loader">
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
        <Route path="/services" element={<Suspense fallback={<ScreenLoader />}><Services /></Suspense>} />
        <Route path="/doctors" element={<Suspense fallback={<ScreenLoader />}><Doctors /></Suspense>} />
        <Route path="/contact" element={<Suspense fallback={<ScreenLoader />}><Contact /></Suspense>} />
        <Route path="/book" element={<Suspense fallback={<ScreenLoader />}><ProtectedRoute><BookingPage /></ProtectedRoute></Suspense>} />
        <Route path="/payment" element={<Suspense fallback={<ScreenLoader />}><ProtectedRoute><PaymentPage /></ProtectedRoute></Suspense>} />
        <Route path="/payment-success" element={<Suspense fallback={<ScreenLoader />}><ProtectedRoute><PaymentSuccessPage /></ProtectedRoute></Suspense>} />
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
