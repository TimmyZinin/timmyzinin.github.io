/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * «Марина в огне» v2.8 — messenger bubble rendering helpers (i18n SPRINT 49).
 * (c) 2026 Tim Zinin.
 */

(function () {
  'use strict';

  // i18n shim — defensive fallback to RU literals if MarinaI18n not loaded
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

  /**
   * Generate pseudo-timestamp based on in-game day + hour-in-day.
   * SPRINT 46 — unified with HUD clock: Marina's day is 9:00 → 23:00
   * (14 real hours = 8 game slots, so 1 game-hour = 1.75 real hours).
   * hours: 8 (start of day) → 0 (end of day)
   */
  function formatTimestamp(gameDay, hoursLeft) {
    var baseHour = 9; // 9 AM start
    var hoursIntoDay = 8 - hoursLeft;
    // 1 game-hour = 1.75 real hours = 105 min; small jitter 0-8 min to avoid desync
    var totalMinutes = baseHour * 60 + Math.floor(hoursIntoDay * 105) + Math.floor(Math.random() * 8);
    var h = Math.floor(totalMinutes / 60) % 24;
    var m = totalMinutes % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  /**
   * Append a bubble to the chat thread.
   * @param {string} threadId - contact id
   * @param {object} msg - { from, text, kind, time, meta, photo }
   *   kind: 'incoming' | 'outgoing' | 'system' | 'bank'
   *   photo: 'img/events/filename.webp' (optional)
   */
  // Build a single bubble element — shared by live render + replay
  function buildBubble(threadId, msg) {
    var $b = $('<div class="bubble">').addClass(msg.kind || 'incoming');
    if (threadId) $b.attr('data-from', threadId);

    if (msg.kind === 'bank') {
      // Bank notification card
      var $head = $('<div class="bank-header">').text(msg.meta && msg.meta.bank_name || t('bubble.bank_default_name', 'Т-Банк'));
      var $amount = $('<div class="bank-amount">');
      if (msg.meta && typeof msg.meta.amount === 'number') {
        var sign = msg.meta.amount >= 0 ? '+' : '';
        $amount.text(sign + '$' + msg.meta.amount);
        $amount.addClass(msg.meta.amount >= 0 ? 'pos' : 'neg');
      }
      var $desc = $('<div>').text(msg.text || '');
      $b.append($head).append($amount).append($desc);
    } else {
      if (msg.senderName && msg.kind === 'incoming') {
        $b.append($('<span class="sender-name">').text(msg.senderName));
      }
      if (msg.photo) {
        var $photoWrap = $('<div class="bubble-photo">');
        var photoErrText = t('bubble.photo_error', '[📷 вложение недоступно]');
        var $img = $('<img>')
          .attr('src', msg.photo)
          .attr('alt', msg.photoAlt || t('bubble.photo_alt', 'вложение'))
          .attr('loading', 'lazy')
          .on('error', function () { $photoWrap.html('<div class="bubble-photo-err"></div>').find('.bubble-photo-err').text(photoErrText); });
        $photoWrap.append($img);
        $b.append($photoWrap);
      }
      if (msg.text) {
        $b.append(document.createTextNode(msg.text));
      }
    }

    if (msg.time) {
      $b.append($('<span class="time">').text(msg.time));
    }

    return $b;
  }

  function renderBubble(threadId, msg) {
    // Only render if this is the currently visible chat
    if (window.Marina && window.Marina.currentChat && window.Marina.currentChat() !== threadId) {
      return;
    }
    var $b = buildBubble(threadId, msg);
    // Standard messenger order — newest at bottom
    $('#chat-thread').append($b);
    scrollToBottom();
  }

  /**
   * Append multiple bubbles to a thread's saved history (not visible yet).
   */
  function appendToThreadHistory(state, threadId, msg) {
    if (!state.threads[threadId]) state.threads[threadId] = [];
    state.threads[threadId].push(msg);
    // Bump unread if this isn't the current chat
    if (state.current_chat !== threadId && msg.kind !== 'outgoing') {
      var contact = state.contacts.find(function (c) { return c.id === threadId; });
      if (contact) {
        contact.unread = (contact.unread || 0) + 1;
        contact.visible = true; // reveal on first message
      }
    }
  }

  /**
   * Replay a thread's history when switching to it.
   */
  function replayThread(state, threadId) {
    var $thread = $('#chat-thread').empty();
    var msgs = state.threads[threadId] || [];
    // Standard messenger order — oldest first, newest at bottom, auto-scroll bottom
    msgs.forEach(function (msg) {
      $thread.append(buildBubble(threadId, msg));
    });
    scrollToBottom();
  }

  function scrollToBottom() {
    var el = document.getElementById('chat-thread');
    if (el) el.scrollTop = el.scrollHeight;
  }

  function scrollToTop() {
    var el = document.getElementById('chat-thread');
    if (el) el.scrollTop = 0;
  }

  /**
   * Show/hide "marina is typing..." indicator.
   */
  function showTyping(duration, callback) {
    var $t = $('#chat-typing');
    $t.show();
    setTimeout(function () {
      $t.hide();
      if (callback) callback();
    }, duration);
  }

  function hideTyping() {
    $('#chat-typing').hide();
  }

  // Resolve contact display name through i18n (so EN/TR/PT can rename Лена → Lucy/Zeynep/Camila)
  function localizedContactName(c) {
    if (!c) return '';
    var key = 'contact.' + c.id + '.name';
    return t(key, c.name);
  }

  /**
   * Render the contacts sidebar list.
   * Filters by state.current_folder: 'all' | 'funnel' | 'team' | 'money'
   */
  function renderContacts(state) {
    var $list = $('#contacts-list').empty();
    var folder = state.current_folder || 'all';

    // SPRINT 14 — "Turn on computer" button on contacts list
    var $lampCta = $('#contacts-lamp-cta');
    if (!state.lamp_on) {
      if ($lampCta.length === 0) {
        $lampCta = $('<button id="contacts-lamp-cta" class="contacts-lamp-btn">')
          .text(t('bubble.lamp_cta', '💻 включить компьютер'));
        $lampCta.on('click', function () {
          if (window.Marina && window.Marina._actLamp) window.Marina._actLamp();
          $lampCta.remove();
        });
        $('#contacts-list').before($lampCta);
      }
      $lampCta.show();
    } else {
      $lampCta.hide();
    }

    // Update folder tab active state
    $('#folder-tabs .folder-tab').removeClass('active');
    $('#folder-tabs .folder-tab[data-folder="' + folder + '"]').addClass('active');

    if (folder === 'funnel') {
      renderFunnelGroups(state, $list);
      return;
    }

    var filterIds = null;
    if (folder === 'team') filterIds = ['lena', 'anna', 'tim'];
    else if (folder === 'money') filterIds = ['bank', 'khozyaika', 'pavel', 'mama'];
    // folder === 'all' shows EVERYTHING visible including spam (SPRINT 06)
    var hideSpamInAll = false;

    // Sort contacts by last message time, descending. Pin 'scratch' always first.
    function lastMsgTime(c) {
      var tArr = (state.threads && state.threads[c.id]) || [];
      if (tArr.length === 0) return 0;
      var last = tArr[tArr.length - 1];
      return last._received_at || 0;
    }
    var sortedContacts = state.contacts.slice().sort(function (a, b) {
      if (a.id === 'scratch') return -1;
      if (b.id === 'scratch') return 1;
      return lastMsgTime(b) - lastMsgTime(a);
    });

    var anyRendered = false;
    sortedContacts.forEach(function (c) {
      if (!c.visible) return;
      if (filterIds && filterIds.indexOf(c.id) === -1) return;
      if (hideSpamInAll && c.spam) return; // «все» folder hides spam group
      anyRendered = true;

      var displayName = localizedContactName(c);
      var $item = $('<div class="contact-item">').attr('data-contact', c.id);
      if (state.current_chat === c.id) $item.addClass('active');
      // SPRINT 37 — pin scratch ('себе') as Telegram-style sticky chat
      if (c.id === 'scratch') $item.addClass('pinned');

      var $avatar = $('<div class="contact-avatar">').addClass(c.id).text(c.avatar || displayName[0]);
      if (c.online) $avatar.addClass('online');
      $item.append($avatar);

      var $info = $('<div class="contact-info">');
      $info.append($('<div class="contact-name">').text(displayName));
      var preview = lastMessagePreview(state, c.id);
      $info.append($('<div class="contact-preview">').text(preview));
      $item.append($info);

      var $meta = $('<div class="contact-meta">');
      if (c.unread && c.unread > 0) {
        $meta.append($('<span class="contact-unread">').text(c.unread));
      }
      $item.append($meta);

      $list.append($item);
    });

    if (!anyRendered) {
      var emptyKey = 'bubble.empty.' + folder;
      var emptyText = t(emptyKey, t('bubble.empty.fallback', 'пусто'));
      $list.append($('<div class="folder-empty-state">').text(emptyText));
    }
  }

  /**
   * Render funnel sub-groups for 'funnel' folder.
   */
  function renderFunnelGroups(state, $list) {
    var groups = [
      { icon: '🔥', label: t('bubble.funnel.cold_label', 'cold'),     count: state.leads,                                desc: t('bubble.funnel.cold_desc', 'холодные лиды') },
      { icon: '📝', label: t('bubble.funnel.qualified_label', 'qualified'), count: state.qualified_leads,                desc: t('bubble.funnel.qualified_desc', 'прошли бриф') },
      { icon: '🚧', label: t('bubble.funnel.in_progress_label', 'в работе'), count: (state.active_projects || []).length, desc: t('bubble.funnel.in_progress_desc', 'активные проекты'), isInProgress: true },
      { icon: '✅', label: t('bubble.funnel.delivered_label', 'сдано'),     count: state.delivered_projects,             desc: t('bubble.funnel.delivered_desc', 'за месяц · цель 3') }
    ];
    var emptyText = t('bubble.funnel.empty', '— пусто —');
    groups.forEach(function (g) {
      var $header = $('<div class="funnel-group-header">');
      $header.text(g.icon + ' ' + g.label);
      $header.append($('<span class="funnel-group-count">').text(g.count));
      $list.append($header);

      if (g.isInProgress && state.active_projects && state.active_projects.length > 0) {
        state.active_projects.forEach(function (p) {
          var $item = $('<div class="funnel-item">');
          $item.append($('<span>').text('#' + p.id + ' ' + p.client));
          var $prog = $('<span class="funnel-progress">');
          $prog.append($('<span class="funnel-progress-fill">').css('width', p.progress + '%'));
          $item.append($prog);
          $item.append($('<span>').text(p.progress + '%'));
          $list.append($item);
        });
      } else if (g.count === 0) {
        $list.append($('<div class="funnel-item">').css('opacity', '0.5').text(emptyText));
      } else {
        $list.append($('<div class="funnel-item">').text(g.desc));
      }
    });
  }

  function lastMessagePreview(state, contactId) {
    var msgs = state.threads[contactId] || [];
    if (msgs.length === 0) return '';
    var last = msgs[msgs.length - 1];
    var text = last.text || '';
    if (text.length > 36) text = text.substring(0, 36) + '…';
    return text;
  }

  /**
   * Render chat header for currently open contact.
   */
  function renderChatHeader(state, contact) {
    var noContactPlaceholder = t('bubble.chat.no_contact_placeholder', '—');
    $('#chat-title').text(contact ? localizedContactName(contact) : noContactPlaceholder);
    var sub = '';
    if (contact) {
      // Per-contact subtitle from i18n (each locale can rewrite character lore)
      sub = t('contact.' + contact.id + '.subtitle', '');
      if (contact.online) sub += t('bubble.chat.status_online', ' · в сети');
      else if (sub && contact.id !== 'bank' && contact.id !== 'scratch' && !contact.spam) {
        sub += t('bubble.chat.status_recent', ' · был(а) недавно');
      }
    }
    $('#chat-subtitle').text(sub);
  }

  /**
   * Render reply chips in chat-actions area.
   */
  function renderReplyChips(options, onClick) {
    var $ca = $('#chat-actions').empty();
    if (!options || options.length === 0) return;
    options.forEach(function (opt) {
      var $chip = $('<button class="reply-chip">').attr('type', 'button');
      $chip.text(opt.label);
      if (opt.cost) $chip.append($('<span class="cost">').text(' · ' + opt.cost));
      if (opt.disabled) $chip.attr('disabled', 'disabled');
      $chip.on('click', function (e) {
        e.preventDefault();
        // SPRINT 43 — track which reply player chose; SPRINT 49 — add lang
        try {
          if (window.umami && typeof window.umami.track === 'function') {
            var state = (window.Marina && window.Marina.state && window.Marina.state()) || {};
            window.umami.track('reply_chosen', {
              contact: state.current_chat || 'unknown',
              option: opt.id || opt.label || 'n/a',
              day: state.day || 0,
              lang: currentLang()
            });
          }
        } catch (err) {}
        if (typeof onClick === 'function') onClick(opt);
      });
      $ca.append($chip);
    });
  }

  function clearChipsArea() {
    $('#chat-actions').empty();
  }

  window.Bubbles = {
    renderBubble: renderBubble,
    appendToThreadHistory: appendToThreadHistory,
    replayThread: replayThread,
    showTyping: showTyping,
    hideTyping: hideTyping,
    renderContacts: renderContacts,
    renderChatHeader: renderChatHeader,
    renderReplyChips: renderReplyChips,
    clearChipsArea: clearChipsArea,
    formatTimestamp: formatTimestamp,
    scrollToBottom: scrollToBottom,
    localizedContactName: localizedContactName
  };
})();
