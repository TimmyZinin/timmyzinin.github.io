/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Derivative work based on A Dark Room by Michael Townsend
 * (github.com/doublespeakgames/adarkroom, MPL-2.0).
 *
 * «Марина в огне» v2.0a — messenger UI sim about a founder's first 12 days.
 * Implementation (c) 2026 Tim Zinin.
 */

(function () {
  'use strict';

  // ========== constants ==========

  var VERSION = '2.0.4';
  var STATE_KEY = 'marina-fire:v2.0:state';
  var VERSION_KEY = 'marina-fire:v2.0:version';
  var OLD_KEYS = [
    'marina-fire:v1:state', 'marina-fire:v1:version',
    'marina-fire:v1.5:state', 'marina-fire:v1.5:version',
    'marina-fire:v1.6:state', 'marina-fire:v1.6:version'
  ];
  var SESSION_KEY = 'marina-fire:session_started_at';

  var HOURS_PER_DAY = 8;
  var FINALE_DAY = 12;
  var TYPING_MS = 900;
  var BUBBLE_DELAY_MS = 400;

  // Action costs (1h standard)
  var COST = {
    reach_out:       { h: 1, e: 5 },
    brief_lead:      { h: 1, e: 3 },
    send_offer:      { h: 1, e: 0 },
    work_on_project: { h: 2, e: 5 },
    rest:            { h: 1, e: 0 },
    end_day:         { h: 0, e: 0 }
  };

  // ========== text banks ==========

  var REACH_OUT_TEXT = {
    outgoing: [
      'рассылаю холодку. 20 адресов. linkedin + email',
      'пишу в slack founders.cc. 7 личок',
      'фармю twitter: кто жаловался на агентства',
      'брифю через sales navigator',
      'трясу старых коллег насчёт контактов',
      'копаюсь в wellfound, пишу cold-loom'
    ],
    hit_reply: [
      '«интересно, давайте на созвон завтра в 14:00»',
      '«привет! расскажи подробнее о ценах»',
      '«у нас как раз запускаем новый продукт, пиши»',
      '«я не решаю, но передам коллеге — она свяжется»',
      '«можем обсудить, у меня есть 15 минут в четверг»'
    ],
    miss_silence: [
      'тишина. ноль ответов',
      'один «не заинтересованы, удачи»',
      'три auto-reply, остальные молчат',
      'модератор удалил пост в чате',
      'все 20 писем — seen, не ответили'
    ]
  };

  var WORK_TEXT = [
    'пишу лендинг. h1, sub, 3 блока про boli',
    'верстаю email-последовательность в mailchimp',
    'правю правки. третий круг. половина прошлых',
    'созваниваюсь с клиентом: «что у вас болит больше всего?»',
    'делаю reels-скрипты: 5 штук по 30 сек',
    'сижу в figma: moodboard, первый wireframe',
    'разбираю вчерашние правки, переписываю headline',
    'экспортирую финалку, делаю zip, пишу сдачу'
  ];

  var BRIEF_TEXT = [
    'задаю вопросы про бюджет и сроки',
    'выясняю decision-maker: кто подписывает',
    'проверяю activity: есть ли у них сейчас продукт',
    'тестирую fit: «если не сработаемся через неделю — что тогда?»'
  ];

  var REST_TEXT = [
    'налила кофе, дала воде остыть. смотрю в окно',
    'вышла на балкон. стою как будто курю, не курю',
    'прилегла на 20 минут с телефоном',
    'прошлась до магазина за хлебом',
    'поставила чайник, забыла, снова поставила'
  ];

  // ========== state ==========

  function defaultState() {
    return {
      version: VERSION,
      day: 1,
      hours: HOURS_PER_DAY,
      energy: 100,
      cash: 500,
      leads: 0,
      qualified_leads: 0,
      active_projects: [],
      delivered_projects: 0,
      coffee_stacks: 0,
      lamp_on: false,
      intro_seen: false,
      notebook_available: false,
      lead_submitted: false,
      automation_active: false,
      // beat flags
      beat_lena_intro: false,
      beat_anna_offer: false,
      beat_tim_intro: false,
      beat_tim_retry: false,
      beat_food: false,
      beat_rent: false,
      beat_lena_day9: false,
      beat_khozyaika: false,
      beat_pavel: false,
      beat_mama6: false,
      beat_mama11: false,
      beat_denis3: false,
      beat_denis6: false,
      beat_denis9: false,
      // reactive
      reach_out_total: 0,
      reach_out_misses: 0,
      lena_lifeline_used: false,
      pending_callbacks: [], // delayed events {trigger_day, type, data}
      ending_seen: false, // 'win' | 'lose_eviction' | 'lose_burnout' | 'lose_no_traction' | false
      // messenger
      contacts: [
        { id: 'lena',    name: 'Лена',            avatar: 'Л',  unread: 0, visible: true  },
        { id: 'anna',    name: 'Анна',            avatar: 'А',  unread: 0, visible: false },
        { id: 'tim',     name: 'Тим',             avatar: 'Т',  unread: 0, visible: false },
        { id: 'bank',    name: 'Т-Банк',          avatar: '$',  unread: 0, visible: true  },
        { id: 'khozyaika', name: 'Наталья Вал.',  avatar: 'Н',  unread: 0, visible: false },
        { id: 'pavel',   name: 'Павел',           avatar: 'П',  unread: 0, visible: false },
        { id: 'mama',    name: 'мама',            avatar: '♥',  unread: 0, visible: false },
        { id: 'denis',   name: 'Денис',           avatar: 'Д',  unread: 0, visible: false },
        { id: 'spam',    name: '+7 неизвестные',  avatar: '?',  unread: 0, visible: false },
        { id: 'scratch', name: 'себе',            avatar: 'М',  unread: 0, visible: true  }
      ],
      threads: {
        lena: [], anna: [], tim: [], bank: [],
        khozyaika: [], pavel: [], mama: [], denis: [], spam: [],
        scratch: []
      },
      spam_used: [],
      current_chat: 'scratch',
      current_folder: 'all'
    };
  }

  var STATE;
  var isBusy = false; // single-flight guard for action pipeline

  function loadState() {
    // clean old keys
    OLD_KEYS.forEach(function (k) {
      try { localStorage.removeItem(k); } catch (e) {}
    });
    try {
      var raw = localStorage.getItem(STATE_KEY);
      var ver = localStorage.getItem(VERSION_KEY);
      if (raw && ver === VERSION) {
        var parsed = JSON.parse(raw);
        var d = defaultState();
        // Top-level merge
        for (var k in d) {
          if (!(k in parsed)) parsed[k] = d[k];
        }
        // Deep-merge contacts by id (keep progress flags, add missing entries)
        if (Array.isArray(parsed.contacts)) {
          var byId = {};
          parsed.contacts.forEach(function (c) { if (c && c.id) byId[c.id] = c; });
          var merged = [];
          d.contacts.forEach(function (def) {
            if (byId[def.id]) {
              // Keep saved fields, backfill any new keys from default
              var saved = byId[def.id];
              for (var kk in def) {
                if (!(kk in saved)) saved[kk] = def[kk];
              }
              merged.push(saved);
            } else {
              merged.push(def);
            }
          });
          parsed.contacts = merged;
        } else {
          parsed.contacts = d.contacts;
        }
        // Deep-merge threads — ensure every contact id has a thread array
        if (!parsed.threads || typeof parsed.threads !== 'object') {
          parsed.threads = d.threads;
        } else {
          for (var tid in d.threads) {
            if (!Array.isArray(parsed.threads[tid])) parsed.threads[tid] = [];
          }
        }
        return parsed;
      }
    } catch (e) {}
    return defaultState();
  }

  // Safe contact lookup — never throws if id missing
  function findContact(id) {
    if (!STATE || !Array.isArray(STATE.contacts)) return null;
    for (var i = 0; i < STATE.contacts.length; i++) {
      if (STATE.contacts[i].id === id) return STATE.contacts[i];
    }
    return null;
  }

  function saveState() {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(STATE));
      localStorage.setItem(VERSION_KEY, VERSION);
    } catch (e) {}
  }

  function clearState() {
    try {
      localStorage.removeItem(STATE_KEY);
      localStorage.removeItem(VERSION_KEY);
    } catch (e) {}
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ========== dock (global HUD) ==========

  function renderDock() {
    // Time-of-day icon based on hours left (8h day)
    var h = STATE.hours;
    var tod = h >= 6 ? '🌅' : h >= 4 ? '☀️' : h >= 2 ? '🌇' : '🌙';
    $('#dock-day').text(tod + ' ' + STATE.day);
    $('#dock-hours').text(Math.max(0, STATE.hours));
    // Cash color
    var $cash = $('#dock-cash').text(STATE.cash).removeClass('neg low');
    if (STATE.cash < 0) $cash.addClass('neg');
    else if (STATE.cash < 200) $cash.addClass('low');
    $('#dock-leads').text(STATE.leads);
    $('#dock-qualified').text(STATE.qualified_leads);
    $('#dock-done').text(STATE.delivered_projects);

    var $buttons = $('#dock-buttons').empty();

    var actions = [];
    if (STATE.lamp_on) {
      if (STATE.hours >= COST.reach_out.h && STATE.energy >= COST.reach_out.e) {
        actions.push({ id: 'reach_out', label: 'искать клиентов', cost: '1ч · −5⚡', primary: true });
      }
      if (STATE.leads >= 1 && STATE.hours >= COST.brief_lead.h && STATE.energy >= COST.brief_lead.e) {
        actions.push({ id: 'brief_lead', label: 'созвон с лидом', cost: '1ч · −3⚡' });
      }
      if (STATE.qualified_leads >= 1 && STATE.hours >= COST.send_offer.h) {
        actions.push({ id: 'send_offer', label: 'отправить оффер', cost: '1ч' });
      }
      if (STATE.active_projects.length > 0 && STATE.hours >= COST.work_on_project.h && STATE.energy >= COST.work_on_project.e) {
        actions.push({ id: 'work_on_project', label: 'делать работу', cost: '2ч · −5⚡' });
      }
      if (STATE.energy < 100 && STATE.hours >= COST.rest.h && STATE.coffee_stacks < 4) {
        actions.push({ id: 'rest', label: 'перерыв', cost: '1ч · +30⚡' });
      }
      actions.push({ id: 'end_day', label: '🌙 лечь спать', cost: 'конец дня' });
    }

    // Primary action = first with primary flag
    var primarySet = false;
    actions.forEach(function (a) {
      var $btn = $('<button class="dock-btn">').attr('data-action', a.id).text(a.label);
      if (a.primary && !primarySet) {
        $btn.addClass('primary');
        primarySet = true;
      }
      // Day-end pulse when hours ≤ 2
      if (a.id === 'end_day' && STATE.hours <= 2 && STATE.lamp_on) {
        $btn.addClass('pulse');
      }
      if (a.cost) $btn.append($('<span class="dock-cost">').text(' · ' + a.cost));
      if (isBusy) $btn.attr('disabled', 'disabled');
      $buttons.append($btn);
    });

    if (!STATE.lamp_on) {
      var $lamp = $('<button class="dock-btn">').attr('data-action', 'lamp').text('включить лампу');
      $buttons.append($lamp);
    }
  }

  // ========== messenger rendering ==========

  function currentChat() { return STATE.current_chat; }

  function openChat(contactId) {
    var contact = STATE.contacts.find(function (c) { return c.id === contactId; });
    if (!contact) return;
    contact.unread = 0;
    STATE.current_chat = contactId;
    Bubbles.renderContacts(STATE);
    Bubbles.renderChatHeader(STATE, contact);
    Bubbles.replayThread(STATE, contactId);
    Bubbles.clearChipsArea();
    renderThreadContextActions(contactId);
    save();
  }

  function renderThreadContextActions(contactId) {
    // Tim thread: show notebook opener if available and not yet submitted
    if (contactId === 'tim' && STATE.notebook_available && !STATE.lead_submitted) {
      Bubbles.renderReplyChips([
        { id: 'open_notebook', label: 'открыть блокнот (написать тиму)' }
      ], function () { mountInlineForm(); });
      return;
    }
    // Khozyaika rent shock
    if (contactId === 'khozyaika' && STATE._khozyaika_pending) {
      Bubbles.renderReplyChips([
        { id: 'pay', label: 'заплатить +$500 (без споров)' },
        { id: 'argue', label: 'возразить (40% waive)' },
        { id: 'ignore', label: 'игнорировать' }
      ], function (opt) {
        STATE._khozyaika_pending = false;
        Bubbles.clearChipsArea();
        if (opt.id === 'pay') {
          postOutgoing('khozyaika', 'окей. перевожу.');
          STATE.cash -= 500;
          postBank(-500, 'доп-rent «комод»');
          postMessage('scratch', { kind: 'system', text: '−$500 · хозяйка' });
        } else if (opt.id === 'argue') {
          postOutgoing('khozyaika', 'извините, но я ничего не царапала. не буду доплачивать.');
          setTimeout(function () {
            if (Math.random() < 0.40) {
              postIncoming('khozyaika', 'ну хорошо. на этот раз.', 'Наталья В.');
              postMessage('scratch', { kind: 'system', text: 'хозяйка отступила' });
            } else {
              postIncoming('khozyaika', 'у меня есть другие арендаторы. до конца недели $500 или уходите.', 'Наталья В.');
              STATE.cash -= 500;
              postBank(-500, 'доп-rent (продавлено)');
            }
            save(); renderDock();
          }, 800);
        } else {
          postMessage('scratch', { kind: 'system', text: 'игнорировала хозяйку' });
        }
        save(); renderDock();
      });
      return;
    }
    // Pavel loan
    if (contactId === 'pavel' && STATE._pavel_pending) {
      Bubbles.renderReplyChips([
        { id: 'lend', label: 'дать $300 в долг' },
        { id: 'refuse', label: 'отказать' }
      ], function (opt) {
        STATE._pavel_pending = false;
        Bubbles.clearChipsArea();
        if (opt.id === 'lend') {
          postOutgoing('pavel', 'ладно. держи.');
          STATE.cash -= 300;
          postBank(-300, 'в долг · Павлу');
          postMessage('scratch', { kind: 'system', text: '−$300 · отданы Павлу' });
          // Delayed callback
          STATE.pending_callbacks = STATE.pending_callbacks || [];
          STATE.pending_callbacks.push({ trigger_day: STATE.day + 3, type: 'pavel_return' });
        } else {
          postOutgoing('pavel', 'не сейчас, извини.');
          postMessage('scratch', { kind: 'system', text: 'Павлу отказала' });
        }
        save(); renderDock();
      });
      return;
    }
    // Mama day 6
    if (contactId === 'mama' && STATE._mama6_pending) {
      Bubbles.renderReplyChips([
        { id: 'send', label: 'перевести $200' },
        { id: 'defer', label: 'не сейчас, мам' }
      ], function (opt) {
        STATE._mama6_pending = false;
        Bubbles.clearChipsArea();
        if (opt.id === 'send') {
          postOutgoing('mama', 'перевела, мам. береги себя.');
          STATE.cash -= 200;
          postBank(-200, 'маме · лекарства');
          postMessage('scratch', { kind: 'system', text: '−$200 · маме' });
        } else {
          postOutgoing('mama', 'мам, сейчас не могу. в следующий раз. обещаю.');
          STATE.energy = Math.max(0, STATE.energy - 5);
          postMessage('scratch', { kind: 'system', text: '−5⚡ · эмоциональный вес' });
        }
        save(); renderDock();
      });
      return;
    }
    // Mama day 11
    if (contactId === 'mama' && STATE._mama11_pending) {
      Bubbles.renderReplyChips([
        { id: 'come', label: 'приеду в воскресенье' },
        { id: 'later', label: 'потом, работа' }
      ], function (opt) {
        STATE._mama11_pending = false;
        Bubbles.clearChipsArea();
        if (opt.id === 'come') {
          postOutgoing('mama', 'буду в воскресенье. соскучилась.');
          STATE.energy = Math.min(100, STATE.energy + 40);
          postMessage('scratch', { kind: 'system', text: '+40⚡ · пироги работают' });
        } else {
          postOutgoing('mama', 'мам, проект горит. позже, ладно?');
          STATE.energy = Math.max(0, STATE.energy - 10);
          postMessage('scratch', { kind: 'system', text: '−10⚡ · эмоциональный долг' });
        }
        save(); renderDock();
      });
      return;
    }
    // Denis party invitations (3 days)
    [3, 6, 9].forEach(function (d) {
      var key = '_denis' + d + '_pending';
      if (contactId === 'denis' && STATE[key]) {
        Bubbles.renderReplyChips([
          { id: 'go', label: 'поехать (−$150, +60⚡, −2h дня)' },
          { id: 'skip', label: 'не сейчас' }
        ], function (opt) {
          STATE[key] = false;
          Bubbles.clearChipsArea();
          if (opt.id === 'go') {
            postOutgoing('denis', 'ладно, поехали. работа подождёт.');
            STATE.cash -= 150;
            STATE.energy = Math.min(100, STATE.energy + 60);
            STATE.hours = Math.max(0, STATE.hours - 2);
            postBank(-150, 'с Денисом');
            postMessage('scratch', { kind: 'system', text: '−$150 · +60⚡ · −2h · день ожил' });
          } else {
            postOutgoing('denis', 'не сегодня. работа.');
            postMessage('scratch', { kind: 'system', text: 'Денису отказала' });
          }
          save(); renderDock();
        });
        return;
      }
    });
  }

  function postMessage(threadId, msg) {
    // Default fields
    if (!msg.time) msg.time = Bubbles.formatTimestamp(STATE.day, STATE.hours);
    if (!msg.kind) msg.kind = 'incoming';
    Bubbles.appendToThreadHistory(STATE, threadId, msg);
    // If this thread is currently open, render live
    if (STATE.current_chat === threadId) {
      Bubbles.renderBubble(threadId, msg);
    }
    Bubbles.renderContacts(STATE);
    save();
  }

  function postOutgoing(threadId, text) {
    postMessage(threadId, { from: 'marina', text: text, kind: 'outgoing' });
  }

  function postIncoming(threadId, text, senderName) {
    postMessage(threadId, { from: threadId, text: text, kind: 'incoming', senderName: senderName });
    if (window.MarinaAudio) window.MarinaAudio.messagePing();
  }

  function postSystem(threadId, text) {
    postMessage(threadId, { text: text, kind: 'system' });
  }

  function postBank(amount, desc) {
    postMessage('bank', {
      text: desc || '',
      kind: 'bank',
      meta: { bank_name: 'Т-Банк', amount: amount }
    });
    if (window.MarinaAudio) window.MarinaAudio.bankDing();
  }

  // ========== action pipeline (single-flight) ==========

  function runAction(fn) {
    if (isBusy) return;
    if (STATE.ending_seen) return;
    isBusy = true;
    renderDock();
    Bubbles.showTyping(TYPING_MS, function () {
      try { fn(); } catch (e) { console.error('action error', e); }
      setTimeout(function () {
        isBusy = false;
        // Hard-fail only: cash crash can end mid-day
        checkEndings(false);
        save();
        renderDock();
      }, BUBBLE_DELAY_MS);
    });
  }

  // ========== actions ==========

  function actLamp() {
    STATE.lamp_on = true;
    // Open scratch chat with intro
    postMessage('scratch', {
      text: 'день 1. 9:00. ноутбук открыт. чат пуст. кофе остыл. пора начинать.',
      kind: 'system'
    });
    // Lena pre-seeded message arrives in a moment
    setTimeout(function () {
      triggerLenaIntro();
      renderDock();
    }, 500);
    save();
    openChat('scratch');
    renderDock();
  }

  function actReachOut() {
    STATE.hours -= COST.reach_out.h;
    STATE.energy = Math.max(0, STATE.energy - COST.reach_out.e);
    STATE.reach_out_total += 1;

    // Newbie bamboozle: first 3 guaranteed hit
    var guaranteed = STATE.reach_out_total <= 3;
    // Pity timer
    var pity = STATE.reach_out_misses >= 3;
    var hit;
    if (guaranteed || pity) {
      hit = true;
      STATE.reach_out_misses = 0;
    } else {
      var roll = Math.random();
      var e = STATE.energy;
      var hitChance = e >= 70 ? 0.65 : (e >= 40 ? 0.50 : 0.30);
      hit = roll < hitChance;
      if (hit) STATE.reach_out_misses = 0;
      else STATE.reach_out_misses += 1;
    }

    runAction(function () {
      // Post outgoing to scratch (self-chat)
      postOutgoing('scratch', pick(REACH_OUT_TEXT.outgoing));

      if (hit) {
        STATE.leads += 1;
        // After short delay, an incoming message from a "cold lead"
        setTimeout(function () {
          postSystem('scratch', '+1 лид · кто-то ответил');
          postIncoming('scratch', pick(REACH_OUT_TEXT.hit_reply), 'незнакомый контакт');
        }, 600);
      } else {
        setTimeout(function () {
          postSystem('scratch', pick(REACH_OUT_TEXT.miss_silence));
        }, 600);
      }
    });
  }

  function actBriefLead() {
    STATE.hours -= COST.brief_lead.h;
    STATE.energy = Math.max(0, STATE.energy - COST.brief_lead.e);
    STATE.leads -= 1;
    STATE.qualified_leads += 1;

    runAction(function () {
      postOutgoing('scratch', pick(BRIEF_TEXT));
      setTimeout(function () {
        postSystem('scratch', '+1 квалифицированный лид · можно отправить оффер');
      }, 600);
    });
  }

  function actSendOffer() {
    if (STATE.qualified_leads < 1) return;
    STATE.hours -= COST.send_offer.h;

    runAction(function () {
      STATE.qualified_leads -= 1;
      var baseBudget = 200 + Math.floor(Math.random() * 101); // 200-300
      postOutgoing('scratch', 'отправляю предложение');
      setTimeout(function () {
        postIncoming('scratch',
          'клиент пишет: «у меня бюджет $' + baseBudget + ', сроки — неделя»',
          'клиент');
        // Offer torgi chips
        Bubbles.renderReplyChips([
          { id: 'accept',   label: 'согласиться ($' + baseBudget + ')', cost: '100% accept' },
          { id: 'counter1', label: 'поторговаться ($' + (baseBudget + 150) + ')', cost: '70% accept' },
          { id: 'counter2', label: 'жёстко ($' + (baseBudget + 350) + ')', cost: '40% accept' },
          { id: 'decline',  label: 'отказать, искать следующего' }
        ], function (opt) {
          handleTorgiChoice(opt.id, baseBudget);
        });
      }, 700);
    });
  }

  function handleTorgiChoice(choice, baseBudget) {
    Bubbles.clearChipsArea();
    var accepted = false;
    var finalPrice = baseBudget;
    if (choice === 'accept') { accepted = true; finalPrice = baseBudget; }
    else if (choice === 'counter1') {
      accepted = Math.random() < 0.70;
      finalPrice = baseBudget + 150;
    } else if (choice === 'counter2') {
      accepted = Math.random() < 0.40;
      finalPrice = baseBudget + 350;
    } else if (choice === 'decline') {
      // Refuse — lead goes cold
      postIncoming('scratch', 'ок, ищите других', 'клиент');
      save(); renderDock();
      return;
    }

    if (accepted) {
      postOutgoing('scratch', choice === 'accept' ? 'окей, беру' : 'давайте на этих условиях');
      setTimeout(function () {
        postIncoming('scratch', 'отлично, договор подписываем', 'клиент');
        // Create project with upfront + final
        var upfront = Math.floor(finalPrice * 0.4);
        var finalPayment = finalPrice - upfront;
        var project = {
          id: (STATE.active_projects.length + STATE.delivered_projects + 1),
          client: pick(['лендинг saas','бриф dtc','email-серия','кейс-стади','reels-пакет']),
          progress: 0,
          final_payment: finalPayment,
          started_day: STATE.day
        };
        STATE.active_projects.push(project);
        STATE.cash += upfront;
        postBank(upfront, 'поступление по договору #' + project.id);
        postSystem('scratch', 'контракт подписан · upfront $' + upfront + ' · проект #' + project.id);
        save(); renderDock();
      }, 800);
    } else {
      postOutgoing('scratch', 'давайте подумаем и обсудим');
      setTimeout(function () {
        postIncoming('scratch', 'извините, нам это не подходит', 'клиент');
        postSystem('scratch', 'сделка сорвалась · лид сгорел');
        save(); renderDock();
      }, 800);
    }
  }

  function actWorkOnProject() {
    if (STATE.active_projects.length === 0) return;
    STATE.hours -= COST.work_on_project.h;
    STATE.energy = Math.max(0, STATE.energy - COST.work_on_project.e);

    runAction(function () {
      var p = STATE.active_projects[0];
      p.progress = Math.min(100, p.progress + 50);
      postOutgoing('scratch', pick(WORK_TEXT));
      setTimeout(function () {
        postSystem('scratch', 'проект #' + p.id + ' · прогресс ' + p.progress + '%');
        if (p.progress >= 100) {
          // auto delivery
          STATE.active_projects.shift();
          STATE.delivered_projects += 1;
          STATE.cash += p.final_payment;
          setTimeout(function () {
            postSystem('scratch', 'проект #' + p.id + ' сдан · клиент принял');
            postBank(p.final_payment, 'финал по проекту #' + p.id);
            save(); renderDock();
          }, 500);
        }
        save(); renderDock();
      }, 600);
    });
  }

  function actRest() {
    STATE.hours -= COST.rest.h;
    STATE.coffee_stacks += 1;
    var gain = STATE.coffee_stacks >= 4 ? 10 : 30;
    STATE.energy = Math.min(100, STATE.energy + gain);

    runAction(function () {
      postOutgoing('scratch', pick(REST_TEXT));
      setTimeout(function () {
        if (gain >= 30) postSystem('scratch', '+' + gain + ' энергии');
        else postSystem('scratch', 'кофе перелит · +' + gain + ' энергии');
      }, 500);
    });
  }

  function actEndDay() {
    if (isBusy) return;
    isBusy = true;
    var prevDay = STATE.day;

    // Show night overlay first
    var $overlay = $('#night-overlay');
    var $text = $overlay.find('.night-text');
    $text.text('ночь · день ' + prevDay + ' позади');
    $overlay.addClass('active');
    renderDock();

    // Safety net: no matter what happens in the transition callback,
    // always release the overlay after max 3.5s so game cannot freeze.
    var safety = setTimeout(function () {
      $overlay.removeClass('active');
      isBusy = false;
      renderDock();
    }, 3500);

    // After 1.5s overlay — do the actual day transition
    setTimeout(function () {
      try {
        STATE.day += 1;
        STATE.hours = HOURS_PER_DAY;
        STATE.energy = Math.min(100, STATE.energy + 20);
        STATE.coffee_stacks = Math.max(0, STATE.coffee_stacks - 1);

        // Day 12 → 13 transition → finale check
        if (STATE.day > FINALE_DAY) {
          postSystem('scratch', '— месяц закончился. день ' + FINALE_DAY + ' позади. —');
          checkEndings(true);
          STATE.day = FINALE_DAY;
          return;
        }

        postSystem('scratch', '— конец дня ' + prevDay + ' · новый день начался —');
        postSystem('scratch', 'день ' + STATE.day + ' · 8 часов впереди · $' + STATE.cash);

        if (STATE.day === FINALE_DAY - 1) {
          postSystem('scratch', 'это последний рабочий день этого месяца · пора заканчивать проекты');
        }
        if (STATE.day === FINALE_DAY) {
          postSystem('scratch', 'последний день месяца · сегодня всё решится');
        }

        try { processPassive(STATE.day); } catch (e) { console.error('passive error', e); }
        try { fireDayBeats(STATE.day); } catch (e) { console.error('beats error', e); }
      } catch (e) {
        console.error('endDay transition error', e);
      } finally {
        // Always: save, re-render, and release the overlay
        clearTimeout(safety);
        try { save(); } catch (e) {}
        try { renderDock(); } catch (e) {}
        setTimeout(function () {
          $overlay.removeClass('active');
          isBusy = false;
          renderDock();
        }, 400);
      }
    }, 1500);
  }

  // ========== beats ==========

  function triggerLenaIntro() {
    if (STATE.beat_lena_intro) return;
    STATE.beat_lena_intro = true;
    var lena = findContact('lena');
    if (!lena) return;
    lena.visible = true;
    lena.online = true;
    postMessage('lena', {
      kind: 'incoming',
      senderName: 'Лена',
      photo: 'img/events/lena_coffee.webp',
      photoAlt: 'кофейня',
      text: 'эй, подруга. услышала что ты ушла из агентства.\n\nпервая неделя всегда самая тяжёлая — я была там. через пару дней скину контакты. держись.'
    });
    Bubbles.renderContacts(STATE);
  }

  function beatAnnaOffer() {
    if (STATE.beat_anna_offer) return;
    STATE.beat_anna_offer = true;
    var c = findContact('anna'); if (c) c.visible = true;
    postMessage('anna', {
      kind: 'incoming',
      senderName: 'Анна',
      photo: 'img/events/anna_landing_sketch.webp',
      photoAlt: 'wireframe лендинга',
      text: 'привет. лена про тебя рассказала.\n\nу меня небольшой проект — двустраничник, $250 upfront + $300 на сдаче. если готова быстро — берём?'
    });
    postMessage('scratch', { kind: 'system', text: 'Анна написала · ответь ей' });

    // Add reply chips when opening Anna chat
    STATE._anna_pending = true;
  }

  function beatTimIntro() {
    if (STATE.beat_tim_intro) return;
    STATE.beat_tim_intro = true;
    var c = findContact('tim'); if (c) c.visible = true;
    STATE.notebook_available = true;

    // Lena hands off
    postMessage('lena', {
      kind: 'incoming',
      senderName: 'Лена',
      text: 'слушай. у меня есть знакомый — тим. он в каше, помогает founders распутывать работу.\n\nне продаёт ничего конкретного — просто смотрит что у тебя на столе и говорит что можно убрать.\n\nпопросила его написать тебе. открой блокнот, запиши что сейчас горит. прочитает в тот же день.'
    });
    // Tim intro bubble — signature urgent-founder energy
    postMessage('tim', {
      kind: 'incoming',
      senderName: 'Тим',
      text: 'СТАВЬ КЛОД КОД'
    });
    postMessage('tim', {
      kind: 'incoming',
      senderName: 'Тим',
      text: 'НЕТ ВРЕМЕНИ ОБЪЯСНЯТЬ!!'
    });
    postMessage('tim', {
      kind: 'incoming',
      senderName: 'Тим',
      photo: 'img/events/tim_kas_view.webp',
      photoAlt: 'вид из каша',
      text: 'так. выдохни.\n\nя тим. лена написала. живу в каше, помогаю фаундерам распутывать бардак в голове.\n\nоткрой блокнот и напиши одним куском что сейчас жрёт больше всего времени и сил. прочитаю в тот же день и верну 3 конкретные штуки которые можно сделать завтра утром.'
    });
    postMessage('scratch', { kind: 'system', text: 'Тим доступен · открой чат и напиши в блокнот' });
  }

  function beatLenaDay9() {
    if (STATE.beat_lena_day9) return;
    if (STATE.lead_submitted) return;
    STATE.beat_lena_day9 = true;
    postMessage('lena', {
      kind: 'incoming',
      senderName: 'Лена',
      text: 'слушай, тим всё ещё спрашивает про тебя. если передумаешь — блокнот ждёт.'
    });
  }

  // ========== new characters (v2.0b1) ==========

  function beatKhozyaika() {
    if (STATE.beat_khozyaika) return;
    STATE.beat_khozyaika = true;
    var c = findContact('khozyaika'); if (c) c.visible = true;
    postMessage('khozyaika', {
      kind: 'incoming',
      senderName: 'Наталья Валерьевна',
      photo: 'img/events/notebook_sketch.webp',
      photoAlt: 'комод, якобы поцарапанный',
      text: 'марина, добрый день. мне сегодня приснилось что вы поцарапали комод в прихожей. думаю будет справедливо повысить аренду на $500. жду квитанции к 15-му числу. наталья валерьевна.'
    });
    postMessage('scratch', { kind: 'system', text: 'хозяйка написала · открой чат' });
    STATE._khozyaika_pending = true;
  }

  function beatPavel() {
    if (STATE.beat_pavel) return;
    STATE.beat_pavel = true;
    var c = findContact('pavel'); if (c) c.visible = true;
    postMessage('pavel', {
      kind: 'incoming',
      senderName: 'Павел',
      photo: 'img/events/bank_sms.webp',
      photoAlt: 'скриншот — обещаю вернуть',
      text: 'привет. знаю, не звонил четыре месяца.\n\nслушай, у меня жёсткая ситуация — нужно $300 на пару недель. верну $450, честно. помоги, пожалуйста.'
    });
    postMessage('scratch', { kind: 'system', text: 'Павел написал · открой чат' });
    STATE._pavel_pending = true;
  }

  function beatMama6() {
    if (STATE.beat_mama6) return;
    STATE.beat_mama6 = true;
    var c = findContact('mama'); if (c) c.visible = true;
    postMessage('mama', {
      kind: 'incoming',
      senderName: 'мама',
      photo: 'img/events/cat_window.webp',
      photoAlt: 'кошка у окна',
      text: 'доча, я на лекарства не могу накопить в этом месяце. если можешь помочь — $200 скинь. если нет — я понимаю, у тебя и так сложно.'
    });
    postMessage('scratch', { kind: 'system', text: 'мама написала · открой чат' });
    STATE._mama6_pending = true;
  }

  function beatMama11() {
    if (STATE.beat_mama11) return;
    STATE.beat_mama11 = true;
    var c = findContact('mama'); if (c) c.visible = true;
    postMessage('mama', {
      kind: 'incoming',
      senderName: 'мама',
      photo: 'img/events/desk_night.webp',
      photoAlt: 'ночной стол',
      text: 'ты там живая? звонков нет. приезжай на выходных, я пирогов напеку.'
    });
    postMessage('scratch', { kind: 'system', text: 'мама ждёт ответа' });
    STATE._mama11_pending = true;
  }

  function beatDenis(day) {
    var flag = 'beat_denis' + day;
    if (STATE[flag]) return;
    STATE[flag] = true;
    var c = findContact('denis'); if (c) c.visible = true;
    var texts = {
      3: 'марин, задолбал сидеть дома. поехали на регату в субботу? море, ветер, никаких писем',
      6: 'слушай, в кино идём? новый фильм — хвалят. отвлечёшься на два часа',
      9: 'перестань работать хоть на день. гулять поехали на набережную? я занесу вино'
    };
    var photos = {
      3: 'img/events/regatta.webp',
      6: 'img/events/cinema_ticket.webp',
      9: 'img/events/street_window.webp'
    };
    postMessage('denis', {
      kind: 'incoming',
      senderName: 'Денис',
      photo: photos[day],
      photoAlt: day === 3 ? 'регата' : day === 6 ? 'кино' : 'набережная',
      text: texts[day] || 'привет, как ты там?'
    });
    postMessage('scratch', { kind: 'system', text: 'Денис зовёт гулять · открой чат' });
    STATE['_denis' + day + '_pending'] = true;
  }

  // ========== spam / humor dialogues (flavor only, zero cost) ==========

  var JOKE_DECK = [
    {
      id: 'pirog',
      sender: 'Людочка (не Людочка)',
      bubbles: [
        'Людочка, ты забыла у меня в духовке пирог 🥧',
        'Я не знаю что с ним делать. Он уже 4 часа там. Он живой ещё?',
        'Алло? Люда это ты??'
      ]
    },
    {
      id: 'solana',
      sender: 'БРАТ КРИПТА',
      bubbles: [
        'БРАТ',
        'СОЛАНА ЛЕТИТ 🚀🚀🚀',
        '1000X ЭТОТ МЕСЯЦ. заносишь $100 — делаешь $100000. не упусти шанс поменять жизнь'
      ]
    },
    {
      id: 'herbalife',
      sender: 'Оля Петрова (11-Б)',
      bubbles: [
        'Мариночка приветик! Это Оля Петрова, мы учились вместе в 11-Б. Помнишь меня?',
        'У меня появилась уникальная возможность для женщин которые хотят изменить свою жизнь и финансы. Можно я расскажу 5 минут?',
        'Это не пирамида, это клуб ✨'
      ]
    },
    {
      id: 'tinder',
      sender: 'Кирилл',
      bubbles: [
        'ну привет',
        'ты потерялась?',
        'я просто хотел сказать что уважаю твой выбор не отвечать три недели. но считаю его слабым. удачи'
      ]
    },
    {
      id: 'shvabra',
      sender: 'OZON курьер',
      bubbles: [
        'Добрый день! Ваш заказ "Швабра телескопическая 3в1 Премиум" готов к доставке',
        'Когда вам удобно принять? Адрес в заказе указан верно?'
      ]
    },
    {
      id: 'coach',
      sender: 'женская сила',
      bubbles: [
        'ТЫ ГОТОВА К ПРОРЫВУ??? 🔥🔥🔥',
        'марафон «ПРОБУЖДЕНИЕ ТВОЕЙ СИЛЫ» · 21 день · бесплатно · только сегодня',
        '🌸 истинная женщина не работает — она притягивает 🌸'
      ]
    },
    {
      id: 'taxi_atlant',
      sender: 'водитель яндекса',
      bubbles: [
        'здравствуйте это водитель. вы ехали в среду из аэропорта',
        'вы забыли у меня в машине книгу «атлант расправил плечи» том 2',
        'вернуть могу за 500 как договаривались'
      ]
    },
    {
      id: 'old_boss',
      sender: 'Артур (экс-босс)',
      bubbles: [
        'марина привет. я понимаю что ты ушла не на лучшей ноте',
        'но у меня есть тема. подойди завтра в 10 в старый офис, объясню лично',
        'это взаимовыгодно'
      ]
    },
    {
      id: 'sosed',
      sender: 'сосед снизу',
      bubbles: [
        'здравствуйте. это ваш сосед снизу, квартира 23',
        'у меня на потолке появилось пятно',
        'я думаю это от вас. спустите поговорить?'
      ]
    },
    {
      id: 'teacher',
      sender: 'Вера Николаевна',
      bubbles: [
        'Марина Сергеевна, здравствуйте! Это Вера Николаевна, ваша учительница по литературе',
        'Я в одноклассниках увидела что вы открыли своё дело. Горжусь вами!',
        'У меня есть внучка Алиса. Она пишет стихи. Не могли бы вы её продвинуть в интернете?'
      ]
    },
    {
      id: 'philosophy',
      sender: 'студент СПбГУ',
      bubbles: [
        'привет. я пишу диплом по постпозитивизму',
        'можно задать 12 вопросов? займёт 5 минут',
        'первый вопрос: как думаешь, сознание — это вычисление?'
      ]
    },
    {
      id: 'teshcha',
      sender: 'неизвестный номер',
      bubbles: [
        'Ну и что, ты думала я не узнаю??',
        'Света мне всё рассказала. Я не буду устраивать сцен',
        'Приедешь в субботу — поговорим как взрослые люди. Я всё ещё твоя мать'
      ]
    },
    {
      id: 'pony',
      sender: 'Катя с работы',
      bubbles: [
        'Марин, ты случайно не знаешь где взять пони в аренду на день?',
        'У Мишутки день рождения в субботу. Нужна живая, можно с седлом',
        'срочно'
      ]
    }
  ];

  function beatSpamJoke(day) {
    try {
      STATE.spam_used = STATE.spam_used || [];
      var available = JOKE_DECK.filter(function (j) {
        return STATE.spam_used.indexOf(j.id) === -1;
      });
      if (available.length === 0) return;
      var joke = pick(available);
      STATE.spam_used.push(joke.id);

      var c = findContact('spam');
      if (c) c.visible = true;

      // Post bubbles with staggered delay so they feel like real incoming msgs
      joke.bubbles.forEach(function (text, i) {
        setTimeout(function () {
          postMessage('spam', {
            kind: 'incoming',
            senderName: joke.sender,
            text: text
          });
        }, i * 800);
      });
    } catch (e) {
      console.error('spam joke error', e);
    }
  }

  // ========== delayed callbacks (Pavel loan return) ==========

  function processPendingCallbacks(day) {
    if (!STATE.pending_callbacks || STATE.pending_callbacks.length === 0) return;
    var keep = [];
    STATE.pending_callbacks.forEach(function (cb) {
      if (day >= cb.trigger_day) {
        // Execute
        if (cb.type === 'pavel_return') {
          if (Math.random() < 0.30) {
            STATE.cash += 450;
            postMessage('pavel', {
              kind: 'incoming',
              senderName: 'Павел',
              text: 'спасибо что выручила. держу слово — вернул $450. без задержек.'
            });
            postBank(450, 'возврат от Павла (с процентом)');
          } else {
            postMessage('pavel', {
              kind: 'incoming',
              senderName: 'Павел',
              text: 'привет. у меня тут затяжка. через неделю-две.'
            });
            postMessage('scratch', { kind: 'system', text: 'Павел обещает через неделю...' });
            // Reschedule once
            if (!cb.retried) {
              keep.push({ trigger_day: day + 4, type: 'pavel_silence', retried: true });
            }
          }
        } else if (cb.type === 'pavel_silence') {
          postMessage('pavel', {
            kind: 'incoming',
            senderName: 'Павел',
            text: 'прости. не получилось.'
          });
          postMessage('scratch', { kind: 'system', text: 'Павел не вернул деньги' });
        }
      } else {
        keep.push(cb);
      }
    });
    STATE.pending_callbacks = keep;
  }

  function fireDayBeats(day) {
    if (day === 2) { /* lena intro already fired via lamp */ }
    if (day === 3) beatDenis(3);
    if (day === 4) beatAnnaOffer();
    if (day === 5) beatTimIntro();
    if (day === 6) { beatMama6(); beatDenis(6); }
    if (day === 7) beatKhozyaika();
    if (day === 8) beatPavel();
    if (day === 9) { beatLenaDay9(); beatDenis(9); }
    if (day === 11) beatMama11();

    // Humor flavor: ~40% chance of a random spam dialogue per day (from day 2 onwards).
    // Deck has 13 one-shots, no repeats. Pure entertainment, zero gameplay impact.
    if (day >= 2 && Math.random() < 0.42) {
      setTimeout(function () { beatSpamJoke(day); }, 1800);
    }

    // Delayed callbacks processed each day
    processPendingCallbacks(day);
  }

  // ========== passive costs (single source) ==========

  function processPassive(day) {
    if (day === 6 && !STATE.beat_food) {
      STATE.beat_food = true;
      STATE.cash -= 200;
      postBank(-200, 'магазин · еда на неделю');
    }
    if (day === 10 && !STATE.beat_rent) {
      STATE.beat_rent = true;
      STATE.cash -= 500;
      postBank(-500, 'аренда · октябрь');
    }
    // Automation
    if (STATE.automation_active) {
      STATE.leads += 1;
      postMessage('scratch', {
        kind: 'system',
        text: '[auto] automation pipeline · +1 лид из фоновой воронки'
      });
    }
    // Lena lifeline
    if (STATE.cash < 0 && !STATE.lena_lifeline_used) {
      STATE.lena_lifeline_used = true;
      STATE.cash += 300;
      postMessage('lena', {
        kind: 'incoming',
        senderName: 'Лена',
        text: 'подруга, у меня есть $300 на пару недель. не спорь. отдашь как сможешь.'
      });
      postBank(300, 'перевод от Лены · lifeline');
    }
  }

  // ========== endings ==========

  /**
   * checkEndings — fires ending ONLY on day 12+ transition (forceOnFinaleDay=true)
   * or on hard-fail cash crash (any day).
   * Game remains freeform until day 12 — player может делать >3 проекта, накопить
   * больше денег, играть по-свободному. Previously (v2.0a bug) win fired at any
   * delivered>=3 causing game to end at day 7-8.
   */
  function checkEndings(forceOnFinaleDay) {
    if (STATE.ending_seen) return;
    // Hard fail: cash crash — any day
    if (STATE.cash < -1500) {
      showLose('eviction', 'месяц не дошёл · не хватило денег');
      return;
    }
    // Finale check — only fires when forceOnFinaleDay AND we've moved past FINALE_DAY
    if (!forceOnFinaleDay) return;
    // At this point STATE.day should be FINALE_DAY+1 (not yet clamped by caller)
    if (STATE.day <= FINALE_DAY) return;

    // Finale reached
    if (STATE.delivered_projects >= 3 && STATE.cash >= 0 && STATE.energy >= 25) {
      showWin();
    } else if (STATE.delivered_projects === 0) {
      showLose('no_traction', '12 дней · ни одного закрытого проекта');
    } else {
      showLose('burnout', 'месяц закончился · проектов не добила');
    }
  }

  function showWin() {
    STATE.ending_seen = 'win';
    save();
    var stats = STATE.delivered_projects + ' проекта сданы · $' + STATE.cash + ' · энергия ' + STATE.energy + '/100';
    $('#win-stats').text(stats);
    $('#win-overlay').show();
  }

  function showLose(reason, reasonText) {
    STATE.ending_seen = 'lose_' + reason;
    save();
    $('#lose-reason').text(reasonText);

    // Build narrative body by reason type
    var $body = $('#lose-body').empty();
    var lines = [];
    if (reason === 'eviction') {
      lines = [
        'не хватило месяца — тебя попросили съехать.',
        'но ты держалась до последнего. это уже что-то.',
        'формат «один в одно лицо» жестокий. не ты виновата — система.',
        ''
      ];
    } else if (reason === 'no_traction') {
      lines = [
        '12 дней прошло. ни одного закрытого проекта.',
        'может быть, формат контент-студии не твой.',
        'или время было неподходящее.',
        'это не провал — это информация.',
        ''
      ];
    } else if (reason === 'burnout') {
      lines = [
        'месяц закончился. проекты не добила.',
        'твоё тело требует остановки, не формат.',
        'первый месяц всегда самый беспощадный.',
        'отдохни и попробуй ещё раз в v2.1.',
        ''
      ];
    } else {
      lines = ['бывает.'];
    }
    lines.forEach(function (l) {
      $body.append($('<p>').text(l));
    });
    $('#lose-overlay').show();
  }

  // ========== inline lead form ==========

  function mountInlineForm() {
    if (!window.MarinaLead) return;
    var $thread = $('#chat-thread');
    var $host = $('<div>').attr('id', 'inline-lead-form-host');
    $thread.append($host);
    Bubbles.scrollToBottom();

    window.MarinaLead.mountInline($host, {
      archetype: 'marina-v20a',
      source: 'marina-v-ogne',
      onSuccess: function () {
        STATE.lead_submitted = true;
        STATE.automation_active = true;
        STATE.leads += 2;
        STATE.cash += 200;
        STATE.energy = Math.min(100, STATE.energy + 15);

        postMessage('tim', {
          kind: 'incoming',
          senderName: 'Тим',
          text: 'прочитал. спасибо что без фильтров.\n\nтри вещи на завтра утром:\n1. разложить почту по воронке (cold / качественный / в работе / сдано)\n2. срезать одну мёртвую задачу — ту, что откладываешь четвёртый день\n3. забронировать два часа без чата, писать одно дело\n\nзакину шаблоны — увидишь эффект.'
        });
        postBank(200, 'тим закинул шаблоны · оплата от клиента который ждал');
        postMessage('scratch', { kind: 'system', text: '+2 лида · +$200 · +15 энергии · automation on' });
        save();
        Bubbles.clearChipsArea();
        renderDock();
      },
      onCancel: function () {
        $host.remove();
      }
    });
  }

  // ========== Anna pending answer (choice when opening Anna chat) ==========

  function renderAnnaChoice() {
    if (!STATE._anna_pending) return;
    Bubbles.renderReplyChips([
      { id: 'anna_take', label: 'взять проект ($250 upfront + $300 final)' },
      { id: 'anna_decline', label: 'отказать (слишком быстро)' }
    ], function (opt) {
      STATE._anna_pending = false;
      if (opt.id === 'anna_take') {
        postOutgoing('anna', 'беру. скидывай договор');
        setTimeout(function () {
          postIncoming('anna', 'ура, отправила', 'Анна');
          var project = {
            id: STATE.active_projects.length + STATE.delivered_projects + 1,
            client: 'лендинг анны',
            progress: 0,
            final_payment: 300,
            started_day: STATE.day
          };
          STATE.active_projects.push(project);
          STATE.cash += 250;
          postBank(250, 'upfront · проект анны');
          postMessage('scratch', { kind: 'system', text: '+$250 upfront · проект #' + project.id + ' в работе' });
          Bubbles.clearChipsArea();
          save(); renderDock();
        }, 600);
      } else {
        postOutgoing('anna', 'прости, не сейчас');
        setTimeout(function () {
          postIncoming('anna', 'поняла. удачи', 'Анна');
          Bubbles.clearChipsArea();
          save(); renderDock();
        }, 500);
      }
    });
  }

  // ========== init ==========

  function save() { saveState(); }

  function showIntroOverlay() {
    if (STATE.intro_seen) return;
    $('#intro-overlay').show();
  }

  function init() {
    if (!sessionStorage.getItem(SESSION_KEY)) {
      sessionStorage.setItem(SESSION_KEY, String(Date.now()));
    }

    STATE = loadState();

    // Render initial state
    Bubbles.renderContacts(STATE);
    openChat(STATE.current_chat || 'scratch');
    renderDock();

    if (STATE.ending_seen === 'win') {
      $('#win-stats').text(STATE.delivered_projects + ' проекта сданы · $' + STATE.cash + ' · energy ' + STATE.energy);
      $('#win-overlay').show();
    } else if (STATE.ending_seen && STATE.ending_seen.indexOf('lose_') === 0) {
      $('#lose-reason').text('');
      $('#lose-overlay').show();
    } else if (!STATE.intro_seen) {
      showIntroOverlay();
    }

    // Intro start — also unlocks audio context + kicks off music (user gesture)
    $('#intro-start').on('click', function () {
      STATE.intro_seen = true;
      save();
      $('#intro-overlay').fadeOut(300);
      if (window.MarinaAudio) window.MarinaAudio.unlock();
    });

    // Win / lose overlay buttons
    // Win/lose overlay "continue" buttons are disabled placeholders (v2.1)
    // Game uses reset link в footer if player wants to restart

    // Folder tab click
    $('#folder-tabs').on('click', '.folder-tab', function () {
      var folder = $(this).attr('data-folder');
      STATE.current_folder = folder;
      save();
      Bubbles.renderContacts(STATE);
    });

    // Contact click
    $('#contacts-list').on('click', '.contact-item', function () {
      var id = $(this).attr('data-contact');
      openChat(id);
      if (id === 'anna' && STATE._anna_pending) {
        renderAnnaChoice();
      }
    });

    // Dock button click
    $('#dock-buttons').on('click', '.dock-btn', function () {
      if (isBusy) return;
      if (window.MarinaAudio) { window.MarinaAudio.unlock(); window.MarinaAudio.click(); }
      var name = $(this).attr('data-action');
      switch (name) {
        case 'lamp': actLamp(); break;
        case 'reach_out': actReachOut(); break;
        case 'brief_lead': actBriefLead(); break;
        case 'send_offer': actSendOffer(); break;
        case 'work_on_project': actWorkOnProject(); break;
        case 'rest': actRest(); break;
        case 'end_day':
          if (window.MarinaAudio) window.MarinaAudio.dayEnd();
          actEndDay();
          break;
      }
    });

    // Audio toggle
    $('#audio-toggle').on('click', function () {
      if (window.MarinaAudio) {
        window.MarinaAudio.toggle();
      }
    });
    // Sync initial button state
    if (window.MarinaAudio) {
      $('#audio-toggle').text(window.MarinaAudio.isMuted() ? '🔇' : '🔊');
    }

    // Reply chip click sound
    $('#chat-actions').on('click', '.reply-chip', function () {
      if (window.MarinaAudio) window.MarinaAudio.click();
    });

    // Contact click sound
    $('#contacts-list').on('click', '.contact-item', function () {
      if (window.MarinaAudio) window.MarinaAudio.click();
    });

    // Folder tab click sound
    $('#folder-tabs').on('click', '.folder-tab', function () {
      if (window.MarinaAudio) window.MarinaAudio.click();
    });

    // Reset
    $('#reset-link').on('click', function (e) {
      e.preventDefault();
      if (confirm('начать заново? прогресс удалится.')) {
        clearState();
        sessionStorage.removeItem(SESSION_KEY);
        location.reload();
      }
    });
  }

  window.Marina = {
    init: init,
    version: VERSION,
    _state: function () { return STATE; },
    _reset: function () { clearState(); location.reload(); },
    currentChat: currentChat
  };

  $(function () { init(); });
})();
