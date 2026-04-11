/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Derivative work based on A Dark Room by Michael Townsend
 * (github.com/doublespeakgames/adarkroom, MPL-2.0).
 *
 * «Марина в огне» v1.5 — 12-day terminal-style text sim about
 * a founder's first days. Implementation (c) 2026 Tim Zinin.
 */

(function () {
  'use strict';

  // ---------- constants ----------

  var VERSION = '1.5.0';
  var STATE_KEY = 'marina-fire:v1.5:state';
  var VERSION_KEY = 'marina-fire:v1.5:version';
  var OLD_V1_KEY = 'marina-fire:v1:state';
  var OLD_V1_VERSION_KEY = 'marina-fire:v1:version';
  var SESSION_KEY = 'marina-fire:session_started_at';

  var HOURS_PER_DAY = 100;
  var FINALE_DAY = 12;
  var CLOSE_DEAL_FAIL_RATE = 0.30; // pre-Tim
  var MAX_LOG_LINES = 400;

  // ---------- state ----------

  function defaultState() {
    return {
      version: VERSION,
      day: 1,
      hours: HOURS_PER_DAY,
      energy: 100,
      cash: 500,
      leads: 0,
      // progression flags
      lamp_on: false,
      notebook_available: false,
      lead_submitted: false,
      qualification_unlocked: false,
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
      // reactive
      lena_lifeline_used: false,
      actions_today: 0,
      ending_seen: false,
      pending_choice: null
    };
  }

  var STATE;

  function loadState() {
    // cleanup old v1 keys
    try {
      localStorage.removeItem(OLD_V1_KEY);
      localStorage.removeItem(OLD_V1_VERSION_KEY);
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

  // ---------- log helpers ----------

  function logLine(text, cls) {
    var $log = $('#log');
    var $p = $('<div>').addClass('log-line').text(text);
    if (cls) $p.addClass(cls);
    if (text === '') $p.addClass('log-spacer');
    $log.append($p);
    // trim old lines
    var all = $log.children('.log-line');
    if (all.length > MAX_LOG_LINES) {
      all.slice(0, all.length - MAX_LOG_LINES).remove();
    }
    // auto-scroll
    var el = document.getElementById('log');
    if (el) el.scrollTop = el.scrollHeight;
  }

  function say(lines, cls) {
    if (!Array.isArray(lines)) lines = [lines];
    for (var i = 0; i < lines.length; i++) {
      logLine(lines[i], cls);
    }
  }

  function sys(text)   { logLine('[system] ' + text, 'log-system'); }
  function alert_(text){ logLine('[alert] ' + text, 'log-alert'); }
  function ok(text)    { logLine('[ok] ' + text, 'log-ok'); }
  function divider()   { logLine('───────────────────────────────────────────', 'log-divider'); }
  function spacer()    { logLine('', 'log-spacer'); }

  // ---------- HUD ----------

  function renderHud() {
    var $l1 = $('#hud-line1').empty();
    $l1.append($('<span class="prompt">').text('marina@studio ~$ '));
    $l1.append($('<span class="title">').text('day ' + STATE.day + ' / ' + FINALE_DAY));

    var $l2 = $('#hud-line2').empty();
    var stats = [
      { label: Math.max(0, Math.floor(STATE.hours)) + 'h', cls: 'stat stat-hours' },
      { label: Math.max(0, Math.floor(STATE.energy)) + 'e', cls: 'stat stat-energy' + (STATE.energy < 25 ? ' low' : '') },
      { label: (STATE.cash < 0 ? '-$' + Math.abs(STATE.cash) : '$' + STATE.cash), cls: 'stat stat-cash' + (STATE.cash < 0 ? ' neg' : '') },
      { label: STATE.leads + ' leads', cls: 'stat stat-leads' }
    ];
    stats.forEach(function (s) {
      $l2.append($('<span>').addClass(s.cls).text(s.label));
    });
  }

  // ---------- beats (narrative only — no money mutations) ----------

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
      '«эй, подруга. услышала, что ты ушла из агентства.',
      ' первая неделя всегда самая тяжёлая — я была там.',
      ' через пару дней скину контакты: одна девочка',
      ' ищет подрядчика на лендинг. держись».'
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
      ' бюджет скромный: $300. если готова',
      ' быстро — возьмёшь?»'
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
      ' живёт где-то в каше, турция. когда-то',
      ' я у него верстала сайт.',
      ' он не продаёт волшебных таблеток.',
      ' говорит: если хочешь, напиши ему что',
      ' сейчас горит больше всего. прочитает».'
    ]);
    spacer();
    divider();
    say('тим / каш / бывший клиент лены');
    divider();
    spacer();
    sys('доступно действие: открыть блокнот');
  }

  function beatTimRetry() {
    if (STATE.beat_tim_retry) return;
    if (STATE.lead_submitted) return;
    STATE.beat_tim_retry = true;
    spacer();
    sys('входящее: лена');
    say([
      '«тим снова передавал привет. говорит,',
      ' если передумаешь — блокнот всё ещё на столе».'
    ]);
    sys('доступно действие: открыть блокнот');
  }

  function beatFoodDoubt() {
    if (STATE.beat_food) return;
    STATE.beat_food = true;
    spacer();
    say([
      'в супермаркете ты стоишь в отделе круп и считаешь',
      'в уме: на сколько хватит.',
      '',
      'в 31 год. после 4 лет карьеры. над крупой.'
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
    ok('+2 лида');
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
      ' qualification работает?',
      ' ты уже видишь, кто реальный, а кто из воздуха».'
    ]);
  }

  // ---------- day-triggered beat dispatch ----------

  var BEATS = {
    2:  [beatLena],
    4:  [beatAnna],
    5:  [beatTimNotebook],
    6:  [beatFoodDoubt],
    7:  [beatTimRetry],
    8:  [beatAnnaReferral],
    10: [beatRent],
    11: [beatTimReturn]
  };

  // ---------- passive costs (SINGLE SOURCE) ----------

  function processPassive(day) {
    // food day 6
    if (day === 6 && !STATE._passive_food_done) {
      STATE._passive_food_done = true;
      STATE.cash -= 200;
      sys('-$200. магазин.');
    }
    // rent day 10
    if (day === 10 && !STATE._passive_rent_done) {
      STATE._passive_rent_done = true;
      STATE.cash -= 500;
      sys('-$500. аренда. смс от банка.');
    }
    // Lena lifeline (reactive, once)
    if (STATE.cash < 0 && !STATE.lena_lifeline_used) {
      STATE.lena_lifeline_used = true;
      STATE.cash += 300;
      spacer();
      sys('входящее: лена');
      say([
        '«подруга. у меня есть $300',
        ' на пару недель. не спорь.',
        ' отдашь как сможешь».'
      ]);
      ok('+$300 · лена');
    }
  }

  // ---------- actions ----------

  function canAct() {
    return !STATE.ending_seen && !STATE.pending_choice;
  }

  var ACTIONS = {
    lamp: {
      label: 'включить лампу',
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
        sys('день 1. 100 часов впереди.');
        // fire day 1 intro sequel if needed
      }
    },

    reach_out: {
      label: 'написать в холодную (15ч, 10e)',
      visible: function () { return STATE.lamp_on; },
      enabled: function () { return canAct() && STATE.hours >= 15 && STATE.energy >= 10; },
      perform: function () {
        STATE.hours -= 15;
        STATE.energy = Math.max(0, STATE.energy - 10);
        STATE.actions_today += 1;

        // RNG weighted by energy
        var roll = Math.random();
        var bucket;
        var e = STATE.energy;
        if (e >= 70) {
          bucket = roll < 0.10 ? 0 : (roll < 0.60 ? 1 : 2);
        } else if (e >= 40) {
          bucket = roll < 0.30 ? 0 : (roll < 0.80 ? 1 : 2);
        } else if (e >= 20) {
          bucket = roll < 0.50 ? 0 : (roll < 0.90 ? 1 : 2);
        } else {
          bucket = roll < 0.80 ? 0 : 1;
        }

        var flavors = [
          [
            ['> reach_out --cold', 'log-prompt'],
            ['написала десять писем. тишина.', 'log-system']
          ],
          [
            ['> reach_out --cold', 'log-prompt'],
            ['один ответил: «давайте на созвон завтра».', null]
          ],
          [
            ['> reach_out --cold', 'log-prompt'],
            ['два ответа за раз. один даже спросил про сроки.', null]
          ]
        ];
        var frames = flavors[bucket];
        spacer();
        for (var i = 0; i < frames.length; i++) {
          logLine(frames[i][0], frames[i][1] || undefined);
        }
        STATE.leads += bucket;
        if (bucket > 0) ok('+' + bucket + ' лид' + (bucket > 1 ? 'а' : ''));
      }
    },

    rest: {
      label: 'отдохнуть (20ч → +30 энергии)',
      visible: function () { return STATE.lamp_on; },
      enabled: function () { return canAct() && STATE.hours >= 20 && STATE.energy < 100; },
      perform: function () {
        STATE.hours -= 20;
        STATE.energy = Math.min(100, STATE.energy + 30);
        spacer();
        logLine('> rest', 'log-prompt');
        say('налила кофе. дала воде остыть. двадцать минут — в окно.');
        ok('+30 энергии');
      }
    },

    close_deal: {
      label: 'закрыть сделку (25ч)',
      visible: function () { return STATE.lamp_on && STATE.beat_anna; },
      enabled: function () { return canAct() && STATE.hours >= 25 && STATE.leads >= 1; },
      perform: function () {
        STATE.hours -= 25;
        STATE.leads -= 1;
        spacer();
        logLine('> close_deal', 'log-prompt');

        if (STATE.qualification_unlocked) {
          // reliable, +$400-600
          var gain = 400 + Math.floor(Math.random() * 201); // 400..600
          STATE.cash += gain;
          say([
            'созвон прошёл ровно. договор подписан,',
            'первая часть сегодня на счёт.'
          ]);
          ok('+$' + gain + ' · сделка закрыта');
        } else {
          // 30% fail
          if (Math.random() < CLOSE_DEAL_FAIL_RATE) {
            STATE.energy = Math.max(0, STATE.energy - 5);
            say([
              'созвон странный. клиент «подумает»',
              'и исчезает. ты не поняла где потеряла.'
            ]);
            alert_('сделка не состоялась');
          } else {
            var gainUnq = 300 + Math.floor(Math.random() * 101); // 300..400
            STATE.cash += gainUnq;
            say([
              'сработало. не идеально, но сработало.',
              'договор подписан, аванс на счёт.'
            ]);
            ok('+$' + gainUnq + ' · сделка закрыта');
          }
        }
      }
    },

    qualification: {
      label: 'квалифицировать лид (10ч)',
      visible: function () { return STATE.qualification_unlocked; },
      enabled: function () { return canAct() && STATE.hours >= 10 && STATE.leads >= 1; },
      perform: function () {
        STATE.hours -= 10;
        spacer();
        logLine('> qualification --next', 'log-prompt');
        say([
          'десять минут вопросов: кто ты, зачем, бюджет.',
          'на этом лиде — всё сходится. реальный.'
        ]);
        ok('следующий close_deal гарантированно успешен');
      }
    },

    open_notebook: {
      label: 'открыть блокнот (написать тиму)',
      visible: function () { return STATE.notebook_available && !STATE.lead_submitted; },
      enabled: function () { return canAct(); },
      perform: function () {
        spacer();
        logLine('> open notebook', 'log-prompt');
        mountInlineForm();
      }
    },

    end_day: {
      label: 'закрыть ноутбук (конец дня)',
      visible: function () { return STATE.lamp_on; },
      enabled: function () { return canAct(); },
      perform: function () {
        spacer();
        logLine('> end_day', 'log-prompt');
        say('— конец дня ' + STATE.day + ' · $' + STATE.cash + ' · лидов ' + STATE.leads + ' —');

        STATE.day += 1;
        STATE.hours = HOURS_PER_DAY;
        STATE.energy = Math.min(100, STATE.energy + 20);
        STATE.actions_today = 0;

        if (STATE.day > FINALE_DAY) {
          STATE.day = FINALE_DAY;
          triggerFinale();
          return;
        }

        // morning header
        spacer();
        sys('день ' + STATE.day + '. 100 часов впереди.');

        // fire day-triggered beats
        fireBeatsForDay(STATE.day);
        // process passive costs
        processPassive(STATE.day);
        // lifeline check again after passive
        if (STATE.cash < 0 && !STATE.lena_lifeline_used) {
          processPassive(STATE.day);
        }
      }
    }
  };

  function fireBeatsForDay(day) {
    var beats = BEATS[day];
    if (!beats) return;
    for (var i = 0; i < beats.length; i++) {
      try { beats[i](); } catch (e) { /* noop */ }
    }
  }

  // ---------- choice handling (Anna first deal) ----------

  function renderChoice() {
    var $actions = $('#actions').empty();
    if (STATE.pending_choice === 'anna_first') {
      var $take = $('<button>').attr('type', 'button').addClass('action-btn').text('взять проект');
      $take.on('click', function () {
        STATE.pending_choice = null;
        STATE.cash += 300;
        STATE.leads = Math.max(0, STATE.leads); // no deduction
        spacer();
        say([
          '«ура. договор отправила. первый $300 на счету.',
          'странное чувство: ты больше не «бывший сотрудник».',
          'ты — «подрядчик». смешно, но вслух проговорить страшно».'
        ]);
        ok('+$300 · первый закрытый');
        save();
        render();
      });

      var $decline = $('<button>').attr('type', 'button').addClass('action-btn').text('отказать (слишком быстро)');
      $decline.on('click', function () {
        STATE.pending_choice = null;
        spacer();
        say([
          'ты отвечаешь «не сейчас». через полчаса',
          'жалеешь, но уже поздно. лена поймёт.'
        ]);
        save();
        render();
      });

      $actions.append($take).append($decline);
    }
  }

  // ---------- inline lead form ----------

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
      archetype: 'marina-v15',
      source: 'marina-v-ogne',
      onSuccess: function () {
        STATE.lead_submitted = true;
        STATE.qualification_unlocked = true;
        spacer();
        ok('блокнот закрыт. тим получил запись.');
        spacer();
        sys('входящее: тим');
        say([
          '«спасибо. прочитал. короткий совет:',
          ' перед каждой сделкой делай qualification —',
          ' 10 минут разговора «кто ты, зачем, есть ли',
          ' бюджет». половина «клиентов» уходит в песок',
          ' без этого. после этого — чище».'
        ]);
        ok('открыто действие: quality / qualification --next');
        sys('день продолжается.');
        save();
        render();
      },
      onCancel: function () {
        spacer();
        sys('блокнот закрыт без записи.');
        render();
      }
    });
  }

  // ---------- finale ----------

  function triggerFinale() {
    STATE.ending_seen = true;
    save();

    var isA = (STATE.cash >= 0 && STATE.energy >= 25);

    // clear game-mode actions so no [ ] leftover shows up
    $('#actions').empty();
    // refresh HUD one last time
    renderHud();

    var $game = $('#game');
    var $ending = $('#ending');
    $ending.empty();

    var linesA = [
      '',
      'прошло 12 дней.',
      '',
      'на счету что-то есть.',
      'энергия — есть.',
      'ты не сгорела. и это не победа.',
      'это день двенадцатый. из долгой работы.',
      '',
      'но теперь ты знаешь: дальше можно.'
    ];

    var linesB = [
      '',
      'прошло 12 дней.',
      '',
      'что-то не получилось.',
      'не ты. формат.',
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
        'у тебя есть 30 секунд, чтобы рассказать тиму что горит больше всего. он ответит сегодня.'
      ));
      var $formHost = $('<div>').attr('id', 'ending-lead-form-host');
      $ending.append($formHost);
      if (window.MarinaLead) {
        window.MarinaLead.mountInline($formHost, {
          archetype: 'marina-v15',
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

  // ---------- render ----------

  function render() {
    renderHud();
    if (STATE.ending_seen) {
      return;
    }
    if (STATE.pending_choice) {
      renderChoice();
      return;
    }
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

  function save() { saveState(); }

  // ---------- init ----------

  function init() {
    if (!sessionStorage.getItem(SESSION_KEY)) {
      sessionStorage.setItem(SESSION_KEY, String(Date.now()));
    }

    STATE = loadState();

    // If resuming a completed game, show ending directly
    if (STATE.ending_seen) {
      renderHud();
      triggerFinale();
      return;
    }

    if (!STATE.lamp_on) {
      // cold start
      beatIntro();
    } else {
      say(['', '(продолжаем с того же места. день ' + STATE.day + ' / ' + FINALE_DAY + '.)']);
    }

    render();

    // day 1 beat sequence — lena fires on day 2 after end_day
    $('#actions').on('click', '.action-btn[data-action]', function () {
      var name = $(this).attr('data-action');
      var a = ACTIONS[name];
      if (!a || !a.enabled()) return;
      a.perform();
      if (!STATE.pending_choice && STATE.day === 1 && STATE.lamp_on && !STATE.beat_intro_done) {
        // first lamp click already logged intro text
        STATE.beat_intro_done = true;
      }
      save();
      render();
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

  // expose for test / rollback
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
