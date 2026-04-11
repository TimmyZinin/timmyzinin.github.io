/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Lead submission module for «Марина в огне».
 * POSTs to FastAPI proxy — no bot token in frontend.
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

  function mountForm($host, opts) {
    opts = opts || {};
    var archetype = opts.archetype || 'marina-v1a';
    var source = opts.source || 'marina-v-ogne';

    var $form = $('<form>').addClass('lead-form').attr('novalidate', 'novalidate');

    $form.append($('<div>').addClass('lead-title').text('рассказать тиму'));
    $form.append($('<div>').addClass('lead-sub').text('30 секунд. форма вручную читается. тим отвечает сам.'));

    var $nameWrap = $('<label>').addClass('lead-field');
    $nameWrap.append($('<span>').text('как к тебе обращаться'));
    var $name = $('<input>').attr({type: 'text', maxlength: MAX_NAME, required: 'required', autocomplete: 'off'});
    $nameWrap.append($name);
    $form.append($nameWrap);

    var $handleWrap = $('<label>').addClass('lead-field');
    $handleWrap.append($('<span>').text('telegram (@username, 3-32 символа)'));
    var $handle = $('<input>').attr({type: 'text', maxlength: MAX_HANDLE, required: 'required', autocomplete: 'off', placeholder: '@username'});
    $handleWrap.append($handle);
    $form.append($handleWrap);

    var $painWrap = $('<label>').addClass('lead-field');
    $painWrap.append($('<span>').text('что сейчас болит больше всего'));
    var $pain = $('<textarea>').attr({maxlength: MAX_PAIN, required: 'required', rows: '4'});
    $painWrap.append($pain);
    $form.append($painWrap);

    // honeypot
    var $hp = $('<input>').attr({
      type: 'text', name: 'website', tabindex: '-1',
      autocomplete: 'off', 'aria-hidden': 'true'
    }).css({
      position: 'absolute', left: '-9999px', opacity: '0', height: '1px', width: '1px'
    });
    $form.append($hp);

    var $submit = $('<button>').attr('type', 'submit').addClass('lead-submit').text('отправить');
    $form.append($submit);

    var $status = $('<div>').addClass('lead-status');
    $form.append($status);

    $form.on('submit', function (e) {
      e.preventDefault();

      var name = $.trim($name.val());
      var handle = $.trim($handle.val());
      var pain = $.trim($pain.val());
      var hpVal = $.trim($hp.val());

      if (hpVal) {
        $status.text('').css('color', '');
        return;
      }

      if (!name || name.length > MAX_NAME) {
        $status.text('имя нужно, и покороче.').css('color', '#c5380e');
        return;
      }
      var handleNormalized = handle.replace(/^@/, '');
      if (!/^[a-zA-Z0-9_]{3,32}$/.test(handleNormalized)) {
        $status.text('telegram handle должен быть 3-32 латинских/цифр/подчёркиваний.').css('color', '#c5380e');
        return;
      }
      if (!pain || pain.length > MAX_PAIN) {
        $status.text('опиши что болит (до 500 символов).').css('color', '#c5380e');
        return;
      }

      var sessionStart = parseInt(sessionStorage.getItem(SESSION_KEY) || '0', 10);
      var elapsed = Date.now() - sessionStart;
      if (!sessionStart || elapsed < MIN_SESSION_MS) {
        $status.text('сессия слишком короткая. подожди ещё немного.').css('color', '#c5380e');
        return;
      }

      $submit.attr('disabled', 'disabled').text('отправляем...');
      $status.text('').css('color', '');

      var payload = {
        name: name,
        handle: '@' + handleNormalized,
        pain: pain,
        archetype: archetype,
        session_started_at: sessionStart,
        website: '',
        source: source
      };

      $.ajax({
        url: LEAD_ENDPOINT,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(payload),
        timeout: 15000
      }).done(function () {
        $form.empty();
        $form.append($('<div>').addClass('lead-success').text('тим увидит заявку. обычно отвечает в течение дня.'));
        try {
          if (window.umami && typeof window.umami.track === 'function') {
            window.umami.track('lead_submitted');
          }
        } catch (e) {}
      }).fail(function (xhr) {
        var msg = 'не доставилось. попробуй ещё раз через минуту.';
        if (xhr && xhr.status === 429) {
          msg = 'слишком много попыток. попробуй через час.';
        } else if (xhr && xhr.status === 400) {
          msg = 'что-то не так с данными. проверь handle и текст.';
        } else if (xhr && xhr.status === 403) {
          msg = 'отправка заблокирована. напиши тиму напрямую.';
        }
        $status.text(msg).css('color', '#c5380e');
        $submit.removeAttr('disabled').text('отправить');
      });
    });

    $host.append($form);
  }

  window.MarinaLead = { mountForm: mountForm };
})();
