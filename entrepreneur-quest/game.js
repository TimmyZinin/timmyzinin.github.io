/* game.js — Entrepreneur Quest core engine */
(function () {
  'use strict';

  // ============ State ============
  const STATE = {
    scenes: null,
    dialogues: null,
    order: [],       // ordered scene objects for this run
    idx: 0,
    resources: { energy: 50, cash: 50, time: 50, rep: 50 },
    archetype: null,
    gameOverReason: null,
  };

  // ============ Utils ============
  function $(id) { return document.getElementById(id); }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function noise(range) { return Math.floor((Math.random() * 2 - 1) * range); }

  function setScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
      s.hidden = true;
      s.classList.remove('screen-active');
    });
    const el = $(id);
    if (el) {
      el.hidden = false;
      el.classList.add('screen-active');
      // Move keyboard focus to first actionable element in new screen
      const focusable = el.querySelector('button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])');
      if (focusable) {
        setTimeout(() => focusable.focus({ preventScroll: true }), 50);
      }
    }
    window.scrollTo(0, 0);
  }

  function track(event, props) {
    if (window.EQLead) window.EQLead.track(event, props);
  }

  // ============ Audio ============
  const AUDIO = {
    bgm: null,
    sfx: {},
    muted: false,
  };

  function audioInit() {
    AUDIO.bgm = $('bgm');
    if (AUDIO.bgm) AUDIO.bgm.volume = 0.5;
    ['click', 'up', 'down', 'turn', 'success'].forEach(k => {
      AUDIO.sfx[k] = $('sfx-' + k);
      if (AUDIO.sfx[k]) AUDIO.sfx[k].volume = 0.7;
    });
    AUDIO.muted = sessionStorage.getItem('eq:mute') === '1';
    applyMute();
  }

  function playBgm() {
    if (!AUDIO.bgm || AUDIO.muted) return;
    try {
      const p = AUDIO.bgm.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) { /* noop */ }
  }

  function playSfx(key) {
    const el = AUDIO.sfx[key];
    if (!el || AUDIO.muted) return;
    try {
      el.currentTime = 0;
      const p = el.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) { /* noop */ }
  }

  function duckBgm(duck) {
    if (!AUDIO.bgm) return;
    AUDIO.bgm.volume = duck ? 0.15 : 0.5;
  }

  function applyMute() {
    if (AUDIO.bgm) AUDIO.bgm.muted = AUDIO.muted;
    Object.values(AUDIO.sfx).forEach(el => { if (el) el.muted = AUDIO.muted; });
    const btn = $('mute-toggle');
    if (btn) {
      btn.setAttribute('aria-pressed', AUDIO.muted ? 'true' : 'false');
      btn.querySelector('.mute-on').hidden = AUDIO.muted;
      btn.querySelector('.mute-off').hidden = !AUDIO.muted;
    }
  }

  function toggleMute() {
    AUDIO.muted = !AUDIO.muted;
    sessionStorage.setItem('eq:mute', AUDIO.muted ? '1' : '0');
    applyMute();
    if (!AUDIO.muted) playBgm();
  }

  // ============ Scene picker (3-act, mirrors tools/simulate.js) ============
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickScenes(allScenes) {
    const fixedFirst = allScenes.find(s => s.fixed === 'first');
    const fixedPen = allScenes.find(s => s.fixed === 'penultimate');
    const fixedLast = allScenes.find(s => s.fixed === 'last');
    const act1NonFixed = allScenes.filter(s => s.act === 1 && !s.fixed);
    const act2Pool = shuffle(allScenes.filter(s => s.act === 2 && !s.fixed));
    const act1Pick = act1NonFixed[0] || act2Pool.shift();
    const act2Picks = act2Pool.slice(0, 3);
    return [fixedFirst, act1Pick, ...act2Picks, fixedPen, fixedLast];
  }

  // ============ Rendering ============
  function renderHUD() {
    $('hud-energy').textContent = STATE.resources.energy;
    $('hud-cash').textContent = STATE.resources.cash;
    $('hud-time').textContent = STATE.resources.time;
    $('hud-rep').textContent = STATE.resources.rep;
    $('scene-progress-current').textContent = String(STATE.idx + 1);
    $('scene-progress-total').textContent = String(STATE.order.length);
  }

  function flashResource(key, direction) {
    const el = document.querySelector(`.hud-res[data-res="${key}"]`);
    if (!el) return;
    el.classList.add(direction === 'up' ? 'flash-up' : 'flash-down');
    setTimeout(() => {
      el.classList.remove('flash-up');
      el.classList.remove('flash-down');
    }, 500);
  }

  function renderScene() {
    const scene = STATE.order[STATE.idx];
    if (!scene) return;
    $('scene-image').style.backgroundImage = `url('${scene.scene_image}')`;
    $('scene-headline').textContent = scene.headline;
    $('scene-intro').textContent = scene.intro || '';
    $('scene-internal').textContent = scene.internal || '';
    $('scene-dilemma').textContent = scene.dilemma || '';

    const choicesEl = $('scene-choices');
    choicesEl.innerHTML = '';
    scene.choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice-btn';
      btn.setAttribute('data-choice', choice.id);
      const labelSpan = document.createElement('span');
      labelSpan.className = 'choice-label';
      labelSpan.textContent = choice.label;
      const previewSpan = document.createElement('span');
      previewSpan.className = 'choice-preview';
      previewSpan.textContent = renderPreview(choice.preview);
      btn.appendChild(labelSpan);
      btn.appendChild(previewSpan);
      btn.addEventListener('click', () => onChoiceMade(choice));
      choicesEl.appendChild(btn);
    });

    renderHUD();
    track('scene_view', { scene_id: scene.id, idx: STATE.idx });
  }

  function renderPreview(preview) {
    if (!preview) return '';
    const parts = [];
    const icons = { energy: '⚡', cash: '₽', time: '⏳', rep: '★' };
    const arrows = { up: '↑', down: '↓', flat: '→', risk: '⚡' };
    Object.keys(preview).forEach(k => {
      const icon = icons[k] || k[0];
      const arrow = arrows[preview[k]] || '';
      parts.push(icon + arrow);
    });
    return parts.join(' ');
  }

  function onChoiceMade(choice) {
    playSfx('click');
    const deltas = choice.deltas || {};
    const applied = {};
    Object.keys(deltas).forEach(k => {
      const delta = (deltas[k] || 0) + noise(STATE.scenes.meta.noise_range);
      applied[k] = delta;
      STATE.resources[k] = clamp(STATE.resources[k] + delta, 0, 100);
      if (delta > 0) {
        flashResource(k, 'up');
        playSfx('up');
      } else if (delta < 0) {
        flashResource(k, 'down');
        playSfx('down');
      }
    });
    track('choice_made', {
      scene_id: STATE.order[STATE.idx].id,
      choice: choice.id,
      energy: STATE.resources.energy,
      cash: STATE.resources.cash,
      time: STATE.resources.time,
      rep: STATE.resources.rep,
    });

    renderOutcome(choice, applied);
  }

  function renderOutcome(choice, applied) {
    $('outcome-headline').textContent = 'Результат';
    $('outcome-text').textContent = choice.outcome || '';
    const deltasEl = $('outcome-deltas');
    deltasEl.innerHTML = '';
    Object.keys(applied).forEach(k => {
      if (!applied[k]) return;
      const span = document.createElement('span');
      span.className = 'delta ' + (applied[k] > 0 ? 'up' : 'down');
      const labels = { energy: 'Энергия', cash: 'Деньги', time: 'Время', rep: 'Репутация' };
      span.textContent = labels[k] + ' ' + (applied[k] > 0 ? '+' : '') + applied[k];
      deltasEl.appendChild(span);
    });
    setScreen('outcome-screen');
    playSfx('turn');

    // Check game over after outcome shown
    const dead = Object.entries(STATE.resources).filter(([, v]) => v === 0);
    if (dead.length > 0) {
      STATE.gameOverReason = dead[0][0];
    }
  }

  function onOutcomeNext() {
    if (STATE.gameOverReason || STATE.idx >= STATE.order.length - 1) {
      showEnding();
      return;
    }
    STATE.idx += 1;
    setScreen('game-screen');
    playSfx('turn');
    renderScene();
  }

  // ============ Endings ============
  function evalTrigger(trigger) {
    const check = cond => {
      const v = STATE.resources[cond.resource];
      switch (cond.op) {
        case '==': return v === cond.value;
        case '>=': return v >= cond.value;
        case '<=': return v <= cond.value;
        case '>': return v > cond.value;
        case '<': return v < cond.value;
      }
      return false;
    };
    if (trigger.type === 'and') return trigger.conditions.every(check);
    if (trigger.type === 'or') return trigger.conditions.some(check);
    return false;
  }

  function resolveArchetype() {
    // Fail states first (zero-resource)
    const endings = STATE.scenes.endings;
    const burnout = endings.find(e => e.id === 'burnout');
    const phoenix = endings.find(e => e.id === 'phoenix');
    if (burnout && evalTrigger(burnout.trigger)) return burnout;
    if (phoenix && evalTrigger(phoenix.trigger)) return phoenix;
    const exit = endings.find(e => e.id === 'exit');
    if (exit && evalTrigger(exit.trigger)) return exit;
    const growth = endings.find(e => e.id === 'growth');
    if (growth && evalTrigger(growth.trigger)) return growth;
    // Fallback to growth
    return growth || endings[0];
  }

  function showEnding() {
    const ending = resolveArchetype();
    STATE.archetype = ending.id;
    $('ending-title').textContent = ending.title;
    $('ending-narrative').textContent = ending.narrative;
    const bg = $('ending-bg');
    bg.style.backgroundImage = `url('${ending.og_image.replace('og/', 'og/')}')`;
    setScreen('ending-screen');
    duckBgm(true);
    playSfx('success');
    track('ending', { archetype: ending.id });
  }

  function onCtaClicked() {
    playSfx('click');
    setScreen('cta-screen');
    track('micro_commit_clicked', { archetype: STATE.archetype });
  }

  // ============ Lead form ============
  function onLeadSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
      name: form.name.value,
      handle: form.handle.value,
      pain: form.pain.value,
      archetype: STATE.archetype || 'growth',
      website: form.website.value,
    };
    const err = window.EQLead.validateForm(data);
    const errEl = $('lead-error');
    if (err) {
      errEl.textContent = err;
      errEl.hidden = false;
      return;
    }
    errEl.hidden = true;
    const submitBtn = $('lead-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправляем...';
    window.EQLead.submitLead(data).then(result => {
      if (result.ok) {
        setScreen('success-screen');
        playSfx('success');
      } else {
        errEl.textContent = result.error || 'Ошибка отправки';
        errEl.hidden = false;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Отправить Тиму';
      }
    });
  }

  // ============ Share ============
  function generateShareUrl(platform) {
    const base = 'https://timzinin.com/entrepreneur-quest/';
    const utm = new URLSearchParams({
      utm_source: platform,
      utm_medium: 'social',
      utm_campaign: 'entrepreneur_quest',
      utm_content: STATE.archetype || 'growth',
    });
    return `${base}?${utm.toString()}`;
  }

  function getShareText() {
    const presets = STATE.dialogues.share_presets[STATE.archetype || 'growth'];
    return presets ? presets.tg_text : 'Год Марины — интерактивная история про предпринимателя';
  }

  function onShareTg() {
    playSfx('click');
    const url = generateShareUrl('tg');
    const text = getShareText();
    const intent = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(intent, '_blank', 'noopener');
    track('share_clicked', { platform: 'tg', archetype: STATE.archetype });
  }

  function onShareLinkedIn() {
    playSfx('click');
    const url = generateShareUrl('linkedin');
    const intent = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    window.open(intent, '_blank', 'noopener');
    track('share_clicked', { platform: 'linkedin', archetype: STATE.archetype });
  }

  async function onShareCopy() {
    playSfx('click');
    const url = generateShareUrl('copy');
    try {
      await navigator.clipboard.writeText(url);
      const btn = $('share-copy');
      const original = btn.textContent;
      btn.textContent = 'Скопировано ✓';
      setTimeout(() => { btn.textContent = original; }, 2000);
    } catch (e) {
      // fallback — textarea hack
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      document.body.removeChild(ta);
    }
    track('share_clicked', { platform: 'copy', archetype: STATE.archetype });
  }

  // ============ Start flow ============
  function startGame() {
    playSfx('click');
    playBgm();
    STATE.order = pickScenes(STATE.scenes.scenes);
    STATE.idx = 0;
    STATE.resources = {
      energy: STATE.scenes.meta.resources.energy.start,
      cash: STATE.scenes.meta.resources.cash.start,
      time: STATE.scenes.meta.resources.time.start,
      rep: STATE.scenes.meta.resources.rep.start,
    };
    STATE.gameOverReason = null;
    STATE.archetype = null;
    if (!sessionStorage.getItem('eq:session_start')) {
      sessionStorage.setItem('eq:session_start', Date.now().toString());
    }
    setScreen('game-screen');
    renderScene();
    showExposition();
    track('game_start', {});
  }

  function showExposition() {
    const t = STATE.dialogues.exposition_tooltip;
    if (!t) return;
    $('exposition-text').textContent = t.body;
    $('exposition-tooltip').hidden = false;
    setTimeout(() => {
      const el = $('exposition-tooltip');
      if (el && !el.hidden) el.hidden = true;
    }, 15000);
  }

  function dismissExposition() {
    $('exposition-tooltip').hidden = true;
    playSfx('click');
  }

  // ============ QA overrides ============
  function checkQAOverride() {
    const params = new URLSearchParams(window.location.search);
    const endingOverride = params.get('ending');
    if (endingOverride && ['exit', 'growth', 'burnout', 'phoenix'].includes(endingOverride)) {
      // Jump directly to ending for QA
      const waitForData = setInterval(() => {
        if (STATE.scenes && STATE.dialogues) {
          clearInterval(waitForData);
          const ending = STATE.scenes.endings.find(e => e.id === endingOverride);
          if (ending) {
            STATE.archetype = ending.id;
            $('ending-title').textContent = ending.title;
            $('ending-narrative').textContent = ending.narrative;
            $('ending-bg').style.backgroundImage = `url('${ending.og_image}')`;
            setScreen('ending-screen');
          }
        }
      }, 100);
    }
  }

  // ============ Test hooks (for develop-web-game Playwright) ============
  window.render_game_to_text = function () {
    return JSON.stringify({
      screen: document.querySelector('.screen-active')?.id || null,
      scene_idx: STATE.idx,
      total: STATE.order.length,
      current_scene: STATE.order[STATE.idx]?.id || null,
      resources: STATE.resources,
      archetype: STATE.archetype,
      gameOver: STATE.gameOverReason,
      muted: AUDIO.muted,
    });
  };

  window.advanceTime = function () {
    // game is event-driven, no frame stepping needed
  };

  // ============ Boot ============
  async function boot() {
    audioInit();
    try {
      const [scenesResp, dialoguesResp] = await Promise.all([
        fetch('data/scenes.json'),
        fetch('data/dialogues.json'),
      ]);
      STATE.scenes = await scenesResp.json();
      STATE.dialogues = await dialoguesResp.json();
    } catch (e) {
      console.error('Failed to load data', e);
      return;
    }

    // Wire up listeners
    $('start-btn').addEventListener('click', startGame);
    $('mute-toggle').addEventListener('click', toggleMute);
    $('outcome-next').addEventListener('click', onOutcomeNext);
    $('ending-cta-btn').addEventListener('click', onCtaClicked);
    $('exposition-dismiss').addEventListener('click', dismissExposition);
    $('lead-form').addEventListener('submit', onLeadSubmit);
    $('share-tg').addEventListener('click', onShareTg);
    $('share-linkedin').addEventListener('click', onShareLinkedIn);
    $('share-copy').addEventListener('click', onShareCopy);
    $('success-share-btn').addEventListener('click', () => {
      setScreen('ending-screen');
      $('ending-share').hidden = false;
    });

    checkQAOverride();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
