/**
 * Premium payment audio manager — Web Audio API synthesis (no external files).
 * Prevents overlapping playback; stops previous sounds before playing new ones.
 * Works in browsers and Electron (Chromium).
 */

/** @typedef {'success' | 'failure' | 'processing'} SoundKind */

let audioContext = null;
/** @type {Set<AudioScheduledSourceNode>} */
const activeNodes = new Set();
/** @type {ReturnType<typeof setInterval> | null} */
let processingInterval = null;

/** Global volume 0–1 */
let masterVolume = 0.85;

/**
 * @returns {AudioContext}
 */
const getContext = () => {
  if (!audioContext) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) throw new Error('Web Audio API is not supported');
    audioContext = new Ctx();
  }
  return audioContext;
};

/**
 * Resume audio context after user gesture (required on mobile).
 */
export const unlockAudio = async () => {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') await ctx.resume();
    return true;
  } catch {
    return false;
  }
};

/**
 * Set master volume for all payment sounds.
 * @param {number} volume — 0 to 1
 */
export const setPaymentAudioVolume = (volume) => {
  masterVolume = Math.min(1, Math.max(0, Number(volume) || 0));
};

/** @returns {number} */
export const getPaymentAudioVolume = () => masterVolume;

/**
 * Stop all currently playing payment sounds.
 */
export const stopAllSounds = () => {
  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
  }
  activeNodes.forEach((node) => {
    try {
      node.stop();
      node.disconnect();
    } catch {
      /* already stopped */
    }
  });
  activeNodes.clear();
};

/**
 * @param {OscillatorNode} osc
 * @param {GainNode} gain
 */
const track = (osc, gain) => {
  activeNodes.add(osc);
  const cleanup = () => {
    activeNodes.delete(osc);
    try {
      osc.disconnect();
      gain.disconnect();
    } catch {
      /* noop */
    }
  };
  osc.addEventListener('ended', cleanup);
};

/**
 * Play a short tone.
 * @param {number} freq
 * @param {number} startAt
 * @param {number} duration
 * @param {OscillatorType} type
 * @param {number} peakGain
 */
const playTone = (freq, startAt, duration, type = 'sine', peakGain = 0.12) => {
  const ctx = getContext();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const peak = peakGain * masterVolume;
  gain.gain.setValueAtTime(0.0001, now + startAt);
  gain.gain.exponentialRampToValueAtTime(peak, now + startAt + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + startAt + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  track(osc, gain);
  osc.start(now + startAt);
  osc.stop(now + startAt + duration + 0.04);
};

/**
 * Smooth premium success chime (Apple Pay / Google Pay style ascending triad).
 */
export const playSuccessSound = async () => {
  stopAllSounds();
  await unlockAudio();
  playTone(523.25, 0, 0.14, 'sine', 0.11);
  playTone(659.25, 0.09, 0.14, 'sine', 0.1);
  playTone(783.99, 0.18, 0.28, 'sine', 0.13);
  playTone(1046.5, 0.32, 0.35, 'triangle', 0.08);
};

/**
 * Subtle modern error tone (soft descending minor second).
 */
export const playFailureSound = async () => {
  stopAllSounds();
  await unlockAudio();
  playTone(330, 0, 0.22, 'sine', 0.09);
  playTone(277.18, 0.12, 0.32, 'sine', 0.08);
};

/**
 * Soft processing pulse loop while verification is pending.
 */
export const playProcessingSound = async () => {
  stopAllSounds();
  await unlockAudio();
  let tick = 0;
  const pulse = async () => {
    if (processingInterval === null) return;
    playTone(440 + (tick % 2) * 20, 0, 0.06, 'sine', 0.04);
    tick += 1;
  };
  await pulse();
  processingInterval = setInterval(pulse, 900);
};

/**
 * Stop processing loop only (keeps success/failure if playing).
 */
export const stopProcessingSound = () => {
  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
  }
};

/** Backward-compatible alias */
export const playPaymentSuccessSound = playSuccessSound;
