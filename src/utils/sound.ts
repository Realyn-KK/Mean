export type SoundEffectType = 'click' | 'bonk' | 'pop' | 'win' | 'error';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextCtor) return null;

  if (!audioCtx) {
    audioCtx = new AudioContextCtor();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  gainPeak = 0.16,
): void {
  const now = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(gainPeak, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

// Note frequencies matching Tone.js triggers (C5, G3, C3, E5, A5, G5, C6, Eb3)
const NOTES = {
  C3: 130.81,
  Eb3: 155.56,
  G3: 196.0,
  C5: 523.25,
  E5: 659.25,
  G5: 783.99,
  A5: 880.0,
  C6: 1046.5,
} as const;

export function playSoundEffect(type: SoundEffectType, enabled: boolean): void {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    switch (type) {
      case 'click':
        playTone(ctx, NOTES.C5, 0, 0.12);
        break;
      case 'bonk':
        playTone(ctx, NOTES.G3, 0, 0.14, 0.22);
        playTone(ctx, NOTES.C3, 0.06, 0.16, 0.22);
        break;
      case 'pop':
        playTone(ctx, NOTES.E5, 0, 0.11);
        playTone(ctx, NOTES.A5, 0.07, 0.16);
        break;
      case 'win':
        playTone(ctx, NOTES.C5, 0, 0.14);
        playTone(ctx, NOTES.E5, 0.09, 0.14);
        playTone(ctx, NOTES.G5, 0.18, 0.14);
        playTone(ctx, NOTES.C6, 0.27, 0.28);
        break;
      case 'error':
        playTone(ctx, NOTES.Eb3, 0, 0.18, 0.2);
        break;
    }
  } catch {
    // Audio playback may be blocked prior to gesture
  }
}
