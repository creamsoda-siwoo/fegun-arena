// Tiny procedural sound kit (WebAudio), no assets.
let ctx = null, master = null;

function init() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.45; master.connect(ctx.destination);
  } catch (e) { ctx = null; }
}
function noise(dur, freq, q, vol, type) {
  if (!ctx) return;
  const n = Math.max(1, ctx.sampleRate * dur | 0), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(master); src.start();
}
function tone(f0, f1, dur, vol, type) {
  if (!ctx) return;
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}

export const SFX = {
  init,
  close() { if (ctx) { try { ctx.close(); } catch (e) { /* already closed */ } } ctx = null; master = null; },
  swing() { noise(0.12, 2200, 0.7, 0.22, 'highpass'); },
  hit(h) { noise(h ? 0.22 : 0.1, h ? 700 : 1400, 1, h ? 0.9 : 0.6); tone(h ? 150 : 230, 45, h ? 0.25 : 0.12, h ? 0.6 : 0.35, 'square'); },
  block() { tone(1100, 700, 0.07, 0.2, 'triangle'); noise(0.05, 3200, 2, 0.3); },
  special() { tone(260, 880, 0.28, 0.22, 'sawtooth'); },
  ult() { tone(70, 520, 1.0, 0.4, 'sawtooth'); noise(0.9, 380, 0.5, 0.5, 'lowpass'); },
  boom() { tone(120, 28, 0.9, 0.9); noise(0.7, 260, 0.7, 0.8, 'lowpass'); },
  thud() { tone(90, 40, 0.18, 0.4); },
  jump() { tone(320, 520, 0.08, 0.1, 'triangle'); },
  zap() { noise(0.18, 4000, 0.5, 0.5, 'highpass'); tone(1600, 200, 0.15, 0.2, 'square'); },
  ice() { tone(1800, 2600, 0.15, 0.12, 'triangle'); noise(0.2, 6000, 1, 0.25, 'highpass'); },
  pick() { tone(660, 990, 0.08, 0.18, 'triangle'); },
  bell() { tone(880, 860, 0.5, 0.2, 'triangle'); tone(1320, 1300, 0.4, 0.08); },
};
