/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Derivative work based on A Dark Room by Michael Townsend
 * (github.com/doublespeakgames/adarkroom, MPL-2.0).
 *
 * «Марина в огне» — minimal incremental text sim about a founder's
 * first days. Implementation (c) 2026 Tim Zinin.
 */

(function () {
  'use strict';

  var STATE_KEY = 'marina-fire:v1:state';
  var VERSION_KEY = 'marina-fire:v1:version';
  var VERSION = '1.0.0';
  var SESSION_KEY = 'marina-fire:session_started_at';

  var DAY_DURATION_MS = 30000; // 30s = 1 day
  var HOURS_PER_DAY = 100;

  var STATE;

  // ---------- narrative copy ----------

  var COPY = {
    intro: [
      'пусто. тихо.',
      'батарейка ноутбука на 20%.',
      'марина смотрит на экран.',
      '',
      '«никому не нужно то, что я умею. это просто я думаю, что нужно.»',
      '',
      'она вздыхает и включает настольную лампу.'
    ],
    day_start: [
      '',
      '— день {day}. —',
      '100 часов впереди. что делать первым.'
    ],
    reach_out_good: [
      'написала в холодную. одному ответили: «давайте созвон завтра в 14».',
      'один человек откликнулся. «сколько стоит?» — это похоже на начало.',
      'написала двадцать сообщений. два дошли куда надо.',
      'кто-то из старых коллег скинул контакт. «попробуй, ей как раз нужно».'
    ],
    reach_out_ok: [
      'написала. один из ответов — «вернёмся через пару дней». засчитываем.',
      'никто не ответил. зато есть вот этот — из альтернативного канала.',
      'холодный запрос → тёплый ответ. так и пишется биография.'
    ],
    reach_out_meh: [
      'часы ушли. ответов нет. так тоже бывает.',
      'никто. тишина. закрыла ноутбук, открыла обратно.',
      'зря. все чаты молчат.',
      'отправила двенадцать писем. одно вернулось — «not delivered». хороший знак.'
    ],
    reach_out_bad: [
      'буквы расплываются. марина перечитывает три раза, сдаётся, ничего не отправляет.',
      'написала «извините», передумала. день провалился.',
      'голова не варит. закрыла почту.'
    ],
    rest_locked_hint: [
      'надо бы выключиться. но — «ещё пару писем». ещё пару. ещё.'
    ],
    rest_done: [
      'налила кофе. дала ему остыть. двадцать минут — в окно.',
      'прилегла. не спала, но выключилась на полчаса.',
      'вышла в магазин. вернулась — мир немного другой.'
    ],
    end_day_normal: [
      'закрыла ноутбук. завтра.',
      'день закончился. рабочее окно закрывается.',
      'свет в кабинете выключен. до утра.'
    ],
    hire_unlock: [
      '',
      'три человека ответили «давайте поговорим». один даже перезвонил.',
      'теперь возможно нанять первого помощника — если хватит часов и лидов.'
    ],
    hire_done: [
      '',
      'первый сотрудник. в договоре написано «контент-менеджер», но на деле — всё.',
      '— «вы точно хотите меня, а не кого-то с опытом?»',
      '— «опыт заработается. мне нужен кто-то, кто не сбежит за неделю.»',
      '',
      'теперь есть кого попросить выйти на холодные контакты.'
    ],
    delegate_good: [
      'сотрудник написал в холодную. два ответа. один — с вопросом: «можно созвон?».',
      'новенький молодец. нашёл старого клиента, который сейчас в активном поиске.',
      'хороший заход. команда работает, ты не одна.'
    ],
    delegate_ok: [
      'сотрудник написал. один ответ. хорошо.',
      'команда делает работу. ты пока смотришь в окно.',
      'тишина, но не та, что изнутри. внешняя.'
    ],
    delegate_meh: [
      'ничего не вышло. зато не ты это делала.',
      'сотрудник отписался: «никто не отвечает». — «тоже нормально».',
      'день работает сам по себе. результат — ноль.'
    ],
    forced_sleep: [
      '',
      'марина закрывает глаза за клавиатурой. просыпается через четыре часа с отпечатком q-w-e-r-t-y на щеке.',
      'половина дня ушла. ничего не поделаешь — энергия была на нуле.'
    ],
    tim_intro: [
      '',
      'в дверь кабинета стучат. заходит немолодой мужчина с термосом.',
      '',
      '— «извините, я искал соседнюю дверь. а ваша открыта. я тут по воде».',
      '— «нет воды».',
      '— «я вижу».',
      '',
      'он смотрит на стол.',
      '',
      '— «знакомая сцена. я свою первую студию открывал в каше, турция. потом в москве. потом снова в каше. лампа, ноутбук, ощущение что ты дура, что это не работа».',
      '— «вы кто?»',
      '— «тим. оставлю визитку. не читайте сегодня. прочтите, когда устанете настолько, что перестанете отвечать на сообщения».',
      '',
      '— «и ещё: налей кофе. дай воде остыть. сядь у окна и не делай ничего двадцать минут. без этого не дойдёшь».',
      '',
      '(+5 часов · +1 лид · открыт отдых)'
    ],
    pressure_event: [
      '',
      'телефон вибрирует: «добрый день, вы нам писали. можно обсудить?»',
      'сердце уходит в пятки. потом возвращается.',
      '(+1 лид)'
    ],
    energy_warning: [
      '',
      'марина поймала себя на мысли: «я в последний раз ела? вчера? позавчера?»',
      'звоночек. лёгкий.'
    ],
    day_summary_template: function (day, leads) {
      return '— конец дня ' + day + ' · всего лидов: ' + leads + ' —';
    }
  };

  // ---------- narrative output ----------

  function say(linesOrLine) {
    var lines = Array.isArray(linesOrLine) ? linesOrLine : [linesOrLine];
    var $log = $('#log');
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var $p = $('<div>').addClass('log-line').text(line);
      if (line === '') { $p.addClass('log-spacer'); }
      $log.append($p);
    }
    // scroll into view
    var el = document.getElementById('log');
    if (el) { el.scrollTop = el.scrollHeight; }
  }

  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ---------- state ----------

  function defaultState() {
    return {
      day: 1,
      hours: HOURS_PER_DAY,
      energy: 100,
      leads: 0,
      tim_met: false,
      rest_unlocked: false,
      hire_unlocked: false,
      hire_done: false,
      delegate_unlocked: false,
      ending_seen: false,
      pressure_event_fired: false,
      energy_warning_fired: false,
      actions_taken_total: 0,
      actions_taken_today: 0,
      lamp_on: false,
      day_started_at_ms: null
    };
  }

  function saveState() {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(STATE));
      localStorage.setItem(VERSION_KEY, VERSION);
    } catch (e) {
      // ignore
    }
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STATE_KEY);
      var ver = localStorage.getItem(VERSION_KEY);
      if (raw && ver === VERSION) {
        var parsed = JSON.parse(raw);
        // merge with defaults to guard against new fields
        var d = defaultState();
        for (var k in d) {
          if (!(k in parsed)) parsed[k] = d[k];
        }
        return parsed;
      }
    } catch (e) {
      // ignore
    }
    return defaultState();
  }

  function clearState() {
    try {
      localStorage.removeItem(STATE_KEY);
      localStorage.removeItem(VERSION_KEY);
    } catch (e) {}
  }

  // ---------- hud ----------

  function renderHud() {
    $('#hud-day').text('день ' + STATE.day);
    $('#hud-hours').text(Math.max(0, Math.floor(STATE.hours)) + ' ч');
    $('#hud-energy').text(Math.max(0, Math.floor(STATE.energy)) + ' · энергия');
    $('#hud-leads').text(STATE.leads + ' · лиды');
  }

  // ---------- actions ----------

  var ACTIONS = {
    lamp: {
      label: 'включить лампу',
      cost: { hours: 0, energy: 0 },
      visible: function () { return !STATE.lamp_on; },
      enabled: function () { return true; },
      perform: function () {
        STATE.lamp_on = true;
        STATE.day_started_at_ms = Date.now();
        say(['', 'свет. кабинет вдруг стал теснее и конкретнее.', 'ноутбук открыт. почта открыта. чат пуст.']);
        say(COPY.day_start.map(function (s) { return s.replace('{day}', STATE.day); }));
        scheduleTimTrigger();
      }
    },
    reach_out: {
      label: 'написать в холодную',
      cost: { hours: 15, energy: 10 },
      visible: function () { return STATE.lamp_on; },
      enabled: function () { return STATE.hours >= 15 && STATE.energy > 0; },
      perform: function () {
        var bucket;
        var e = STATE.energy;
        var roll = Math.random();
        if (e >= 70) {
          // 10% 0, 50% 1, 40% 2
          if (roll < 0.1) bucket = 0;
          else if (roll < 0.6) bucket = 1;
          else bucket = 2;
          if (bucket === 0) say(randomFrom(COPY.reach_out_meh));
          else say(randomFrom(COPY.reach_out_good));
        } else if (e >= 40) {
          // 30% 0, 50% 1, 20% 2
          if (roll < 0.3) bucket = 0;
          else if (roll < 0.8) bucket = 1;
          else bucket = 2;
          if (bucket === 0) say(randomFrom(COPY.reach_out_meh));
          else if (bucket === 1) say(randomFrom(COPY.reach_out_ok));
          else say(randomFrom(COPY.reach_out_good));
        } else if (e >= 20) {
          // 50% 0, 40% 1, 10% 2
          if (roll < 0.5) bucket = 0;
          else if (roll < 0.9) bucket = 1;
          else bucket = 2;
          if (bucket === 0) say(randomFrom(COPY.reach_out_meh));
          else if (bucket === 1) say(randomFrom(COPY.reach_out_ok));
          else say(randomFrom(COPY.reach_out_good));
        } else {
          // 80% 0, 20% 1, 0% 2
          bucket = roll < 0.8 ? 0 : 1;
          say(randomFrom(COPY.reach_out_bad));
        }
        STATE.hours -= 15;
        STATE.energy = Math.max(0, STATE.energy - 10);
        STATE.leads += bucket;
        STATE.actions_taken_total += 1;
        STATE.actions_taken_today += 1;
        maybeTimIntro();
        maybePressureEvent();
        maybeEnergyWarning();
        maybeHireUnlock();
        maybeFirstLeadAnalytics();
      }
    },
    rest: {
      label: 'передохнуть (20 ч → +30 энергии)',
      cost: { hours: 20, energy: 0 },
      visible: function () { return STATE.rest_unlocked; },
      enabled: function () { return STATE.hours >= 20 && STATE.energy < 100; },
      perform: function () {
        STATE.hours -= 20;
        STATE.energy = Math.min(100, STATE.energy + 30);
        say(randomFrom(COPY.rest_done));
      }
    },
    hire: {
      label: 'нанять помощника (3 лида + 50 ч)',
      cost: { hours: 50, energy: 0, leads: 3 },
      visible: function () { return STATE.hire_unlocked && !STATE.hire_done; },
      enabled: function () { return STATE.hours >= 50 && STATE.leads >= 3; },
      perform: function () {
        STATE.hours -= 50;
        STATE.leads -= 3;
        STATE.hire_done = true;
        STATE.delegate_unlocked = true;
        say(COPY.hire_done);
        umami('hire_unlocked');
      }
    },
    delegate_outreach: {
      label: 'поручить команде холодные',
      cost: { hours: 10, energy: 0 },
      visible: function () { return STATE.delegate_unlocked; },
      enabled: function () { return STATE.hours >= 10; },
      perform: function () {
        var bucket;
        var roll = Math.random();
        // flatter distribution, cost no energy (team takes the burnout)
        if (roll < 0.35) bucket = 0;
        else if (roll < 0.85) bucket = 1;
        else bucket = 2;
        if (bucket === 0) say(randomFrom(COPY.delegate_meh));
        else if (bucket === 1) say(randomFrom(COPY.delegate_ok));
        else say(randomFrom(COPY.delegate_good));
        STATE.hours -= 10;
        STATE.leads += bucket;
        STATE.actions_taken_total += 1;
        STATE.actions_taken_today += 1;
      }
    },
    end_day: {
      label: 'закрыть ноутбук (конец дня)',
      cost: {},
      visible: function () { return STATE.lamp_on; },
      enabled: function () { return true; },
      perform: function () {
        say(['', COPY.day_summary_template(STATE.day, STATE.leads)]);
        say(randomFrom(COPY.end_day_normal));
        STATE.day += 1;
        STATE.hours = HOURS_PER_DAY;
        STATE.actions_taken_today = 0;
        STATE.day_started_at_ms = Date.now();
        say(COPY.day_start.map(function (s) { return s.replace('{day}', STATE.day); }));
      }
    }
  };

  // ---------- events ----------

  function scheduleTimTrigger() {
    // Tim appears after 2 reach_out actions OR 45 seconds of play, whichever first
    setTimeout(function () { maybeTimIntro(); }, 45000);
  }

  function maybeTimIntro() {
    if (STATE.tim_met) return;
    // trigger only after at least 1 action taken — so player sees the setup first
    if (STATE.actions_taken_total < 1 && (Date.now() - (STATE.day_started_at_ms || Date.now())) < 45000) return;
    STATE.tim_met = true;
    STATE.rest_unlocked = true;
    STATE.hours = Math.min(HOURS_PER_DAY, STATE.hours + 5);
    STATE.leads += 1;
    say(COPY.tim_intro);
    render();
    save();
    umami('tim_intro');
  }

  function maybePressureEvent() {
    if (STATE.pressure_event_fired) return;
    if (STATE.leads >= 5 && !STATE.hire_done) {
      STATE.pressure_event_fired = true;
      STATE.leads += 1;
      say(COPY.pressure_event);
    }
  }

  function maybeEnergyWarning() {
    if (STATE.energy_warning_fired) return;
    if (STATE.energy <= 25 && STATE.energy > 0) {
      STATE.energy_warning_fired = true;
      say(COPY.energy_warning);
    }
  }

  function maybeHireUnlock() {
    if (STATE.hire_unlocked) return;
    if (STATE.leads >= 3) {
      STATE.hire_unlocked = true;
      say(COPY.hire_unlock);
    }
  }

  var _firstLeadReported = false;
  function maybeFirstLeadAnalytics() {
    if (!_firstLeadReported && STATE.leads >= 1) {
      _firstLeadReported = true;
      umami('first_lead');
    }
  }

  function maybeForcedSleep() {
    if (STATE.energy === 0 && STATE.hours > 0) {
      say(COPY.forced_sleep);
      STATE.hours = Math.max(0, STATE.hours - 50);
      STATE.energy = 40;
    }
  }

  // ---------- ending ----------

  function checkEnding() {
    if (STATE.ending_seen) return false;
    if (STATE.leads >= 10) {
      STATE.ending_seen = true;
      umami('ending_seen');
      saveState();
      showEnding();
      return true;
    }
    return false;
  }

  function showEnding() {
    var $ending = $('#ending');
    $ending.empty();

    var endingLines = [
      '',
      'прошло ' + STATE.day + ' дней.',
      '',
      'студия тлеет. не горит ярко — тлеет. но тепло.',
      'марина смотрит на окно. за окном — другая марина. в турции, в мадриде, в каше, в шанхае.',
      'каждая из них сейчас делает одно и то же: решает, сдаться или продолжить.',
      '',
      'эта игра была не про победу.',
      'она была про то, чтобы узнать себя раньше, чем сгорит всё.',
      '',
      'если ты узнала что-то про себя за эти 10 лидов —',
      'расскажи. тим увидит.'
    ];
    for (var i = 0; i < endingLines.length; i++) {
      var l = endingLines[i];
      var $p = $('<div>').addClass('ending-line').text(l);
      if (l === '') $p.addClass('log-spacer');
      $ending.append($p);
    }

    // mount form
    if (window.MarinaLead && typeof window.MarinaLead.mountForm === 'function') {
      var $formHost = $('<div>').attr('id', 'lead-form-host').appendTo($ending);
      window.MarinaLead.mountForm($formHost, { archetype: 'marina-v1a', source: 'marina-v-ogne' });
    }

    $('#game').hide();
    $ending.show();
    document.title = 'финал · Марина в огне';
    window.scrollTo(0, 0);
  }

  // ---------- render ----------

  function render() {
    renderHud();
    var $actions = $('#actions').empty();
    for (var name in ACTIONS) {
      var a = ACTIONS[name];
      if (!a.visible()) continue;
      var enabled = a.enabled();
      var $btn = $('<button>')
        .attr('type', 'button')
        .attr('data-action', name)
        .addClass('action-btn')
        .text(a.label);
      if (!enabled) $btn.attr('disabled', 'disabled');
      $actions.append($btn);
    }
  }

  function save() {
    saveState();
  }

  // ---------- umami event helper ----------

  function umami(name) {
    try {
      if (window.umami && typeof window.umami.track === 'function') {
        window.umami.track(name);
      }
    } catch (e) {}
  }

  // ---------- init ----------

  function init() {
    if (!sessionStorage.getItem(SESSION_KEY)) {
      sessionStorage.setItem(SESSION_KEY, String(Date.now()));
    }

    STATE = loadState();
    renderHud();

    if (!STATE.lamp_on) {
      say(COPY.intro);
    } else {
      say(['', '(продолжаем с того же места. день ' + STATE.day + '.)']);
    }

    // If ending was seen, go directly to ending
    if (STATE.ending_seen) {
      showEnding();
      return;
    }

    render();
    umami('game_start');

    $('#actions').on('click', '.action-btn', function () {
      var name = $(this).attr('data-action');
      var a = ACTIONS[name];
      if (!a || !a.enabled()) return;
      a.perform();
      maybeForcedSleep();
      save();
      render();
      checkEnding();
    });

    $('#reset-link').on('click', function (e) {
      e.preventDefault();
      if (confirm('начать заново?')) {
        clearState();
        location.reload();
      }
    });
  }

  // expose for test / reset
  window.Marina = {
    init: init,
    _state: function () { return STATE; },
    _reset: clearState
  };

  $(function () { init(); });
})();
