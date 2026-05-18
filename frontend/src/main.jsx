import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './styles.css';
import './features/payment-verification/styles/payment-verification.css';
import { setVoiceFeedbackEnabled } from './features/payment-verification/utils/voiceFeedback.js';

const voicePref = localStorage.getItem('jk_payment_voice_enabled');
setVoiceFeedbackEnabled(voicePref === null ? true : voicePref === 'true');

document.documentElement.classList.remove('dark');
localStorage.removeItem('jk_theme');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
