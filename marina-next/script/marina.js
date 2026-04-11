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

  var VERSION = '2.0.0';
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
      // reactive
      reach_out_total: 0,
      reach_out_misses: 0,
      lena_lifeline_used: false,
      ending_seen: false, // 'win' | 'lose_eviction' | 'lose_burnout' | 'lose_no_traction' | false
      // messenger
      contacts: [
        { id: 'lena',  name: 'Лена',   avatar: 'Л', unread: 0, visible: true },
        { id: 'anna',  name: 'Анна',   avatar: 'А', unread: 0, visible: false },
        { id: 'tim',   name: 'Тим',    avatar: 'Т', unread: 0, visible: false },
        { id: 'bank',  name: 'Т-Банк', avatar: '$', unread: 0, visible: true },
        { id: 'scratch', name: 'себе', avatar: 'М', unread: 0, visible: true }
      ],
      threads: {
        lena: [],
        anna: [],
        tim: [],
        bank: [],
        scratch: []
      },
      current_chat: 'scratch'
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
        for (var k in d) {
          if (!(k in parsed)) parsed[k] = d[k];
        }
        return parsed;
      }
    } catch (e) {}
    return defaultState();
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
    $('#dock-day').text(STATE.day);
    $('#dock-hours').text(Math.max(0, STATE.hours));
    $('#dock-cash').text(STATE.cash);
    $('#dock-leads').text(STATE.leads);
    $('#dock-qualified').text(STATE.qualified_leads);
    $('#dock-done').text(STATE.delivered_projects);

    var $buttons = $('#dock-buttons').empty();

    var actions = [];
    if (STATE.lamp_on) {
      if (STATE.hours >= COST.reach_out.h && STATE.energy >= COST.reach_out.e) {
        actions.push({ id: 'reach_out', label: 'написать в холодную', cost: '1ч, 5e' });
      }
      if (STATE.leads >= 1 && STATE.hours >= COST.brief_lead.h && STATE.energy >= COST.brief_lead.e) {
        actions.push({ id: 'brief_lead', label: 'пробрифовать лида', cost: '1ч, 3e' });
      }
      if (STATE.qualified_leads >= 1 && STATE.hours >= COST.send_offer.h) {
        actions.push({ id: 'send_offer', label: 'сделать коммерческое', cost: '1ч' });
      }
      if (STATE.active_projects.length > 0 && STATE.hours >= COST.work_on_project.h && STATE.energy >= COST.work_on_project.e) {
        actions.push({ id: 'work_on_project', label: 'работать над проектом', cost: '2ч, 5e' });
      }
      if (STATE.energy < 100 && STATE.hours >= COST.rest.h && STATE.coffee_stacks < 4) {
        actions.push({ id: 'rest', label: 'отдохнуть', cost: '1ч, +30e' });
      }
      actions.push({ id: 'end_day', label: 'закрыть ноутбук', cost: 'конец дня' });
    }

    actions.forEach(function (a) {
      var $btn = $('<button class="dock-btn">').attr('data-action', a.id).text(a.label);
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
      ], function () {
        mountInlineForm();
      });
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
        checkEndings();
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
    STATE.day += 1;
    STATE.hours = HOURS_PER_DAY;
    STATE.energy = Math.min(100, STATE.energy + 20);
    STATE.coffee_stacks = Math.max(0, STATE.coffee_stacks - 1);

    if (STATE.day > FINALE_DAY) {
      STATE.day = FINALE_DAY;
      checkEndings(true);
      return;
    }

    postSystem('scratch', '— конец дня ' + (STATE.day - 1) + ' · новый день начался —');
    postSystem('scratch', 'день ' + STATE.day + ' · 8 часов впереди · $' + STATE.cash);

    // Fire scheduled day beats + passive
    processPassive(STATE.day);
    fireDayBeats(STATE.day);

    save();
    renderDock();
  }

  // ========== beats ==========

  function triggerLenaIntro() {
    if (STATE.beat_lena_intro) return;
    STATE.beat_lena_intro = true;
    STATE.contacts.find(function (c) { return c.id === 'lena'; }).visible = true;
    postMessage('lena', {
      kind: 'incoming',
      senderName: 'Лена',
      text: 'эй, подруга. услышала что ты ушла из агентства.\n\nпервая неделя всегда самая тяжёлая — я была там. через пару дней скину контакты. держись.'
    });
    Bubbles.renderContacts(STATE);
  }

  function beatAnnaOffer() {
    if (STATE.beat_anna_offer) return;
    STATE.beat_anna_offer = true;
    STATE.contacts.find(function (c) { return c.id === 'anna'; }).visible = true;
    postMessage('anna', {
      kind: 'incoming',
      senderName: 'Анна',
      text: 'привет. лена про тебя рассказала.\n\nу меня небольшой проект — двустраничник, $250 upfront + $300 на сдаче. если готова быстро — берём?'
    });
    postMessage('scratch', { kind: 'system', text: 'Анна написала · ответь ей' });

    // Add reply chips when opening Anna chat
    STATE._anna_pending = true;
  }

  function beatTimIntro() {
    if (STATE.beat_tim_intro) return;
    STATE.beat_tim_intro = true;
    STATE.contacts.find(function (c) { return c.id === 'tim'; }).visible = true;
    STATE.notebook_available = true;

    // Lena hands off
    postMessage('lena', {
      kind: 'incoming',
      senderName: 'Лена',
      text: 'слушай. у меня есть знакомый — тим. он в каше, помогает founders распутывать работу.\n\nне продаёт ничего конкретного — просто смотрит что у тебя на столе и говорит что можно убрать.\n\nпопросила его написать тебе. открой блокнот, запиши что сейчас горит. прочитает в тот же день.'
    });
    // Tim intro bubble
    postMessage('tim', {
      kind: 'incoming',
      senderName: 'Тим',
      text: 'привет. лена написала про тебя.\n\nесли хочешь — открой блокнот и напиши одним куском что сейчас жрёт больше всего времени и сил.\n\nя прочитаю, верну конкретные 3 вещи которые можно сделать завтра утром.'
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

  function fireDayBeats(day) {
    if (day === 2) { /* lena intro already fired via lamp */ }
    if (day === 4) beatAnnaOffer();
    if (day === 5) beatTimIntro();
    if (day === 9) beatLenaDay9();
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

  function checkEndings(forceOnFinaleDay) {
    if (STATE.ending_seen) return;
    // Lose conditions
    if (STATE.cash < -1500) { showLose('eviction', 'денежный крах: −$1500'); return; }
    if (forceOnFinaleDay && STATE.day >= FINALE_DAY && STATE.delivered_projects < 1) {
      showLose('no_traction', '12 дней · ни одного закрытого проекта'); return;
    }
    // Win condition
    if (STATE.delivered_projects >= 3 && STATE.cash >= 0 && STATE.energy >= 25) {
      showWin(); return;
    }
    // Finale check
    if (forceOnFinaleDay && STATE.day >= FINALE_DAY) {
      if (STATE.delivered_projects >= 3) { showWin(); return; }
      else { showLose('burnout', 'день 12 · проекты не добиты'); return; }
    }
  }

  function showWin() {
    STATE.ending_seen = 'win';
    save();
    var stats = STATE.delivered_projects + ' проекта сданы · $' + STATE.cash + ' · energy ' + STATE.energy;
    $('#win-stats').text(stats);
    $('#win-overlay').show();
  }

  function showLose(reason, reasonText) {
    STATE.ending_seen = 'lose_' + reason;
    save();
    $('#lose-reason').text(reasonText);
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

    // Intro start
    $('#intro-start').on('click', function () {
      STATE.intro_seen = true;
      save();
      $('#intro-overlay').fadeOut(300);
    });

    // Win / lose overlay buttons
    $('#win-restart, #lose-restart').on('click', function () {
      clearState();
      sessionStorage.removeItem(SESSION_KEY);
      location.reload();
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
      var name = $(this).attr('data-action');
      switch (name) {
        case 'lamp': actLamp(); break;
        case 'reach_out': actReachOut(); break;
        case 'brief_lead': actBriefLead(); break;
        case 'send_offer': actSendOffer(); break;
        case 'work_on_project': actWorkOnProject(); break;
        case 'rest': actRest(); break;
        case 'end_day': actEndDay(); break;
      }
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
