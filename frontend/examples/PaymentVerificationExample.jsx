/**
 * Example: standalone payment verification demo (no booking required).
 * Import in a dev route or Storybook-style sandbox.
 */

import { useState } from 'react';
import toast from 'react-hot-toast';
import PaymentVerificationModal from '../src/features/payment-verification/components/PaymentVerificationModal.jsx';
import {
  playFailureSound,
  playProcessingSound,
  playSuccessSound,
  stopAllSounds
} from '../src/features/payment-verification/utils/audioManager.js';
import { triggerElectronHaptic } from '../src/features/payment-verification/utils/haptics.js';

export default function PaymentVerificationExample() {
  const [status, setStatus] = useState('idle');
  const [volume, setVolume] = useState(0.85);

  const simulate = async (next) => {
    stopAllSounds();
    setStatus('processing');
    await playProcessingSound();
    triggerElectronHaptic('processing');

    await new Promise((r) => setTimeout(r, 1800));

    if (next === 'success') {
      setStatus('success');
      await playSuccessSound();
      triggerElectronHaptic('success');
      toast.success('Payment verified successfully');
    } else {
      setStatus('failure');
      await playFailureSound();
      triggerElectronHaptic('failure');
      toast.error('Payment verification failed');
    }

    setTimeout(() => setStatus('idle'), 2500);
  };

  return (
    <div className="container-pad py-16">
      <h1 className="text-2xl font-bold">Payment verification demo</h1>
      <p className="mt-2 text-slate-600">Simulates async verify flow with sounds and modal.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" className="btn-primary" onClick={() => simulate('success')}>
          Simulate success
        </button>
        <button type="button" className="btn-secondary" onClick={() => simulate('failure')}>
          Simulate failure
        </button>
      </div>
      <PaymentVerificationModal
        open={status !== 'idle'}
        status={status}
        volume={volume}
        onVolumeChange={setVolume}
        voiceEnabled={false}
        onVoiceToggle={() => {}}
      />
    </div>
  );
}
