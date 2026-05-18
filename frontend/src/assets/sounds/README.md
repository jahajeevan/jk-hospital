# Payment sounds

JK Hospital uses **synthesized Web Audio** in `features/payment-verification/utils/audioManager.js` so the app works offline, in Electron, and on mobile without bundling MP3/WAV files.

| Function | Description |
|----------|-------------|
| `playSuccessSound()` | Premium ascending success chime |
| `playFailureSound()` | Subtle error tone |
| `playProcessingSound()` | Soft pulse while verifying |
| `stopAllSounds()` | Stops all active audio |

To use custom files later, extend `audioManager.js` with `HTMLAudioElement` paths under this folder.
