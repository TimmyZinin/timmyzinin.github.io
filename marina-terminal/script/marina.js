/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Derivative work based on A Dark Room by Michael Townsend
 * (github.com/doublespeakgames/adarkroom, MPL-2.0).
 *
 * «Марина в огне» v1.6a — terminal-style 12-day founder sim with
 * button cooldowns, HUD progress bars, contract lifecycle, Tim AI
 * consultant narrative, status indicator, variety text banks.
 *
 * Implementation (c) 2026 Tim Zinin.
 */

(function () {
  'use strict';

  // ========== constants ==========

  var VERSION = '1.6.0';
  var STATE_KEY = 'marina-fire:v1.6:state';
  var VERSION_KEY = 'marina-fire:v1.6:version';
  var OLD_V15_KEY = 'marina-fire:v1.5:state';
  var OLD_V15_VERSION_KEY = 'marina-fire:v1.5:version';
  var OLD_V1_KEY = 'marina-fire:v1:state';
  var OLD_V1_VERSION_KEY = 'marina-fire:v1:version';
  var SESSION_KEY = 'marina-fire:session_started_at';

  var HOURS_PER_DAY = 100;
  var FINALE_DAY = 12;
  var MAX_LOG_LINES = 400;
  var LOG_LINE_DELAY_MS = 180;
  var STATUS_SPINNER_MS = 80;
  var BAR_CELLS = 10;

  // Action cooldowns (seconds) — tuned short, total forced wait ≤90s per run
  var COOLDOWN = {
    lamp: 0,
    reach_out: 3,
    rest: 2,
    qualification: 3,
    take_project: 4,
    work_on_project: 4,
    open_notebook: 0,
    end_day: 1
  };

  // Action costs (hours, energy)
  var COST = {
    reach_out: { h: 25, e: 10 },
    rest: { h: 20, e: 0 },
    qualification: { h: 10, e: 5 },
    take_project: { h: 10, e: 0 },
    work_on_project: { h: 20, e: 10 },
    end_day: { h: 0, e: 0 }
  };

  var PASSIVE_ENERGY_WEAR = 3; // extra energy cost per action (shows wear)

  // ========== text banks ==========

  var REACH_OUT_VARIANTS = {
    // [bucket 0 = miss, bucket 1 = one lead, bucket 2 = N/A (removed from v1.6a)]
    miss: [
      'рассылает холодку по списку из notion. двадцать адресов. тишина в ответ',
      'копается в slack-комьюнити founders.cc, пишет семь личок. никто не отвечает',
      'фармит twitter: ищет людей которые жаловались на агентства. пусто',
      'брифит через linkedin sales navigator. два открытых сообщения, ни одного ответа',
      'роет reddit r/startups. находит пост про «ищу подрядчика», отвечает. пост уже закрыт',
      'отрабатывает notion template: cold email v3, A/B split. конверсия сегодня — ноль',
      'пишет в telegram-чаты saas-стартапов. удаляется модератором'
    ],
    hit: [
      'рассылает холодку по списку из notion — 20 адресов. один ответил: «давайте на созвон завтра»',
      'брифит через linkedin, задаёт вопросы. одна founder отвечает подробно — интересно',
      'копается в slack founders.cc. старая коллега даёт прямой контакт CEO',
      'фармит twitter: находит CMO который жаловался на агентство. DM-ит. ответ через час',
      'перелопачивает wellfound. отправляет video-loom pitch. один просматривает до конца',
      'трясёт старых коллег: «у кого знакомые с бюджетом на контент?» — Лена вспоминает двух',
      'ищет через clay.com decision-makers в DTC-брендах. один отвечает быстрее чем ожидалось',
      'чешет instagram-бренды, DM владельцам шопов. один пишет «а сколько стоит?»'
    ]
  };

  var WORK_ON_PROJECT_VARIANTS = [
    'пишет лендинг в notion: h1, sub, social proof, CTA, FAQ. первый черновик',
    'собирает бриф: 12 вопросов клиенту про аудиторию и goals',
    'верстает email-последовательность: welcome → education → offer',
    'правит правки: третий круг комментариев. половина прошлых',
    'делает reels-скрипты: 5 штук по 30 секунд, hook на первой секунде',
    'пишет кейс-стадию предыдущего клиента для сайта',
    'сидит в figma: референсы, moodboard, первый wireframe',
    'созванивается с клиентом: «что у вас болит больше всего?»',
    'разбирает вчерашние правки, переписывает headline четыре раза',
    'экспортирует финалку, делает zip, пишет сдачу-письмо'
  ];

  var REST_VARIANTS = {
    normal: [
      'налила кофе, дала воде остыть. смотрит в окно двадцать минут',
      'вышла на балкон, не курит, но стоит как будто курит',
      'легла на диван с телефоном. через 15 минут вспомнила что надо отдыхать',
      'прошлась до магазина за хлебом, вернулась через сорок минут',
      'поставила чайник, забыла, снова поставила',
      'залезла в горячий душ, вышла через час, не поняла что произошло'
    ],
    overdose: [
      'четвёртая кружка за день. руки трясутся. мысли разбегаются. кофе сработал обратно',
      'выпила кофе, лучше бы воды. сердце стучит. мысли петляют',
      'кофе перестал быть отдыхом. стал просто добавкой к уже перегретой голове'
    ]
  };

  var QUALIFICATION_VARIANTS = [
    'задаёт вопросы: кто вы, какая команда, есть ли сейчас активный проект',
    'проверяет бюджет: 15 минут о цифрах без стеснения',
    'разговаривает про сроки: «когда нужно сдать? кто подписывает согласование?»',
    'выясняет decision-maker: «кто принимает финальное решение?»',
    'тестирует fit: «если мы не сработаемся через неделю — что тогда?»'
  ];

  var TAKE_PROJECT_VARIANTS = [
    'читает договор на три страницы, правит один пункт про правки',
    'подписывает pdf через docsign, отправляет клиенту',
    'проверяет предоплату на счёте: 150 долларов, всё на месте',
    'договаривается о дедлайне: пять рабочих дней',
    'пересылает клиенту бриф-шаблон, просит заполнить до вечера'
  ];

  // status indicator verbs (farming vocab, random pick)
  var STATUS_VERBS = {
    reach_out: [
      'рассылает холодку',
      'брифит в linkedin',
      'фармит контакты',
      'трясёт старых коллег',
      'ищет в slack-комьюнити',
      'копается в twitter',
      'перелопачивает wellfound',
      'шлёт cold-loom'
    ],
    rest: [
      'наливает кофе',
      'смотрит в окно',
      'листает instagram',
      'стоит на балконе',
      'делает глоток воды',
      'лежит пять минут'
    ],
    qualification: [
      'задаёт вопросы про бюджет',
      'выясняет сроки',
      'проверяет decision-maker',
      'тестирует fit'
    ],
    take_project: [
      'читает договор',
      'подписывает pdf',
      'проверяет предоплату',
      'договаривается о дедлайне'
    ],
    work_on_project: [
      'пишет',
      'правит',
      'собирает',
      'верстает',
      'созванивается',
      'брифит',
      'выкатывает черновик'
    ],
    end_day: [
      'закрывает ноутбук',
      'выключает лампу',
      'ставит таймер на утро'
    ]
  };

  // energy band status tone prefix
  function energyTone(energy) {
    if (energy >= 80) return '';
    if (energy >= 50) return 'уставшим взглядом ';
    if (energy >= 20) return 'с трудом ';
    return 'еле-еле ';
  }

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
      // progression flags
      lamp_on: false,
      notebook_available: false,
      lead_submitted: false,
      qualification_unlocked: true, // available from day 1 (non-Tim path viable)
      automation_active: false,
      // beat flags (fire once)
      beat_intro: false,
      beat_lena: false,
      beat_anna: false,
      beat_tim: false,
      beat_tim_retry: false,
      beat_food: false,
      beat_anna_referral: false,
      beat_rent: false,
      beat_tim_return: false,
      beat_lena_retry_day9: false,
      // reactive
      reach_out_misses: 0,
      reach_out_total: 0,
      lena_lifeline_used: false,
      automation_accumulator: 0, // fractional leads accumulator
      _passive_food_done: false,
      _passive_rent_done: false,
      ending_seen: false,
      pending_choice: null
    };
  }

  var STATE;

  function loadState() {
    // cleanup old v1, v1.5 keys
    try {
      localStorage.removeItem(OLD_V1_KEY);
      localStorage.removeItem(OLD_V1_VERSION_KEY);
      localStorage.removeItem(OLD_V15_KEY);
      localStorage.removeItem(OLD_V15_VERSION_KEY);
    } catch (e) {}
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

  // ========== log helpers (incremental render) ==========

  var logQueue = [];
  var logFlushTimer = null;

  function flushNextLogLine() {
    if (logQueue.length === 0) {
      logFlushTimer = null;
      return;
    }
    var item = logQueue.shift();
    var $p = $('<div>').addClass('log-line');
    if (item.text === '') {
      $p.addClass('log-spacer');
    } else {
      $p.text(item.text);
    }
    if (item.cls) $p.addClass(item.cls);
    var $log = $('#log');
    $log.append($p);
    var all = $log.children('.log-line');
    if (all.length > MAX_LOG_LINES) {
      all.slice(0, all.length - MAX_LOG_LINES).remove();
    }
    var el = document.getElementById('log');
    if (el) el.scrollTop = el.scrollHeight;
    logFlushTimer = setTimeout(flushNextLogLine, LOG_LINE_DELAY_MS);
  }

  function enqueueLog(text, cls) {
    logQueue.push({ text: text, cls: cls });
    if (!logFlushTimer) {
      logFlushTimer = setTimeout(flushNextLogLine, 10);
    }
  }

  function say(lines, cls) {
    if (!Array.isArray(lines)) lines = [lines];
    for (var i = 0; i < lines.length; i++) {
      enqueueLog(lines[i], cls);
    }
  }

  function sys(text)   { enqueueLog('[system] ' + text, 'log-system'); }
  function alert_(text){ enqueueLog('[alert] ' + text, 'log-alert'); }
  function ok(text)    { enqueueLog('[ok] ' + text, 'log-ok'); }
  function divider()   { enqueueLog('───────────────────────────────────────────', 'log-divider'); }
  function spacer()    { enqueueLog('', 'log-spacer'); }

  function pickVariant(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ========== HUD ==========

  function bar(current, max, cells, fillChar, emptyChar) {
    cells = cells || BAR_CELLS;
    fillChar = fillChar || '█';
    emptyChar = emptyChar || '░';
    var ratio = Math.max(0, Math.min(1, current / max));
    var filled = Math.round(ratio * cells);
    return fillChar.repeat(filled) + emptyChar.repeat(cells - filled);
  }

  function cashBar(cash, target) {
    var ratio = Math.max(0, Math.min(1, cash / target));
    var cells = BAR_CELLS;
    var filled = Math.round(ratio * cells);
    return '$'.repeat(filled) + '░'.repeat(cells - filled);
  }

  function leadsBar(leads, target) {
    var cells = BAR_CELLS;
    var filled = Math.min(cells, leads);
    return '●'.repeat(filled) + '○'.repeat(cells - filled);
  }

  function projectsBar(progress) {
    return bar(progress, 100, BAR_CELLS, '█', '░');
  }

  function nextRentTarget() {
    return STATE._passive_rent_done ? 0 : 500;
  }

  function nextUnlockHint() {
    if (!STATE.lamp_on) return 'next: [ ] включить лампу';
    if (STATE.delivered_projects >= 3) return 'next: [ ] закрыть ноутбук — финал';
    if (STATE.notebook_available && !STATE.lead_submitted) {
      return 'next: [ ] открыть блокнот — написать тиму (разблокирует автоматизацию)';
    }
    if (STATE.active_projects.length > 0) {
      var p = STATE.active_projects[0];
      return 'next: [ ] работать над проектом #' + p.id + ' · ' + p.progress + '%';
    }
    if (STATE.qualified_leads >= 1) {
      return 'next: [ ] взять проект — у тебя есть квалифицированный лид';
    }
    if (STATE.leads >= 1) {
      return 'next: [ ] qualification — проверить лид перед договором';
    }
    if (STATE.hours >= COST.reach_out.h && STATE.energy >= COST.reach_out.e) {
      return 'next: [ ] написать в холодную — нужны лиды';
    }
    if (STATE.energy < 25) return 'next: [ ] отдохнуть — энергия на нуле';
    return 'next: [ ] закрыть ноутбук — новый день';
  }

  function renderHud() {
    // Line 1: prompt + day counter
    var $l1 = $('#hud-line1').empty();
    $l1.append($('<span class="prompt">').text('marina@studio ~$ '));
    $l1.append($('<span class="title">').text('day ' + STATE.day + ' / ' + FINALE_DAY));
    if (STATE.automation_active) {
      $l1.append($('<span class="auto-badge">').text('  auto: +0.5/day'));
    }
    if (STATE.coffee_stacks > 0) {
      $l1.append($('<span class="coffee-badge">').text(
        '  coffee: ' + '▰'.repeat(STATE.coffee_stacks) + '▱'.repeat(Math.max(0, 3 - STATE.coffee_stacks))
      ));
    }

    // Line 2: hours + energy
    var $l2 = $('#hud-line2').empty();
    var hoursBar = bar(STATE.hours, HOURS_PER_DAY);
    var energyBar = bar(STATE.energy, 100);
    var energyCls = 'stat-energy';
    if (STATE.energy < 25) energyCls += ' low';
    else if (STATE.energy < 50) energyCls += ' mid';
    $l2.append($('<span class="stat-label">').text('hours '));
    $l2.append($('<span class="bar">').text('[' + hoursBar + ']'));
    $l2.append($('<span class="stat-num">').text(' ' + Math.floor(STATE.hours) + '/' + HOURS_PER_DAY));
    $l2.append($('<span class="sep">').text('   '));
    $l2.append($('<span class="stat-label">').text('energy '));
    $l2.append($('<span class="bar ' + energyCls + '">').text('[' + energyBar + ']'));
    $l2.append($('<span class="stat-num ' + energyCls + '">').text(' ' + Math.floor(STATE.energy) + '/100'));

    // Line 3: cash + leads
    var $l3 = $('#hud-line3').empty();
    var rentTarget = nextRentTarget() || 500;
    var cashBarStr = cashBar(STATE.cash, rentTarget);
    var cashCls = 'stat-cash';
    if (STATE.cash < 0) cashCls += ' neg';
    else if (STATE.cash < 200) cashCls += ' low';
    var cashDisplay = STATE.cash < 0 ? '-$' + Math.abs(STATE.cash) : '$' + STATE.cash;
    var target = 3;
    $l3.append($('<span class="stat-label">').text('cash  '));
    $l3.append($('<span class="bar ' + cashCls + '">').text('[' + cashBarStr + ']'));
    $l3.append($('<span class="stat-num ' + cashCls + '">').text(' ' + cashDisplay));
    $l3.append($('<span class="sep">').text('   '));
    $l3.append($('<span class="stat-label">').text('leads '));
    $l3.append($('<span class="bar">').text('[' + leadsBar(STATE.leads + STATE.qualified_leads, target) + ']'));
    $l3.append($('<span class="stat-num">').text(' ' + STATE.leads + 'l ' + STATE.qualified_leads + 'q · done ' + STATE.delivered_projects + '/3'));

    // Line 4: next-unlock hint
    $('#hud-hint').text(nextUnlockHint());

    // Active projects (if any)
    var $proj = $('#hud-projects').empty();
    if (STATE.active_projects.length > 0) {
      for (var i = 0; i < STATE.active_projects.length; i++) {
        var p = STATE.active_projects[i];
        var line = 'project #' + p.id + ' ' + p.client + '  [' + projectsBar(p.progress) + '] ' + p.progress + '%';
        $proj.append($('<div class="project-line">').text(line));
      }
    }
  }

  function flashDelta(cssSel, value, positive) {
    var sign = positive ? '+' : '';
    var $el = $('<span class="delta-flash">').addClass(positive ? 'pos' : 'neg').text(sign + value);
    var $host = $(cssSel);
    if ($host.length) {
      $host.append($el);
      setTimeout(function () { $el.addClass('fade'); }, 20);
      setTimeout(function () { $el.remove(); }, 1500);
    }
  }

  // ========== status indicator ==========

  var statusInterval = null;
  var spinnerFrames = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';
  var spinnerFrame = 0;

  function showStatus(actionName) {
    var $status = $('#status-line');
    $status.empty().show();
    var verbs = STATUS_VERBS[actionName] || ['работает'];
    var verb = pickVariant(verbs);
    var tone = energyTone(STATE.energy);
    var $spinner = $('<span class="spinner">').text(spinnerFrames[0]);
    $status.append($spinner);
    $status.append($('<span class="status-text">').text(' marina ' + tone + verb + '...'));
    spinnerFrame = 0;
    statusInterval = setInterval(function () {
      spinnerFrame = (spinnerFrame + 1) % spinnerFrames.length;
      $spinner.text(spinnerFrames[spinnerFrame]);
    }, STATUS_SPINNER_MS);
  }

  function hideStatus() {
    if (statusInterval) { clearInterval(statusInterval); statusInterval = null; }
    $('#status-line').hide().empty();
  }

  // ========== cooldown system ==========

  var cooldownActive = false;

  function startCooldown(buttonEl, durationSec, onComplete) {
    if (!durationSec || durationSec <= 0) {
      if (onComplete) onComplete();
      return;
    }
    cooldownActive = true;
    var $btn = $(buttonEl);
    $btn.addClass('action-disabled');
    // disable all action buttons during cooldown
    $('.action-btn').attr('disabled', 'disabled');
    var $cd = $('<div class="action-cooldown">').css('width', '100%');
    $btn.append($cd);
    // force reflow
    $cd[0].offsetWidth;
    $cd.css({
      'transition': 'width ' + durationSec + 's linear',
      'width': '0%'
    });
    setTimeout(function () {
      $btn.removeClass('action-disabled');
      $cd.remove();
      cooldownActive = false;
      $('.action-btn').removeAttr('disabled');
      if (onComplete) onComplete();
    }, durationSec * 1000);
  }

  // ========== contract helpers ==========

  var nextProjectId = 1;

  function createProject() {
    var clientNames = [
      'лендинг saas',
      'бриф dtc',
      'email-серия',
      'кейс-стади',
      'reels-пакет',
      'brand guide'
    ];
    var p = {
      id: nextProjectId++,
      client: pickVariant(clientNames),
      progress: 0,
      final_payment: 350 + Math.floor(Math.random() * 151), // 350-500
      started_day: STATE.day
    };
    STATE.active_projects.push(p);
    return p;
  }

  function progressOldestProject(amount) {
    if (STATE.active_projects.length === 0) return null;
    var p = STATE.active_projects[0];
    p.progress = Math.min(100, p.progress + amount);
    return p;
  }

  function checkAutoDelivery() {
    var delivered = [];
    STATE.active_projects = STATE.active_projects.filter(function (p) {
      if (p.progress >= 100) {
        delivered.push(p);
        return false;
      }
      return true;
    });
    delivered.forEach(function (p) {
      STATE.cash += p.final_payment;
      STATE.delivered_projects += 1;
      spacer();
      ok('проект #' + p.id + ' сдан. клиент принял. вторая половина на счёте.');
      enqueueLog('+$' + p.final_payment + ' · проект #' + p.id, 'log-ok');
      flashDelta('#hud-line3', p.final_payment, true);
    });
  }

  // ========== beats (narrative, no money mutations) ==========

  function beatIntro() {
    if (STATE.beat_intro) return;
    STATE.beat_intro = true;
    say([
      'пусто.',
      'тихо.',
      'батарейка ноутбука на 20%.',
      '',
      '«никому не нужно то, что я умею. это просто я думаю, что нужно».',
      '',
      'марина вздыхает и тянется к настольной лампе.'
    ]);
  }

  function beatLena() {
    if (STATE.beat_lena) return;
    STATE.beat_lena = true;
    spacer();
    sys('входящее: лена');
    say([
      '«эй, подруга. услышала что ты ушла из агентства.',
      ' первая неделя всегда самая тяжёлая — я была там.',
      ' через пару дней скину контакты. держись».'
    ]);
  }

  function beatAnna() {
    if (STATE.beat_anna) return;
    STATE.beat_anna = true;
    spacer();
    sys('входящее: анна (по рекомендации лены)');
    say([
      '«привет. лена про тебя рассказала.',
      ' у меня небольшой проект — двустраничник,',
      ' бюджет скромный: $300 upfront + $350 на сдаче.',
      ' если готова быстро — берём?»'
    ]);
    STATE.pending_choice = 'anna_first';
  }

  function beatTimNotebook() {
    if (STATE.beat_tim) return;
    STATE.beat_tim = true;
    STATE.notebook_available = true;
    spacer();
    sys('входящее: лена');
    say([
      '«слушай. у меня есть знакомый — тим.',
      ' он сейчас в каше, помогает founders',
      ' распутывать работу. не продаёт ничего',
      ' конкретного — просто смотрит что у тебя',
      ' на столе и говорит что можно убрать.',
      '',
      ' одна девочка из моего потока на третий',
      ' раз после разговора с ним наконец-то',
      ' перестала работать по ночам.',
      '',
      ' если хочешь — открой блокнот, запиши'
    ]);
    say([' что сейчас жрёт больше всего времени.', ' он прочитает в тот же день».']);
    spacer();
    divider();
    enqueueLog('тим / каш / помогает распутывать работу', 'log-divider');
    divider();
    spacer();
    sys('доступно: открыть блокнот');
  }

  function beatTimRetry() {
    if (STATE.beat_tim_retry) return;
    if (STATE.lead_submitted) return;
    STATE.beat_tim_retry = true;
    spacer();
    sys('входящее: лена');
    say([
      '«тим снова передавал привет.',
      ' говорит, если передумаешь — блокнот на столе».'
    ]);
  }

  function beatFoodDoubt() {
    if (STATE.beat_food) return;
    STATE.beat_food = true;
    spacer();
    say([
      'в супермаркете стоишь в отделе круп и считаешь в уме.',
      'в 31 год. после четырёх лет карьеры. над крупой.'
    ]);
  }

  function beatAnnaReferral() {
    if (STATE.beat_anna_referral) return;
    STATE.beat_anna_referral = true;
    spacer();
    sys('входящее: анна');
    say([
      '«эй. я тебя везде рекомендую.',
      ' у коллеги задача — скоро напишет.',
      ' если сработаетесь — будет ещё пара».'
    ]);
    STATE.leads += 2;
    ok('+2 лида от анны');
  }

  function beatRent() {
    if (STATE.beat_rent) return;
    STATE.beat_rent = true;
    spacer();
    say([
      'простая цифра. ни тревоги, ни облегчения. баланс.',
      'просто баланс, который каждый месяц показывает,',
      'что ты — всё ещё здесь.'
    ]);
  }

  function beatTimReturn() {
    if (STATE.beat_tim_return) return;
    if (!STATE.lead_submitted) return;
    STATE.beat_tim_return = true;
    spacer();
    sys('входящее: тим');
    say([
      '«почти две недели прошло.',
      ' qualification работает? видишь кто реальный?',
      ' если упрёшься во что-то — пиши лично».'
    ]);
  }

  function beatLenaRetryDay9() {
    if (STATE.beat_lena_retry_day9) return;
    if (STATE.lead_submitted) return;
    STATE.beat_lena_retry_day9 = true;
    spacer();
    sys('входящее: лена');
    say([
      '«слушай, тим всё ещё спрашивает про тебя.',
      ' у него как раз bootcamp запускается — попросил',
      ' сказать. если передумаешь — блокнот у тебя».'
    ]);
  }

  var BEATS = {
    2:  [beatLena],
    4:  [beatAnna],
    5:  [beatTimNotebook],
    6:  [beatFoodDoubt],
    7:  [beatTimRetry],
    8:  [beatAnnaReferral],
    9:  [beatLenaRetryDay9],
    10: [beatRent],
    11: [beatTimReturn]
  };

  function fireBeatsForDay(day) {
    var beats = BEATS[day];
    if (!beats) return;
    for (var i = 0; i < beats.length; i++) {
      try { beats[i](); } catch (e) {}
    }
  }

  // ========== passive costs (single source) ==========

  function processPassive(day) {
    if (day === 6 && !STATE._passive_food_done) {
      STATE._passive_food_done = true;
      STATE.cash -= 200;
      sys('-$200 · магазин');
      flashDelta('#hud-line3', 200, false);
    }
    if (day === 10 && !STATE._passive_rent_done) {
      STATE._passive_rent_done = true;
      STATE.cash -= 500;
      sys('-$500 · аренда. смс от банка');
      flashDelta('#hud-line3', 500, false);
    }
    // Automation passive leads
    if (STATE.automation_active) {
      STATE.automation_accumulator += 0.5;
      if (STATE.automation_accumulator >= 1) {
        var intGain = Math.floor(STATE.automation_accumulator);
        STATE.automation_accumulator -= intGain;
        STATE.leads += intGain;
        sys('[auto] +' + intGain + ' лид из automation pipeline');
        flashDelta('#hud-line3', intGain, true);
      }
    }
    // Coffee decay
    if (STATE.coffee_stacks > 0) {
      STATE.coffee_stacks = Math.max(0, STATE.coffee_stacks - 1);
    }
    // Lena lifeline (reactive)
    if (STATE.cash < 0 && !STATE.lena_lifeline_used) {
      STATE.lena_lifeline_used = true;
      STATE.cash += 300;
      spacer();
      sys('входящее: лена');
      say([
        '«подруга. у меня есть $300 на пару недель.',
        ' не спорь. отдашь как сможешь».'
      ]);
      ok('+$300 · лена');
      flashDelta('#hud-line3', 300, true);
    }
  }

  // ========== actions ==========

  function canAct() {
    return !STATE.ending_seen && !STATE.pending_choice && !cooldownActive;
  }

  function spendActionBase(action) {
    var c = COST[action];
    if (!c) return;
    STATE.hours = Math.max(0, STATE.hours - c.h);
    STATE.energy = Math.max(0, STATE.energy - c.e - PASSIVE_ENERGY_WEAR);
  }

  var ACTIONS = {
    lamp: {
      label: 'включить лампу',
      group: 'main',
      visible: function () { return !STATE.lamp_on; },
      enabled: function () { return canAct(); },
      perform: function () {
        STATE.lamp_on = true;
        spacer();
        say([
          'свет. кабинет вдруг стал теснее и конкретнее.',
          'ноутбук открыт. почта открыта. чат пуст.'
        ]);
        spacer();
        sys('день 1. 100 часов впереди');
      }
    },

    reach_out: {
      label: 'написать в холодную (25ч, 10e)',
      group: 'main',
      visible: function () { return STATE.lamp_on; },
      enabled: function () { return canAct() && STATE.hours >= COST.reach_out.h && STATE.energy >= COST.reach_out.e + PASSIVE_ENERGY_WEAR; },
      perform: function () {
        spendActionBase('reach_out');
        STATE.reach_out_total += 1;

        // Newbie bamboozle: first 3 guaranteed ≥1 lead
        var guaranteed = STATE.reach_out_total <= 3;
        // Pity timer: 3+ consecutive misses → guaranteed hit
        var pity = STATE.reach_out_misses >= 3;
        var bucket;
        if (guaranteed || pity) {
          bucket = 1;
          STATE.reach_out_misses = 0;
        } else {
          var roll = Math.random();
          var e = STATE.energy;
          if (e >= 70)      bucket = roll < 0.35 ? 0 : 1;
          else if (e >= 40) bucket = roll < 0.50 ? 0 : 1;
          else              bucket = roll < 0.75 ? 0 : 1;
          if (bucket === 0) STATE.reach_out_misses += 1;
          else              STATE.reach_out_misses = 0;
        }

        spacer();
        enqueueLog('> reach_out --cold', 'log-prompt');
        if (bucket === 0) {
          say(pickVariant(REACH_OUT_VARIANTS.miss));
        } else {
          say(pickVariant(REACH_OUT_VARIANTS.hit));
          STATE.leads += 1;
          ok('+1 лид');
          flashDelta('#hud-line3', 1, true);
        }
      }
    },

    rest: {
      label: 'отдохнуть (20ч → +30 энергии)',
      group: 'maintenance',
      visible: function () { return STATE.lamp_on; },
      enabled: function () { return canAct() && STATE.hours >= COST.rest.h && STATE.energy < 100; },
      perform: function () {
        STATE.hours -= COST.rest.h;
        STATE.coffee_stacks += 1;

        var gain;
        var variant;
        if (STATE.coffee_stacks >= 4) {
          gain = 10;
          variant = pickVariant(REST_VARIANTS.overdose);
        } else {
          gain = 30;
          variant = pickVariant(REST_VARIANTS.normal);
        }

        STATE.energy = Math.min(100, STATE.energy + gain);

        spacer();
        enqueueLog('> rest', 'log-prompt');
        say(variant);
        if (gain >= 30) ok('+' + gain + ' энергии');
        else            alert_('кофе перелит · +' + gain + ' энергии');
        flashDelta('#hud-line2', gain, true);
      }
    },

    qualification: {
      label: 'квалифицировать лид (10ч, 5e)',
      group: 'main',
      visible: function () { return STATE.lamp_on && STATE.qualification_unlocked; },
      enabled: function () { return canAct() && STATE.leads >= 1 && STATE.hours >= COST.qualification.h && STATE.energy >= COST.qualification.e + PASSIVE_ENERGY_WEAR; },
      perform: function () {
        spendActionBase('qualification');
        STATE.leads -= 1;
        STATE.qualified_leads += 1;
        spacer();
        enqueueLog('> qualification --next', 'log-prompt');
        say(pickVariant(QUALIFICATION_VARIANTS));
        ok('лид квалифицирован · можно брать проект');
      }
    },

    take_project: {
      label: 'взять проект (10ч, нужен квалифицированный лид)',
      group: 'main',
      visible: function () { return STATE.lamp_on && STATE.beat_anna; },
      enabled: function () {
        var hasQualified = STATE.qualified_leads >= 1 || (!STATE.qualification_unlocked && STATE.leads >= 1);
        return canAct() && hasQualified && STATE.hours >= COST.take_project.h;
      },
      perform: function () {
        spendActionBase('take_project');
        if (STATE.qualification_unlocked && STATE.qualified_leads >= 1) {
          STATE.qualified_leads -= 1;
        } else if (STATE.leads >= 1) {
          STATE.leads -= 1;
        }

        var p = createProject();
        STATE.cash += 150;

        spacer();
        enqueueLog('> take_project --client=' + p.client, 'log-prompt');
        say(pickVariant(TAKE_PROJECT_VARIANTS));
        ok('+$150 upfront · проект #' + p.id + ' · финал $' + p.final_payment);
        flashDelta('#hud-line3', 150, true);
      }
    },

    work_on_project: {
      label: 'работать над проектом (20ч, 10e, +50% прогресс)',
      group: 'main',
      visible: function () { return STATE.lamp_on && STATE.active_projects.length > 0; },
      enabled: function () { return canAct() && STATE.active_projects.length > 0 && STATE.hours >= COST.work_on_project.h && STATE.energy >= COST.work_on_project.e + PASSIVE_ENERGY_WEAR; },
      perform: function () {
        spendActionBase('work_on_project');
        var p = progressOldestProject(50);
        spacer();
        enqueueLog('> work --project=' + p.id, 'log-prompt');
        say(pickVariant(WORK_ON_PROJECT_VARIANTS));
        ok('проект #' + p.id + ' · прогресс ' + p.progress + '%');
        checkAutoDelivery();
      }
    },

    open_notebook: {
      label: 'открыть блокнот (написать тиму)',
      group: 'main',
      visible: function () { return STATE.notebook_available && !STATE.lead_submitted; },
      enabled: function () { return canAct(); },
      perform: function () {
        spacer();
        enqueueLog('> open notebook', 'log-prompt');
        mountInlineForm();
      }
    },

    end_day: {
      label: 'закрыть ноутбук (конец дня)',
      group: 'advance',
      visible: function () { return STATE.lamp_on; },
      enabled: function () { return canAct(); },
      perform: function () {
        spacer();
        enqueueLog('> end_day', 'log-prompt');

        var summary = '— конец дня ' + STATE.day + ' · $' + STATE.cash +
                      ' · ' + (STATE.leads + STATE.qualified_leads) + ' лидов · ' +
                      STATE.delivered_projects + '/3 сдано —';
        say(summary);

        STATE.day += 1;
        STATE.hours = HOURS_PER_DAY;
        STATE.energy = Math.min(100, STATE.energy + 20);

        if (STATE.day > FINALE_DAY) {
          STATE.day = FINALE_DAY;
          triggerFinale();
          return;
        }

        spacer();
        sys('день ' + STATE.day + ' начался. 100 часов впереди');

        fireBeatsForDay(STATE.day);
        processPassive(STATE.day);
      }
    }
  };

  function fireAction(actionName) {
    var a = ACTIONS[actionName];
    if (!a || !a.enabled()) return;
    a.perform();
    if (STATE.delivered_projects >= 3 && !STATE.ending_seen && STATE.day >= FINALE_DAY - 2) {
      // auto-trigger end
    }
    save();
    // Re-render after cooldown finishes (inside startCooldown callback)
  }

  // ========== choice handling (Anna first deal) ==========

  function renderChoice() {
    var $actions = $('#actions').empty();
    if (STATE.pending_choice === 'anna_first') {
      var $take = $('<button>').attr('type', 'button').addClass('action-btn').text('взять проект (первый клиент)');
      $take.on('click', function () {
        STATE.pending_choice = null;
        // Guaranteed qualified lead + create project directly
        STATE.qualified_leads += 1;
        spacer();
        say([
          '«ура. договор отправлен. первая половина — $150 — уже упала».',
          '',
          'марина открывает notion, создаёт новую страницу: "проект анны".',
          'это первый настоящий контракт. не внутренний. не от руководителя.',
          'именно подрядчица подписала подрядчицу.'
        ]);
        ok('+1 квалифицированный лид от анны · бери проект');
        save();
        render();
      });

      var $decline = $('<button>').attr('type', 'button').addClass('action-btn').text('отказать (слишком быстро)');
      $decline.on('click', function () {
        STATE.pending_choice = null;
        spacer();
        say([
          'отвечаешь «не сейчас». через полчаса жалеешь.',
          'но уже поздно. лена поймёт.'
        ]);
        save();
        render();
      });

      $actions.append($take).append($decline);
    }
  }

  // ========== inline lead form ==========

  function mountInlineForm() {
    if (!window.MarinaLead || typeof window.MarinaLead.mountInline !== 'function') {
      sys('ошибка: lead модуль не загружен');
      return;
    }
    var $log = $('#log');
    var $formHost = $('<div>').attr('id', 'inline-lead-form');
    $log.append($formHost);
    document.getElementById('log').scrollTop = document.getElementById('log').scrollHeight;

    window.MarinaLead.mountInline($formHost, {
      archetype: 'marina-v16a',
      source: 'marina-v-ogne',
      onSuccess: function () {
        STATE.lead_submitted = true;
        STATE.automation_active = true;
        // Instant buff
        STATE.leads += 2;
        STATE.cash += 200;
        STATE.energy = Math.min(100, STATE.energy + 15);

        spacer();
        ok('блокнот закрыт. тим получил запись');
        spacer();
        sys('входящее: тим, через час');
        say([
          '«прочитал. спасибо что без фильтров.',
          '',
          ' три вещи которые я бы сделал завтра утром:',
          '',
          ' 1. разложить почту по воронке.',
          '    cold / качественный / в работе / сдано.',
          ' 2. срезать одну мёртвую задачу из списка —',
          '    ту, которую откладываешь четвёртый день.',
          ' 3. забронировать два часа без чата и почты.',
          '    просто писать одно дело.',
          '',
          ' закину пару шаблонов — и увидишь эффект».'
        ]);
        spacer();
        ok('+2 лида · +$200 · +15 энергии');
        ok('сдвиг почувствуется: часть холодки теперь идёт сама (+0.5 лида/день)');
        flashDelta('#hud-line3', 200, true);
        save();
        render();
      },
      onCancel: function () {
        spacer();
        sys('блокнот закрыт без записи');
        render();
      }
    });
  }

  // ========== finale ==========

  function triggerFinale() {
    STATE.ending_seen = true;
    save();

    var isA = (STATE.delivered_projects >= 3 && STATE.cash >= 0 && STATE.energy >= 25);

    $('#actions').empty();
    renderHud();

    var $game = $('#game');
    var $ending = $('#ending');
    $ending.empty();

    var linesA = [
      '',
      'прошло 12 дней.',
      '',
      STATE.delivered_projects + ' проекта сданы.',
      'на счету $' + STATE.cash + '.',
      'энергия есть. силы есть.',
      '',
      'ты не сгорела. и это не победа.',
      'это день двенадцатый из долгой работы.',
      '',
      'но теперь ты знаешь: дальше можно.'
    ];

    var linesB = [
      '',
      'прошло 12 дней.',
      '',
      STATE.delivered_projects + ' проекта сданы.',
      'что-то не получилось. не ты. формат.',
      '',
      'первая студия — часто не студия.',
      'это испытание.',
      '',
      'эта игра заканчивается.',
      'но второй шанс — не в игре.'
    ];

    var lines = isA ? linesA : linesB;
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      var $p = $('<div>').addClass('ending-line').text(l);
      if (l === '') $p.addClass('log-spacer');
      $ending.append($p);
    }

    $ending.append($('<div>').addClass('ending-line ending-divider').text('— — —'));

    if (STATE.lead_submitted) {
      $ending.append($('<div>').addClass('ending-line ending-cta').text(
        'тим видел твой блокнот. напиши в @timofeyzinin — договоримся про следующие 12 дней.'
      ));
      var $link = $('<a>')
        .attr('href', 'https://t.me/timofeyzinin')
        .attr('target', '_blank')
        .attr('rel', 'noopener')
        .addClass('ending-link')
        .text('→ открыть telegram @timofeyzinin');
      $ending.append($link);
    } else {
      $ending.append($('<div>').addClass('ending-line ending-cta').text(
        'у тебя есть 30 секунд рассказать тиму что горит. он ответит сегодня.'
      ));
      var $formHost = $('<div>').attr('id', 'ending-lead-form-host');
      $ending.append($formHost);
      if (window.MarinaLead) {
        window.MarinaLead.mountInline($formHost, {
          archetype: 'marina-v16a',
          source: 'marina-v-ogne',
          finaleMode: true,
          onSuccess: function () {
            STATE.lead_submitted = true;
            save();
            $formHost.empty().append($('<div>').addClass('ending-line ending-cta').text(
              'спасибо. тим ответит сегодня.'
            ));
          }
        });
      }
    }

    $game.hide();
    $ending.show();
    document.title = 'финал · Марина в огне';
    window.scrollTo(0, 0);
  }

  // ========== render ==========

  function render() {
    renderHud();
    if (STATE.ending_seen) return;
    if (STATE.pending_choice) {
      renderChoice();
      return;
    }
    var $actions = $('#actions').empty();

    var groups = { main: [], maintenance: [], advance: [] };
    for (var name in ACTIONS) {
      var a = ACTIONS[name];
      if (!a.visible()) continue;
      groups[a.group || 'main'].push(name);
    }

    function makeBtn(name) {
      var a = ACTIONS[name];
      var $btn = $('<button>')
        .attr('type', 'button')
        .attr('data-action', name)
        .addClass('action-btn')
        .addClass('action-' + (a.group || 'main'))
        .text(a.label);
      if (!a.enabled()) $btn.attr('disabled', 'disabled');
      return $btn;
    }

    if (groups.main.length) {
      var $mg = $('<div class="action-group action-group-main">');
      groups.main.forEach(function (n) { $mg.append(makeBtn(n)); });
      $actions.append($mg);
    }
    if (groups.maintenance.length) {
      var $mn = $('<div class="action-group action-group-maintenance">');
      groups.maintenance.forEach(function (n) { $mn.append(makeBtn(n)); });
      $actions.append($mn);
    }
    if (groups.advance.length) {
      var $av = $('<div class="action-group action-group-advance">');
      groups.advance.forEach(function (n) { $av.append(makeBtn(n)); });
      $actions.append($av);
    }
  }

  function save() { saveState(); }

  // ========== init ==========

  function init() {
    if (!sessionStorage.getItem(SESSION_KEY)) {
      sessionStorage.setItem(SESSION_KEY, String(Date.now()));
    }

    STATE = loadState();

    // Resume highest active project id counter
    if (STATE.active_projects && STATE.active_projects.length) {
      var maxId = STATE.active_projects.reduce(function (m, p) { return Math.max(m, p.id); }, 0);
      nextProjectId = maxId + 1;
    }

    if (STATE.ending_seen) {
      renderHud();
      triggerFinale();
      return;
    }

    if (!STATE.lamp_on) {
      beatIntro();
    } else {
      say(['', '(продолжаем. день ' + STATE.day + ' / ' + FINALE_DAY + ')']);
    }

    render();

    $('#actions').on('click', '.action-btn[data-action]', function () {
      if (cooldownActive) return;
      var $btn = $(this);
      var name = $btn.attr('data-action');
      var a = ACTIONS[name];
      if (!a || !a.enabled()) return;

      var cd = COOLDOWN[name] || 0;
      if (cd > 0) {
        showStatus(name);
        startCooldown(this, cd, function () {
          hideStatus();
          a.perform();
          save();
          render();
        });
      } else {
        a.perform();
        save();
        render();
      }
    });

    $('#reset-link').on('click', function (e) {
      e.preventDefault();
      if (confirm('начать заново? текущий прогресс удалится.')) {
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
    _forceDay: function (day) {
      STATE.day = Math.min(FINALE_DAY, Math.max(1, parseInt(day, 10) || 1));
      STATE.hours = HOURS_PER_DAY;
      save(); render();
    },
    _forceEnding: function () {
      STATE.day = FINALE_DAY;
      triggerFinale();
    }
  };

  $(function () { init(); });
})();
