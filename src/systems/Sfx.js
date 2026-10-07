// Tiny procedural sound effects on top of Phaser's Web Audio context.
// Every call is a silent no-op when audio is unavailable or still locked.

const MASTER_VOLUME = 0.25;
const SHOT_MIN_GAP = 0.09;
const EXPLODE_MIN_GAP = 0.04;
const BLAST_MIN_GAP = 0.06;

export default class Sfx {
  constructor(scene) {
    this.ctx = scene.sound && scene.sound.context ? scene.sound.context : null;
    this.lastShotAt = 0;
    this.lastExplodeAt = 0;
    this.lastBlastAt = 0;
    this.master = null;
    this.noiseBuffer = null;
  }

  ready() {
    if (!this.ctx || this.ctx.state !== 'running') return false;
    if (!this.master) {
      this.master = this.ctx.createGain();
      this.master.gain.value = MASTER_VOLUME;
      this.master.connect(this.ctx.destination);
    }
    return true;
  }

  tone(freq, freqEnd, duration, type, volume, delay = 0) {
    if (!this.ready()) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  noise(duration, volume, cutoff) {
    if (!this.ready()) return;
    if (!this.noiseBuffer) {
      const length = this.ctx.sampleRate;
      this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    }
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    src.buffer = this.noiseBuffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t);
    src.stop(t + duration + 0.02);
  }

  shoot() {
    if (!this.ready()) return;
    if (this.ctx.currentTime - this.lastShotAt < SHOT_MIN_GAP) return;
    this.lastShotAt = this.ctx.currentTime;
    this.tone(880, 440, 0.05, 'square', 0.04);
  }

  explode() {
    if (!this.ready()) return;
    if (this.ctx.currentTime - this.lastExplodeAt < EXPLODE_MIN_GAP) return;
    this.lastExplodeAt = this.ctx.currentTime;
    this.noise(0.25, 0.35, 2400);
  }

  bigExplosion() {
    this.noise(0.9, 0.6, 3000);
    this.tone(120, 40, 0.8, 'sawtooth', 0.2);
  }

  playerHit() {
    this.tone(220, 70, 0.3, 'sawtooth', 0.3);
    this.noise(0.2, 0.25, 1200);
  }

  levelUp() {
    this.tone(660, null, 0.08, 'square', 0.12);
    this.tone(990, null, 0.12, 'square', 0.12, 0.07);
  }

  droneShot() {
    this.tone(1800, 900, 0.06, 'square', 0.06);
  }

  teslaArc() {
    this.noise(0.12, 0.18, 6000);
    this.tone(90, 60, 0.1, 'sawtooth', 0.08);
  }

  // Railgun detonations can come several per frame against a dense pattern, so they're throttled.
  railBlast() {
    if (!this.ready()) return;
    if (this.ctx.currentTime - this.lastBlastAt < BLAST_MIN_GAP) return;
    this.lastBlastAt = this.ctx.currentTime;
    this.noise(0.1, 0.2, 5000);
    this.tone(1400, 500, 0.08, 'square', 0.05);
  }

  deflect() {
    this.tone(400, 1200, 0.12, 'triangle', 0.18);
  }

  denied() {
    this.tone(160, 120, 0.18, 'square', 0.15);
  }

  abilityCollect() {
    this.tone(520, 1040, 0.15, 'triangle', 0.25);
  }

  abilityActivate() {
    this.tone(200, 900, 0.3, 'sawtooth', 0.15);
  }

  nova() {
    this.noise(0.6, 0.5, 4000);
    this.tone(90, 30, 0.6, 'sine', 0.4);
  }

  bossWarning() {
    this.tone(180, 140, 0.45, 'square', 0.2);
    this.tone(180, 140, 0.45, 'square', 0.2, 0.6);
    this.tone(180, 140, 0.45, 'square', 0.2, 1.2);
  }

  prestige() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, null, 0.18, 'triangle', 0.25, i * 0.1));
  }
}
