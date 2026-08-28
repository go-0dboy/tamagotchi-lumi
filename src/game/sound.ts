/* ============================================================
 * Мягкий синтезаторный звук (WebAudio, без аудиофайлов).
 * ============================================================ */
let ctx: AudioContext | null = null;
let enabled = true;

export const setSoundEnabled = (v: boolean) => { enabled = v; };
export const soundEnabled = () => enabled;

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.12, delay = 0, glide = 0) {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + glide), t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}

const SCALE = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5];

export const sfx = {
  pop() { tone(520, 0.12, 'sine', 0.14, 0, -180); },
  chime() { tone(880, 0.5, 'sine', 0.08); tone(1320, 0.6, 'sine', 0.05, 0.09); },
  sparkle() { tone(1560, 0.25, 'triangle', 0.07); tone(2080, 0.3, 'triangle', 0.05, 0.07); tone(2600, 0.35, 'triangle', 0.04, 0.15); },
  purr() { tone(140, 0.5, 'sine', 0.1, 0, -20); tone(110, 0.55, 'sine', 0.07, 0.12, -15); },
  eat() { tone(300, 0.1, 'triangle', 0.12, 0, 90); tone(380, 0.12, 'triangle', 0.1, 0.1, 60); },
  sad() { tone(392, 0.5, 'sine', 0.08, 0, -80); tone(311, 0.6, 'sine', 0.06, 0.18, -60); },
  coin() { tone(988, 0.14, 'square', 0.05); tone(1319, 0.25, 'square', 0.04, 0.08); },
  levelup() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, 'triangle', 0.08, i * 0.1)); },
  hatch() { [392, 494, 587, 784, 988].forEach((f, i) => tone(f, 0.3, 'sine', 0.09, i * 0.09)); },
  bubble() { tone(700 + Math.random() * 300, 0.08, 'sine', 0.06); },
  tap() { tone(440 + Math.random() * 120, 0.06, 'sine', 0.05); },
  splash() { tone(300, 0.3, 'sine', 0.1, 0, 250); tone(500, 0.25, 'sine', 0.07, 0.1, 300); },
  note(i: number) { tone(SCALE[Math.max(0, Math.min(SCALE.length - 1, i))], 0.38, 'triangle', 0.13); },
};
