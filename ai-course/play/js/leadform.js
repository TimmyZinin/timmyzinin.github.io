// Лид-форма после Главы 3 — захват имени + телефона/email + согласие на обработку.
// Вызывается из engine.js при завершении ch3-финала.
// POST /api/lead-form (HMAC-валидированный initData).

import { apiUrl } from './api-base.js';

const TG = window.Telegram?.WebApp;
const HAPTIC = TG?.HapticFeedback;

function initData() {
  return TG?.initData || '';
}

function validateEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function validatePhone(s) {
  // допускаем +7..., 8..., международные форматы; min 7 цифр
  const digits = s.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export async function showLeadForm({ source = 'game-ch3-final', onComplete } = {}) {
  return new Promise((resolve) => {
    const tgUser = TG?.initDataUnsafe?.user || {};
    const overlay = document.createElement('div');
    overlay.className = 'leadform-overlay';
    overlay.innerHTML = `
      <div class="leadform-modal">
        <button class="leadform-close" type="button" aria-label="Закрыть">×</button>
        <div class="leadform-header">
          <div class="leadform-tim-photo" data-asset="char-tim-teaching"></div>
          <div class="leadform-headline">
            <h2>Хочешь пройти это с человеком?</h2>
            <p class="leadform-sub">Тим Зинин — преподаватель и консультант по AI-интеграции. Лично пишет каждому в течение 24 часов.</p>
          </div>
        </div>
        <form class="leadform-fields" novalidate>
          <label>
            <span>Как тебя зовут</span>
            <input type="text" name="name" required maxlength="100" value="${(tgUser.first_name || '').replace(/"/g, '&quot;')}" autocomplete="given-name">
          </label>
          <label>
            <span>Телефон</span>
            <input type="tel" name="phone" placeholder="+7 ..." maxlength="20" autocomplete="tel">
          </label>
          <label>
            <span>Или email</span>
            <input type="email" name="email" placeholder="you@example.com" maxlength="150" autocomplete="email">
          </label>
          <p class="leadform-hint">Достаточно одного канала связи.</p>
          <label class="leadform-consent">
            <input type="checkbox" name="consent" required>
            <span>Согласен на обработку контактных данных для связи по этому запросу.</span>
          </label>
          <button type="submit" class="leadform-submit">Получить разбор от Тима</button>
          <button type="button" class="leadform-skip">Пропустить — просто сертификат</button>
        </form>
        <div class="leadform-success" hidden>
          <h2>Спасибо.</h2>
          <p>Тим напишет тебе в течение 24 часов. Сертификат и бонус-чеклист — ниже.</p>
          <button type="button" class="leadform-success-close">Продолжить</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('leadform-visible'));

    const form = overlay.querySelector('.leadform-fields');
    const successBox = overlay.querySelector('.leadform-success');
    const closeBtn = overlay.querySelector('.leadform-close');
    const skipBtn = overlay.querySelector('.leadform-skip');
    const submitBtn = overlay.querySelector('.leadform-submit');

    const cleanup = (result) => {
      overlay.classList.remove('leadform-visible');
      setTimeout(() => {
        overlay.remove();
        if (typeof onComplete === 'function') onComplete(result);
        resolve(result);
      }, 250);
    };

    const close = () => cleanup({ submitted: false });
    closeBtn.addEventListener('click', close);
    skipBtn.addEventListener('click', close);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      submitBtn.disabled = true;
      submitBtn.textContent = 'Отправляю…';
      const fd = new FormData(form);
      const name = (fd.get('name') || '').toString().trim();
      const phone = (fd.get('phone') || '').toString().trim();
      const email = (fd.get('email') || '').toString().trim();
      const consent = !!fd.get('consent');

      if (!consent) {
        alert('Нужно согласие на обработку.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Получить разбор от Тима';
        return;
      }
      if (!phone && !email) {
        alert('Укажи телефон или email — что удобнее.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Получить разбор от Тима';
        return;
      }
      if (phone && !validatePhone(phone)) {
        alert('Телефон выглядит странно. Проверь.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Получить разбор от Тима';
        return;
      }
      if (email && !validateEmail(email)) {
        alert('Email выглядит странно. Проверь.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Получить разбор от Тима';
        return;
      }

      try {
        const resp = await fetch(apiUrl('/api/lead-form'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            initData: initData(),
            name, phone, email, consent: true, source,
          }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        HAPTIC?.notificationOccurred?.('success');
        form.hidden = true;
        successBox.hidden = false;
      } catch (err) {
        console.error('lead-form failed', err);
        alert('Не получилось отправить. Попробуй ещё раз через минуту.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Получить разбор от Тима';
      }
    });

    overlay.querySelector('.leadform-success-close').addEventListener('click', () => {
      cleanup({ submitted: true });
    });
  });
}
