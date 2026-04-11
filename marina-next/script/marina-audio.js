/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * «Марина в огне» v2.0b3 — audio module.
 * Uses Web Audio API for inline SFX synthesis.
 * Soundtrack: audio/soundtrack.mp3 («Двенадцать дней до конца месяца»),
 * played via HTMLAudioElement with fade-in/out + loop.
 * Mute default OFF (music-on by default). Tim Zinin (c) 2026.
 */

(function () {
  'use strict';

  var MUTE_KEY = 'marina-fire:v2.0:audio_muted';
  // Sequential playlist: main → «потолок не падает» → «обычный вторник» → repeat
  var PLAYLIST = [
    'audio/soundtrack.mp3',    // 1. «Двенадцать дней до конца месяца»
    'audio/soundtrack_2.mp3',  // 2. «потолок не падает»
    'audio/soundtrack_3.mp3'   // 3. «обычный вторник»
  ];
  // Finale track — interrupts rotation starting day 29+
  var FINALE_TRACK = 'audio/soundtrack_4.mp3'; // 4. «Тридцать дней до потолка»
  var MUSIC_VOL = 0.42; // sit under SFX (~-7 dB)

  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  var ctx = null;
  var masterGain = null;
  var muted = false; // default ON — real music now ships
  var soundtrack = null; // current HTMLAudioElement
  var trackIndex = 0;
  var inFinaleMode = false;
  var musicFadeTimer = null;
  var firstUnlockDone = false;

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
    // First-time unlock: lazy-instantiate the soundtrack and start if unmuted
    if (!firstUnlockDone) {
      firstUnlockDone = true;
      ensureSoundtrack();
      if (!muted) playMusic();
    }
  }

  // ===== soundtrack playlist =====

  function ensureSoundtrack() {
    if (soundtrack) return soundtrack;
    try {
      soundtrack = new Audio(PLAYLIST[trackIndex]);
      soundtrack.loop = false; // playlist mode: advance to next on ended
      soundtrack.preload = 'auto';
      soundtrack.volume = 0;
      soundtrack.addEventListener('ended', onTrackEnded);
      soundtrack.addEventListener('error', function () {
        console.warn('track ' + trackIndex + ' load failed, skipping');
        onTrackEnded();
      });
    } catch (e) {
      console.warn('soundtrack init failed', e);
      soundtrack = null;
    }
    return soundtrack;
  }

  function onTrackEnded() {
    // In finale mode — loop the finale track forever, don't advance playlist
    if (inFinaleMode) {
      if (soundtrack) {
        try {
          soundtrack.currentTime = 0;
          var p = soundtrack.play();
          if (p && typeof p.then === 'function') {
            p.catch(function () {});
          }
        } catch (e) {}
      }
      return;
    }
    // Normal rotation: advance to next track
    trackIndex = (trackIndex + 1) % PLAYLIST.length;
    if (soundtrack) {
      try {
        soundtrack.removeEventListener('ended', onTrackEnded);
        soundtrack.pause();
      } catch (e) {}
      soundtrack = null;
    }
    if (!muted) {
      ensureSoundtrack();
      var s = soundtrack;
      if (!s) return;
      try {
        var p = s.play();
        if (p && typeof p.then === 'function') {
          p.catch(function () {});
        }
        fadeTo(MUSIC_VOL, 1500);
      } catch (e) {}
    }
  }

  // Switch to finale track (called from day 29+) — overrides playlist rotation
  function playFinaleTrack() {
    if (inFinaleMode) return; // already in finale mode
    inFinaleMode = true;

    // Fade out current track, swap source, fade in
    fadeTo(0, 800, function () {
      if (soundtrack) {
        try {
          soundtrack.removeEventListener('ended', onTrackEnded);
          soundtrack.pause();
        } catch (e) {}
      }
      try {
        soundtrack = new Audio(FINALE_TRACK);
        soundtrack.loop = true; // real loop — no advance
        soundtrack.preload = 'auto';
        soundtrack.volume = 0;
        soundtrack.addEventListener('ended', onTrackEnded);
        soundtrack.addEventListener('error', function () {
          console.warn('finale track load failed');
          inFinaleMode = false;
        });
        if (!muted) {
          var p = soundtrack.play();
          if (p && typeof p.then === 'function') {
            p.catch(function () {});
          }
          fadeTo(MUSIC_VOL, 2000);
        }
      } catch (e) {
        console.warn('finale track init error', e);
        inFinaleMode = false;
      }
    });
  }

  function clearFade() {
    if (musicFadeTimer) {
      clearInterval(musicFadeTimer);
      musicFadeTimer = null;
    }
  }

  function fadeTo(target, durationMs, onDone) {
    if (!soundtrack) { if (onDone) onDone(); return; }
    clearFade();
    var startVol = soundtrack.volume || 0;
    var delta = target - startVol;
    var steps = Math.max(1, Math.floor(durationMs / 40));
    var i = 0;
    musicFadeTimer = setInterval(function () {
      i += 1;
      var progress = Math.min(1, i / steps);
      // Ease-out cubic
      var eased = 1 - Math.pow(1 - progress, 3);
      if (soundtrack) {
        soundtrack.volume = Math.max(0, Math.min(1, startVol + delta * eased));
      }
      if (progress >= 1) {
        clearFade();
        if (onDone) onDone();
      }
    }, 40);
  }

  function playMusic() {
    var s = ensureSoundtrack();
    if (!s) return;
    try {
      var p = s.play();
      if (p && typeof p.then === 'function') {
        p.catch(function () { /* autoplay blocked — will retry on next user click */ });
      }
      fadeTo(MUSIC_VOL, 1500);
    } catch (e) { /* noop */ }
  }

  function stopMusic() {
    if (!soundtrack) return;
    fadeTo(0, 600, function () {
      try { soundtrack.pause(); } catch (e) {}
    });
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

  // ===== mute toggle =====

  function isMuted() { return muted; }

  function setMuted(v) {
    muted = !!v;
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) {}
    // SFX master gain follows mute
    if (masterGain && ctx) {
      masterGain.gain.setValueAtTime(muted ? 0 : 1, ctx.currentTime);
    }
    // Music: fade in / out
    if (muted) {
      stopMusic();
    } else {
      unlock();
      playMusic();
    }
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
      // Default: music ON (saved === null → not muted)
      muted = saved === '1';
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
    isMuted: isMuted,
    playMusic: playMusic,
    stopMusic: stopMusic,
    playFinaleTrack: playFinaleTrack
  };
})();
