/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * «Марина в огне» v2.0a — messenger bubble rendering helpers.
 * (c) 2026 Tim Zinin.
 */

(function () {
  'use strict';

  /**
   * Generate pseudo-timestamp based on in-game day + hour-in-day.
   * Day 1 starts at 09:00. Each in-game hour advances 1h of display clock.
   * hours: 8 (start of day) → 0 (end of day)
   */
  function formatTimestamp(gameDay, hoursLeft) {
    var baseHour = 9; // 9 AM start
    var hoursIntoDay = 8 - hoursLeft;
    var totalMinutes = baseHour * 60 + hoursIntoDay * 60 + Math.floor(Math.random() * 15);
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
      var $head = $('<div class="bank-header">').text(msg.meta && msg.meta.bank_name || 'Т-Банк');
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
        var $img = $('<img>')
          .attr('src', msg.photo)
          .attr('alt', msg.photoAlt || 'вложение')
          .attr('loading', 'lazy')
          .on('error', function () { $photoWrap.html('<div class="bubble-photo-err">[📷 вложение недоступно]</div>'); });
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

  /**
   * Render the contacts sidebar list.
   * Filters by state.current_folder: 'all' | 'funnel' | 'team' | 'money'
   */
  function renderContacts(state) {
    var $list = $('#contacts-list').empty();
    var folder = state.current_folder || 'all';

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
      var t = (state.threads && state.threads[c.id]) || [];
      if (t.length === 0) return 0;
      var last = t[t.length - 1];
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

      var $item = $('<div class="contact-item">').attr('data-contact', c.id);
      if (state.current_chat === c.id) $item.addClass('active');

      var $avatar = $('<div class="contact-avatar">').addClass(c.id).text(c.avatar || c.name[0]);
      if (c.online) $avatar.addClass('online');
      $item.append($avatar);

      var $info = $('<div class="contact-info">');
      $info.append($('<div class="contact-name">').text(c.name));
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
      var emptyTexts = {
        team: 'команда ещё не собрана · продолжай искать клиентов',
        money: 'в папке «деньги» пока только банк',
        spam: 'пока тихо · спам ещё не посыпался',
        all: 'пусто · продолжай играть'
      };
      $list.append($('<div class="folder-empty-state">').text(emptyTexts[folder] || 'пусто'));
    }
  }

  /**
   * Render funnel sub-groups for 'funnel' folder.
   */
  function renderFunnelGroups(state, $list) {
    var groups = [
      { icon: '🔥', label: 'cold', count: state.leads, desc: 'холодные лиды' },
      { icon: '📝', label: 'qualified', count: state.qualified_leads, desc: 'прошли бриф' },
      { icon: '🚧', label: 'в работе', count: (state.active_projects || []).length, desc: 'активные проекты' },
      { icon: '✅', label: 'сдано', count: state.delivered_projects, desc: 'за месяц · цель 3' }
    ];
    groups.forEach(function (g) {
      var $header = $('<div class="funnel-group-header">');
      $header.text(g.icon + ' ' + g.label);
      $header.append($('<span class="funnel-group-count">').text(g.count));
      $list.append($header);

      if (g.label === 'в работе' && state.active_projects && state.active_projects.length > 0) {
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
        $list.append($('<div class="funnel-item">').css('opacity', '0.5').text('— пусто —'));
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
    $('#chat-title').text(contact ? contact.name : '—');
    var sub = '';
    if (contact) {
      if (contact.id === 'tim')       sub = 'создатель игры · каш, турция';
      else if (contact.id === 'lena') sub = 'бывшая коллега · москва';
      else if (contact.id === 'anna') sub = 'первый клиент';
      else if (contact.id === 'bank') sub = 'Т-Банк · входящие уведомления';
      else if (contact.id === 'khozyaika') sub = 'хозяйка квартиры';
      else if (contact.id === 'pavel') sub = 'бывший · 4 месяца тишины';
      else if (contact.id === 'mama')  sub = 'мама · всегда на связи';
      else if (contact.id === 'denis') sub = 'Денис · тусовщик';
      // new spam contacts
      else if (contact.id === 'olya')  sub = '11-Б · клуб женщин';
      else if (contact.id === 'kirill') sub = 'Tinder · угощает';
      else if (contact.id === 'krypta') sub = 'не знает как тебя зовут';
      else if (contact.id === 'artur') sub = 'бывший босс';
      else if (contact.id === 'vera')  sub = 'училка · одноклассники';
      else if (contact.id === 'sosed') sub = 'квартира 23';
      else if (contact.id === 'lyuda') sub = 'случайный номер';
      else if (contact.id === 'ozon')  sub = 'ваш заказ?';
      else if (contact.id === 'taxi')  sub = 'случайный таксист';
      else if (contact.id === 'student') sub = 'диплом горит';
      else if (contact.id === 'katya') sub = 'Катя с работы';
      else if (contact.id === 'teshcha') sub = 'свекровь кого-то';
      else if (contact.id === 'marathon') sub = 'эзотерический клуб';
      else if (contact.id === 'scratch') sub = 'личные заметки';
      if (contact.online) sub += ' · в сети';
      else if (sub && contact.id !== 'bank' && contact.id !== 'scratch' && !contact.spam) sub += ' · был(а) недавно';
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
    scrollToBottom: scrollToBottom
  };
})();
