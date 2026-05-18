/**
 * Electron integration example for JK Hospital payment verification.
 *
 * In your Electron main process (main.js):
 *
 * ```js
 * const { ipcMain } = require('electron');
 *
 * ipcMain.handle('payment:haptic', (_event, pattern) => {
 *   // macOS: no built-in haptic from main; renderer uses navigator.vibrate when available
 *   // Windows: optional node-hid or skip
 *   return { ok: true, pattern };
 * });
 * ```
 *
 * In preload.js — expose safe bridge:
 */

// @ts-check
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronPayment', {
  /**
   * @param {'success' | 'failure' | 'processing'} pattern
   */
  haptic: (pattern) => ipcRenderer.invoke('payment:haptic', pattern),

  /** Unlock Web Audio after window focus (Chromium in Electron) */
  unlockAudio: () => ipcRenderer.invoke('payment:unlock-audio')
});

/**
 * Renderer usage (React):
 *
 * ```jsx
 * import PremiumPaymentSection from '../features/payment-verification/components/PremiumPaymentSection.jsx';
 *
 * // window.electronPayment is used automatically via triggerElectronHaptic()
 * export function ElectronPaymentView({ booking, user }) {
 *   return <PremiumPaymentSection booking={booking} user={user} />;
 * }
 * ```
 *
 * Load the Vite dev server or built index.html in BrowserWindow:
 *
 * ```js
 * mainWindow.loadURL(process.env.ELECTRON_START_URL || 'http://localhost:5173/payment');
 * ```
 */
