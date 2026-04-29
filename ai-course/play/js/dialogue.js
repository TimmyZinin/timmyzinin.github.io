// dialogue.js — typewriter с tap-to-skip
// Один блок реплики появляется посимвольно, тап ускоряет/завершает

const TICK_MS = 30;          // мс на символ
const TAP_INSTANT = true;    // тап при анимации = мгновенно

export class Dialogue {
  constructor(container) {
    this.container = container;
    this.currentLine = null;
    this.tickTimer = null;
    this.onComplete = null;
    this.skipped = false;
    this.reducedMotion = false;
  }

  setReducedMotion(flag) {
    this.reducedMotion = flag;
  }

  show(line, onComplete) {
    this.cancel();
    this.currentLine = line;
    this.onComplete = onComplete;
    this.skipped = false;

    const speakerEl = this.container.querySelector('[data-role="speaker"]');
    const textEl = this.container.querySelector('[data-role="text"]');
    const arrowEl = this.container.querySelector('[data-role="arrow"]');

    speakerEl.textContent = line.speaker || '';
    textEl.textContent = '';
    arrowEl.style.opacity = '0';

    // Apply mode styling
    this.container.dataset.mode = line.mode || 'normal';

    if (this.reducedMotion) {
      // Skip animation entirely for accessibility
      textEl.textContent = line.text;
      arrowEl.style.opacity = '1';
      return;
    }

    let i = 0;
    const text = line.text;
    this.tickTimer = setInterval(() => {
      if (this.skipped || i >= text.length) {
        clearInterval(this.tickTimer);
        this.tickTimer = null;
        textEl.textContent = text;
        arrowEl.style.opacity = '1';
        return;
      }
      i++;
      textEl.textContent = text.slice(0, i);
    }, TICK_MS);
  }

  // User tapped: skip animation if running, else advance
  handleTap() {
    if (this.tickTimer) {
      // Animation is running — finish it instantly
      if (TAP_INSTANT) {
        this.skipped = true;
      }
      return;
    }
    // Animation done — advance to next line
    if (this.onComplete) {
      const cb = this.onComplete;
      this.onComplete = null;
      cb();
    }
  }

  cancel() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    this.currentLine = null;
    this.onComplete = null;
    this.skipped = false;
  }

  isAnimating() {
    return !!this.tickTimer;
  }
}
