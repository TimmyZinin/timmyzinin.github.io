/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * «Марина в огне» v2.8 — viral social-spreading mechanic (SPRINT 51).
 *
 * Surface hierarchy per completion-funnel analysis:
 *   lose screen (primary, ~30% reach) — "This is Fine" meme aesthetic
 *   rescue accepted (primary, ~20%)
 *   first project delivered (secondary, ~45%)
 *   end-of-day milestone (secondary, ~40%)
 *   win screen (tertiary, ~5%)
 *
 * Public API: window.MarinaViral
 *   - renderCardForSurface(surface, state, hostEl)  → inject emoji card + share CTA
 *   - readReferralParams()                           → parse ?from= and ?challenge=
 *   - applyReferralOnLanding()                       → override landing hero eyebrow
 *   - openShareModal(cardData)                       → modal with platform intents
 *
 * Storage: localStorage['marina-fire:my_name'], localStorage['marina-fire:referred_by']
 * Analytics: share_card_viewed / share_card_copied / share_platform_clicked /
 *            referral_landing / referral_game_started / challenge_viewed
 *
 * (c) 2026 Tim Zinin.
 */

(function () {
  'use strict';

  var NAME_KEY = 'marina-fire:my_name';
  var REFERRER_KEY = 'marina-fire:referred_by';
  var MAX_NAME = 20;
  var NAME_DEFAULT = 'Anonymous';

  // i18n defensive shim
  function t(key, fallback) {
    if (window.MarinaI18n && typeof window.MarinaI18n.t === 'function') {
      var v = window.MarinaI18n.t(key);
      if (typeof v === 'string' && v.indexOf('[MISSING:') !== 0) return v;
    }
    return fallback;
  }
  function currentLang() {
    if (window.MarinaI18n && typeof window.MarinaI18n.getLang === 'function') {
      return window.MarinaI18n.getLang() || 'ru';
    }
    return 'ru';
  }

  // Analytics shim — uses marina.js track() if available, falls back to umami direct
  function trackEvent(name, data) {
    try {
      var d = data || {};
      d.lang = currentLang();
      if (window.Marina && typeof window.Marina.track === 'function') {
        window.Marina.track(name, d);
      } else if (window.umami && typeof window.umami.track === 'function') {
        window.umami.track(name, d);
      }
    } catch (e) {}
  }

  // ---------- Name management ----------

  function sanitizeName(raw) {
    if (!raw) return NAME_DEFAULT;
    var cleaned = String(raw).replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, MAX_NAME);
    return cleaned || NAME_DEFAULT;
  }

  function getMyName() {
    try {
      var n = localStorage.getItem(NAME_KEY);
      return n && n.length ? n : null;
    } catch (e) { return null; }
  }

  function saveMyName(name) {
    try { localStorage.setItem(NAME_KEY, sanitizeName(name)); } catch (e) {}
  }

  function promptForNameOnce(callback) {
    var existing = getMyName();
    if (existing) { callback(existing); return; }
    var raw = window.prompt(t('viral.prompt.name', 'Как тебя назвать в ссылке? (необязательно)'), '');
    var name = sanitizeName(raw || '');
    saveMyName(name);
    callback(name);
  }

  // ---------- URL param encoding ----------

  function encodeChallenge(state, surface) {
    // Compact: { d: day, p: projects, l: love (0/1), a: automations (0-3), o: outcome, n: name }
    var payload = {
      d: state.day || 0,
      p: state.delivered_projects || 0,
      l: state.love_ending_unlocked ? 1 : 0,
      a: (state.auto_reach_out ? 1 : 0) + (state.auto_brief_lead ? 1 : 0) + (state.auto_send_offer ? 1 : 0),
      o: surface,
      n: getMyName() || NAME_DEFAULT
    };
    try {
      return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    } catch (e) { return ''; }
  }

  function decodeChallenge(b64) {
    try {
      return JSON.parse(decodeURIComponent(escape(atob(b64))));
    } catch (e) { return null; }
  }

  function readReferralParams() {
    try {
      var url = new URL(window.location.href);
      var from = url.searchParams.get('from');
      var challenge = url.searchParams.get('challenge');
      var lang = url.searchParams.get('lang');
      return {
        from: from ? sanitizeName(from) : null,
        challenge: challenge ? decodeChallenge(challenge) : null,
        lang: lang
      };
    } catch (e) { return { from: null, challenge: null, lang: null }; }
  }

  function persistReferrer(from) {
    if (!from) return;
    try { localStorage.setItem(REFERRER_KEY, from); } catch (e) {}
  }

  function getReferrer() {
    try { return localStorage.getItem(REFERRER_KEY); } catch (e) { return null; }
  }

  // ---------- Emoji card templates per surface ----------

  function fireRunes(day) {
    // 🔥 per 5 days survived, max 6 (day 30)
    var count = Math.min(6, Math.ceil((day || 0) / 5));
    return Array(count + 1).join('🔥');
  }

  function checkmarks(projects) {
    return Array((projects || 0) + 1).join('✅');
  }

  function energyBars(energy) {
    // ⚡ per 20% energy (0-5 scale)
    var count = Math.min(5, Math.max(0, Math.floor((energy || 0) / 20)));
    return Array(count + 1).join('⚡');
  }

  function automationBots(state) {
    var n = (state.auto_reach_out ? 1 : 0) + (state.auto_brief_lead ? 1 : 0) + (state.auto_send_offer ? 1 : 0);
    return Array(n + 1).join('🤖');
  }

  function buildCardText(surface, state) {
    var title = t('viral.card.title', '🔥 Марина в огне');
    var urlBase = 'https://timzinin.com/marina-next/';
    var challenge = encodeChallenge(state, surface);
    var name = getMyName() || NAME_DEFAULT;
    var lang = currentLang();
    var params = [];
    if (name !== NAME_DEFAULT) params.push('from=' + encodeURIComponent(name));
    if (challenge) params.push('challenge=' + challenge);
    if (lang !== 'ru') params.push('lang=' + lang);
    var url = urlBase + (params.length ? '?' + params.join('&') : '');

    var body;
    var day = state.day || 0;
    var projects = state.delivered_projects || 0;
    var energy = state.energy || 0;

    if (surface === 'win') {
      body = fireRunes(day) + ' day ' + day + '/30 · ' + t('viral.card.win_title', 'Marina made it') + '\n' +
             checkmarks(projects) + ' ' + projects + ' ' + t('viral.card.projects', 'projects') +
             (state.love_ending_unlocked ? ' · ❤️ ' + t('viral.card.love', 'love') : '') + '\n' +
             t('viral.card.rare', '1-in-20 outcome.');
    } else if (surface === 'lose') {
      body = fireRunes(day) + ' day ' + day + ' · ' + t('viral.card.lose_title', "Marina's studio burned") + '\n' +
             projects + ' ' + t('viral.card.projects', 'projects') + ' · ' + t('viral.card.burnout', 'burnout') + '\n' +
             t('viral.card.this_is_fine', 'this is fine.');
    } else if (surface === 'rescue') {
      body = '🚨 day ' + day + ' · ' + t('viral.card.rescue_title', 'saved at the last minute') + '\n' +
             t('viral.card.this_is_fine', 'this is fine.');
    } else if (surface === 'first_project') {
      body = '🚀 day ' + day + ' · ' + t('viral.card.first_project', 'first project shipped') + '\n' +
             energyBars(energy) + ' energy ' + energy;
    } else { // end_of_day
      body = fireRunes(day) + ' day ' + day + '/30 · ' + t('viral.card.surviving', 'Marina survives') + '\n' +
             (projects > 0 ? checkmarks(projects) + ' ' + projects + ' ' + t('viral.card.projects', 'projects') + ' · ' : '') +
             energyBars(energy) + ' energy ' + energy;
    }

    return title + '\n' + body + '\n\n→ ' + url;
  }

  // ---------- Share modal + platform intents ----------

  function buildShareUrl(platform, cardText) {
    // Extract URL from card (last line)
    var lines = cardText.split('\n');
    var lastLine = lines[lines.length - 1] || '';
    var urlMatch = lastLine.match(/https?:\/\/\S+/);
    var shareUrl = urlMatch ? urlMatch[0] : 'https://timzinin.com/marina-next/';
    var text = cardText;

    switch (platform) {
      case 'telegram':
        return 'https://t.me/share/url?url=' + encodeURIComponent(shareUrl) + '&text=' + encodeURIComponent(text);
      case 'whatsapp':
        return 'https://wa.me/?text=' + encodeURIComponent(text);
      case 'twitter':
        return 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text);
      case 'linkedin':
        return 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(shareUrl);
      default:
        return shareUrl;
    }
  }

  function copyToClipboard(text, cb) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { cb && cb(true); }, function () { cb && cb(false); });
    } else {
      // Fallback
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        cb && cb(true);
      } catch (e) { cb && cb(false); }
    }
  }

  function showToast(text) {
    var existing = document.getElementById('viral-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'viral-toast';
    toast.className = 'viral-toast';
    toast.textContent = text;
    document.body.appendChild(toast);
    // Auto-dismiss
    setTimeout(function () { toast.classList.add('fade-out'); }, 2000);
    setTimeout(function () { toast.remove(); }, 2600);
  }

  function openShareModal(cardText, surface) {
    var existing = document.getElementById('viral-share-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'viral-share-modal';
    modal.className = 'viral-modal';
    modal.innerHTML =
      '<div class="viral-modal-backdrop"></div>' +
      '<div class="viral-modal-card">' +
      '  <button class="viral-modal-close" type="button" aria-label="close">✕</button>' +
      '  <h3 class="viral-modal-title"></h3>' +
      '  <pre class="viral-card-preview"></pre>' +
      '  <div class="viral-share-buttons">' +
      '    <button class="viral-platform-btn" data-platform="clipboard" type="button">📋 ' + t('viral.platform.copy', 'Copy') + '</button>' +
      '    <button class="viral-platform-btn" data-platform="telegram" type="button">✈️ Telegram</button>' +
      '    <button class="viral-platform-btn" data-platform="whatsapp" type="button">💬 WhatsApp</button>' +
      '    <button class="viral-platform-btn" data-platform="twitter" type="button">𝕏 Twitter</button>' +
      '    <button class="viral-platform-btn" data-platform="linkedin" type="button">💼 LinkedIn</button>' +
      '    <button class="viral-platform-btn" data-platform="native" type="button">📱 ' + t('viral.platform.native', 'Share') + '</button>' +
      '  </div>' +
      '</div>';
    modal.querySelector('.viral-modal-title').textContent = t('viral.modal.title', 'Send to one friend');
    modal.querySelector('.viral-card-preview').textContent = cardText;

    // Hide native share button if not supported
    if (!navigator.share) {
      var nb = modal.querySelector('[data-platform="native"]');
      if (nb) nb.style.display = 'none';
    }

    document.body.appendChild(modal);

    trackEvent('share_card_viewed', { surface: surface, cardLength: cardText.length });

    modal.querySelector('.viral-modal-close').addEventListener('click', function () { modal.remove(); });
    modal.querySelector('.viral-modal-backdrop').addEventListener('click', function () { modal.remove(); });

    var buttons = modal.querySelectorAll('.viral-platform-btn');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function (e) {
        var platform = e.currentTarget.getAttribute('data-platform');
        if (platform === 'clipboard') {
          copyToClipboard(cardText, function (ok) {
            if (ok) {
              showToast(t('viral.toast.copied', 'Copied to clipboard'));
              trackEvent('share_card_copied', { surface: surface, platform: 'clipboard' });
            } else {
              showToast(t('viral.toast.copy_failed', 'Copy failed — select manually'));
            }
          });
        } else if (platform === 'native' && navigator.share) {
          navigator.share({ title: t('viral.card.title', '🔥 Марина в огне'), text: cardText })
            .then(function () {
              trackEvent('share_platform_clicked', { surface: surface, platform: 'native' });
            })
            .catch(function () {});
        } else {
          var url = buildShareUrl(platform, cardText);
          window.open(url, '_blank', 'noopener,noreferrer');
          trackEvent('share_platform_clicked', { surface: surface, platform: platform });
        }
      });
    }
  }

  // ---------- Inject share card on overlay ----------

  function renderCardForSurface(surface, state, hostEl) {
    if (!hostEl || !state) return;

    promptForNameOnce(function (name) {
      var cardText = buildCardText(surface, state);
      var msg = t('viral.tim.share_' + surface,
                 t('viral.tim.share_default', 'покажи это одной подруге. не feed. один человек.'));

      var wrap = document.createElement('div');
      wrap.className = 'viral-share-block surface-' + surface;
      wrap.innerHTML =
        '<div class="viral-tim-message">' + escapeHtml(msg) + '</div>' +
        '<pre class="viral-card-inline"></pre>' +
        '<button type="button" class="viral-share-btn">📱 ' + t('viral.cta.share_button', 'поделиться') + '</button>';
      wrap.querySelector('.viral-card-inline').textContent = cardText;
      wrap.querySelector('.viral-share-btn').addEventListener('click', function () {
        openShareModal(cardText, surface);
      });

      hostEl.appendChild(wrap);
      trackEvent('share_card_rendered', { surface: surface, day: state.day, outcome: state.ending_seen || 'in_progress' });
    });
  }

  // ---------- Landing page referral hero override ----------

  function applyReferralOnLanding() {
    var params = readReferralParams();
    if (params.from) {
      persistReferrer(params.from);
      trackEvent('referral_landing', {
        from: params.from,
        has_challenge: !!params.challenge,
        challenge_outcome: params.challenge ? params.challenge.o : null
      });

      // Override hero eyebrow
      var eyebrow = document.querySelector('.hero-eyebrow');
      if (!eyebrow) return;
      if (params.challenge) {
        var c = params.challenge;
        var heroKey;
        if (c.o === 'win') heroKey = 'viral.challenge.hero_win';
        else if (c.o === 'lose') heroKey = 'viral.challenge.hero_lose';
        else if (c.o === 'rescue') heroKey = 'viral.challenge.hero_rescue';
        else heroKey = 'viral.challenge.hero_default';

        var heroTemplate = t(heroKey, '🎁 {name} прошла до дня {d}. Сможешь дальше?');
        var heroText = heroTemplate
          .replace('{name}', escapeHtml(params.from))
          .replace('{d}', c.d)
          .replace('{p}', c.p);
        eyebrow.innerHTML = heroText;
        trackEvent('challenge_viewed', { their_day: c.d, their_outcome: c.o });
      } else {
        var inviteTemplate = t('viral.referral.hero_eyebrow', '🎁 {name} приглашает тебя · бесплатная игра');
        eyebrow.innerHTML = inviteTemplate.replace('{name}', escapeHtml(params.from));
      }
    }
  }

  // ---------- Game-start referral tracking ----------

  function notifyReferralGameStarted() {
    var ref = getReferrer();
    if (ref) {
      trackEvent('referral_game_started', { from: ref });
    }
  }

  // ---------- Utils ----------

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- Export ----------

  window.MarinaViral = {
    renderCardForSurface: renderCardForSurface,
    openShareModal: openShareModal,
    readReferralParams: readReferralParams,
    applyReferralOnLanding: applyReferralOnLanding,
    notifyReferralGameStarted: notifyReferralGameStarted,
    getMyName: getMyName,
    saveMyName: saveMyName,
    encodeChallenge: encodeChallenge,
    decodeChallenge: decodeChallenge
  };

  // Auto-hook on landing page if present (no game shell)
  if (typeof document !== 'undefined' && document.querySelector('.hero-eyebrow')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyReferralOnLanding);
    } else {
      applyReferralOnLanding();
    }
  }
})();
