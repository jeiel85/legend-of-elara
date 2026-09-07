// WebAudio synthesized SFX + tiny procedural music loop. No assets.
const MUTE_KEY = 'elara.muted';

class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = false;
    this.musicMode = 'overworld'; // overworld | dungeon | boss | title | off
    this._step = 0;
    this._nextNoteTime = 0;
    this._timer = null;
    try {
      if (typeof localStorage !== 'undefined') {
        this.muted = localStorage.getItem(MUTE_KEY) === '1';
      }
    } catch (e) { /* ignore */ }
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = typeof AudioContext !== 'undefined' ? AudioContext
        : (typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null);
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.9;
      this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.35;
      this.musicGain.connect(this.master);
      this._startScheduler();
      return true;
    } catch (e) {
      return false;
    }
  }

  setMuted(m) {
    this.muted = !!m;
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch (e) { /* ignore */ }
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime, 0.02);
    }
  }

  toggleMute() {
    this.ensure();
    this.setMuted(!this.muted);
    return this.muted;
  }

  setMusicMode(mode) {
    this.musicMode = mode;
  }

  _tone(freq, dur, type, vol, when, slideTo) {
    if (!this.ctx || this.muted) return;
    const t = when !== undefined ? when : this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  _noise(dur, vol, when, lowpass) {
    if (!this.ctx || this.muted) return;
    const t = when !== undefined ? when : this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    let node = src;
    if (lowpass) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lowpass;
      node.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(this.sfxGain);
    src.start(t);
  }

  // ---- SFX ----
  swing() { this.ensure(); this._noise(0.08, 0.15, undefined, 3000); this._tone(600, 0.07, 'square', 0.06, undefined, 200); }
  hit() { this.ensure(); this._tone(220, 0.08, 'square', 0.2, undefined, 90); this._noise(0.06, 0.12, undefined, 2000); }
  hurt() { this.ensure(); this._tone(180, 0.25, 'sawtooth', 0.25, undefined, 60); }
  pickup() { this.ensure(); const t = this.ctx ? this.ctx.currentTime : 0; this._tone(660, 0.08, 'square', 0.15, t); this._tone(990, 0.12, 'square', 0.15, t + 0.08); }
  gem() { this.ensure(); this._tone(1200, 0.06, 'square', 0.1, undefined, 1600); }
  door() { this.ensure(); this._tone(120, 0.3, 'triangle', 0.25, undefined, 60); this._noise(0.2, 0.08, undefined, 800); }
  secret() { this.ensure(); if (!this.ctx) return; const t = this.ctx.currentTime; const n = [523, 659, 784, 1046]; n.forEach((f, i) => this._tone(f, 0.14, 'square', 0.14, t + i * 0.11)); }
  roar() { this.ensure(); this._tone(90, 0.6, 'sawtooth', 0.3, undefined, 40); this._noise(0.5, 0.15, undefined, 500); }
  blip() { this.ensure(); this._tone(800 + Math.random() * 200, 0.03, 'square', 0.06); }
  shoot() { this.ensure(); this._tone(900, 0.08, 'square', 0.12, undefined, 300); }
  boom() { this.ensure(); this._noise(0.5, 0.35, undefined, 900); this._tone(70, 0.4, 'sine', 0.3, undefined, 30); }
  splash() { this.ensure(); this._noise(0.2, 0.15, undefined, 1200); }
  key() { this.ensure(); if (!this.ctx) return; const t = this.ctx.currentTime; this._tone(520, 0.1, 'triangle', 0.2, t); this._tone(780, 0.15, 'triangle', 0.2, t + 0.1); }
  heal() { this.ensure(); if (!this.ctx) return; const t = this.ctx.currentTime; this._tone(440, 0.12, 'sine', 0.2, t); this._tone(660, 0.15, 'sine', 0.2, t + 0.1); }
  unlock() { this.ensure(); if (!this.ctx) return; const t = this.ctx.currentTime; this._tone(300, 0.1, 'square', 0.15, t, 600); this._tone(600, 0.15, 'square', 0.15, t + 0.1, 900); }

  // ---- music: tiny step sequencer ----
  _startScheduler() {
    if (this._timer) return;
    this._nextNoteTime = this.ctx.currentTime + 0.1;
    this._step = 0;
    const tick = () => {
      if (!this.ctx) return;
      while (this._nextNoteTime < this.ctx.currentTime + 0.25) {
        this._playStep(this._step, this._nextNoteTime);
        const tempo = this.musicMode === 'boss' ? 0.14 : this.musicMode === 'dungeon' ? 0.22 : 0.19;
        this._nextNoteTime += tempo;
        this._step = (this._step + 1) % 64;
      }
    };
    this._timer = setInterval(tick, 80);
  }

  _playStep(step, t) {
    if (!this.ctx || this.muted || this.musicMode === 'off') return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.connect(g);
    g.connect(this.musicGain);
    let scale;
    let base = 220;
    let wave = 'square';
    if (this.musicMode === 'title') { base = 261.6; scale = [0, 4, 7, 12, 7, 4, 2, 4]; }
    else if (this.musicMode === 'dungeon') { base = 146.8; scale = [0, 0, 3, 0, 5, 3, 2, 1]; wave = 'triangle'; }
    else if (this.musicMode === 'boss') { base = 164.8; scale = [0, 1, 0, 1, 0, 6, 5, 3]; wave = 'sawtooth'; }
    else { base = 246.9; scale = [0, 4, 7, 12, 9, 7, 4, 2]; }
    const semi = scale[step % scale.length] + (Math.floor(step / 16) % 2 === 1 ? -2 : 0);
    const freq = base * Math.pow(2, semi / 12);
    // sparse: play melody every step, bass every 4
    o.type = wave;
    o.frequency.value = freq;
    const vol = step % 2 === 0 ? 0.5 : 0.25;
    g.gain.setValueAtTime(0.0, t);
    g.gain.linearRampToValueAtTime(vol * 0.4, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.start(t);
    o.stop(t + 0.2);
    if (step % 8 === 0) {
      const b = this.ctx.createOscillator();
      const bg = this.ctx.createGain();
      b.connect(bg);
      bg.connect(this.musicGain);
      b.type = 'triangle';
      b.frequency.value = base / 2;
      bg.gain.setValueAtTime(0.4, t);
      bg.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      b.start(t);
      b.stop(t + 0.32);
    }
  }
}

export const audio = new AudioSys();
