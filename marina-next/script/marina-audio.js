/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * «Марина в огне» v2.0b2 — audio module.
 * Uses Web Audio API for inline SFX synthesis + 8-bit ambient pattern.
 * No external files. Mute default ON (opt-in via toggle).
 * (c) 2026 Tim Zinin.
 */

(function () {
  'use strict';

  var MUTE_KEY = 'marina-fire:v2.0:audio_muted';

  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  var ctx = null;
  var masterGain = null;
  var muted = true;
  var ambientTimer = null;
  var ambientStep = 0;

  function initCtx() {
    if (ctx) return;
    try {
      ctx = new AudioCtx();
      masterGain = ctx.createGain();
      masterGain.gain.value = muted ? 0 : 1;
      masterGain.connect(ctx.destination);
    } catch (e) {
      console.warn('AudioContext init failed', e);
    }
  }

  function unlock() {
    if (!ctx) initCtx();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  // ===== SFX synthesizers =====

  function click() {
    if (muted || !ctx) return;
    var t = ctx.currentTime;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.05);
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  function typing() {
    if (muted || !ctx) return;
    var t = ctx.currentTime;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 800 + Math.random() * 400;
    g.gain.setValueAtTime(0.04, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  function messagePing() {
    if (muted || !ctx) return;
    var t = ctx.currentTime;
    // Two-tone bell
    [[900, 0], [1400, 0.08]].forEach(function (pair) {
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = pair[0];
      g.gain.setValueAtTime(0, t + pair[1]);
      g.gain.linearRampToValueAtTime(0.15, t + pair[1] + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + pair[1] + 0.4);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(t + pair[1]);
      osc.stop(t + pair[1] + 0.45);
    });
  }

  function bankDing() {
    if (muted || !ctx) return;
    var t = ctx.currentTime;
    var freqs = [1000, 1500];
    freqs.forEach(function (f, i) {
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      var start = t + i * 0.05;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.12, start + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  function dayEnd() {
    if (muted || !ctx) return;
    var t = ctx.currentTime;
    // Descending pad sweep
    [400, 300, 200].forEach(function (f, i) {
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      var start = t + i * 0.15;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.08, start + 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.8);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(start);
      osc.stop(start + 0.85);
    });
  }

  // ===== 8-bit ambient loop (simple chiptune arp) =====

  var AMBIENT_NOTES = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63]; // C4-E4-G4-C5-G4-E4

  function ambientTick() {
    if (muted || !ctx) return;
    var t = ctx.currentTime;
    var freq = AMBIENT_NOTES[ambientStep % AMBIENT_NOTES.length];
    ambientStep += 1;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.03, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  function startAmbient() {
    if (ambientTimer) return;
    ambientStep = 0;
    ambientTick();
    ambientTimer = setInterval(ambientTick, 600); // 100 BPM
  }

  function stopAmbient() {
    if (ambientTimer) {
      clearInterval(ambientTimer);
      ambientTimer = null;
    }
  }

  // ===== mute toggle =====

  function isMuted() { return muted; }

  function setMuted(v) {
    muted = !!v;
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) {}
    if (masterGain && ctx) {
      masterGain.gain.setValueAtTime(muted ? 0 : 1, ctx.currentTime);
    }
    if (muted) {
      stopAmbient();
    } else {
      unlock();
      startAmbient();
    }
    // Update toggle button if present
    var btn = document.getElementById('audio-toggle');
    if (btn) btn.textContent = muted ? '🔇' : '🔊';
  }

  function toggle() {
    setMuted(!muted);
  }

  // ===== init =====

  function init() {
    try {
      var saved = localStorage.getItem(MUTE_KEY);
      muted = saved === null ? true : saved === '1';
    } catch (e) {}
  }

  init();

  // Expose globally
  window.MarinaAudio = {
    unlock: unlock,
    click: click,
    typing: typing,
    messagePing: messagePing,
    bankDing: bankDing,
    dayEnd: dayEnd,
    toggle: toggle,
    setMuted: setMuted,
    isMuted: isMuted
  };
})();
