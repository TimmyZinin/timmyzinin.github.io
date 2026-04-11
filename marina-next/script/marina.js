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

  var VERSION = '2.1.0';
  var STATE_KEY = 'marina-fire:v2.0:state';
  var VERSION_KEY = 'marina-fire:v2.0:version';
  var OLD_KEYS = [
    'marina-fire:v1:state', 'marina-fire:v1:version',
    'marina-fire:v1.5:state', 'marina-fire:v1.5:version',
    'marina-fire:v1.6:state', 'marina-fire:v1.6:version'
  ];
  var SESSION_KEY = 'marina-fire:session_started_at';

  var HOURS_PER_DAY = 8;
  var FINALE_DAY = 30;
  var TYPING_MS = 900;
  var BUBBLE_DELAY_MS = 400;

  // Action costs (1h standard). Resources: h = hours, e = energy, c = cash, f = food/hunger, m = comfort
  var COST = {
    reach_out:       { h: 1, e: 5 },
    brief_lead:      { h: 1, e: 3 },
    send_offer:      { h: 1, e: 0 },
    work_on_project: { h: 2, e: 5 },
    work_night:      { h: 3, e: 15, m: -15 }, // BLOCK F — night work, more progress
    rest:            { h: 1, e: 0 },
    eat_home:        { h: 1, c: 15, f: 35, m: 2 },
    eat_out:         { h: 1, c: 35, f: 45, m: 8 },
    shopping:        { h: 2, c: 80, m: 25 },
    date_kirill:     { h: 3, e: 10, f: 50, m: 15 }, // free food but energy drain
    hangout_denis:   { h: 4, c: 150, f: 30, m: 20, ePlus: 15 },
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
      hunger: 100,    // 0-100, decays 12/day
      comfort: 60,    // 0-100, decays 4/day
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
      // 115-ФЗ bank lock (BLOCK I)
      bank_locked: false,
      bank_locked_until: null,
      plate_girl_count: 0,
      kirill_date_count: 0, // blocks date action after 3 uses
      kirill_blocked: false,
      // Interaction counter (BLOCK M)
      player_interactions: 0,
      beat_tim_creator_fired: false,
      // beat flags (30-day arc)
      beat_lena_intro: false,
      beat_anna_offer: false,
      beat_anna_milestone: false,
      beat_anna_referral: false,
      beat_tim_retry: false,
      beat_food: false,
      beat_rent_10: false,
      beat_rent_20: false,
      beat_rent_30: false,
      beat_lena_day9: false,
      beat_khozyaika_1: false,
      beat_khozyaika_2: false,
      beat_khozyaika_3: false,
      beat_khozyaika_4: false,
      beat_pavel: false,
      beat_mama6: false,
      beat_mama11: false,
      beat_mama17: false,
      beat_mama24: false,
      beat_denis3: false,
      beat_denis9: false,
      beat_denis15: false,
      beat_denis27: false,
      // recurring spam intros (BLOCK A)
      beat_olya: false,
      beat_kirill: false,
      beat_krypta: false,
      beat_artur: false,
      beat_vera: false,
      beat_sosed: false,
      // reactive
      reach_out_total: 0,
      reach_out_misses: 0,
      lena_lifeline_used: false,
      pending_callbacks: [], // delayed events {trigger_day, type, data}
      spam_pool_rolled: [],  // dedup for flavor-only one-shot spam
      ending_seen: false, // 'win' | 'lose_eviction' | 'lose_burnout' | 'lose_no_traction' | false
      // messenger
      contacts: [
        { id: 'lena',    name: 'Лена',            avatar: 'Л',  unread: 0, visible: true  },
        { id: 'anna',    name: 'Анна',            avatar: 'А',  unread: 0, visible: false },
        { id: 'tim',     name: 'Тим',             avatar: 'Т',  unread: 0, visible: false },
        { id: 'bank',    name: 'Т-Банк',          avatar: '$',  unread: 0, visible: true  },
        { id: 'khozyaika', name: 'Наталья Вал.',  avatar: 'Н',  unread: 0, visible: false },
        { id: 'pavel',   name: 'Павел (бывший)',  avatar: 'П',  unread: 0, visible: false },
        { id: 'mama',    name: 'мама',            avatar: '♥',  unread: 0, visible: false },
        { id: 'denis',   name: 'Денис',           avatar: 'Д',  unread: 0, visible: false },
        // recurring spam (6 with reply chips + state effects)
        { id: 'olya',    name: 'Оля Петрова (11-Б)', avatar: 'О', unread: 0, visible: false, spam: true },
        { id: 'kirill',  name: 'Кирилл (Tinder)',    avatar: 'К', unread: 0, visible: false, spam: true },
        { id: 'krypta',  name: 'БРАТ крипта',        avatar: '🚀', unread: 0, visible: false, spam: true },
        { id: 'artur',   name: 'Артур (экс-босс)',   avatar: 'А', unread: 0, visible: false, spam: true },
        { id: 'vera',    name: 'Вера Николаевна',    avatar: 'В', unread: 0, visible: false, spam: true },
        { id: 'sosed',   name: 'сосед снизу',        avatar: 'С', unread: 0, visible: false, spam: true },
        // one-shot flavor spam (7)
        { id: 'lyuda',   name: 'Людочка (не та)',    avatar: 'Л', unread: 0, visible: false, spam: true },
        { id: 'ozon',    name: 'OZON курьер',        avatar: '📦', unread: 0, visible: false, spam: true },
        { id: 'taxi',    name: 'водитель яндекса',   avatar: '🚕', unread: 0, visible: false, spam: true },
        { id: 'student', name: 'студент СПбГУ',      avatar: '🎓', unread: 0, visible: false, spam: true },
        { id: 'katya',   name: 'Катя про пони',      avatar: 'К', unread: 0, visible: false, spam: true },
        { id: 'teshcha', name: 'неизвестный номер',  avatar: '?', unread: 0, visible: false, spam: true },
        { id: 'marathon',name: 'женская сила',       avatar: '🌸', unread: 0, visible: false, spam: true },
        { id: 'scratch', name: 'себе',            avatar: 'М',  unread: 0, visible: true  }
      ],
      threads: {
        lena: [], anna: [], tim: [], bank: [],
        khozyaika: [], pavel: [], mama: [], denis: [],
        olya: [], kirill: [], krypta: [], artur: [], vera: [], sosed: [],
        lyuda: [], ozon: [], taxi: [], student: [], katya: [], teshcha: [], marathon: [],
        scratch: []
      },
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

    // v2.1 — все кнопки ВСЕГДА видимы. disabled если недоступны. Badges счётчики.
    var actions = [];
    if (STATE.lamp_on) {
      // Воронка: искать → созвон → оффер → работать → ночная работа
      actions.push({
        id: 'reach_out', label: 'искать клиентов', cost: '1ч · −5⚡',
        disabled: STATE.hours < COST.reach_out.h || STATE.energy < COST.reach_out.e,
        reason: STATE.hours < COST.reach_out.h ? 'нет часов' : 'нет энергии',
        primary: true
      });
      actions.push({
        id: 'brief_lead', label: 'созвон с лидом', cost: '1ч · −3⚡',
        badge: STATE.leads > 0 ? STATE.leads : null,
        badgeHot: STATE.leads > 0,
        disabled: STATE.leads < 1 || STATE.hours < COST.brief_lead.h || STATE.energy < COST.brief_lead.e,
        reason: STATE.leads < 1 ? 'нет лидов' : (STATE.hours < COST.brief_lead.h ? 'нет часов' : 'нет энергии')
      });
      actions.push({
        id: 'send_offer', label: 'отправить оффер', cost: '1ч',
        badge: STATE.qualified_leads > 0 ? STATE.qualified_leads : null,
        badgeHot: STATE.qualified_leads > 0,
        disabled: STATE.qualified_leads < 1 || STATE.hours < COST.send_offer.h || STATE.bank_locked,
        reason: STATE.bank_locked ? 'счёт заблокирован' : (STATE.qualified_leads < 1 ? 'нет брифов' : 'нет часов')
      });
      actions.push({
        id: 'work_on_project', label: 'делать работу', cost: '2ч · −5⚡',
        badge: STATE.active_projects.length > 0 ? STATE.active_projects.length : null,
        disabled: STATE.active_projects.length === 0 || STATE.hours < COST.work_on_project.h || STATE.energy < COST.work_on_project.e,
        reason: STATE.active_projects.length === 0 ? 'нет проектов' : (STATE.hours < COST.work_on_project.h ? 'нет часов' : 'нет энергии')
      });
      actions.push({
        id: 'work_night', label: '🌙 ночная работа', cost: '3ч · −15⚡',
        disabled: STATE.active_projects.length === 0 || STATE.day < 5 || STATE.hours < COST.work_night.h || STATE.energy < COST.work_night.e,
        reason: STATE.day < 5 ? 'доступно с дня 5' : (STATE.active_projects.length === 0 ? 'нет проектов' : 'нет часов/энергии')
      });
      // Еда + отдых + шопинг
      actions.push({
        id: 'eat_home', label: '🍝 поесть дома', cost: '1ч · −$15',
        badge: STATE.hunger < 30 ? '!' : null,
        badgePulse: STATE.hunger < 30,
        disabled: STATE.cash < COST.eat_home.c || STATE.hours < COST.eat_home.h || STATE.bank_locked,
        reason: STATE.bank_locked ? 'счёт заблокирован' : (STATE.cash < COST.eat_home.c ? 'не хватает денег' : 'нет часов')
      });
      actions.push({
        id: 'eat_out', label: '🥗 кафе', cost: '1ч · −$35',
        disabled: STATE.cash < COST.eat_out.c || STATE.hours < COST.eat_out.h || STATE.bank_locked,
        reason: STATE.bank_locked ? 'счёт заблокирован' : (STATE.cash < COST.eat_out.c ? 'не хватает денег' : 'нет часов')
      });
      actions.push({
        id: 'rest', label: '☕ перерыв', cost: '1ч · +30⚡',
        badge: STATE.energy < 30 ? '!' : null,
        badgePulse: STATE.energy < 30,
        disabled: STATE.hours < COST.rest.h || STATE.energy >= 100 || STATE.coffee_stacks >= 4,
        reason: STATE.energy >= 100 ? 'энергия максимум' : (STATE.coffee_stacks >= 4 ? 'кофе перелит' : 'нет часов')
      });
      actions.push({
        id: 'shopping', label: '🛍 шопинг', cost: '2ч · −$80',
        disabled: STATE.day < 5 || STATE.cash < COST.shopping.c || STATE.hours < COST.shopping.h || STATE.bank_locked,
        reason: STATE.day < 5 ? 'с дня 5' : (STATE.bank_locked ? 'счёт заблокирован' : 'не хватает ресурсов')
      });
      // Social actions — только если анлокнуты
      if (STATE.kirill_unlocked && !STATE.kirill_blocked) {
        actions.push({
          id: 'date_kirill', label: '💔 свидание (Кирилл)', cost: '3ч · −10⚡',
          disabled: STATE.hours < COST.date_kirill.h || (STATE.kirill_date_count >= 4 && !STATE.bank_locked),
          reason: 'не хватает часов'
        });
      }
      if (STATE.beat_denis3 || STATE.beat_denis6 || STATE.beat_denis9 || STATE.beat_denis15) {
        actions.push({
          id: 'hangout_denis', label: '🎉 с Денисом', cost: '4ч · −$150',
          disabled: STATE.cash < COST.hangout_denis.c || STATE.hours < COST.hangout_denis.h || STATE.bank_locked,
          reason: STATE.bank_locked ? 'счёт заблокирован' : 'не хватает ресурсов'
        });
      }
      actions.push({
        id: 'end_day', label: '🌙 лечь спать', cost: 'конец дня',
        disabled: false
      });
    }

    // Primary action = first with primary flag + not disabled
    var primarySet = false;
    actions.forEach(function (a) {
      var $btn = $('<button class="dock-btn">').attr('data-action', a.id);
      $btn.append($('<span class="dock-label">').text(a.label));
      if (a.primary && !primarySet && !a.disabled) {
        $btn.addClass('primary');
        primarySet = true;
      }
      if (a.id === 'end_day' && STATE.hours <= 2 && STATE.lamp_on) {
        $btn.addClass('pulse');
      }
      if (a.cost) $btn.append($('<span class="dock-cost">').text(' · ' + a.cost));
      if (a.badge !== null && a.badge !== undefined) {
        var $badge = $('<span class="dock-badge">').text(a.badge);
        if (a.badgeHot) $badge.addClass('hot');
        if (a.badgePulse) $badge.addClass('pulse');
        $btn.append($badge);
      }
      if (a.disabled || isBusy) {
        $btn.attr('disabled', 'disabled');
        if (a.reason) $btn.attr('title', a.reason);
      }
      $buttons.append($btn);
    });

    if (!STATE.lamp_on) {
      var $lamp = $('<button class="dock-btn">').attr('data-action', 'lamp').text('включить лампу');
      $buttons.append($lamp);
    }

    // Render top resource HUD (BLOCK C.1)
    renderHud();
  }

  // ===== Top resource HUD (BLOCK C.1) =====
  function renderHud() {
    var $hud = $('#resource-hud');
    if ($hud.length === 0) return;

    function colorClass(val) {
      if (val >= 60) return 'ok';
      if (val >= 30) return 'warn';
      return 'crit';
    }

    var parts = [];
    parts.push('<div class="r-pill r-day"><span class="r-icon">🗓️</span><span class="r-val">' + STATE.day + '</span><span class="r-max">/' + FINALE_DAY + '</span></div>');
    parts.push('<div class="r-pill r-hours"><span class="r-icon">⏱️</span><span class="r-val">' + STATE.hours + '</span><span class="r-max">h</span></div>');
    var cashCls = STATE.cash < 0 ? 'crit' : (STATE.cash < 200 ? 'warn' : 'ok');
    parts.push('<div class="r-pill r-cash ' + cashCls + '"><span class="r-icon">💰</span><span class="r-val">$' + STATE.cash + '</span></div>');
    var e = STATE.energy;
    parts.push('<div class="r-pill r-energy ' + colorClass(e) + '"><span class="r-icon">⚡</span><span class="r-val">' + e + '</span><div class="r-bar"><div class="r-fill" style="width:' + e + '%"></div></div></div>');
    var h = STATE.hunger || 100;
    parts.push('<div class="r-pill r-hunger ' + colorClass(h) + '"><span class="r-icon">🍔</span><span class="r-val">' + h + '</span><div class="r-bar"><div class="r-fill" style="width:' + h + '%"></div></div></div>');
    var m = STATE.comfort || 0;
    parts.push('<div class="r-pill r-comfort ' + colorClass(m) + '"><span class="r-icon">💚</span><span class="r-val">' + m + '</span><div class="r-bar"><div class="r-fill" style="width:' + m + '%"></div></div></div>');

    if (STATE.bank_locked) {
      var daysLeft = Math.max(0, (STATE.bank_locked_until || STATE.day) - STATE.day);
      parts.push('<div class="r-pill r-locked"><span class="r-icon">🔒</span><span class="r-val">115-ФЗ</span><span class="r-max">· ' + daysLeft + 'д</span></div>');
    }

    $hud.html(parts.join(''));
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
    renderChatPinned(contactId);
    Bubbles.replayThread(STATE, contactId);
    Bubbles.clearChipsArea();
    renderThreadContextActions(contactId);
    save();
  }

  // BLOCK D — Bank balance pinned card
  function renderChatPinned(contactId) {
    var $pinned = $('#chat-pinned');
    if ($pinned.length === 0) return;
    $pinned.empty();
    if (contactId !== 'bank') return;

    // Calculate 7-day delta from bank thread history
    var bankMsgs = (STATE.threads.bank || []);
    var sevenDaysAgoDay = Math.max(0, STATE.day - 7);
    var delta = 0;
    bankMsgs.forEach(function (m) {
      // Approximate: take meta.amount of all recent bank messages (can't perfectly filter by day
      // without day field on each message — use latest 10 as proxy)
      if (m.meta && typeof m.meta.amount === 'number') {
        delta += m.meta.amount;
      }
    });

    var cashClass = STATE.cash < 0 ? 'neg' : (STATE.cash < 200 ? 'warn' : 'pos');
    var deltaClass = delta >= 0 ? 'pos' : 'neg';
    var deltaText = (delta >= 0 ? '+' : '') + '$' + delta + ' за последние 7 дней';

    var lockBanner = '';
    if (STATE.bank_locked) {
      var daysLeft = Math.max(0, (STATE.bank_locked_until || STATE.day) - STATE.day);
      lockBanner = '<div class="bb-delta neg">🔒 115-ФЗ · заблокирован · ещё ' + daysLeft + ' дн.</div>';
    }

    var html = '<div class="bank-balance-card">' +
      '<div class="bb-label">ТЕКУЩИЙ БАЛАНС</div>' +
      '<div class="bb-value ' + cashClass + '">$' + STATE.cash + '</div>' +
      '<div class="bb-delta ' + deltaClass + '">' + deltaText + '</div>' +
      lockBanner +
      '</div>';
    $pinned.html(html);
  }

  function renderThreadContextActions(contactId) {
    // Tim thread (creator lead form): show when beat_tim_creator_fired
    if (contactId === 'tim' && STATE.beat_tim_creator_fired && !STATE.lead_submitted) {
      Bubbles.renderReplyChips([
        { id: 'fill_form', label: '📝 заполнить форму (связаться с Тимом)' }
      ], function () { mountInlineForm(); });
      return;
    }
    // Khozyaika 1 — счётчики воды
    if (contactId === 'khozyaika' && STATE._khozyaika1_pending) {
      Bubbles.renderReplyChips([
        { id: 'send', label: 'отправить показания (−1h)' },
        { id: 'ignore', label: 'забить (−$100 штраф day+2)' }
      ], function (opt) {
        STATE._khozyaika1_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'send') {
          postOutgoing('khozyaika', 'отправила показания, фото прикреплено.');
          STATE.hours = Math.max(0, STATE.hours - 1);
          postMessage('scratch', { kind: 'system', text: '−1h · счётчики' });
        } else {
          postOutgoing('khozyaika', 'ок.');
          STATE.pending_callbacks.push({ trigger_day: STATE.day + 2, type: 'khozyaika_fine' });
        }
        save(); renderDock();
      });
      return;
    }
    // Khozyaika 2 — тикток
    if (contactId === 'khozyaika' && STATE._khozyaika2_pending) {
      Bubbles.renderReplyChips([
        { id: 'like', label: 'лайкнуть и подписаться (−1h)' },
        { id: 'refuse', label: 'отказать (−5 комфорт)' }
      ], function (opt) {
        STATE._khozyaika2_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'like') {
          postOutgoing('khozyaika', 'подписалась, лайкнула. удачи с Сатурном.');
          STATE.hours = Math.max(0, STATE.hours - 1);
        } else {
          postOutgoing('khozyaika', 'Наталья Валерьевна, простите, не подписываюсь на тиктоках.');
          STATE.comfort = Math.max(0, STATE.comfort - 5);
        }
        save(); renderDock();
      });
      return;
    }
    // Khozyaika 3 — кошка
    if (contactId === 'khozyaika' && STATE._khozyaika3_pending) {
      Bubbles.renderReplyChips([
        { id: 'help', label: 'помочь искать (−2h, +10 комфорт)' },
        { id: 'refuse', label: 'нет времени (−5 комфорт)' }
      ], function (opt) {
        STATE._khozyaika3_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'help') {
          postOutgoing('khozyaika', 'сейчас спущусь, помогу.');
          STATE.hours = Math.max(0, STATE.hours - 2);
          STATE.comfort = Math.min(100, STATE.comfort + 10);
          setTimeout(function () {
            postIncoming('khozyaika', 'Мурка нашлась! спала под диваном. спасибо!', 'Наталья В.');
            save();
          }, 1500);
        } else {
          postOutgoing('khozyaika', 'извините, я сейчас не могу. работа.');
          STATE.comfort = Math.max(0, STATE.comfort - 5);
        }
        save(); renderDock();
      });
      return;
    }
    // Khozyaika 4 — гороскоп (flavor only)
    if (contactId === 'khozyaika' && STATE._khozyaika4_pending) {
      Bubbles.renderReplyChips([
        { id: 'thanks', label: 'спасибо, буду знать' }
      ], function () {
        STATE._khozyaika4_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        postOutgoing('khozyaika', 'спасибо Наталья Валерьевна. весы в очках — мимо меня.');
        STATE.comfort = Math.min(100, STATE.comfort + 2);
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
        bumpInteraction();
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
        bumpInteraction();
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
    // Mama day 17 (pirogi invitation)
    if (contactId === 'mama' && STATE._mama17_pending) {
      Bubbles.renderReplyChips([
        { id: 'come', label: 'приеду в выходные' },
        { id: 'later', label: 'потом, работа' }
      ], function (opt) {
        STATE._mama17_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
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
    // Denis party invitations (any day — invitations use generic pending)
    [3, 6, 9, 15, 27].forEach(function (d) {
      var key = '_denis' + d + '_pending';
      if (contactId === 'denis' && STATE[key]) {
        Bubbles.renderReplyChips([
          { id: 'go', label: 'поехать (−$150, +60⚡, −2h дня)' },
          { id: 'skip', label: 'не сейчас' }
        ], function (opt) {
          STATE[key] = false;
          Bubbles.clearChipsArea();
          bumpInteraction();
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

    // ===== BLOCK A: 6 recurring spam reply chips =====

    // Оля Петрова (Herbalife pitch)
    if (contactId === 'olya' && STATE._olya_pending) {
      Bubbles.renderReplyChips([
        { id: 'invest', label: 'вложить $200 в клуб' },
        { id: 'listen', label: 'послушать 5 минут (−1h)' },
        { id: 'delete', label: 'удалить из контактов' }
      ], function (opt) {
        STATE._olya_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'invest') {
          postOutgoing('olya', 'ок, перевожу $200.');
          STATE.cash -= 200;
          STATE.comfort = Math.max(0, STATE.comfort - 15);
          postBank(-200, 'Оля «клуб женщин» · 0 возврата');
          postMessage('scratch', { kind: 'system', text: '−$200 · −15 комфорт · клуб Оли сгорел' });
          setTimeout(function () {
            postIncoming('olya', 'спасибо дорогая! ты на пути к новой жизни 🌸', 'Оля Петрова');
          }, 1500);
        } else if (opt.id === 'listen') {
          postOutgoing('olya', 'оля, у меня 5 минут. рассказывай.');
          STATE.hours = Math.max(0, STATE.hours - 1);
        } else {
          postMessage('scratch', { kind: 'system', text: 'Оля удалена из контактов' });
        }
        save(); renderDock();
      });
      return;
    }

    // Кирилл (Tinder intro → unlocks date action)
    if (contactId === 'kirill' && STATE._kirill_pending) {
      Bubbles.renderReplyChips([
        { id: 'yes', label: 'встретимся (разблокировать свидания)' },
        { id: 'no', label: 'не мой типаж' }
      ], function (opt) {
        STATE._kirill_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'yes') {
          postOutgoing('kirill', 'хорошо, давай встретимся. не обещаю ничего серьёзного.');
          STATE.kirill_unlocked = true;
          postMessage('scratch', { kind: 'system', text: 'Кирилл разблокировал свидания (action «свидание»)' });
        } else {
          postOutgoing('kirill', 'извини, ты не мой типаж.');
          STATE.kirill_blocked = true;
        }
        save(); renderDock();
      });
      return;
    }

    // Kirill follow-up complaint after bank unlocks (plate girl call-out)
    if (contactId === 'kirill' && STATE._kirill_complaint_pending) {
      Bubbles.renderReplyChips([
        { id: 'sorry', label: 'прости (−15 комфорт)' },
        { id: 'defend', label: 'я просто не могла (−10 комфорт)' }
      ], function (opt) {
        STATE._kirill_complaint_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'sorry') {
          postOutgoing('kirill', 'прости, Кирилл. я понимаю как это выглядит.');
          STATE.comfort = Math.max(0, STATE.comfort - 15);
        } else {
          postOutgoing('kirill', 'Кирилл, у меня был счёт заблокирован. мне было нечем.');
          STATE.comfort = Math.max(0, STATE.comfort - 10);
        }
        save(); renderDock();
      });
      return;
    }

    // БРАТ крипта (triggers 115-ФЗ bank lock — BLOCK I)
    if (contactId === 'krypta' && STATE._krypta_pending) {
      Bubbles.renderReplyChips([
        { id: 'send', label: 'ПЕРЕВОЖУ $100 (5% шанс х10)' },
        { id: 'bot', label: 'ты бот?' },
        { id: 'ignore', label: 'игнор' }
      ], function (opt) {
        STATE._krypta_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'send') {
          postOutgoing('krypta', 'брат, перевожу $100. не подведи.');
          STATE.cash -= 100;
          postBank(-100, 'перевод на «крипту»');
          // Schedule 115-ФЗ bank lock for next day
          STATE.pending_callbacks.push({ trigger_day: STATE.day + 1, type: 'bank_lock_115' });
          postMessage('scratch', { kind: 'system', text: 'подозрительная транзакция · жди последствий' });
        } else if (opt.id === 'bot') {
          postOutgoing('krypta', 'ты бот?');
          setTimeout(function () {
            postIncoming('krypta', 'БРАТ НЕ БОТ Я РЕАЛЬНЫЙ БРАТ', 'БРАТ крипта');
          }, 800);
        } else {
          postMessage('scratch', { kind: 'system', text: 'БРАТ проигнорирован' });
        }
        save(); renderDock();
      });
      return;
    }

    // Артур (эx-босс) — potentially $800 project
    if (contactId === 'artur' && STATE._artur_pending) {
      Bubbles.renderReplyChips([
        { id: 'visit', label: 'подойти в офис (−4h)' },
        { id: 'refuse', label: 'отказать' }
      ], function (opt) {
        STATE._artur_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'visit') {
          postOutgoing('artur', 'хорошо, завтра в 10.');
          STATE.hours = Math.max(0, STATE.hours - 4);
          setTimeout(function () {
            if (Math.random() < 0.40) {
              // Hit — $800 project offer
              postIncoming('artur', 'марина, есть проект на $800 — серьёзный клиент, 10 дней.', 'Артур');
              STATE.cash += 400;
              postBank(400, 'upfront от Артура');
              STATE.active_projects.push({
                id: (STATE.active_projects.length + STATE.delivered_projects + 1),
                clientId: 'artur',
                client: 'Артур',
                progress: 0,
                work_units_done: 0,
                work_units_total: 4,
                upfront_paid: 400,
                final_due: 400,
                final_payment: 400,
                started_day: STATE.day,
                deadline_day: STATE.day + 10,
                status: 'active'
              });
            } else {
              // Wasted — nothing happens
              postIncoming('artur', 'извини, понял что мы сейчас не заинтересованы.', 'Артур');
              postMessage('scratch', { kind: 'system', text: 'Артур зря вызвал · потеряла 4 часа' });
            }
            save(); renderDock();
          }, 1500);
        } else {
          postOutgoing('artur', 'Артур, извини, не готова.');
        }
        save(); renderDock();
      });
      return;
    }

    // Вера Николаевна — помочь внучке
    if (contactId === 'vera' && STATE._vera_pending) {
      Bubbles.renderReplyChips([
        { id: 'help', label: 'помочь Алисе (−2h, +10 комфорт)' },
        { id: 'refuse', label: 'вежливо отказать (−3 комфорт)' }
      ], function (opt) {
        STATE._vera_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'help') {
          postOutgoing('vera', 'Вера Николаевна, да конечно помогу. скиньте стихи.');
          STATE.hours = Math.max(0, STATE.hours - 2);
          STATE.comfort = Math.min(100, STATE.comfort + 10);
        } else {
          postOutgoing('vera', 'Вера Николаевна, простите — у меня сейчас много работы.');
          STATE.comfort = Math.max(0, STATE.comfort - 3);
        }
        save(); renderDock();
      });
      return;
    }

    // Сосед снизу — протёк
    if (contactId === 'sosed' && STATE._sosed_pending) {
      Bubbles.renderReplyChips([
        { id: 'come', label: 'спуститься (−1h)' },
        { id: 'ignore', label: 'игнорировать (переспросит day+1)' }
      ], function (opt) {
        STATE._sosed_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'come') {
          postOutgoing('sosed', 'сейчас спущусь, посмотрим.');
          STATE.hours = Math.max(0, STATE.hours - 1);
          setTimeout(function () {
            postIncoming('sosed', 'оказалось не от вас. извините за беспокойство.', 'сосед');
          }, 1200);
        } else {
          STATE.pending_callbacks.push({ trigger_day: STATE.day + 1, type: 'sosed_retry' });
        }
        save(); renderDock();
      });
      return;
    }
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

  // ========== BLOCK J — Funnel particle animation (Game Dev Tycoon style) ==========

  var _particleCount = 0;

  function getBtnRect(actionId) {
    var el = document.querySelector('#dock-buttons .dock-btn[data-action="' + actionId + '"]');
    if (!el) return null;
    return el.getBoundingClientRect();
  }

  function getCashPillRect() {
    var el = document.querySelector('#resource-hud .r-cash');
    if (!el) return null;
    return el.getBoundingClientRect();
  }

  function spawnParticle(opts) {
    // opts: { from: {x,y} OR actionId, to: {x,y} OR actionId OR 'cash', kind, icon, duration }
    if (_particleCount >= 14) return;
    _particleCount += 1;

    var fromRect, toRect;
    if (typeof opts.from === 'string') fromRect = getBtnRect(opts.from);
    if (typeof opts.to === 'string') {
      toRect = opts.to === 'cash' ? getCashPillRect() : getBtnRect(opts.to);
    }

    var fromX = fromRect ? (fromRect.left + fromRect.width / 2) : (opts.from && opts.from.x) || window.innerWidth / 2;
    var fromY = fromRect ? (fromRect.top + fromRect.height / 2) : (opts.from && opts.from.y) || window.innerHeight / 2;

    var toX, toY;
    if (toRect) {
      toX = toRect.left + toRect.width / 2;
      toY = toRect.top + toRect.height / 2;
    } else if (opts.direction === 'up') {
      toX = fromX + (Math.random() - 0.5) * 120;
      toY = fromY - 180 - Math.random() * 60;
    } else {
      toX = fromX + (Math.random() - 0.5) * 60;
      toY = fromY - 80;
    }

    var $p = $('<div class="particle">').addClass(opts.kind || 'red').text(opts.icon || '●');
    $p.css({ left: fromX + 'px', top: fromY + 'px', transform: 'translate(-50%, -50%) scale(0.6)', opacity: '0' });
    $(document.body).append($p);

    // Trigger animation next frame
    requestAnimationFrame(function () {
      $p.css({
        opacity: '1',
        transform: 'translate(' + (toX - fromX - $p.width() / 2) + 'px, ' + (toY - fromY - $p.height() / 2) + 'px) scale(1)'
      });
    });

    setTimeout(function () {
      $p.css('opacity', '0');
    }, (opts.duration || 650) - 200);

    setTimeout(function () {
      $p.remove();
      _particleCount = Math.max(0, _particleCount - 1);
      if (typeof opts.onArrive === 'function') opts.onArrive();
    }, opts.duration || 650);
  }

  // Burst: spawn multiple particles on reach-out — blues fly up (reject), reds fly to brief_lead
  function funnelBurstReachOut(hit) {
    var totalBlues = 5;
    var totalReds = hit ? 1 : 0;
    var i;
    for (i = 0; i < totalBlues; i++) {
      (function (idx) {
        setTimeout(function () {
          spawnParticle({
            from: 'reach_out',
            kind: 'blue',
            icon: '👤',
            direction: 'up',
            duration: 700
          });
        }, idx * 60);
      })(i);
    }
    for (i = 0; i < totalReds; i++) {
      (function (idx) {
        setTimeout(function () {
          spawnParticle({
            from: 'reach_out',
            to: 'brief_lead',
            kind: 'red',
            icon: '✉',
            duration: 700
          });
        }, 300 + idx * 60);
      })(i);
    }
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

    // BLOCK J — particle burst on click
    funnelBurstReachOut(hit);

    runAction(function () {
      postOutgoing('scratch', pick(REACH_OUT_TEXT.outgoing));

      if (hit) {
        STATE.leads += 1;
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

    // BLOCK J — funnel particle: brief_lead → send_offer
    spawnParticle({ from: 'brief_lead', to: 'send_offer', kind: 'red', icon: '📞', duration: 700 });

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

    // BLOCK J — particle send_offer → work_on_project
    spawnParticle({ from: 'send_offer', to: 'work_on_project', kind: 'red', icon: '📄', duration: 700 });

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
        postIncoming('scratch', 'отлично, договор подписываем · срок неделя', 'клиент');
        // Create project with upfront + final + deadline (BLOCK K)
        var upfront = Math.floor(finalPrice * 0.4);
        var finalPayment = finalPrice - upfront;
        var project = {
          id: (STATE.active_projects.length + STATE.delivered_projects + 1),
          clientId: 'scratch', // generic cold lead — clawback goes to scratch
          client: pick(['лендинг saas','бриф dtc','email-серия','кейс-стади','reels-пакет']),
          progress: 0,
          work_units_done: 0,
          work_units_total: 3, // 3 work sessions needed
          upfront_paid: upfront,
          final_due: finalPayment,
          final_payment: finalPayment,
          started_day: STATE.day,
          deadline_day: STATE.day + 7, // 7-day deadline
          status: 'active'
        };
        STATE.active_projects.push(project);
        STATE.cash += upfront;
        postBank(upfront, 'поступление по договору #' + project.id);
        postSystem('scratch', 'контракт · upfront $' + upfront + ' · срок: день ' + project.deadline_day);
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

    // BLOCK J — progress particle (yellow, orbits work button)
    spawnParticle({ from: 'work_on_project', kind: 'progress', icon: '⚙', direction: 'up', duration: 600 });

    runAction(function () {
      var p = STATE.active_projects[0];
      p.progress = Math.min(100, (p.progress || 0) + 34);
      p.work_units_done = (p.work_units_done || 0) + 1; // daytime = 1 unit
      postOutgoing('scratch', pick(WORK_TEXT));
      setTimeout(function () {
        postSystem('scratch', 'проект #' + p.id + ' · прогресс ' + Math.floor(p.progress) + '%');
        if (p.work_units_done >= (p.work_units_total || 3)) {
          // Delivered — money particle flies to cash pill
          STATE.active_projects.shift();
          STATE.delivered_projects += 1;
          var payment = p.final_due || p.final_payment || 0;
          STATE.cash += payment;
          p.status = 'delivered';
          spawnParticle({ from: 'work_on_project', to: 'cash', kind: 'money', icon: '$', duration: 800 });
          setTimeout(function () {
            postSystem('scratch', 'проект #' + p.id + ' сдан · клиент принял');
            postBank(payment, 'финал по проекту #' + p.id);
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

  // ===== BLOCK B new actions: food / comfort / dates =====

  function actEatHome() {
    if (STATE.bank_locked) return;
    if (STATE.cash < COST.eat_home.c) return;
    if (STATE.hours < COST.eat_home.h) return;
    STATE.hours -= COST.eat_home.h;
    STATE.cash -= COST.eat_home.c;
    STATE.hunger = Math.min(100, STATE.hunger + COST.eat_home.f);
    STATE.comfort = Math.min(100, STATE.comfort + COST.eat_home.m);

    runAction(function () {
      postOutgoing('scratch', 'варю макароны с сыром · еда, но хоть что-то');
      setTimeout(function () {
        postSystem('scratch', '+' + COST.eat_home.f + ' сытости · −$' + COST.eat_home.c);
      }, 400);
    });
  }

  function actEatOut() {
    if (STATE.bank_locked) return;
    if (STATE.cash < COST.eat_out.c) return;
    if (STATE.hours < COST.eat_out.h) return;
    STATE.hours -= COST.eat_out.h;
    STATE.cash -= COST.eat_out.c;
    STATE.hunger = Math.min(100, STATE.hunger + COST.eat_out.f);
    STATE.comfort = Math.min(100, STATE.comfort + COST.eat_out.m);

    runAction(function () {
      postOutgoing('scratch', 'заказала в кафе · боул с лососем и кофе · dopamine hit');
      setTimeout(function () {
        postSystem('scratch', '+' + COST.eat_out.f + ' сытости · +' + COST.eat_out.m + ' комфорт · −$' + COST.eat_out.c);
        postBank(-COST.eat_out.c, 'кафе на углу');
      }, 400);
    });
  }

  function actShopping() {
    if (STATE.bank_locked) return;
    if (STATE.day < 5) return;
    if (STATE.cash < COST.shopping.c) return;
    if (STATE.hours < COST.shopping.h) return;
    STATE.hours -= COST.shopping.h;
    STATE.cash -= COST.shopping.c;
    STATE.comfort = Math.min(100, STATE.comfort + COST.shopping.m);

    runAction(function () {
      postOutgoing('scratch', 'купила новый свитер, носки, крем для лица · маленькие штуки, но поднимают');
      setTimeout(function () {
        postSystem('scratch', '+' + COST.shopping.m + ' комфорт · −$' + COST.shopping.c);
        postBank(-COST.shopping.c, 'маленький шопинг');
      }, 400);
    });
  }

  function actDateKirill() {
    if (!STATE.kirill_unlocked) return;
    if (STATE.kirill_blocked) return;
    if (STATE.kirill_date_count >= 4 && !STATE.bank_locked) return;
    if (STATE.hours < COST.date_kirill.h) return;

    STATE.hours -= COST.date_kirill.h;
    STATE.energy = Math.max(0, STATE.energy - COST.date_kirill.e);
    STATE.hunger = Math.min(100, STATE.hunger + COST.date_kirill.f);
    STATE.comfort = Math.min(100, STATE.comfort + COST.date_kirill.m);
    STATE.kirill_date_count += 1;
    if (STATE.bank_locked) {
      STATE.plate_girl_count = (STATE.plate_girl_count || 0) + 1;
    }

    runAction(function () {
      postOutgoing('scratch', 'свидание с Кириллом · грустный ужин но он угощает');
      setTimeout(function () {
        postSystem('scratch', '+' + COST.date_kirill.f + ' сытости · +' + COST.date_kirill.m + ' комфорт · −3h · −10⚡');
      }, 400);
    });
  }

  function actHangoutDenis() {
    if (STATE.bank_locked) return;
    if (STATE.cash < COST.hangout_denis.c) return;
    if (STATE.hours < COST.hangout_denis.h) return;
    STATE.hours -= COST.hangout_denis.h;
    STATE.cash -= COST.hangout_denis.c;
    STATE.hunger = Math.min(100, STATE.hunger + COST.hangout_denis.f);
    STATE.comfort = Math.min(100, STATE.comfort + COST.hangout_denis.m);
    STATE.energy = Math.min(100, STATE.energy + COST.hangout_denis.ePlus);

    runAction(function () {
      postOutgoing('scratch', 'с Денисом на набережной · вино, смех, море, 4 часа как 40 минут');
      setTimeout(function () {
        postSystem('scratch', '+' + COST.hangout_denis.m + ' комфорт · +' + COST.hangout_denis.ePlus + '⚡ · −$' + COST.hangout_denis.c);
        postBank(-COST.hangout_denis.c, 'с Денисом');
      }, 400);
    });
  }

  // BLOCK F — night work (more progress, more cost)
  function actWorkNight() {
    if (STATE.active_projects.length === 0) return;
    if (STATE.day < 5) return;
    if (STATE.hours < COST.work_night.h) return;
    if (STATE.energy < COST.work_night.e) return;
    STATE.hours -= COST.work_night.h;
    STATE.energy = Math.max(0, STATE.energy - COST.work_night.e);
    STATE.comfort = Math.max(0, STATE.comfort + COST.work_night.m); // .m is negative

    runAction(function () {
      var p = STATE.active_projects[0];
      p.progress = Math.min(100, (p.progress || 0) + 50);
      p.work_units_done = (p.work_units_done || 0) + 1.5; // night = 1.5 units
      postOutgoing('scratch', 'сидишь до 4 утра · экран режет глаза · проект двигается');
      setTimeout(function () {
        postSystem('scratch', 'проект #' + p.id + ' · прогресс ' + Math.floor(p.progress) + '% · −15⚡ ночной режим');
        if (p.work_units_done >= (p.work_units_total || 3)) {
          // Delivered
          STATE.active_projects.shift();
          STATE.delivered_projects += 1;
          STATE.cash += p.final_due || p.final_payment || 0;
          p.status = 'delivered';
          setTimeout(function () {
            postSystem('scratch', 'проект #' + p.id + ' сдан · клиент принял');
            postBank(p.final_due || p.final_payment || 0, 'финал по проекту #' + p.id);
            save(); renderDock();
          }, 500);
        }
        save(); renderDock();
      }, 600);
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
      text: 'привет. лена про тебя рассказала.\n\nу меня небольшой проект — двустраничник, $200 upfront + $250 на сдаче. срок 6 дней. если готова быстро — берём?'
    });
    postMessage('scratch', { kind: 'system', text: 'Анна написала · ответь ей' });
    STATE._anna_pending = true;
  }

  function beatAnnaReferral() {
    if (STATE.beat_anna_referral) return;
    STATE.beat_anna_referral = true;
    // Anna возвращается с новым проектом если первый был сдан
    if (STATE.delivered_projects >= 1) {
      postMessage('anna', {
        kind: 'incoming',
        senderName: 'Анна',
        text: 'марина, привет. мне понравилось как ты сделала. у меня второй проект — email-последовательность для другого клиента. $350 upfront + $450 на сдаче. 7 дней. берёшь?'
      });
      postMessage('scratch', { kind: 'system', text: 'Анна с новым проектом · открой чат' });
      STATE._anna_referral_pending = true;
    }
  }

  function beatLenaDay9() {
    if (STATE.beat_lena_day9) return;
    STATE.beat_lena_day9 = true;
    postMessage('lena', {
      kind: 'incoming',
      senderName: 'Лена',
      text: 'как держишься? я тут смотрю новости — обнимаю. скину тебе пару контактов днями если найду что-то стоящее.'
    });
  }

  // ========== Тим as game creator (BLOCK M) — triggered by interaction count, not day ==========

  function beatTimCreator() {
    if (STATE.beat_tim_creator_fired) return;
    STATE.beat_tim_creator_fired = true;
    var c = findContact('tim'); if (c) { c.visible = true; c.online = true; }
    STATE.notebook_available = true;

    // 4th wall break: Tim-as-creator messages the player directly
    postMessage('tim', {
      kind: 'incoming',
      senderName: 'Тим',
      text: 'привет. это не персонаж — это реально я. Тим, создатель этой игры.'
    });
    setTimeout(function () {
      postMessage('tim', {
        kind: 'incoming',
        senderName: 'Тим',
        photo: 'img/events/tim_kas_view.webp',
        photoAlt: 'вид из каша',
        text: 'спасибо что ты тут. что играешь за Марину, принимаешь решения, тратишь своё время. мне правда важно.\n\nесли тебе хочется сэкономить ещё больше своего времени — в реальной жизни — я могу помочь. я автоматизирую бизнесы и прикручиваю ИИ к процессам. это то чем я занимаюсь каждый день.'
      });
    }, 1200);
    setTimeout(function () {
      postMessage('tim', {
        kind: 'incoming',
        senderName: 'Тим',
        text: 'если интересно — нажми кнопку ниже и заполни короткую форму. я свяжусь лично. без воронок, без ботов, без курсов. просто Тим.'
      });
    }, 2400);

    postMessage('scratch', { kind: 'system', text: 'сообщение от Тима · открой чат' });
  }

  function bumpInteraction() {
    STATE.player_interactions = (STATE.player_interactions || 0) + 1;
    if (STATE.player_interactions >= 3 && !STATE.beat_tim_creator_fired) {
      setTimeout(beatTimCreator, 600);
    }
  }

  // ========== Хозяйка 4 absurd beats (BLOCK E) ==========

  function beatKhozyaika1() {
    if (STATE.beat_khozyaika_1) return;
    STATE.beat_khozyaika_1 = true;
    var c = findContact('khozyaika'); if (c) c.visible = true;
    postMessage('khozyaika', {
      kind: 'incoming',
      senderName: 'Наталья Валерьевна',
      text: 'Марина, добрый день! Не забудьте передать показания счётчиков горячей и холодной воды до 10 числа. ВАЖНО: обязательно с фотографией сертифицированного образца. Иначе штраф $100. Наталья В.'
    });
    postMessage('scratch', { kind: 'system', text: 'хозяйка требует счётчики · открой чат' });
    STATE._khozyaika1_pending = true;
  }

  function beatKhozyaika2() {
    if (STATE.beat_khozyaika_2) return;
    STATE.beat_khozyaika_2 = true;
    var c = findContact('khozyaika'); if (c) c.visible = true;
    postMessage('khozyaika', {
      kind: 'incoming',
      senderName: 'Наталья Валерьевна',
      text: 'Мариночка, я сняла видео с нашим домом для тиктока. Можете лайкнуть и подписаться на @natalya_vmore? Мне важно как бабе-стрельцу, я сейчас на сатурновом транзите и дом это моя точка опоры.'
    });
    postMessage('scratch', { kind: 'system', text: 'хозяйка про тикток · открой чат' });
    STATE._khozyaika2_pending = true;
  }

  function beatKhozyaika3() {
    if (STATE.beat_khozyaika_3) return;
    STATE.beat_khozyaika_3 = true;
    var c = findContact('khozyaika'); if (c) c.visible = true;
    postMessage('khozyaika', {
      kind: 'incoming',
      senderName: 'Наталья Валерьевна',
      photo: 'img/events/cat_window.webp',
      photoAlt: 'кошка Мурка',
      text: 'SOS МАРИНА! Кошка Мурка сбежала из квартиры на восьмой этаж. Помогите расклеить объявления по району, вы же дома работаете? У вас время есть. Срочно пожалуйста.'
    });
    postMessage('scratch', { kind: 'system', text: 'хозяйка потеряла кошку · открой чат' });
    STATE._khozyaika3_pending = true;
  }

  function beatKhozyaika4() {
    if (STATE.beat_khozyaika_4) return;
    STATE.beat_khozyaika_4 = true;
    var c = findContact('khozyaika'); if (c) c.visible = true;
    postMessage('khozyaika', {
      kind: 'incoming',
      senderName: 'Наталья Валерьевна',
      text: 'Марина, читала ваш гороскоп на месяц. Скорпионы в этом месяце в огне. Деньги НЕ давайте Весам (особенно Весам в очках). Это важно для кармы дома, я переживаю как за родную.'
    });
    STATE._khozyaika4_pending = true;
  }

  // BLOCK N — Day 12 Khozyaika Rescue (turns from absurd antagonist into absurd guardian)
  // Plan guarantee: player всегда к day 12 в минусе. Хозяйка abruptly прощает rent
  // с нелепым аргументом, добавляет $500 refund, продлевает игру до day 30.
  function beatKhozyaikaRescue() {
    if (STATE.beat_khozyaika_rescue) return;
    STATE.beat_khozyaika_rescue = true;
    var c = findContact('khozyaika'); if (c) c.visible = true;

    postMessage('khozyaika', {
      kind: 'incoming',
      senderName: 'Наталья Валерьевна',
      text: 'Марина, добрый день. У меня к вам разговор важный и странный.'
    });
    setTimeout(function () {
      postMessage('khozyaika', {
        kind: 'incoming',
        senderName: 'Наталья Валерьевна',
        text: 'Я вчера перед сном смотрела видео одной блогерши из Таиланда — она там про карму дома рассказывала. И знаете что? Она сказала что если собственница жилья помогает молодой фаундерше в первый месяц — у неё третий глаз открывается. А мне надо открыть, я уже кукушку на птичьем рынке спрашивала про своё будущее.'
      });
    }, 1200);
    setTimeout(function () {
      postMessage('khozyaika', {
        kind: 'incoming',
        senderName: 'Наталья Валерьевна',
        text: 'Короче. Аренду за первую половину месяца — я вам прощаю. Перевела обратно. До конца месяца — живите спокойно, думайте о деле. У меня высшие задачи, не подведите — у меня третий глаз на кону.'
      });
    }, 2400);
    setTimeout(function () {
      // Mechanical effect: +$500 refund + comfort relief
      STATE.cash += 500;
      STATE.comfort = Math.min(100, (STATE.comfort || 60) + 15);
      postBank(500, 'возврат аренды от хозяйки · карма дома');
      postMessage('scratch', { kind: 'system', text: 'хозяйка вернула аренду · +$500 · месяц продлён' });
      postMessage('scratch', { kind: 'system', text: '━━━ половина месяца позади ━━━' });
      save();
      renderDock();
    }, 3400);
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
    postMessage('scratch', { kind: 'system', text: 'бывший написал · открой чат' });
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

  function beatMama17() {
    if (STATE.beat_mama17) return;
    STATE.beat_mama17 = true;
    var c = findContact('mama'); if (c) c.visible = true;
    postMessage('mama', {
      kind: 'incoming',
      senderName: 'мама',
      photo: 'img/events/desk_night.webp',
      photoAlt: 'ночной стол',
      text: 'ты там живая? звонков нет уже неделю. пирогов наготовила, приезжай в субботу.'
    });
    STATE._mama17_pending = true;
  }

  function beatMama24() {
    if (STATE.beat_mama24) return;
    STATE.beat_mama24 = true;
    var c = findContact('mama'); if (c) c.visible = true;
    postMessage('mama', {
      kind: 'incoming',
      senderName: 'мама',
      text: 'доча, я скучаю. звони когда сможешь. хоть на 5 минут.'
    });
  }

  function beatMamaFinal() {
    if (STATE.beat_mama29) return;
    STATE.beat_mama29 = true;
    var c = findContact('mama'); if (c) c.visible = true;
    postMessage('mama', {
      kind: 'incoming',
      senderName: 'мама',
      text: 'доча. я всё это время не знала как ты. завтра последний день месяца. я просто скажу: горжусь тобой. что бы ни было. позвони когда сможешь.'
    });
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

  // ========== spam / humor dialogues (13 individual contacts) ==========

  // Recurring spam characters (6) — have reply chips + state effects (BLOCK A, I)
  // Each triggered via fireDayBeats on specific day, with own beat function.

  function beatOlya() {
    if (STATE.beat_olya) return;
    STATE.beat_olya = true;
    var c = findContact('olya'); if (c) c.visible = true;
    postMessage('olya', { kind: 'incoming', senderName: 'Оля Петрова', text: 'Мариночка приветик! Это Оля Петрова, мы учились вместе в 11-Б. Помнишь меня?' });
    setTimeout(function () {
      postMessage('olya', { kind: 'incoming', senderName: 'Оля Петрова', text: 'У меня появилась уникальная возможность для женщин которые хотят изменить жизнь и финансы. Можно я расскажу 5 минут?' });
    }, 900);
    setTimeout(function () {
      postMessage('olya', { kind: 'incoming', senderName: 'Оля Петрова', text: 'Это не пирамида, это клуб ✨ инвестиция всего $200, возвращается х3 за 2 месяца гарантированно' });
    }, 1800);
    STATE._olya_pending = true;
    postMessage('scratch', { kind: 'system', text: 'одноклассница пишет · открой чат' });
  }

  function beatKirillIntro() {
    if (STATE.beat_kirill) return;
    STATE.beat_kirill = true;
    var c = findContact('kirill'); if (c) c.visible = true;
    postMessage('kirill', { kind: 'incoming', senderName: 'Кирилл', text: 'ну привет' });
    setTimeout(function () {
      postMessage('kirill', { kind: 'incoming', senderName: 'Кирилл', text: 'я тебя на тиндере лайкнул три недели назад. ты молчала. я всё-таки настойчивый' });
    }, 900);
    setTimeout(function () {
      postMessage('kirill', { kind: 'incoming', senderName: 'Кирилл', text: 'может встретимся? я угощаю ужином. любое кафе на выбор' });
    }, 1800);
    STATE._kirill_pending = true;
    postMessage('scratch', { kind: 'system', text: 'Кирилл пишет · открой чат' });
  }

  function beatKrypta() {
    if (STATE.beat_krypta) return;
    STATE.beat_krypta = true;
    var c = findContact('krypta'); if (c) c.visible = true;
    postMessage('krypta', { kind: 'incoming', senderName: 'БРАТ крипта', text: 'БРАТ' });
    setTimeout(function () {
      postMessage('krypta', { kind: 'incoming', senderName: 'БРАТ крипта', text: 'СОЛАНА ЛЕТИТ 🚀🚀🚀 1000X ЭТОТ МЕСЯЦ' });
    }, 700);
    setTimeout(function () {
      postMessage('krypta', { kind: 'incoming', senderName: 'БРАТ крипта', text: 'скидываешь $100 на кошелёк — делаешь $100000. проверено. ловлю момент один. решай быстрее' });
    }, 1500);
    STATE._krypta_pending = true;
    postMessage('scratch', { kind: 'system', text: 'какой-то брат-крипта пишет · открой чат' });
  }

  function beatArtur() {
    if (STATE.beat_artur) return;
    STATE.beat_artur = true;
    var c = findContact('artur'); if (c) c.visible = true;
    postMessage('artur', { kind: 'incoming', senderName: 'Артур', text: 'марина привет. я понимаю что ты ушла не на лучшей ноте' });
    setTimeout(function () {
      postMessage('artur', { kind: 'incoming', senderName: 'Артур', text: 'но у меня есть тема. подойди завтра в 10 в старый офис, объясню лично. это взаимовыгодно' });
    }, 1000);
    STATE._artur_pending = true;
    postMessage('scratch', { kind: 'system', text: 'бывший босс написал · открой чат' });
  }

  function beatVera() {
    if (STATE.beat_vera) return;
    STATE.beat_vera = true;
    var c = findContact('vera'); if (c) c.visible = true;
    postMessage('vera', { kind: 'incoming', senderName: 'Вера Николаевна', text: 'Марина Сергеевна, здравствуйте! Это Вера Николаевна, ваша учительница по литературе.' });
    setTimeout(function () {
      postMessage('vera', { kind: 'incoming', senderName: 'Вера Николаевна', text: 'Я в одноклассниках увидела что вы открыли своё дело. Горжусь вами! У меня есть внучка Алиса. Она пишет стихи. Не могли бы вы помочь ей продвинуться в интернете?' });
    }, 1100);
    STATE._vera_pending = true;
  }

  function beatSosedIntro() {
    if (STATE.beat_sosed) return;
    STATE.beat_sosed = true;
    var c = findContact('sosed'); if (c) c.visible = true;
    postMessage('sosed', { kind: 'incoming', senderName: 'сосед снизу', text: 'здравствуйте. это ваш сосед снизу, квартира 23' });
    setTimeout(function () {
      postMessage('sosed', { kind: 'incoming', senderName: 'сосед снизу', text: 'у меня на потолке появилось пятно. я думаю это от вас. спустите поговорить?' });
    }, 900);
    STATE._sosed_pending = true;
  }

  // One-shot flavor spam (7 контактов без chips) — случайный выбор per day
  var ONESHOT_SPAM = [
    {
      id: 'lyuda', sender: 'Людочка',
      bubbles: [
        'Людочка, ты забыла у меня в духовке пирог 🥧',
        'Я не знаю что с ним делать. Он уже 4 часа там. Он живой ещё?',
        'Алло? Люда это ты??'
      ]
    },
    {
      id: 'ozon', sender: 'OZON курьер',
      bubbles: [
        'Добрый день! Ваш заказ "Швабра телескопическая 3в1 Премиум" готов к доставке',
        'Когда вам удобно принять? Адрес в заказе указан верно?'
      ]
    },
    {
      id: 'taxi', sender: 'водитель яндекса',
      bubbles: [
        'здравствуйте это водитель. вы ехали в среду из аэропорта',
        'вы забыли у меня в машине книгу «атлант расправил плечи» том 2',
        'вернуть могу за 500 как договаривались'
      ]
    },
    {
      id: 'student', sender: 'студент СПбГУ',
      bubbles: [
        'привет. я пишу диплом по постпозитивизму',
        'можно задать 12 вопросов? займёт 5 минут',
        'первый вопрос: как думаешь, сознание — это вычисление?'
      ]
    },
    {
      id: 'katya', sender: 'Катя с работы',
      bubbles: [
        'Марин, ты случайно не знаешь где взять пони в аренду на день?',
        'У Мишутки день рождения в субботу. Нужна живая, можно с седлом',
        'срочно'
      ]
    },
    {
      id: 'teshcha', sender: 'неизвестный номер',
      bubbles: [
        'Ну и что, ты думала я не узнаю??',
        'Света мне всё рассказала. Я не буду устраивать сцен',
        'Приедешь в субботу — поговорим как взрослые люди. Я всё ещё твоя мать'
      ]
    },
    {
      id: 'marathon', sender: 'женская сила',
      bubbles: [
        'ТЫ ГОТОВА К ПРОРЫВУ??? 🔥🔥🔥',
        'марафон «ПРОБУЖДЕНИЕ ТВОЕЙ СИЛЫ» · 21 день · бесплатно · только сегодня',
        '🌸 истинная женщина не работает — она притягивает 🌸'
      ]
    }
  ];

  function beatSpamOneshot(day) {
    try {
      STATE.spam_pool_rolled = STATE.spam_pool_rolled || [];
      var available = ONESHOT_SPAM.filter(function (s) {
        return STATE.spam_pool_rolled.indexOf(s.id) === -1;
      });
      if (available.length === 0) return;
      var pick_ = pick(available);
      STATE.spam_pool_rolled.push(pick_.id);

      var c = findContact(pick_.id);
      if (c) c.visible = true;

      pick_.bubbles.forEach(function (text, i) {
        setTimeout(function () {
          postMessage(pick_.id, {
            kind: 'incoming',
            senderName: pick_.sender,
            text: text
          });
        }, i * 800);
      });
    } catch (e) {
      console.error('spam oneshot error', e);
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
        } else if (cb.type === 'bank_lock_115') {
          // BLOCK I — 115-ФЗ bank block activates
          STATE.bank_locked = true;
          STATE.bank_locked_until = STATE.day + 6;
          postMessage('bank', {
            kind: 'bank',
            meta: { bank_name: 'Т-Банк', amount: 0 },
            text: 'Счёт ВРЕМЕННО ЗАБЛОКИРОВАН по 115-ФЗ. Подозрительная транзакция на криптобиржу. До выяснения — операции недоступны.'
          });
          postMessage('scratch', { kind: 'system', text: '🔒 счёт заблокирован · 6 дней · не можешь тратить деньги' });
          // Кирилл пишет приглашение на свидание (free food, plate girl loop)
          if (!STATE.kirill_blocked) {
            setTimeout(function () {
              var k = findContact('kirill'); if (k) k.visible = true;
              postMessage('kirill', {
                kind: 'incoming',
                senderName: 'Кирилл',
                text: 'привет. хочешь в кафе вечером? я угощаю, тебе ничего не надо'
              });
              STATE._kirill_invite_pending = true;
            }, 1800);
          }
        } else if (cb.type === 'khozyaika_fine') {
          STATE.cash -= 100;
          postBank(-100, 'штраф за счётчики · хозяйка');
          postMessage('khozyaika', {
            kind: 'incoming',
            senderName: 'Наталья Валерьевна',
            text: 'Я же предупреждала про счётчики. Штраф $100 списан. Будьте ответственнее.'
          });
        } else if (cb.type === 'sosed_retry') {
          postMessage('sosed', {
            kind: 'incoming',
            senderName: 'сосед снизу',
            text: 'вы где? я жду уже сутки. пятно стало больше.'
          });
          STATE._sosed_pending = true;
        }
      } else {
        keep.push(cb);
      }
    });
    STATE.pending_callbacks = keep;
  }

  function fireDayBeats(day) {
    // v2.1 — 30-day arc. Beats распределены по трём неделям.
    // Tim creator beat (BLOCK M) триггерится по player_interactions, не по дню.
    if (day === 3) { beatDenis(3); beatOlya(); }
    if (day === 4) beatKhozyaika1(); // счётчики воды
    if (day === 5) beatAnnaOffer();
    if (day === 6) beatSosedIntro();
    if (day === 8) beatMama6();
    if (day === 9) { beatLenaDay9(); beatKirillIntro(); beatDenis(9); }
    if (day === 11) beatKhozyaika2(); // тикток эзотерика
    if (day === 12) beatKhozyaikaRescue(); // BLOCK N — rescue beat, mandatory
    if (day === 14) beatPavel();
    if (day === 15) { beatArtur(); beatDenis(15); }
    if (day === 17) beatMama17();
    if (day === 18) beatKhozyaika3(); // пропала кошка
    if (day === 19) beatVera();
    if (day === 21) beatAnnaReferral();
    if (day === 24) beatMama24();
    if (day === 25) beatKhozyaika4(); // гороскоп
    if (day === 26) beatKrypta();
    if (day === 27) beatDenis(27);
    if (day === 29) beatMamaFinal();

    // One-shot flavor spam: ~35% chance of a random pop-up per day
    if (day >= 2 && Math.random() < 0.35) {
      setTimeout(function () { beatSpamOneshot(day); }, 1800);
    }

    // Delayed callbacks processed each day
    processPendingCallbacks(day);
  }

  // ========== passive costs (single source) ==========

  function processPassive(day) {
    // Base daily drains (survival economy v2.1 — tuned so day 10-12 always hit negative)
    STATE.cash -= 25; // daily mini-expenses (coffee, метро, подписки, всякая мелочь)
    STATE.hunger = Math.max(0, (STATE.hunger || 100) - 12);
    STATE.comfort = Math.max(0, (STATE.comfort || 60) - 4);

    // Low hunger → energy drain
    if (STATE.hunger < 30) {
      STATE.energy = Math.max(0, STATE.energy - 8);
      postMessage('scratch', { kind: 'system', text: 'голодно · −8 энергии · пора поесть' });
    }
    // Low comfort → impulsive purchase
    if (STATE.comfort < 30 && Math.random() < 0.35) {
      STATE.cash -= 50;
      postBank(-50, 'импульсивная покупка · комфорт низкий');
    }
    // High comfort → energy regen
    if (STATE.comfort >= 70) {
      STATE.energy = Math.min(100, STATE.energy + 3);
    }

    // 30-day arc passive expenses
    if (day === 10 && !STATE.beat_rent_10) {
      STATE.beat_rent_10 = true;
      STATE.cash -= 500;
      postBank(-500, 'аренда · первая декада');
    }
    if (day === 20 && !STATE.beat_rent_20) {
      STATE.beat_rent_20 = true;
      STATE.cash -= 500;
      postBank(-500, 'аренда · вторая декада');
    }
    if (day === 7 && !STATE.beat_food) {
      STATE.beat_food = true;
      STATE.cash -= 150;
      postBank(-150, 'продукты · базовая закупка');
    }

    // 115-ФЗ bank lock tick (BLOCK I)
    if (STATE.bank_locked && STATE.bank_locked_until && STATE.day >= STATE.bank_locked_until) {
      STATE.bank_locked = false;
      STATE.bank_locked_until = null;
      postBank(0, 'блокировка снята · счёт разморожен');
      postMessage('bank', {
        kind: 'incoming',
        senderName: 'Т-Банк',
        text: 'Блокировка снята. Спасибо за ожидание. Операции доступны.'
      });
      // Кирилл пишет про тарелочницу если были свидания при блокировке
      if (STATE.plate_girl_count >= 2) {
        setTimeout(function () {
          postMessage('kirill', {
            kind: 'incoming',
            senderName: 'Кирилл',
            text: 'слушай. я за последние 2 недели угостил тебя ужином ' + STATE.plate_girl_count + ' раз. ты ни разу не предложила свой счёт.'
          });
          postMessage('kirill', {
            kind: 'incoming',
            senderName: 'Кирилл',
            text: 'ты тарелочница. я не в обиде, но давай на этом закончим.'
          });
          STATE.kirill_blocked = true;
          STATE._kirill_complaint_pending = true;
        }, 1500);
      }
    }

    // Contract deadlines (BLOCK K)
    if (Array.isArray(STATE.active_projects)) {
      STATE.active_projects.forEach(function (p) {
        if (!p || p.status !== 'active') return;
        if (STATE.day > (p.deadline_day || Infinity)) {
          if ((p.work_units_done || 0) >= (p.work_units_total || 3)) {
            // Just finished in time
            p.status = 'delivered';
            STATE.delivered_projects = (STATE.delivered_projects || 0) + 1;
            STATE.cash += (p.final_due || 0);
            postBank(p.final_due || 0, p.client + ' · финал за проект');
          } else {
            // Missed deadline
            var roll = Math.random();
            if (roll < 0.4) {
              // Clawback
              p.status = 'clawback';
              STATE.cash -= (p.upfront_paid || 0);
              STATE.comfort = Math.max(0, STATE.comfort - 15);
              postBank(-(p.upfront_paid || 0), p.client + ' · возврат аванса (срыв сроков)');
              postMessage(p.clientId || 'anna', {
                kind: 'incoming',
                senderName: p.client,
                text: 'Марина, мы договаривались на ' + p.deadline_day + ' день. Я жду уже неделю. Верни аванс — я больше не могу ждать.'
              });
            } else {
              p.status = 'missed';
              STATE.comfort = Math.max(0, STATE.comfort - 8);
              postMessage(p.clientId || 'anna', {
                kind: 'incoming',
                senderName: p.client,
                text: 'ничего. найдём другого. извини.'
              });
            }
          }
        }
      });
    }

    // Automation
    if (STATE.automation_active) {
      STATE.leads += 1;
      postMessage('scratch', {
        kind: 'system',
        text: '[auto] automation pipeline · +1 лид из фоновой воронки'
      });
    }
    // Lena lifeline — available only after day 14 (after khozyaika rescue).
    // До day 12 player должен дойти в минусе — тогда хозяйка спасает. После 14 —
    // lena подстраховывает вторую половину если что.
    if (STATE.cash < 0 && !STATE.lena_lifeline_used && STATE.day > 14) {
      STATE.lena_lifeline_used = true;
      STATE.cash += 300;
      postMessage('lena', {
        kind: 'incoming',
        senderName: 'Лена',
        text: 'подруга, у меня есть $300 наличкой на пару недель. не спорь. отдашь как сможешь.'
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
    // Hunger starvation — any day 4+
    if (STATE.hunger !== undefined && STATE.hunger === 0 && STATE.day >= 4) {
      showLose('starvation', 'ты свалилась · 4 дня без еды');
      return;
    }
    // Comfort breakdown — any day 15+
    if (STATE.comfort !== undefined && STATE.comfort <= 5 && STATE.day >= 15 && Math.random() < 0.3) {
      showLose('burnout', 'ты больше не можешь · нервы сдали');
      return;
    }
    // Finale check — only fires when forceOnFinaleDay AND we've moved past FINALE_DAY
    if (!forceOnFinaleDay) return;
    if (STATE.day <= FINALE_DAY) return;

    // Finale reached (day 30+)
    var meetsWin = STATE.delivered_projects >= 3
      && STATE.cash >= 0
      && STATE.energy >= 25
      && (STATE.hunger === undefined || STATE.hunger >= 30)
      && (STATE.comfort === undefined || STATE.comfort >= 20);

    if (meetsWin) {
      showWin();
    } else if (STATE.delivered_projects === 0) {
      showLose('no_traction', '30 дней · ни одного закрытого проекта');
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
        case 'work_night': actWorkNight(); break;
        case 'rest': actRest(); break;
        case 'eat_home': actEatHome(); break;
        case 'eat_out': actEatOut(); break;
        case 'shopping': actShopping(); break;
        case 'date_kirill': actDateKirill(); break;
        case 'hangout_denis': actHangoutDenis(); break;
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
