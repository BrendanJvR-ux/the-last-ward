// A small synthesized horn: no audio files needed.
let ctx: AudioContext | null = null;
let muted = false;
try { muted = localStorage.getItem('lastward.muted') === '1'; } catch { /* storage unavailable */ }

/** Browsers only allow sound after a user gesture: call this from one. */
export function unlockAudio() {
  if (ctx) { if (ctx.state === 'suspended') void ctx.resume(); return; }
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (AC) ctx = new AC();
}

export function isMuted() { return muted; }
export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem('lastward.muted', m ? '1' : '0'); } catch { /* ignore */ }
}

function hornNote(start: number, dur: number, freq: number) {
  if (!ctx) return;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0, start);
  out.gain.linearRampToValueAtTime(0.22, start + 0.08);
  out.gain.setValueAtTime(0.22, start + dur - 0.15);
  out.gain.linearRampToValueAtTime(0, start + dur);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(500, start); lp.frequency.linearRampToValueAtTime(1300, start + 0.12); lp.Q.value = 2;
  lp.connect(out); out.connect(ctx.destination);
  for (const [type, mul, gain] of [['sawtooth', 1, 0.6], ['square', 0.5, 0.25], ['triangle', 2, 0.2]] as const) {
    const o = ctx.createOscillator();
    const g = ctx.createGain(); g.gain.value = gain;
    o.type = type;
    o.frequency.setValueAtTime(freq * mul * 0.94, start);
    o.frequency.linearRampToValueAtTime(freq * mul, start + 0.1);
    // a little vibrato, like a player's breath
    const lfo = ctx.createOscillator(); const lg = ctx.createGain();
    lfo.frequency.value = 5.5; lg.gain.value = freq * mul * 0.008;
    lfo.connect(lg); lg.connect(o.frequency);
    o.connect(g); g.connect(lp);
    o.start(start); o.stop(start + dur + 0.05); lfo.start(start); lfo.stop(start + dur + 0.05);
  }
}

/** The hunt-master's double horn, loosing the war dogs. */
export function playDoubleHorn() {
  if (muted || !ctx) return;
  const t = ctx.currentTime + 0.02;
  hornNote(t, 0.55, 147);
  hornNote(t + 0.72, 0.9, 147);
}
