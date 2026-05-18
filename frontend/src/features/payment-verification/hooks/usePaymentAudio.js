/**
 * Hook wrapping payment audio manager with React lifecycle cleanup.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getPaymentAudioVolume,
  playFailureSound,
  playProcessingSound,
  playSuccessSound,
  setPaymentAudioVolume,
  stopAllSounds,
  stopProcessingSound,
  unlockAudio
} from '../utils/audioManager.js';

/**
 * @param {{ initialVolume?: number }} [options]
 */
export function usePaymentAudio(options = {}) {
  const { initialVolume = 0.85 } = options;
  const [volume, setVolumeState] = useState(initialVolume);
  const mounted = useRef(true);

  useEffect(() => {
    setPaymentAudioVolume(initialVolume);
    return () => {
      mounted.current = false;
      stopAllSounds();
    };
  }, [initialVolume]);

  const setVolume = useCallback((value) => {
    const v = Math.min(1, Math.max(0, value));
    setPaymentAudioVolume(v);
    setVolumeState(v);
  }, []);

  const prepareAudio = useCallback(async () => unlockAudio(), []);

  const onSuccess = useCallback(async () => {
    stopProcessingSound();
    await playSuccessSound();
  }, []);

  const onFailure = useCallback(async () => {
    stopProcessingSound();
    await playFailureSound();
  }, []);

  const onProcessing = useCallback(async () => {
    await playProcessingSound();
  }, []);

  const stop = useCallback(() => {
    stopAllSounds();
  }, []);

  return {
    volume,
    setVolume,
    prepareAudio,
    playSuccess: onSuccess,
    playFailure: onFailure,
    playProcessing: onProcessing,
    stopAll: stop,
    getVolume: getPaymentAudioVolume
  };
}
