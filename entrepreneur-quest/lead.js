/* lead.js — secure lead submit to FastAPI proxy
 * NO TG token in this file. All TG delivery via backend at marshall.timzinin.com.
 */
(function () {
  'use strict';

  const LEAD_ENDPOINT = 'https://marshall.timzinin.com/quest-api/lead';
  // const LEAD_ENDPOINT_FALLBACK = 'https://formspree.io/f/xxxxxxxx'; // reserved, not used

  const HANDLE_RE = /^@?[a-zA-Z0-9_]{3,32}$/;
  const NAME_MAX = 60;
  const PAIN_MAX = 500;
  const HANDLE_MAX = 33;

  function track(event, props) {
    try {
      if (window.umami && typeof window.umami.track === 'function') {
        window.umami.track(event, props || {});
      }
    } catch (e) { /* noop */ }
  }

  function getSessionStart() {
    let t = sessionStorage.getItem('eq:session_start');
    if (!t) {
      t = Date.now().toString();
      sessionStorage.setItem('eq:session_start', t);
    }
    return parseInt(t, 10);
  }

  function setRateLimit() {
    sessionStorage.setItem('eq:lead_submitted', '1');
  }

  function isRateLimited() {
    return sessionStorage.getItem('eq:lead_submitted') === '1';
  }

  function validateForm(data) {
    const name = (data.name || '').trim();
    const handle = (data.handle || '').trim();
    const pain = (data.pain || '').trim();
    if (!name || name.length < 1 || name.length > NAME_MAX) {
      return 'Представься, пожалуйста';
    }
    if (!HANDLE_RE.test(handle)) {
      return 'Telegram username: @ и от 3 до 32 символов (буквы, цифры, _)';
    }
    if (!pain || pain.length < 1 || pain.length > PAIN_MAX) {
      return 'Опиши, что болит — хотя бы пару слов';
    }
    return null;
  }

  async function submitLead(data) {
    if (isRateLimited()) {
      return { ok: false, error: 'Ты уже отправлял заявку. Тим ответит.' };
    }

    const payload = {
      name: data.name.trim(),
      handle: data.handle.trim(),
      pain: data.pain.trim(),
      archetype: data.archetype || 'growth',
      session_started_at: getSessionStart(),
      website: data.website || '', // honeypot, must be empty
    };

    try {
      const resp = await fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (resp.ok) {
        setRateLimit();
        track('lead_submitted', { archetype: payload.archetype });
        return { ok: true };
      }
      if (resp.status === 429) {
        return { ok: false, error: 'Слишком много заявок. Попробуй через час.' };
      }
      if (resp.status === 403) {
        return { ok: false, error: 'Открой игру через timzinin.com/entrepreneur-quest/' };
      }
      if (resp.status === 400) {
        return { ok: false, error: 'Проверь поля формы и попробуй ещё раз.' };
      }
      return { ok: false, error: 'Сервер не отвечает. Напиши Тиму напрямую: @timzinin' };
    } catch (e) {
      return { ok: false, error: 'Нет сети. Напиши Тиму напрямую: @timzinin' };
    }
  }

  window.EQLead = {
    validateForm,
    submitLead,
    track,
  };
})();
