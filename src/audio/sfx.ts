import { useUi } from '../state/uiStore';

// Procedural WebAudio sound effects (no audio assets needed). The AudioContext is
// created lazily on the first user gesture, as browsers require.

export type Sfx = 'swing' | 'hit' | 'hurt' | 'collect' | 'build' | 'click' | 'error' | 'levelup' | 'quest' | 'research' | 'kill' | 'shoot' | 'craft';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

function ensure() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch {
    ctx = null;
  }
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, slideTo?: number) {
  const c = ctx!;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master!);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur: number, vol: number, freq: number, q = 1, delay = 0) {
  const c = ctx!;
  const t = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(freq, t);
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master!);
  src.start(t);
  src.stop(t + dur + 0.02);
}

export function playSfx(name: Sfx) {
  const { muted, volume } = useUi.getState().settings;
  if (muted || volume <= 0) return;
  if (!ensure() || !master) return;
  if (ctx!.state === 'suspended') void ctx!.resume();
  master.gain.value = volume * 0.5;
  switch (name) {
    case 'swing':
      noise(0.16, 0.35, 1800, 0.8);
      break;
    case 'hit':
      noise(0.08, 0.5, 600, 1.5);
      tone(180, 0.12, 'square', 0.12, 0, 90);
      break;
    case 'hurt':
      tone(220, 0.25, 'sawtooth', 0.15, 0, 80);
      break;
    case 'collect':
      tone(880, 0.12, 'sine', 0.18);
      tone(1320, 0.18, 'sine', 0.14, 0.07);
      break;
    case 'build':
      noise(0.25, 0.4, 220, 1);
      tone(110, 0.3, 'triangle', 0.25, 0, 70);
      tone(660, 0.15, 'sine', 0.1, 0.18);
      break;
    case 'click':
      tone(1200, 0.04, 'square', 0.05);
      break;
    case 'error':
      tone(160, 0.18, 'square', 0.1);
      tone(120, 0.2, 'square', 0.1, 0.1);
      break;
    case 'levelup':
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, 'triangle', 0.16, i * 0.09));
      break;
    case 'quest':
      [392, 523, 659].forEach((f, i) => tone(f, 0.35, 'sine', 0.16, i * 0.12));
      break;
    case 'research':
      tone(440, 0.4, 'sine', 0.14, 0, 880);
      tone(1320, 0.3, 'sine', 0.08, 0.2);
      break;
    case 'kill':
      noise(0.3, 0.3, 400, 0.7);
      tone(300, 0.3, 'sine', 0.12, 0, 60);
      break;
    case 'shoot':
      tone(1400, 0.1, 'sawtooth', 0.06, 0, 300);
      break;
    case 'craft':
      noise(0.06, 0.3, 3000, 2);
      noise(0.06, 0.3, 3000, 2, 0.12);
      tone(990, 0.2, 'sine', 0.1, 0.22);
      break;
  }
}
