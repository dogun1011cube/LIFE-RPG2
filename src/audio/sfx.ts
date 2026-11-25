import type { SfxName } from '../game/types';

// ─────────────────────────────────────────────────────────────
// Chiptune SFX synthesised with WebAudio (no audio files needed).
// The game works fully without sound; everything is optional.
// ─────────────────────────────────────────────────────────────

let ac: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let volume = 0.6;
let musicOn = false;
let musicTimer: ReturnType<typeof setInterval> | null = null;

function ctx(): AudioContext | null {
  if (!enabled && !musicOn) return null;
  try {
    if (!ac) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = volume * 0.5;
      master.connect(ac.destination);
    }
    if (ac.state === 'suspended') void ac.resume();
    return ac;
  } catch {
    return null;
  }
}

export function setSound(on: boolean, vol: number) {
  enabled = on;
  volume = Math.max(0, Math.min(1, vol));
  if (master) master.gain.value = volume * 0.5;
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; slide?: number; delay?: number; attack?: number } = {}) {
  const a = ctx();
  if (!a || !master) return;
  const t0 = a.currentTime + (opts.delay || 0);
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = opts.type || 'square';
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t0 + dur);
  const v = (opts.vol ?? 0.25) * 0.6;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(v, t0 + (opts.attack ?? 0.005));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur: number, opts: { vol?: number; freq?: number; delay?: number; type?: BiquadFilterType } = {}) {
  const a = ctx();
  if (!a || !master) return;
  const t0 = a.currentTime + (opts.delay || 0);
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = opts.type || 'bandpass';
  f.frequency.value = opts.freq || 1800;
  const g = a.createGain();
  g.gain.value = (opts.vol ?? 0.3) * 0.6;
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(t0);
}

function arp(notes: number[], step: number, opts: { type?: OscillatorType; vol?: number; len?: number } = {}) {
  notes.forEach((n, i) => tone(n, opts.len ?? step * 1.6, { type: opts.type, vol: opts.vol, delay: i * step }));
}

const N = (semi: number) => 440 * Math.pow(2, (semi - 9) / 12); // semitones from C4

export function playSfx(name: SfxName) {
  if (!enabled) return;
  switch (name) {
    case 'click':
      tone(N(24), 0.04, { vol: 0.12 });
      break;
    case 'select':
      tone(N(19), 0.05, { vol: 0.12 });
      tone(N(24), 0.05, { vol: 0.12, delay: 0.04 });
      break;
    case 'confirm':
      arp([N(12), N(16), N(19)], 0.05, { vol: 0.16 });
      break;
    case 'cancel':
      tone(N(14), 0.08, { vol: 0.14, slide: N(7) });
      break;
    case 'error':
      tone(N(2), 0.14, { vol: 0.18, type: 'sawtooth' });
      tone(N(1), 0.14, { vol: 0.18, type: 'sawtooth', delay: 0.12 });
      break;
    case 'sword':
      noise(0.12, { vol: 0.35, freq: 3500, type: 'highpass' });
      tone(N(31), 0.08, { vol: 0.1, slide: N(19), type: 'triangle' });
      break;
    case 'hit':
      noise(0.1, { vol: 0.4, freq: 900 });
      tone(N(0), 0.1, { vol: 0.2, slide: N(-12), type: 'square' });
      break;
    case 'crit':
      noise(0.18, { vol: 0.5, freq: 1400 });
      tone(N(24), 0.16, { vol: 0.2, slide: N(0) });
      tone(N(36), 0.1, { vol: 0.15, delay: 0.05, type: 'triangle' });
      break;
    case 'magic':
      tone(N(24), 0.3, { vol: 0.16, slide: N(36), type: 'triangle' });
      tone(N(31), 0.3, { vol: 0.1, slide: N(43), type: 'sine', delay: 0.05 });
      break;
    case 'heal':
      arp([N(16), N(19), N(24), N(28)], 0.06, { type: 'triangle', vol: 0.15 });
      break;
    case 'buff':
      arp([N(12), N(19), N(24), N(31)], 0.05, { type: 'square', vol: 0.12 });
      break;
    case 'miss':
      tone(N(26), 0.1, { vol: 0.08, slide: N(20), type: 'sine' });
      break;
    case 'monsterAttack':
      noise(0.14, { vol: 0.35, freq: 600, type: 'lowpass' });
      tone(N(-5), 0.12, { vol: 0.2, slide: N(-17), type: 'sawtooth' });
      break;
    case 'playerHurt':
      tone(N(7), 0.15, { vol: 0.2, slide: N(-5), type: 'square' });
      noise(0.08, { vol: 0.25, freq: 1200 });
      break;
    case 'defeatMonster':
      noise(0.3, { vol: 0.3, freq: 800, type: 'lowpass' });
      arp([N(19), N(14), N(7), N(0)], 0.05, { vol: 0.12 });
      break;
    case 'slime':
      tone(N(12), 0.12, { vol: 0.18, slide: N(24), type: 'sine' });
      tone(N(5), 0.15, { vol: 0.14, slide: N(-2), type: 'sine', delay: 0.08 });
      break;
    case 'victory':
      arp([N(12), N(12), N(12), N(16), N(19), N(24)], 0.09, { vol: 0.18, len: 0.12 });
      tone(N(24), 0.5, { vol: 0.16, delay: 0.55, type: 'triangle' });
      tone(N(28), 0.5, { vol: 0.12, delay: 0.55 });
      break;
    case 'defeat':
      arp([N(12), N(8), N(5), N(0)], 0.18, { type: 'triangle', vol: 0.18, len: 0.3 });
      break;
    case 'levelUp':
      arp([N(12), N(16), N(19), N(24), N(28), N(31), N(36)], 0.07, { vol: 0.17 });
      tone(N(36), 0.6, { vol: 0.14, delay: 0.5, type: 'triangle' });
      tone(N(43), 0.6, { vol: 0.1, delay: 0.5 });
      break;
    case 'rankUp':
      arp([N(7), N(12), N(16), N(19), N(24)], 0.1, { vol: 0.18, len: 0.2 });
      tone(N(31), 0.8, { vol: 0.14, delay: 0.5, type: 'triangle' });
      break;
    case 'item':
      tone(N(24), 0.08, { vol: 0.15 });
      tone(N(31), 0.16, { vol: 0.15, delay: 0.07 });
      break;
    case 'coin':
      tone(N(35), 0.06, { vol: 0.14 });
      tone(N(40), 0.18, { vol: 0.14, delay: 0.06 });
      break;
    case 'study':
      arp([N(12), N(19), N(24), N(28), N(31)], 0.06, { vol: 0.15, type: 'triangle' });
      noise(0.2, { vol: 0.08, freq: 6000, type: 'highpass', delay: 0.2 });
      break;
    case 'quest':
      arp([N(19), N(24), N(28)], 0.08, { vol: 0.16 });
      tone(N(31), 0.3, { vol: 0.14, delay: 0.24, type: 'triangle' });
      break;
    case 'gachaCharge':
      tone(N(0), 1.2, { vol: 0.12, slide: N(36), type: 'sawtooth', attack: 0.2 });
      break;
    case 'gachaReveal':
      tone(N(24), 0.12, { vol: 0.14, type: 'triangle' });
      break;
    case 'gachaRare':
      arp([N(19), N(24), N(28), N(31)], 0.06, { vol: 0.16, type: 'triangle' });
      break;
    case 'gachaLegend':
      arp([N(12), N(16), N(19), N(24), N(28), N(31), N(36), N(40)], 0.06, { vol: 0.17 });
      tone(N(48), 0.9, { vol: 0.12, delay: 0.5, type: 'triangle' });
      noise(0.6, { vol: 0.1, freq: 7000, type: 'highpass', delay: 0.45 });
      break;
    case 'door':
      noise(0.4, { vol: 0.25, freq: 300, type: 'lowpass' });
      tone(N(-12), 0.3, { vol: 0.15, type: 'triangle' });
      break;
    case 'stairs':
      arp([N(0), N(4), N(7), N(12), N(16)], 0.06, { vol: 0.14, type: 'square' });
      break;
    case 'sleep':
      arp([N(16), N(12), N(7), N(4)], 0.2, { type: 'sine', vol: 0.15, len: 0.4 });
      break;
    case 'wake':
      arp([N(7), N(12), N(16), N(19), N(24)], 0.12, { type: 'triangle', vol: 0.16, len: 0.3 });
      break;
    case 'upgradeOk':
      noise(0.08, { vol: 0.3, freq: 3000, type: 'highpass' });
      arp([N(24), N(31), N(36)], 0.07, { vol: 0.16 });
      break;
    case 'upgradeFail':
      noise(0.1, { vol: 0.3, freq: 3000, type: 'highpass' });
      tone(N(7), 0.3, { vol: 0.16, slide: N(-5), type: 'sawtooth', delay: 0.08 });
      break;
    case 'chest':
      tone(N(0), 0.1, { vol: 0.14, type: 'square' });
      arp([N(12), N(16), N(19), N(24)], 0.06, { vol: 0.15, type: 'triangle' });
      break;
  }
}

// ── optional background music: tiny chiptune loop ──
const MELODY = [12, 16, 19, 24, 19, 16, 14, 17, 21, 26, 21, 17, 12, 16, 19, 23, 24, 19, 16, 12, 11, 14, 19, 14];
const BASS = [0, 0, 5, 5, 0, 0, 7, 7];

export function setMusic(on: boolean) {
  musicOn = on;
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
  if (!on) return;
  let i = 0;
  musicTimer = setInterval(() => {
    const a = ctx();
    if (!a || !master || !musicOn) return;
    const note = MELODY[i % MELODY.length];
    tone(N(note), 0.22, { type: 'triangle', vol: 0.05 });
    if (i % 3 === 0) tone(N(BASS[Math.floor(i / 3) % BASS.length] - 12), 0.5, { type: 'square', vol: 0.03 });
    i++;
  }, 260);
}
