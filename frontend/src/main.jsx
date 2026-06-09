import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './providers/ThemeProvider.jsx';
import './styles.css';
import './features/payment-verification/styles/payment-verification.css';
import { setVoiceFeedbackEnabled } from './features/payment-verification/utils/voiceFeedback.js';

// Clear all legacy localStorage entries (migration from localStorage to Clerk/state)
// This ensures old data doesn't persist after app update
if (typeof window !== 'undefined') {
  const keysToRemove = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
    .filter(key => key && key.startsWith('jk_'));
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
      console.log(`Cleared legacy localStorage key: ${key}`);
    } catch (e) {
      console.warn(`Failed to clear localStorage key ${key}:`, e);
    }
  });
}

// Also clear sessionStorage (was used for temporary data)
if (typeof window !== 'undefined') {
  const sessionKeysToRemove = Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.key(i))
    .filter(key => key && key.startsWith('jk_'));
  sessionKeysToRemove.forEach(key => {
    try {
      sessionStorage.removeItem(key);
      console.log(`Cleared legacy sessionStorage key: ${key}`);
    } catch (e) {
      console.warn(`Failed to clear sessionStorage key ${key}:`, e);
    }
  });
}

// Voice preference defaults to enabled (no localStorage)
setVoiceFeedbackEnabled(false);

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function MissingClerkKeys() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f8fb] p-6">
      <section className="glass max-w-lg rounded-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-ink">Clerk keys required</h1>
        <p className="mt-3 text-sm text-slate-600">
          Add your Clerk publishable key to <code>frontend/.env</code>, then restart the dev server.
        </p>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      {clerkPublishableKey ? (
        <ClerkProvider
          publishableKey={clerkPublishableKey}
          signInFallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
          afterSignOutUrl="/"
        >
          <ThemeProvider>
            <BrowserRouter>
              <AuthProvider>
                <App />
                <Toaster
                  position="top-right"
                  toastOptions={{ duration: 3500 }}
                />
              </AuthProvider>
            </BrowserRouter>
          </ThemeProvider>
        </ClerkProvider>
      ) : (
        <MissingClerkKeys />
      )}
    </ErrorBoundary>
  </React.StrictMode>
);
