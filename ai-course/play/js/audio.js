// audio.js — Web Audio с lazy-load
// Создаётся на первом user gesture (TG webview блокирует autoplay).
// Если SFX-файлы не найдены — silently fail (игра должна работать без аудио).

const SFX_PATHS = {
  click: 'assets/audio/sfx-click.mp3',
  correct: 'assets/audio/sfx-correct.mp3',
  wrong: 'assets/audio/sfx-wrong.mp3',
  badge: 'assets/audio/sfx-badge.mp3',
  chapterEnd: 'assets/audio/sfx-chapter.mp3',
  terminal: 'assets/audio/sfx-terminal.mp3',
  tick: 'assets/audio/sfx-tick.mp3',
};

const AMBIENT_PATH = 'assets/audio/ambient-loop.mp3';

export class Audio {
  constructor() {
    this.ctx = null;
    this.buffers = {};
    this.ambientNode = null;
    this.muted = false;
    this.loaded = false;
    this.masterGain = null;
  }

  setMuted(flag) {
    this.muted = flag;
    if (this.masterGain) {
      this.masterGain.gain.value = flag ? 0 : 1;
    }
  }

  async init() {
    if (this.loaded) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 1;
      this.masterGain.connect(this.ctx.destination);

      // Resume if suspended (Safari iOS)
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      // Load all SFX in parallel; failures are non-fatal
      const entries = Object.entries(SFX_PATHS);
      await Promise.all(
        entries.map(([name, path]) => this.loadBuffer(name, path).catch(() => null))
      );

      this.loaded = true;
    } catch (e) {
      console.warn('Audio init failed:', e);
    }
  }

  async loadBuffer(name, path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`SFX not found: ${path}`);
    const arrayBuffer = await res.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.buffers[name] = audioBuffer;
  }

  play(name) {
    if (this.muted || !this.ctx || !this.buffers[name]) return;
    try {
      const source = this.ctx.createBufferSource();
      source.buffer = this.buffers[name];
      source.connect(this.masterGain);
      source.start(0);
    } catch (e) {
      // Silently fail
    }
  }

  async startAmbient() {
    if (this.muted || !this.ctx || this.ambientNode) return;
    try {
      const res = await fetch(AMBIENT_PATH);
      if (!res.ok) return;
      const arrayBuffer = await res.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);

      const source = this.ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = true;

      const ambientGain = this.ctx.createGain();
      ambientGain.gain.value = 0.3;

      source.connect(ambientGain);
      ambientGain.connect(this.masterGain);
      source.start(0);

      this.ambientNode = source;
    } catch (e) {
      // Silently fail
    }
  }

  stopAmbient() {
    if (this.ambientNode) {
      try {
        this.ambientNode.stop(0);
      } catch {}
      this.ambientNode = null;
    }
  }
}
