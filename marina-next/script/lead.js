/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Lead submission module for «Марина в огне» v2.8 (i18n SPRINT 49).
 * Inline mode — renders inside game log, calls onSuccess to continue game.
 * No bot token in frontend — POST via FastAPI proxy.
 * (c) 2026 Tim Zinin.
 */

(function () {
  'use strict';

  var LEAD_ENDPOINT = 'https://marshall.timzinin.com/quest-api/lead';
  var SESSION_KEY = 'marina-fire:session_started_at';
  var MIN_SESSION_MS = 30000;

  var MAX_NAME = 60;
  var MAX_HANDLE = 33;
  var MAX_PAIN = 500;

  // i18n shim — falls back to RU literals if MarinaI18n not loaded (defensive)
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

  function mountInline($host, opts) {
    opts = opts || {};
    var archetype = opts.archetype || 'marina-v15';
    var source = opts.source || 'marina-v-ogne';
    var finaleMode = !!opts.finaleMode;
    var onSuccess = opts.onSuccess || function () {};
    var onCancel = opts.onCancel || function () {};

    var $form = $('<form>').addClass('lead-form').attr('novalidate', 'novalidate');

    $form.append($('<div>').addClass('lead-form-header').text(
      finaleMode
        ? t('lead.header.finale', '──── написать тиму (30 сек) ────')
        : t('lead.header.default', '──── блокнот ────')
    ));

    // Name
    var $nameWrap = $('<label>').addClass('lead-field');
    $nameWrap.append($('<span>').text(t('lead.field.name_label', 'как к тебе обращаться')));
    var $name = $('<input>').attr({
      type: 'text',
      maxlength: MAX_NAME,
      required: 'required',
      autocomplete: 'off',
      spellcheck: 'false'
    });
    $nameWrap.append($name);
    $form.append($nameWrap);

    // Handle
    var $handleWrap = $('<label>').addClass('lead-field');
    $handleWrap.append($('<span>').text(t('lead.field.handle_label', '@telegram (3-32 символа: буквы, цифры, _)')));
    var $handle = $('<input>').attr({
      type: 'text',
      maxlength: MAX_HANDLE,
      required: 'required',
      autocomplete: 'off',
      spellcheck: 'false',
      placeholder: t('lead.field.handle_placeholder', '@username')
    });
    $handleWrap.append($handle);
    $form.append($handleWrap);

    // Pain
    var $painWrap = $('<label>').addClass('lead-field');
    $painWrap.append($('<span>').text(t('lead.field.pain_label', 'что сейчас горит больше всего')));
    var $pain = $('<textarea>').attr({
      maxlength: MAX_PAIN,
      required: 'required',
      rows: '3',
      spellcheck: 'false'
    });
    $painWrap.append($pain);
    $form.append($painWrap);

    // Honeypot
    var $hp = $('<input>').attr({
      type: 'text',
      name: 'website',
      tabindex: '-1',
      autocomplete: 'off',
      'aria-hidden': 'true'
    }).css({
      position: 'absolute',
      left: '-9999px',
      opacity: '0',
      height: '1px',
      width: '1px'
    });
    $form.append($hp);

    // Actions
    var $actions = $('<div>').addClass('lead-form-actions');
    var $submit = $('<button>').attr('type', 'submit').addClass('lead-submit').text(t('lead.button.submit', 'save'));
    $actions.append($submit);
    if (!finaleMode) {
      var $cancel = $('<button>').attr('type', 'button').addClass('lead-cancel').text(t('lead.button.cancel', 'cancel'));
      $cancel.on('click', function (e) {
        e.preventDefault();
        $form.remove();
        onCancel();
      });
      $actions.append($cancel);
    }
    $form.append($actions);

    var $status = $('<div>').addClass('lead-status');
    $form.append($status);

    function setStatus(text, isErr) {
      $status.text(text);
      if (isErr) $status.addClass('err');
      else $status.removeClass('err');
    }

    $form.on('submit', function (e) {
      e.preventDefault();

      var name = $.trim($name.val());
      var handle = $.trim($handle.val());
      var pain = $.trim($pain.val());
      var hpVal = $.trim($hp.val());

      if (hpVal) {
        // honeypot — silently fail
        setStatus('', false);
        return;
      }

      if (!name || name.length > MAX_NAME) {
        setStatus(t('lead.error.name_required', 'имя нужно, до 60 символов.'), true);
        return;
      }
      var handleNormalized = handle.replace(/^@/, '');
      if (!/^[a-zA-Z0-9_]{3,32}$/.test(handleNormalized)) {
        setStatus(t('lead.error.handle_invalid', 'telegram: 3-32 символа, латинские/цифры/подчёркивания.'), true);
        return;
      }
      if (!pain || pain.length > MAX_PAIN) {
        setStatus(t('lead.error.pain_required', 'опиши что горит. до 500 символов.'), true);
        return;
      }

      var sessionStart = parseInt(sessionStorage.getItem(SESSION_KEY) || '0', 10);
      var elapsed = Date.now() - sessionStart;
      if (!sessionStart || elapsed < MIN_SESSION_MS) {
        setStatus(t('lead.error.session_short', 'сессия слишком короткая. подожди ещё немного.'), true);
        return;
      }

      $submit.attr('disabled', 'disabled').text(t('lead.button.sending', 'sending...'));
      setStatus('', false);

      var lang = currentLang();
      var payload = {
        name: name,
        handle: '@' + handleNormalized,
        pain: pain,
        archetype: archetype,
        session_started_at: sessionStart,
        website: '',
        // SPRINT 49 — language tag passes through to Тим so leads from EN/TR/PT routes are visible
        source: source + (lang && lang !== 'ru' ? '#' + lang : ''),
        lang: lang
      };

      $.ajax({
        url: LEAD_ENDPOINT,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
        timeout: 15000
      }).done(function () {
        $form.remove();
        onSuccess();
      }).fail(function (xhr) {
        var msg = t('lead.error.delivery_failed', 'не доставилось. попробуй через минуту.');
        if (xhr && xhr.status === 429) {
          msg = t('lead.error.rate_limit', 'слишком много попыток. попробуй через час.');
        } else if (xhr && xhr.status === 400) {
          msg = t('lead.error.bad_data', 'что-то не так с данными. проверь @handle.');
        } else if (xhr && xhr.status === 403) {
          msg = t('lead.error.cors_blocked', 'заблокировано cors. напиши тиму напрямую.');
        }
        setStatus(msg, true);
        $submit.removeAttr('disabled').text(t('lead.button.submit', 'save'));
      });
    });

    $host.append($form);

    // focus first field
    setTimeout(function () { $name.focus(); }, 30);
  }

  // Legacy compat (old v1a callers)
  function mountForm($host, opts) {
    return mountInline($host, opts);
  }

  window.MarinaLead = {
    mountInline: mountInline,
    mountForm: mountForm
  };
})();
