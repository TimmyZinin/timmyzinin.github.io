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

  // SPRINT 18 — split versions
  // APP_VERSION: cache-bust + UI display, changes every deploy
  // SAVE_SCHEMA_VERSION: persistence shape, only changes when state structure changes
  var APP_VERSION = '2.3.3';
  var SAVE_SCHEMA_VERSION = 1; // bump only on state shape change
  var VERSION = APP_VERSION; // legacy alias kept for existing refs
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
    // hangout_denis: removed — Denis uses per-event pricing via DENIS_COSTS in chat chips
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

  var EAT_HOME_TEXT = [
    'варю макароны с сыром. не ресторан, но хоть что-то горячее',
    'гречка с луком. бабушкина схема. работает',
    'яичница из трёх яиц. кофе. смотрю на стену',
    'ем йогурт с бананом прямо из баночки. на тарелку лень',
    'замораживаю половинку лазаньи из пятёрки. норм'
  ];

  var EAT_OUT_TEXT = [
    'заказала в кафе · боул с лососем, кофе · dopamine hit',
    'забежала в бистро на углу. паста карбонара. в одиночестве за столиком у окна',
    'ресторан с видом на реку. стейк, бокал вина. чувствую себя наполовину человеком',
    'dim sum place в торговом. одна, с книжкой. тихо и хорошо',
    'суши-сет со скидкой по промокоду. грустноватая романтика но сытно'
  ];

  var SHOPPING_TEXT = [
    'купила тёплый свитер в zara. мелочь, но настроение +50',
    'новые кроссовки со скидкой. с ними чувствую что могу бегать быстрее (не буду)',
    'платье которое давно хотела. оно всё ещё не по размеру, но куплено. счастье',
    'косметика в рив гош. палетка теней и помада. буду красить лицо завтра',
    'книга в мольскине + термо-кружка. рабочий набор обновлён'
  ];

  var WORK_NIGHT_TEXT = [
    'сижу до 4 утра · экран режет глаза · проект двигается',
    'чай третьей заварки, вентилятор ноутбука на максимум, соседи спят',
    'в окне синий рассвет. я ещё не спала. но работа почти закончена',
    'ночной дожор: орехи, доширак, чай. кнопка save нажата 47 раз',
    'наушники, lofi hip hop, руки сами по себе. 3:47 утра'
  ];

  var DATE_KIRILL_TEXT = [
    'свидание с Кириллом · грустный ужин, но он угощает',
    'с Кириллом в кафе. он говорит о криптотрейдинге. я киваю и ем салат',
    'с Кириллом в баре. он заказал коктейль с зонтиком. мне стейк. норм',
    'ужин с Кириллом. он пытается держать руку. я не убираю. странно и тепло',
    'Кирилл привёл в кино и кафе после. даже проводил до метро. может он не так плох'
  ];

  var HANGOUT_DENIS_TEXT = [
    'с Денисом на набережной · вино, смех, море, 4 часа как 40 минут',
    'квартирник у Дениса. акустическая гитара, вино, 12 человек, я смеюсь до слёз',
    'парк горького с Денисом. велосипеды, квас, шашлык, закат',
    'клуб с Денисом. душно, громко, дорого, но я танцевала три часа подряд',
    'регата вышла. ветер, брызги, Денис рулит, я смеюсь как ребёнок'
  ];

  // SPRINT 12 — Marina's morning inner monologue when resources are critical
  var HUNGRY_MORNINGS = [
    'проспала будильник. живот жжёт — три дня на кофе и доширке',
    'проснулась и сразу захотелось мяса. реального, не соевого. ничего в холодильнике',
    'голова кружится когда встаёшь. надо что-то съесть нормальное, иначе я не вытяну',
    'забыла как меня зовут пару секунд. это нормально? это от голода?',
    'утро. сижу в кухне, смотрю на пустой холодильник, планирую оптимальную закупку на $10'
  ];

  var TIRED_MORNINGS = [
    'будильник в 8:30. в 10:45 всё ещё в кровати. руки как ватные',
    'проснулась с чувством что я пробежала марафон во сне. ничего не сделала за неделю',
    'кофе третьей заварки. глаза закрываются сами. мне нужен день тишины, но его нет',
    'меня кто-то выпил. физически. лежу, смотрю в потолок, считаю трещины',
    'сколько можно вставать уставшей. это уже не усталость — это метаморфоза'
  ];

  var SAD_MORNINGS = [
    'проснулась без причины в 5 утра. всё тихо и мне грустно, но я не знаю почему',
    'хочу позвонить маме и не могу. не знаю что сказать кроме «всё плохо»',
    'читаю свои старые посты в телеграм и не узнаю ту девочку. когда я стала такой',
    'плачу в душе. ничего особенного не случилось. просто накопилось',
    'утро. смотрю в зеркало. кто этот человек. серьёзно'
  ];

  var FINE_MORNINGS = [
    'проснулась до будильника. что за фокус',
    'кофе, солнце в окне, три мысли в голове вместо ста. редкое утро',
    'чувствую себя живой сегодня. спасибо вчерашнему ужину',
    'утро из тех когда я могу',
    'сегодня получится. я это чувствую'
  ];

  // SPRINT 14 — Hungry work text (used when hunger < 50)
  var WORK_TEXT_HUNGRY = [
    'пытаюсь писать. буквы расплываются. когда я ела в последний раз?',
    'делаю правки. трижды перечитываю одно предложение. голова не работает',
    'работа идёт в два раза медленнее. желудок урчит как трактор',
    'сижу и смотрю на экран. мысли не складываются. надо поесть'
  ];

  // SPRINT 14 — Night work hangover morning
  var HANGOVER_MORNINGS = [
    'проснулась в 11. голова как чугун. кофе не помогает. это цена ночной работы',
    'будильник в 8. ноутбук ещё тёплый от вчерашней ночи. я холодная. руки не слушаются',
    'полночи работала, полночи смотрела в потолок. итог: минус полдня',
    'рассвет. экран слепит. уснула за ноутбуком. шея болит, спина болит, всё болит'
  ];

  // SPRINT 13 — Marina POV narrative for Tim automation (feels real, not system)
  var AUTO_REACH_NARRATIVE = [
    'открыла ноут · в inbox уже есть ответ от одного из фоновых холодок. AI-бот Тима отработал ночью',
    'засыпала — папка «входящие» пустая. проснулась — три ответа. один живой, двое seen. не понимаю как это работает, но работает',
    'бот тима написал за меня 20 холодок пока я спала. один из них ответил. я просто пью кофе и читаю. это странно',
    'уведомление в 7:12 утра: «новый лид». AI сделал свою работу. я даже не знаю что ему написать в ответ — посмотрю',
    'просыпаюсь в мире где мой холодный фарминг идёт без меня. не знаю куда это всё денется, но пока работает'
  ];

  var AUTO_BRIEF_NARRATIVE = [
    'AI Тима провёл созвон за меня. отправил расшифровку: клиент адекватный, бюджет $200+, нужен лендинг. квалифицированный лид',
    'открываю AI-трансcript: «клиент сказал, я хочу запустить за неделю, готов платить». квалифицирован. я даже не говорила с ним',
    'бот закрыл первый контакт на брифе, сразу в qualified. я прочитала pipeline-notes и поняла что могу не звонить',
    'AI-созвонщик: 23 минуты, 4 уточняющих, закрыл на следующий шаг. я за это время успела выпить кофе и посмотреть в окно',
    'первый раз в жизни кто-то провёл созвон за меня. странное чувство благодарности и немного вины'
  ];

  var AUTO_OFFER_NARRATIVE = [
    'AI отправил оффер и провёл торг. клиент согласился на upfront. я только что прочитала диалог — адекватный торг, не передавил',
    'уведомление: «контракт подписан». AI сделал всё. upfront уже в банке. я проверяю три раза, не верю',
    'бот отправил предложение, клиент согласился за 4 часа. я в этот момент гуляла. деньги пришли сами',
    'торг AI: начал с $280, клиент упирался, AI сделал контр-оффер $240, согласие. я бы переборщила',
    'вся воронка работает без меня. первый контакт → бриф → оффер → upfront. осталось только делать проект. это пугает и освобождает одновременно'
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
      kirill_invite_active: false, // SPRINT 08 — pulses only when Kirill has active invite
      kirill_invite_expires_day: 0,
      kirill_affection: 0,  // SPRINT 01 — love arc score
      love_ending_unlocked: false,
      beat_kirill_love_1: false,
      beat_kirill_love_2: false,
      beat_kirill_love_final: false,
      // SPRINT 20 — Kirill arc expansion beats
      beat_kirill_scene11: false,
      beat_kirill_scene13: false,
      beat_kirill_conflict16: false,
      beat_kirill_resolution19: false,
      beat_kirill_prefinale24: false,
      _kirill_conflict_pending: false,
      // Interaction counter (BLOCK M)
      player_interactions: 0,
      beat_tim_creator_fired: false,
      // SPRINT 06/13 — Tim consultant automation tiers (3 tiers, work is not automated)
      beat_tim_consult_intro: false,
      auto_reach_out: false,       // tier 1 — $200
      auto_brief_lead: false,      // tier 2 — $300
      auto_send_offer: false,      // tier 3 — $400 (final tier)
      // SPRINT 14 — guaranteed economy drain events
      beat_drain_charger: false,   // day 3 — $60
      beat_drain_phone: false,     // day 6 — $80
      beat_drain_dentist: false,   // day 8 — $150
      beat_drain_electric: false,  // day 11 — $100
      // SPRINT 14 — khozyaika arc enhancement
      beat_khozyaika_day3_noise: false,
      beat_khozyaika_day5_electric: false,
      beat_khozyaika_day7_damage: false,
      beat_khozyaika_day9_chain: false,
      beat_khozyaika_post12_flowers: false,
      beat_khozyaika_post12_quote1: false,
      beat_khozyaika_post12_quote2: false,
      // SPRINT 14 — night work hangover
      worked_night_last_day: 0,
      _hangover_active: false,
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
      beat_khozyaika_day1: false,
      beat_khozyaika_komod: false,
      beat_khozyaika_1: false,
      beat_khozyaika_2: false,
      beat_khozyaika_3: false,
      beat_khozyaika_4: false,
      beat_pavel: false,
      beat_pavel_night_day2: false,
      beat_pavel_day5: false,
      beat_pavel_day7: false,
      beat_pavel_day9: false,
      beat_mama6: false,
      beat_mama11: false,
      beat_mama17: false,
      beat_mama24: false,
      beat_denis3: false,
      beat_denis6: false,
      beat_denis9: false,
      beat_denis15: false,
      beat_denis27: false,
      // SPRINT 14.1 — explicit init for Denis reply-chip pending flags
      _denis3_pending: false,
      _denis6_pending: false,
      _denis9_pending: false,
      _denis15_pending: false,
      _denis27_pending: false,
      // SPRINT 18 — all _*_pending flags explicit-init policy
      _anna_pending: false,
      _anna_referral_pending: false,
      _artur_pending: false,
      _khozyaika1_pending: false,
      _khozyaika2_pending: false,
      _khozyaika3_pending: false,
      _khozyaika4_pending: false,
      _khozyaika_chain_pending: false,
      _khozyaika_electric_pending: false,
      _kirill_complaint_pending: false,
      _kirill_love1_pending: false,
      _kirill_love2_pending: false,
      _kirill_love_final_pending: false,
      _kirill_pending: false,
      _krypta_pending: false,
      _mama6_pending: false,
      _mama17_pending: false,
      _olya_pending: false,
      _pavel_pending: false,
      _sosed_pending: false,
      _svetka_pending: false,
      _tim_consult_pending: false,
      _tim_tier2_pending: false,
      _tim_tier3_pending: false,
      _vera_pending: false,
      // recurring spam intros (BLOCK A)
      beat_olya: false,
      beat_kirill: false,
      beat_krypta: false,
      beat_artur: false,
      beat_vera: false,
      beat_sosed: false,
      beat_svetka_day3: false,
      beat_svetka_day6: false,
      beat_svetka_day10: false,
      beat_svetka_day14: false,
      beat_svetka_day18: false,
      beat_svetka_day22: false,
      beat_svetka_day26: false,
      // Sprint 07 late-game density beats
      beat_khozyaika_d22: false,
      beat_khozyaika_d27: false,
      beat_olya_retry: false,
      beat_olya_final: false,
      beat_krypta_retry: false,
      beat_krypta_final: false,
      beat_pavel_d13: false,
      beat_pavel_d17: false,
      beat_pavel_d21: false,
      beat_pavel_d25: false,
      beat_mama_d20: false,
      beat_denis_d22: false,
      // Настя parallel arc
      beat_nastya_d6: false,
      beat_nastya_d11: false,
      beat_nastya_d16: false,
      beat_nastya_d20: false,
      beat_nastya_d25: false,
      beat_nastya_d30: false,
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
        { id: 'svetka',  name: 'Светка (подружка)',  avatar: '🎤', unread: 0, visible: false },
        { id: 'nastya',  name: 'Настя (коллега)',    avatar: 'Н',  unread: 0, visible: false },
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
        olya: [], kirill: [], krypta: [], artur: [], vera: [], sosed: [], svetka: [], nastya: [],
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
    // SPRINT 14.1 rev3 — forward-merge compatible saves across 2.x minor versions
    // (Codex decision audit BLOCKER #2: don't reset player progress on every bump)
    var COMPATIBLE_VERSIONS = ['2.2.0', '2.2.1', '2.2.2', '2.2.3', '2.2.4', '2.2.5', '2.2.6', '2.2.7', '2.2.8', '2.2.9', '2.3.0', '2.3.1', '2.3.2', '2.3.3', '2.1.1'];
    try {
      var raw = localStorage.getItem(STATE_KEY);
      var ver = localStorage.getItem(VERSION_KEY);
      if (raw && (ver === VERSION || COMPATIBLE_VERSIONS.indexOf(ver) !== -1)) {
        var parsed = JSON.parse(raw);
        var d = defaultState();
        // Stamp current version onto migrated save so future loads skip the compat check
        parsed.version = VERSION;
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
        // SPRINT 15 — normalize legacy projects missing work_units_total/deadline_day
        // (Anna projects pre-SPRINT 15 had no completion criteria; without this they
        // would never expire and could be exploited)
        if (Array.isArray(parsed.active_projects)) {
          parsed.active_projects.forEach(function (p) {
            if (p && typeof p === 'object') {
              if (typeof p.work_units_total !== 'number') p.work_units_total = 6;
              if (typeof p.deadline_day !== 'number') p.deadline_day = (parsed.day || 1) + 7;
              if (typeof p.work_units_done !== 'number') p.work_units_done = 0;
              if (!p.status) p.status = 'active';
            }
          });
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
        id: 'reach_out',
        label: (STATE.auto_reach_out ? '🤖 ' : '') + 'искать клиентов',
        cost: STATE.auto_reach_out ? 'AI делает' : '1ч · −5⚡',
        auto: STATE.auto_reach_out,
        disabled: STATE.auto_reach_out || STATE.hours < COST.reach_out.h || STATE.energy < COST.reach_out.e,
        reason: STATE.auto_reach_out ? 'AI автоматизирован' : (STATE.hours < COST.reach_out.h ? 'нет часов' : 'нет энергии'),
        primary: !STATE.auto_reach_out
      });
      actions.push({
        id: 'brief_lead',
        label: (STATE.auto_brief_lead ? '🤖 ' : '') + 'созвон с лидом',
        cost: STATE.auto_brief_lead ? 'AI делает' : '1ч · −3⚡',
        auto: STATE.auto_brief_lead,
        badge: !STATE.auto_brief_lead && STATE.leads > 0 ? STATE.leads : null,
        badgeHot: STATE.leads > 0,
        disabled: STATE.auto_brief_lead || STATE.leads < 1 || STATE.hours < COST.brief_lead.h || STATE.energy < COST.brief_lead.e,
        reason: STATE.auto_brief_lead ? 'AI автоматизирован' : (STATE.leads < 1 ? 'нет лидов' : (STATE.hours < COST.brief_lead.h ? 'нет часов' : 'нет энергии'))
      });
      actions.push({
        id: 'send_offer',
        label: (STATE.auto_send_offer ? '🤖 ' : '') + 'отправить оффер',
        cost: STATE.auto_send_offer ? 'AI делает' : '1ч',
        auto: STATE.auto_send_offer,
        badge: !STATE.auto_send_offer && STATE.qualified_leads > 0 ? STATE.qualified_leads : null,
        badgeHot: STATE.qualified_leads > 0,
        disabled: STATE.auto_send_offer || STATE.qualified_leads < 1 || STATE.hours < COST.send_offer.h || STATE.bank_locked,
        reason: STATE.auto_send_offer ? 'AI автоматизирован' : (STATE.bank_locked ? 'счёт заблокирован' : (STATE.qualified_leads < 1 ? 'нет брифов' : 'нет часов'))
      });
      actions.push({
        id: 'work_on_project', label: 'делать работу', cost: '2ч · −5⚡',
        badge: STATE.active_projects.length > 0 ? STATE.active_projects.length : null,
        disabled: STATE.active_projects.length === 0 || STATE.hours < COST.work_on_project.h || STATE.energy < COST.work_on_project.e,
        reason: STATE.active_projects.length === 0 ? 'нет проектов' : (STATE.hours < COST.work_on_project.h ? 'нет часов' : 'нет энергии')
      });
      actions.push({
        id: 'work_night', label: '🌙 ночная работа', cost: '−15⚡ · −15💚',
        disabled: STATE.active_projects.length === 0 || STATE.day < 3 || STATE.energy < COST.work_night.e,
        reason: STATE.day < 3 ? 'доступно с дня 3' : (STATE.active_projects.length === 0 ? 'нет проектов' : 'мало энергии'),
        hideOnMobile: STATE.active_projects.length === 0 || STATE.day < 3
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
        reason: STATE.day < 5 ? 'с дня 5' : (STATE.bank_locked ? 'счёт заблокирован' : 'не хватает ресурсов'),
        hideOnMobile: STATE.day < 5 || STATE.cash < COST.shopping.c || STATE.bank_locked
      });
      // Social actions — только если анлокнуты
      if (STATE.kirill_unlocked && !STATE.kirill_blocked) {
        var kirillInviteActive = !!STATE.kirill_invite_active;
        actions.push({
          id: 'date_kirill',
          label: '💔 свидание (Кирилл)',
          cost: '3ч · −10⚡',
          badge: kirillInviteActive ? '!' : null,
          badgePulse: kirillInviteActive,
          disabled: !kirillInviteActive || STATE.hours < COST.date_kirill.h || STATE.energy < COST.date_kirill.e || (STATE.kirill_date_count >= 4 && !STATE.bank_locked),
          reason: !kirillInviteActive ? 'Кирилл сейчас не зовёт' : (STATE.energy < COST.date_kirill.e ? 'нет энергии' : 'не хватает часов'),
          hideOnMobile: !kirillInviteActive
        });
      }
      if (STATE.beat_denis3 || STATE.beat_denis6 || STATE.beat_denis9 || STATE.beat_denis15) {
        // Denis actions only via reply chips in chat (per-event pricing)
        var hasDenisPending = STATE._denis3_pending || STATE._denis6_pending || STATE._denis9_pending || STATE._denis15_pending || STATE._denis27_pending;
        actions.push({
          id: 'hangout_denis', label: '🎉 с Денисом', cost: hasDenisPending ? 'ответь в чат' : 'ждёт приглашения',
          badge: hasDenisPending ? '!' : null,
          badgePulse: hasDenisPending,
          disabled: !hasDenisPending,
          reason: 'ответь на приглашение Дениса в чате',
          hideOnMobile: !hasDenisPending
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
      if (a.auto) {
        $btn.addClass('auto-ai');
      }
      if (a.id === 'end_day' && STATE.hours <= 2 && STATE.lamp_on) {
        $btn.addClass('pulse');
      }
      // SPRINT 14 — hide irrelevant disabled buttons on mobile
      if (a.hideOnMobile && a.disabled) {
        $btn.addClass('mobile-hide');
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
      var $lamp = $('<button class="dock-btn">').attr('data-action', 'lamp').text('включить компьютер');
      $buttons.append($lamp);
    }

    // Render top resource HUD (BLOCK C.1)
    renderHud();
  }

  // SPRINT 12 — Marina's morning inner monologue (visible crisis feedback)
  function postMorningMonologue() {
    if (STATE.day < 2) return; // skip day 1
    // SPRINT 14 — hangover takes priority
    if (STATE._hangover_active) {
      postMessage('scratch', {
        kind: 'outgoing',
        photo: 'img/events/hangover_desk.webp',
        photoAlt: 'утро после ночной работы',
        text: pick(HANGOVER_MORNINGS)
      });
      postSystem('scratch', '☕ после ночной работы · энергия не восстановилась');
      return;
    }
    var h = STATE.hunger, e = STATE.energy, m = STATE.comfort;
    // Pick the worst resource and post inner-monologue for it
    if (h != null && h < 30) {
      // SPRINT 14.3 — empty fridge photo when critically hungry
      postMessage('scratch', {
        kind: 'outgoing',
        photo: h < 15 ? 'img/events/marina_hungry.webp' : undefined,
        photoAlt: 'пустой холодильник',
        text: pick(HUNGRY_MORNINGS)
      });
      return;
    }
    if (m != null && m < 25) {
      postMessage('scratch', { kind: 'outgoing', text: pick(SAD_MORNINGS) });
      return;
    }
    if (e < 30) {
      postMessage('scratch', { kind: 'outgoing', text: pick(TIRED_MORNINGS) });
      return;
    }
    // Fine morning — only 25% chance (not every day)
    if (Math.random() < 0.25) {
      postMessage('scratch', { kind: 'outgoing', text: pick(FINE_MORNINGS) });
    }
  }

  // SPRINT 12 — Dynamic brand subtitle based on Marina's state
  function renderBrandStatus() {
    var $sub = $('.brand-subtitle');
    if ($sub.length === 0) return;
    var h = STATE.hunger || 100;
    var e = STATE.energy || 100;
    var m = STATE.comfort || 60;
    var status = 'теледрам v' + VERSION;
    if (STATE.bank_locked) status = '🔒 счёт заблокирован';
    else if (h < 20) status = '🍔 очень голодна';
    else if (e < 20) status = '⚡ на пределе';
    else if (m < 20) status = '💔 грустит';
    else if (h < 35 || e < 35 || m < 30) status = '😮‍💨 устала';
    $sub.text(status);

    // Avatar grayscale when comfort low
    var $avatar = $('.brand-circle img');
    if ($avatar.length) {
      if (m < 30) $avatar.css('filter', 'grayscale(0.7) brightness(0.85)');
      else $avatar.css('filter', '');
    }
  }

  // SPRINT 12 — Crisis banner top of screen (persistent warning)
  function renderCrisisBanner() {
    var $banner = $('#crisis-banner');
    if ($banner.length === 0) return;
    var h = STATE.hunger, e = STATE.energy, m = STATE.comfort, c = STATE.cash;
    var msg = null, cls = '';

    if (STATE.bank_locked) {
      var daysLeft = Math.max(0, (STATE.bank_locked_until || STATE.day) - STATE.day);
      msg = '🔒 СЧЁТ ЗАБЛОКИРОВАН ПО 115-ФЗ · ещё ' + daysLeft + ' дн.';
      cls = 'crit';
    } else if (h != null && h < 15) {
      msg = '🍔 МАРИНА ГОЛОДАЕТ · энергия падает быстро · поешь';
      cls = 'crit';
    } else if (e < 15) {
      msg = '⚡ МАРИНА НА ПРЕДЕЛЕ · перерыв срочно';
      cls = 'crit';
    } else if (c < -500) {
      msg = '💰 БАЛАНС КРИТИЧЕСКИЙ · −$' + Math.abs(c) + ' · сдай проект или теряешь квартиру';
      cls = 'crit';
    } else if (m != null && m < 15) {
      msg = '💔 КОМФОРТ ОБНУЛИЛСЯ · ты сгораешь · шопинг/еда/друзья';
      cls = 'crit';
    } else if (h != null && h < 30) {
      msg = '🍔 голодно · хочется настоящей еды';
      cls = 'warn';
    } else if (e < 30) {
      msg = '⚡ устала · пора отдохнуть';
      cls = 'warn';
    }

    if (msg) {
      $banner.text(msg).attr('class', 'crisis-banner ' + cls).show();
    } else {
      $banner.hide();
    }
  }

  // ===== Top resource HUD (BLOCK C.1) =====
  function renderHud() {
    renderBrandStatus();
    renderCrisisBanner();
    var $hud = $('#resource-hud');
    var $hudList = $('#resource-hud-list'); // mobile list view
    if ($hud.length === 0 && $hudList.length === 0) return;

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

    var html = parts.join('');
    if ($hud.length) $hud.html(html);
    if ($hudList.length) $hudList.html(html);
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

    // SPRINT 19 — real 7-day delta using meta.day stamped at postBank time
    // Legacy messages without meta.day are included (fallback assumes recent)
    var bankMsgs = (STATE.threads.bank || []);
    var sevenDaysAgoDay = Math.max(0, STATE.day - 7);
    var delta = 0;
    bankMsgs.forEach(function (m) {
      if (m.meta && typeof m.meta.amount === 'number') {
        var day = (typeof m.meta.day === 'number') ? m.meta.day : STATE.day; // legacy fallback
        if (day >= sevenDaysAgoDay) {
          delta += m.meta.amount;
        }
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
    // Tim creator 4th wall break: lead form chip
    if (contactId === 'tim' && STATE.beat_tim_creator_fired && !STATE.lead_submitted) {
      Bubbles.renderReplyChips([
        { id: 'fill_form', label: '📝 заполнить форму (связаться с реальным Тимом)' }
      ], function () { mountInlineForm(); });
      return;
    }
    // Tim tier 1 — auto_reach_out
    if (contactId === 'tim' && STATE._tim_consult_pending && !STATE.auto_reach_out) {
      Bubbles.renderReplyChips([
        { id: 'buy', label: 'купить автофарминг ($200)' },
        { id: 'later', label: 'подумаю позже' }
      ], function (opt) {
        STATE._tim_consult_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'buy' && STATE.cash >= 200 && !STATE.bank_locked) {
          STATE.cash -= 200;
          STATE.auto_reach_out = true;
          postBank(-200, 'Тим · автофарминг лидов');
          postOutgoing('tim', 'беру. переведу $200.');
          setTimeout(function () {
            postIncoming('tim', 'отлично, настроил. с завтрашнего дня +1 лид в день автоматом.', 'Тим');
          }, 900);
        } else if (opt.id === 'buy') {
          postOutgoing('tim', 'не хватает денег пока.');
        } else {
          postOutgoing('tim', 'хорошо, пока не сейчас.');
        }
        save(); renderDock();
      });
      return;
    }
    // Tim tier 2 — auto_brief_lead
    if (contactId === 'tim' && STATE._tim_tier2_pending && !STATE.auto_brief_lead) {
      Bubbles.renderReplyChips([
        { id: 'buy', label: 'купить авто-созвоны ($300)' },
        { id: 'later', label: 'нет' }
      ], function (opt) {
        STATE._tim_tier2_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'buy' && STATE.cash >= 300 && !STATE.bank_locked) {
          STATE.cash -= 300;
          STATE.auto_brief_lead = true;
          postBank(-300, 'Тим · AI созвоны');
          postOutgoing('tim', 'беру, настраивай.');
          setTimeout(function () {
            postIncoming('tim', 'готово. AI будет квалифицировать лиды каждое утро.', 'Тим');
          }, 900);
        } else {
          postOutgoing('tim', opt.id === 'buy' ? 'не хватает денег' : 'пока нет.');
        }
        save(); renderDock();
      });
      return;
    }
    // Tim tier 3 — auto_send_offer
    if (contactId === 'tim' && STATE._tim_tier3_pending && !STATE.auto_send_offer) {
      Bubbles.renderReplyChips([
        { id: 'buy', label: 'купить AI-оффер ($400)' },
        { id: 'later', label: 'нет' }
      ], function (opt) {
        STATE._tim_tier3_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'buy' && STATE.cash >= 400 && !STATE.bank_locked) {
          STATE.cash -= 400;
          STATE.auto_send_offer = true;
          postBank(-400, 'Тим · AI оффер');
          postOutgoing('tim', 'беру.');
          setTimeout(function () {
            postIncoming('tim', 'настроил. AI будет сам отправлять офферы и принимать контракты.', 'Тим');
          }, 900);
        } else {
          postOutgoing('tim', opt.id === 'buy' ? 'не хватает денег' : 'нет.');
        }
        save(); renderDock();
      });
      return;
    }
    // (tier 4 removed — work_on_project stays manual by design)
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
    // SPRINT 14 — Khozyaika day 5 electric meter
    if (contactId === 'khozyaika' && STATE._khozyaika_electric_pending) {
      Bubbles.renderReplyChips([
        { id: 'send', label: 'отправить фото (−1h)' },
        { id: 'later', label: 'потом отправлю (−5 комфорт)' }
      ], function (opt) {
        STATE._khozyaika_electric_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'send') {
          postOutgoing('khozyaika', 'отправила фото счётчика. розетка нормальная.');
          STATE.hours = Math.max(0, STATE.hours - 1);
        } else {
          postOutgoing('khozyaika', 'Наталья Валерьевна, отправлю позже.');
          STATE.comfort = Math.max(0, STATE.comfort - 5);
        }
        save(); renderDock();
      });
      return;
    }
    // SPRINT 14 — Khozyaika day 9 chain letter
    if (contactId === 'khozyaika' && STATE._khozyaika_chain_pending) {
      Bubbles.renderReplyChips([
        { id: 'forward', label: 'переслать 5 людям (−1h)' },
        { id: 'refuse', label: 'не буду (−5 комфорт)' }
      ], function (opt) {
        STATE._khozyaika_chain_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'forward') {
          postOutgoing('khozyaika', 'хорошо, переслала.');
          STATE.hours = Math.max(0, STATE.hours - 1);
          setTimeout(function () {
            postIncoming('khozyaika', 'СПАСИБО Марина! Карма дома восстановлена! 🙏✨', 'Наталья В.');
          }, 800);
        } else {
          postOutgoing('khozyaika', 'Наталья Валерьевна, я не верю в это.');
          STATE.comfort = Math.max(0, STATE.comfort - 5);
          setTimeout(function () {
            postIncoming('khozyaika', 'Ну как хотите. Но если что случится — я предупреждала.', 'Наталья В.');
          }, 800);
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
    // Denis party invitations (any day — SPRINT 14: per-event variable pricing)
    // SPRINT 14.1 rev3 — chip enforces bank_locked, cash, hours guards (was bypassed after
    // actHangoutDenis() removal). Codex decision audit BLOCKER #1.
    var DENIS_COSTS = { 3: 250, 6: 200, 9: 300, 15: 350, 27: 300 };
    [3, 6, 9, 15, 27].forEach(function (d) {
      var key = '_denis' + d + '_pending';
      if (contactId === 'denis' && STATE[key]) {
        var dCost = DENIS_COSTS[d] || 250;
        var canAfford = !STATE.bank_locked && STATE.cash >= dCost && STATE.hours >= 2;
        var denyReason = STATE.bank_locked ? 'счёт заблокирован' :
                         (STATE.cash < dCost ? 'не хватает $' + (dCost - STATE.cash) :
                         (STATE.hours < 2 ? 'нет 2 часов' : null));
        Bubbles.renderReplyChips([
          {
            id: 'go',
            label: 'поехать (−$' + dCost + ', +60⚡, −2h дня)' + (canAfford ? '' : ' · ' + denyReason),
            disabled: !canAfford
          },
          { id: 'skip', label: 'не сейчас' }
        ], function (opt) {
          // SPRINT 14.1 rev4 — re-evaluate guards against CURRENT STATE (not stale closure).
          // Codex caught bypass: player opens chat while affordable, spends money
          // elsewhere, returns and clicks "go" — render-time canAfford was true.
          if (opt.id === 'go') {
            var liveBankLocked = STATE.bank_locked;
            var liveCash = STATE.cash;
            var liveHours = STATE.hours;
            if (liveBankLocked || liveCash < dCost || liveHours < 2) {
              var reason = liveBankLocked ? 'счёт заблокирован' :
                           (liveCash < dCost ? 'не хватает $' + (dCost - liveCash) : 'нет 2 часов');
              postOutgoing('denis', 'слушай, не сейчас. не могу — ' + reason + '.');
              // Do NOT clear pending — let player come back when ready.
              // Re-render chips so UI reflects current resource state.
              Bubbles.clearChipsArea();
              renderThreadContextActions('denis');
              return;
            }
          }
          STATE[key] = false;
          Bubbles.clearChipsArea();
          bumpInteraction();
          if (opt.id === 'go') {
            postOutgoing('denis', 'ладно, поехали. работа подождёт.');
            STATE.cash -= dCost;
            STATE.energy = Math.min(100, STATE.energy + 60);
            STATE.hours = Math.max(0, STATE.hours - 2);
            postBank(-dCost, 'с Денисом');
            postMessage('scratch', { kind: 'outgoing', text: pick(HANGOUT_DENIS_TEXT) });
            postMessage('scratch', { kind: 'system', text: '−$' + dCost + ' · +60⚡ · −2h · день ожил' });
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
          STATE.kirill_affection = (STATE.kirill_affection || 0) + 3;
          // Activate date invitation window (expires in 2 days)
          STATE.kirill_invite_active = true;
          STATE.kirill_invite_expires_day = (STATE.day || 1) + 2;
          postMessage('scratch', { kind: 'system', text: 'Кирилл разблокировал свидания · ⏳ окно 2 дня' });
        } else {
          postOutgoing('kirill', 'извини, ты не мой типаж.');
          STATE.kirill_blocked = true;
        }
        save(); renderDock();
      });
      return;
    }

    // Kirill love arc — mid-late game warm messages
    if (contactId === 'kirill' && STATE._kirill_love1_pending) {
      Bubbles.renderReplyChips([
        { id: 'warm', label: 'ответить искренне (+affection)' },
        { id: 'cool', label: 'отшутиться (−affection)' }
      ], function (opt) {
        STATE._kirill_love1_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'warm') {
          postOutgoing('kirill', 'спасибо. мне сейчас сложно, но я тебя слышу. и мне важно что ты видишь.');
          STATE.kirill_affection = (STATE.kirill_affection || 0) + 2;
          STATE.comfort = Math.min(100, STATE.comfort + 5);
        } else {
          postOutgoing('kirill', 'ох лично, сохрани на потом. я в процессе.');
          STATE.kirill_affection = Math.max(0, (STATE.kirill_affection || 0) - 2);
        }
        save(); renderDock();
      });
      return;
    }
    if (contactId === 'kirill' && STATE._kirill_love2_pending) {
      Bubbles.renderReplyChips([
        { id: 'yes', label: 'да, встретимся (+affection, −3h)' },
        { id: 'defer', label: 'не сейчас, работа' }
      ], function (opt) {
        STATE._kirill_love2_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'yes') {
          postOutgoing('kirill', 'давай. просто погуляем.');
          STATE.hours = Math.max(0, STATE.hours - 3);
          STATE.comfort = Math.min(100, STATE.comfort + 15);
          STATE.kirill_affection = (STATE.kirill_affection || 0) + 2;
        } else {
          postOutgoing('kirill', 'Кирилл, сейчас не могу. проекты горят.');
          STATE.kirill_affection = Math.max(0, (STATE.kirill_affection || 0) - 1);
        }
        save(); renderDock();
      });
      return;
    }
    if (contactId === 'kirill' && STATE._kirill_love_final_pending) {
      Bubbles.renderReplyChips([
        { id: 'yes_love', label: '«да. я тоже.»' },
        { id: 'scared', label: '«Кирилл, я боюсь, но хочу попробовать»' }
      ], function (opt) {
        STATE._kirill_love_final_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'yes_love') {
          postOutgoing('kirill', 'да. я тоже.');
        } else {
          postOutgoing('kirill', 'Кирилл, я боюсь. но я хочу попробовать быть с тобой.');
        }
        STATE.love_ending_unlocked = true;
        postMessage('scratch', { kind: 'system', text: '❤️ love ending подтверждён' });
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
    // SPRINT 20 — Kirill conflict (Pavel night messages)
    if (contactId === 'kirill' && STATE._kirill_conflict_pending) {
      Bubbles.renderReplyChips([
        { id: 'honest', label: 'я с ним не возвращаюсь (+affection, −5 комфорт)' },
        { id: 'defensive', label: 'это не твоё дело (−affection)' },
        { id: 'leave', label: 'может мы и правда рано... (−affection, STATE.kirill_blocked)' }
      ], function (opt) {
        STATE._kirill_conflict_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'honest') {
          postOutgoing('kirill', 'нет. он просто пишет. я отвечаю коротко и сплю. я тут, с тобой.');
          STATE.kirill_affection = (STATE.kirill_affection || 0) + 2;
          STATE.comfort = Math.max(0, STATE.comfort - 5);
        } else if (opt.id === 'defensive') {
          postOutgoing('kirill', 'Кирилл, это не твоё дело с кем я переписываюсь.');
          STATE.kirill_affection = Math.max(0, (STATE.kirill_affection || 0) - 2);
        } else {
          postOutgoing('kirill', 'может мы правда поторопились. мне нужно время.');
          STATE.kirill_affection = Math.max(0, (STATE.kirill_affection || 0) - 3);
          STATE.kirill_blocked = true;
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
                work_units_total: 6, // SPRINT 15 — match standard
                upfront_paid: 400,
                final_due: 400,
                final_payment: 400,
                started_day: STATE.day,
                deadline_day: STATE.day + 12, // SPRINT 15 — bigger Artur project, slightly longer
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

    // Светка — сплетни (SPRINT 06)
    if (contactId === 'svetka' && STATE._svetka_pending) {
      Bubbles.renderReplyChips([
        { id: 'listen', label: '«слушать» сплетню (−1h, +15💚)' },
        { id: 'ignore', label: 'не сейчас (−5💚)' }
      ], function (opt) {
        STATE._svetka_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'listen') {
          postOutgoing('svetka', 'ааа рассказывай подробнее');
          STATE.hours = Math.max(0, STATE.hours - 1);
          STATE.comfort = Math.min(100, STATE.comfort + 15);
          setTimeout(function () {
            postIncoming('svetka', 'ТЫ ЛУЧШАЯ я тебя обожаю 💕 расскажу всё на кофе в воскресенье', 'Светка');
          }, 1000);
        } else {
          postOutgoing('svetka', 'света я не могу, проект горит. позже');
          STATE.comfort = Math.max(0, STATE.comfort - 5);
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
    msg._received_at = Date.now(); // for contact sort by last message time
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
      meta: { bank_name: 'Т-Банк', amount: amount, day: STATE.day } // SPRINT 19 — day for 7-day delta filter
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
    postMessage('scratch', {
      text: 'день 1. 9:00. ноутбук открыт. чат пуст. кофе остыл. пора начинать.',
      kind: 'system'
    });
    setTimeout(function () {
      triggerLenaIntro();
      renderDock();
    }, 500);
    // Day 1 Khozyaika rent reminder only — rest of her beats spread across days
    setTimeout(function () {
      beatKhozyaikaDay1Rent();
    }, 2500);
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
      var hitChance = e >= 70 ? 0.50 : (e >= 40 ? 0.40 : 0.25); // SPRINT 15 — was 0.65/0.50/0.30
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
          work_units_total: 6, // SPRINT 15 rev2 — 3→4→6: real playtest needed deeper nerf
          upfront_paid: upfront,
          final_due: finalPayment,
          final_payment: finalPayment,
          started_day: STATE.day,
          deadline_day: STATE.day + 10, // SPRINT 15 — 7→10 to match 6 work units
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
      // SPRINT 14 — hunger + hangover affect work progress
      var workProgress = 34;
      if (STATE.hunger < 30) workProgress = 15;
      else if (STATE.hunger < 50) workProgress = 25;
      if (STATE._hangover_active) workProgress = Math.floor(workProgress * 0.75);
      p.progress = Math.min(100, (p.progress || 0) + workProgress);
      p.work_units_done = (p.work_units_done || 0) + 1; // daytime = 1 unit
      postOutgoing('scratch', STATE.hunger < 50 ? pick(WORK_TEXT_HUNGRY) : pick(WORK_TEXT));
      setTimeout(function () {
        var extra = '';
        if (STATE.hunger < 30) extra = ' · 🍔 голод снижает прогресс';
        else if (STATE.hunger < 50) extra = ' · 🍔 голодно';
        if (STATE._hangover_active) extra += ' · ☕ похмелье';
        postSystem('scratch', 'проект #' + p.id + ' · прогресс ' + Math.floor(p.progress) + '%' + extra);
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
      postOutgoing('scratch', pick(EAT_HOME_TEXT));
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
      postOutgoing('scratch', pick(EAT_OUT_TEXT));
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
      postOutgoing('scratch', pick(SHOPPING_TEXT));
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
    // Clear active invite — Kirill gets quiet until next ping
    STATE.kirill_invite_active = false;
    if (STATE.bank_locked) {
      STATE.plate_girl_count = (STATE.plate_girl_count || 0) + 1;
      STATE.kirill_affection = Math.max(0, (STATE.kirill_affection || 0) - 5);
    } else {
      STATE.kirill_affection = (STATE.kirill_affection || 0) + 2;
    }

    runAction(function () {
      postOutgoing('scratch', pick(DATE_KIRILL_TEXT));
      setTimeout(function () {
        postSystem('scratch', '+' + COST.date_kirill.f + ' сытости · +' + COST.date_kirill.m + ' комфорт · −3h · −10⚡');
      }, 400);
    });
  }

  // SPRINT 14.1 — actHangoutDenis() removed. Denis interactions go via chat reply chips
  // with per-event pricing (DENIS_COSTS map at line ~1093). Dock button only opens chat.

  // BLOCK F — night work (extra time beyond 8h day, burns energy + comfort)
  // SPRINT 14 — tracks hangover for next morning
  function actWorkNight() {
    if (STATE.active_projects.length === 0) return;
    if (STATE.day < 3) return;
    if (STATE.energy < COST.work_night.e) return;
    // No hours check — night work happens AFTER the day's 8 hours
    STATE.energy = Math.max(0, STATE.energy - COST.work_night.e);
    STATE.comfort = Math.max(0, STATE.comfort + COST.work_night.m); // .m is negative
    STATE.worked_night_last_day = STATE.day; // SPRINT 14 — triggers hangover

    // SPRINT 19 / BLOCK F — 20% chance of fatigue bug: code has errors, work undone
    var fatigueBug = Math.random() < 0.20;

    runAction(function () {
      var p = STATE.active_projects[0];
      // SPRINT 14 — hunger affects night work too
      var nightProgress = 50;
      if (STATE.hunger < 30) nightProgress = 22;
      else if (STATE.hunger < 50) nightProgress = 37;
      // SPRINT 19 — fatigue bug: instead of +progress, lose 0.5 work_units
      if (fatigueBug) {
        p.work_units_done = Math.max(0, (p.work_units_done || 0) - 0.5);
        postOutgoing('scratch', 'опять баг в коде ночью · переделала утром то что сломала');
      } else {
        p.progress = Math.min(100, (p.progress || 0) + nightProgress);
        p.work_units_done = (p.work_units_done || 0) + 1.5; // night = 1.5 units
        postOutgoing('scratch', pick(WORK_NIGHT_TEXT));
      }
      setTimeout(function () {
        if (fatigueBug) {
          postSystem('scratch', '⚠ ночная работа · усталость · прогресс -0.5 unit');
        } else {
          postSystem('scratch', 'проект #' + p.id + ' · прогресс ' + Math.floor(p.progress) + '% · −15⚡ ночной режим · завтра будет тяжело');
        }
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
        // SPRINT 14 — overnight energy recovery depends on hunger + hangover
        var overnightRecovery = 20;
        if (STATE.hunger < 30) overnightRecovery = 5;
        else if (STATE.hunger < 50) overnightRecovery = 12;
        // Night work hangover — extra penalty
        if (STATE.worked_night_last_day === prevDay) {
          overnightRecovery = Math.max(0, overnightRecovery - 10);
          STATE._hangover_active = true;
        } else {
          STATE._hangover_active = false;
        }
        STATE.energy = Math.min(100, STATE.energy + overnightRecovery);
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
        // SPRINT 12 — Marina's morning inner monologue based on worst resource
        try { postMorningMonologue(); } catch (e) {}
        try { fireDayBeats(STATE.day); } catch (e) { console.error('beats error', e); }
        // Expire Kirill invite if window closed
        if (STATE.kirill_invite_active && STATE.kirill_invite_expires_day && STATE.day > STATE.kirill_invite_expires_day) {
          STATE.kirill_invite_active = false;
        }
        // Check mid-month hard-fail conditions (hunger starvation / comfort breakdown / cash crash)
        try { checkEndings(false); } catch (e) {}
        // SPRINT 02 — Finale track kicks in on last 2 days
        if (STATE.day >= 29 && window.MarinaAudio && window.MarinaAudio.playFinaleTrack) {
          try { window.MarinaAudio.playFinaleTrack(); } catch (e) {}
        }
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

  // ========== Тим as automation consultant (SPRINT 06) ==========
  // Arc: day 5 intro → buys automation tiers → day 28 4th-wall-break → lead form
  // 4 tiers unlock in sequence: $200 auto_reach_out → $300 auto_brief_lead →
  // $400 auto_send_offer → $500 auto_work_project. Each tier makes that action
  // auto-trigger once per day in processPassive (passive income generation).

  var TIM_TIERS = [
    { id: 'auto_reach_out',   label: 'Автофарминг холодных лидов', price: 200 },
    { id: 'auto_brief_lead',  label: 'Авто-созвоны с лидами',      price: 300 },
    { id: 'auto_send_offer',  label: 'Авто-оффер и торг',          price: 400 }
  ];

  function beatTimConsultIntro() {
    if (STATE.beat_tim_consult_intro) return;
    STATE.beat_tim_consult_intro = true;
    var c = findContact('tim'); if (c) { c.visible = true; c.online = true; }

    postMessage('tim', {
      kind: 'incoming',
      senderName: 'Тим',
      photo: 'img/events/tim_kas_view.webp',
      photoAlt: 'вид из каша',
      text: 'привет, марина. лена мне про тебя рассказала. я консультант по автоматизации и AI.'
    });
    setTimeout(function () {
      postMessage('tim', {
        kind: 'incoming',
        senderName: 'Тим',
        text: 'смотри: я могу прикрутить ИИ к твоему процессу поиска клиентов. ты заплатишь один раз, и я настрою систему которая будет искать клиентов за тебя, пока ты спишь.'
      });
    }, 1200);
    setTimeout(function () {
      postMessage('tim', {
        kind: 'incoming',
        senderName: 'Тим',
        text: 'первый уровень — автофарминг холодки. $200. каждый день +1 лид без твоего участия. хочешь попробовать?'
      });
    }, 2400);
    STATE._tim_consult_pending = true;
    postMessage('scratch', { kind: 'system', text: 'Тим предлагает автоматизацию · открой чат' });
  }

  function beatTimTier2Offer() {
    if (STATE.beat_tim_tier2_offer) return;
    STATE.beat_tim_tier2_offer = true;
    postMessage('tim', {
      kind: 'incoming',
      senderName: 'Тим',
      text: 'смотрю твоя система работает. теперь могу автоматизировать созвоны — AI делает brief за тебя. $300. +1 квалифицированный лид в день.'
    });
    STATE._tim_tier2_pending = true;
  }

  function beatTimTier3Offer() {
    if (STATE.beat_tim_tier3_offer) return;
    STATE.beat_tim_tier3_offer = true;
    postMessage('tim', {
      kind: 'incoming',
      senderName: 'Тим',
      text: 'третий уровень: AI сам отправляет офферы и торгуется по базовой стратегии. $400. +1 оффер отправлен в день.'
    });
    STATE._tim_tier3_pending = true;
  }

  // (tier 4 removed — see SPRINT 13)

  // Day 28 — 4th wall break (moved from interaction-based to late-game beat)
  function beatTimCreator() {
    if (STATE.beat_tim_creator_fired) return;
    STATE.beat_tim_creator_fired = true;
    var c = findContact('tim'); if (c) { c.visible = true; c.online = true; }
    STATE.notebook_available = true;

    postMessage('tim', {
      kind: 'incoming',
      senderName: 'Тим',
      text: 'слушай, марина. есть одна штука которую я до сих пор не сказал.'
    });
    setTimeout(function () {
      postMessage('tim', {
        kind: 'incoming',
        senderName: 'Тим',
        text: 'я не персонаж. я реально Тим. я создатель этой игры. и ты прямо сейчас читаешь это как игрок, а не как Марина.'
      });
    }, 1500);
    setTimeout(function () {
      postMessage('tim', {
        kind: 'incoming',
        senderName: 'Тим',
        text: 'то что я рассказывал Марине про автоматизацию — это реально то, чем я занимаюсь. я прикручиваю ИИ к бизнесам. если тебе надо такое — нажми кнопку ниже, заполни форму, я свяжусь лично.'
      });
    }, 3000);
    setTimeout(function () {
      postMessage('tim', {
        kind: 'incoming',
        senderName: 'Тим',
        text: 'без воронок, без курсов. просто я и ты. если интересно — жди сообщения в течение суток.'
      });
    }, 4500);
    postMessage('scratch', { kind: 'system', text: '❕ сообщение от Тима (реального) · открой чат' });
  }

  function bumpInteraction() {
    STATE.player_interactions = (STATE.player_interactions || 0) + 1;
  }

  // ========== Хозяйка (SPRINT 06: 6+ beats starting day 1) ==========

  function beatKhozyaikaDay1Rent() {
    if (STATE.beat_khozyaika_day1) return;
    STATE.beat_khozyaika_day1 = true;
    var c = findContact('khozyaika'); if (c) c.visible = true;
    postMessage('khozyaika', {
      kind: 'incoming',
      senderName: 'Наталья Валерьевна',
      text: 'Марина, добрый день! На всякий случай напоминаю: оплата за квартиру $500 первого числа каждой декады — 10, 20 и 30. Поздравляю с новой главой в жизни!'
    });
    setTimeout(function () {
      postMessage('khozyaika', {
        kind: 'incoming',
        senderName: 'Наталья Валерьевна',
        text: 'И если вдруг задержка — дайте знать. Я приду с ключами уже со своим дворником. У него характер.'
      });
    }, 1200);
    postMessage('scratch', { kind: 'system', text: 'хозяйка напомнила про аренду · 10/20/30 число · $500' });
  }

  function beatKhozyaikaDay2Komod() {
    if (STATE.beat_khozyaika_komod) return;
    STATE.beat_khozyaika_komod = true;
    var c = findContact('khozyaika'); if (c) c.visible = true;
    postMessage('khozyaika', {
      kind: 'incoming',
      senderName: 'Наталья Валерьевна',
      text: 'Марина, мне сегодня приснилось что вы поцарапали комод в прихожей. Комод этот от дедушки, ручная работа, ему 60 лет. Я его берегу.'
    });
    setTimeout(function () {
      postMessage('khozyaika', {
        kind: 'incoming',
        senderName: 'Наталья Валерьевна',
        text: 'Ничего страшного, конечно, просто на всякий случай — осмотрите его, пожалуйста. И напишите мне фото. Я волнуюсь.'
      });
    }, 1000);
  }

  function beatKhozyaika1() {
    if (STATE.beat_khozyaika_1) return;
    STATE.beat_khozyaika_1 = true;
    var c = findContact('khozyaika'); if (c) c.visible = true;
    postMessage('khozyaika', {
      kind: 'incoming',
      senderName: 'Наталья Валерьевна',
      photo: 'img/events/khozyaika_meters.webp',
      photoAlt: 'счётчики воды',
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
      photo: 'img/events/khozyaika_cat.webp',
      photoAlt: 'кошка Мурка',
      text: 'SOS МАРИНА! Кошка Мурка сбежала из квартиры на восьмом этаже. Помогите расклеить объявления по району, вы же дома работаете? У вас время есть. Срочно пожалуйста.'
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
      photo: 'img/events/khozyaika_tarot.webp',
      photoAlt: 'карты таро',
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
      text: 'слушай, у меня жёсткая ситуация — нужно $300 на пару недель. верну $450, честно. помоги, пожалуйста.'
    });
    postMessage('scratch', { kind: 'system', text: 'бывший просит денег · открой чат' });
    STATE._pavel_pending = true;
  }

  // SPRINT 06 — бывший пишет чаще до Кирилла
  function beatPavelNightDay2() {
    if (STATE.beat_pavel_night_day2) return;
    STATE.beat_pavel_night_day2 = true;
    var c = findContact('pavel'); if (c) c.visible = true;
    postMessage('pavel', { kind: 'incoming', senderName: 'Павел', text: 'привет, спишь?' });
  }

  function beatPavelDay5() {
    if (STATE.beat_pavel_day5) return;
    STATE.beat_pavel_day5 = true;
    var c = findContact('pavel'); if (c) c.visible = true;
    postMessage('pavel', { kind: 'incoming', senderName: 'Павел', photo: 'img/events/pavel_roof.webp', photoAlt: 'крыша', text: 'я тут вспомнил, как мы с тобой в Питере сидели на Мойке. помнишь?' });
    setTimeout(function () {
      postMessage('pavel', { kind: 'incoming', senderName: 'Павел', text: 'тебе было 23, мне 27. я был дурак и не понимал ничего. прости если что.' });
    }, 1200);
  }

  function beatPavelDay7() {
    if (STATE.beat_pavel_day7) return;
    STATE.beat_pavel_day7 = true;
    var c = findContact('pavel'); if (c) c.visible = true;
    postMessage('pavel', { kind: 'incoming', senderName: 'Павел', text: 'слушай, ты сейчас одна? в смысле по жизни.' });
  }

  // ========== SPRINT 07 — Late-game density beats ==========

  function beatKhozyaikaD22() {
    if (STATE.beat_khozyaika_d22) return;
    STATE.beat_khozyaika_d22 = true;
    var c = findContact('khozyaika'); if (c) c.visible = true;
    postMessage('khozyaika', {
      kind: 'incoming',
      senderName: 'Наталья Валерьевна',
      text: 'Марина, я вчера видела сон будто у нас в подъезде появился домовой в форме кошки. Мурка теперь на подоконнике смотрит в одну точку третий день. Вы не против если я загляну освятить квартиру батюшкой?'
    });
  }

  function beatKhozyaikaD27() {
    if (STATE.beat_khozyaika_d27) return;
    STATE.beat_khozyaika_d27 = true;
    var c = findContact('khozyaika'); if (c) c.visible = true;
    postMessage('khozyaika', {
      kind: 'incoming',
      senderName: 'Наталья Валерьевна',
      text: 'Марина, на следующей неделе полнолуние в Раке. В это время комоды особенно уязвимы. Пожалуйста, не ставьте на него горячие чашки и не включайте китайских мантр рядом. И вообще лучше выйти из квартиры между 23:00 и 01:00.'
    });
  }

  function beatOlyaRetry() {
    if (STATE.beat_olya_retry) return;
    STATE.beat_olya_retry = true;
    var c = findContact('olya'); if (c) c.visible = true;
    postMessage('olya', {
      kind: 'incoming',
      senderName: 'Оля Петрова',
      photo: 'img/events/olya_product.webp',
      photoAlt: 'продукт клуба',
      text: 'Мариночка, как ты? Я тут обновление по нашему клубу — мы запускаем НОВЫЙ уровень. Всего $400, но ты получаешь в три раза больше активаций. Подумай, я верю в тебя!'
    });
  }

  function beatOlyaFinal() {
    if (STATE.beat_olya_final) return;
    STATE.beat_olya_final = true;
    var c = findContact('olya'); if (c) c.visible = true;
    postMessage('olya', {
      kind: 'incoming',
      senderName: 'Оля Петрова',
      text: 'Марина, я понимаю что ты сомневаешься. Но вот скриншот моего дохода за месяц: $3200 чистыми. И это не предел. Последнее предложение: $150, заходишь бесплатным уровнем и начинаешь зарабатывать.'
    });
  }

  function beatKryptaRetry() {
    if (STATE.beat_krypta_retry) return;
    STATE.beat_krypta_retry = true;
    var c = findContact('krypta'); if (c) c.visible = true;
    postMessage('krypta', {
      kind: 'incoming',
      senderName: 'БРАТ крипта',
      photo: 'img/events/krypta_wallet.webp',
      photoAlt: 'крипто-кошелёк',
      text: 'БРАТ алё ты жива? смотри SOLANA х3 за неделю я говорил! у меня есть ещё 1 слот. $50 минимум, на следующей неделе $500. не упусти'
    });
  }

  function beatKryptaFinal() {
    if (STATE.beat_krypta_final) return;
    STATE.beat_krypta_final = true;
    var c = findContact('krypta'); if (c) c.visible = true;
    postMessage('krypta', {
      kind: 'incoming',
      senderName: 'БРАТ крипта',
      text: 'сестра, скажу честно. у меня не было $100. они пошли на оплату хостинга для моего блога. но завтра реально точно ракета. прости брат. больше не будет. $30?'
    });
  }

  function beatPavelD13() {
    if (STATE.beat_pavel_d13) return;
    STATE.beat_pavel_d13 = true;
    var c = findContact('pavel'); if (c) c.visible = true;
    postMessage('pavel', {
      kind: 'incoming',
      senderName: 'Павел',
      photo: 'img/events/pavel_bridge.webp',
      photoAlt: 'мост ночью',
      text: 'марина я вчера был в твоём доме. просто проходил. вспомнил крышу куда мы поднимались в мае 2022. помнишь?'
    });
  }

  function beatPavelD17() {
    if (STATE.beat_pavel_d17) return;
    STATE.beat_pavel_d17 = true;
    var c = findContact('pavel'); if (c) c.visible = true;
    postMessage('pavel', {
      kind: 'incoming',
      senderName: 'Павел',
      text: 'слушай. а если я серьёзно. давай встретимся на чашку кофе. без возврата денег, без истории. как старые знакомые.'
    });
  }

  function beatPavelD21() {
    if (STATE.beat_pavel_d21) return;
    STATE.beat_pavel_d21 = true;
    var c = findContact('pavel'); if (c) c.visible = true;
    postMessage('pavel', {
      kind: 'incoming',
      senderName: 'Павел',
      text: 'марин, слышал у тебя кто-то появился. может не стоит? ты меня лучше знаешь.'
    });
  }

  function beatPavelD25() {
    if (STATE.beat_pavel_d25) return;
    STATE.beat_pavel_d25 = true;
    var c = findContact('pavel'); if (c) c.visible = true;
    postMessage('pavel', {
      kind: 'incoming',
      senderName: 'Павел',
      text: 'ну и ладно. удачи. я всегда был рядом когда тебе было сложно. помни.'
    });
  }

  function beatMamaD20() {
    if (STATE.beat_mama_d20) return;
    STATE.beat_mama_d20 = true;
    var c = findContact('mama'); if (c) c.visible = true;
    postMessage('mama', {
      kind: 'incoming',
      senderName: 'мама',
      text: 'доча, соседка спрашивает какой у тебя бизнес. я сказала что ты творческая, всё пишешь. она говорит это хорошо. у её дочки такой же бизнес, но та получает зарплату в мвд. но я тебя не сравниваю.'
    });
  }

  function beatDenisD22() {
    if (STATE.beat_denis_d22) return;
    STATE.beat_denis_d22 = true;
    var c = findContact('denis'); if (c) c.visible = true;
    postMessage('denis', {
      kind: 'incoming',
      senderName: 'Денис',
      text: 'марин, слышал про тебя от общих. гордимся. держись. кстати — парус-тур на выходных, присоединяйся.'
    });
  }

  // Настя — параллельная arc коллеги-фаундера
  function beatNastyaD6() {
    if (STATE.beat_nastya_d6) return;
    STATE.beat_nastya_d6 = true;
    var c = findContact('nastya'); if (c) c.visible = true;
    postMessage('nastya', {
      kind: 'incoming',
      senderName: 'Настя',
      photo: 'img/events/nastya_desk.webp',
      photoAlt: 'рабочий стол',
      text: 'привет! я Настя, тоже фрилансер, мы вроде в одном чате в telegram были. хотела спросить — как ты справляешься с первыми неделями без офиса?'
    });
    setTimeout(function () {
      postMessage('nastya', {
        kind: 'incoming',
        senderName: 'Настя',
        text: 'у меня прям паника каждое утро. но я вот начала выписывать три задачи в день вместо десяти. помогает.'
      });
    }, 1100);
  }

  function beatNastyaD11() {
    if (STATE.beat_nastya_d11) return;
    STATE.beat_nastya_d11 = true;
    var c = findContact('nastya'); if (c) c.visible = true;
    postMessage('nastya', {
      kind: 'incoming',
      senderName: 'Настя',
      text: 'ооо я сегодня закрыла второй проект. чувствую себя богиней. и одновременно засыпаю стоя. как оно у тебя?'
    });
  }

  function beatNastyaD16() {
    if (STATE.beat_nastya_d16) return;
    STATE.beat_nastya_d16 = true;
    var c = findContact('nastya'); if (c) c.visible = true;
    postMessage('nastya', {
      kind: 'incoming',
      senderName: 'Настя',
      photo: 'img/events/nastya_coworking.webp',
      photoAlt: 'коворкинг',
      text: 'слушай, думала. нам надо объединяться. одна хорошо, но вдвоём быстрее. может посидим, обсудим?'
    });
  }

  function beatNastyaD20() {
    if (STATE.beat_nastya_d20) return;
    STATE.beat_nastya_d20 = true;
    var c = findContact('nastya'); if (c) c.visible = true;
    postMessage('nastya', {
      kind: 'incoming',
      senderName: 'Настя',
      text: 'у меня тут проект на двух человек, клиент крупный. половину могу тебе отдать. $400 твои, только делай хорошо. интересно?'
    });
  }

  function beatNastyaD25() {
    if (STATE.beat_nastya_d25) return;
    STATE.beat_nastya_d25 = true;
    var c = findContact('nastya'); if (c) c.visible = true;
    postMessage('nastya', {
      kind: 'incoming',
      senderName: 'Настя',
      text: 'марин, я серьёзно думаю о партнёрстве. давай после месяца встретимся и обсудим. у меня есть план.'
    });
  }

  function beatNastyaD30() {
    if (STATE.beat_nastya_d30) return;
    STATE.beat_nastya_d30 = true;
    var c = findContact('nastya'); if (c) c.visible = true;
    postMessage('nastya', {
      kind: 'incoming',
      senderName: 'Настя',
      text: 'ты дожила. я горжусь. давай встретимся в воскресенье, я принесу вино и план на следующий месяц.'
    });
  }

  // ========== Светка подружка (SPRINT 06) — гороскоп, голосовые, сплетни ==========

  var SVETKA_GOSSIP = [
    {
      intros: [
        '🎤 голосовое сообщение · 47 минут',
        '🎤 голосовое сообщение · 52 минуты',
        '🎤 голосовое сообщение · 38 минут',
        '🎤 голосовое сообщение · 1 час 2 минуты',
        '🎤 голосовое сообщение · 44 минуты'
      ],
      gossip: [
        'марин! ты не поверишь. Ленка с работы встречается с ТЕМ саМЫМ! ну помнишь который был женат на Наташе которая в декрете? ну которая на йогу ходит в ту студию где теперь мой тренер по пилатесу работает? так вот ТА Наташа — она беременна ВТОРЫМ от своего нового который был в тиндере у меня 2 года назад! марина это катастрофа я не знаю кому звонить. перезвони срочно пожалуйста ТОЛЬКО ТЕБЕ МОГУ СКАЗАТЬ 😭',
        'марина ты не поверишь что вчера было. я пошла на ту выставку где был пиар-вечер и встретила ТОГО САМОГО Олежу, помнишь мы на дне рождения у Ксюши с ним сидели и он сказал что у него свой стартап? так вот ОКАЗАЛОСЬ он таксует в яндексе, а стартап это что он продаёт кальяны онлайн. кальяны карл. и в процессе рассказа как он кальяны продаёт ОН МЕНЯ ПОЦЕЛОВАЛ я в шоке',
        'слушай у меня тут драма. я переспала с Антоном — помнишь он нас знакомил на квартирнике в декабре? ну тот который по йоге гуру а на самом деле бухгалтер в адидасе. так вот. я узнала что у него есть ДЕВУШКА и она в Грузии сейчас и мы встречались всю неделю и он мне СКАЗАЛ что у него никого и я ЧУВСТВУЮ что я разрушила отношения. марина что мне делать звонить ей??',
        'ты СИДИШЬ? маринчик моя тётя узнала что мой двоюродный брат развёлся с Кариной потому что она ему изменила с их СОСЕДОМ! карл! с соседом! у которого кошка живёт у них в квартире пока он в командировках! так вот они все три года пока она ей изменяла у них был такой график когда кошка приходит когда кошка уходит!!! это же конец света скажи мне!!',
        'марина я вчера гадала на картах таро и мне выпал аркан башни в позиции близкого будущего я в панике что это значит?? гуглила всю ночь говорят это развод с кем-то кого я ещё даже не встретила это как мне готовиться?? я в панике я себе купила новую помаду но это не помогает'
      ]
    }
  ];

  // SPRINT 14.2 — Светка random photo pool
  var SVETKA_PHOTOS = [
    { src: 'img/events/svetka_phone.webp', alt: 'светка звонит' },
    { src: 'img/events/svetka_drama.webp', alt: 'драма' },
    { src: 'img/events/svetka_taro.webp', alt: 'карты таро' }
  ];

  function svetkaBeat(key) {
    if (STATE[key]) return;
    STATE[key] = true;
    var c = findContact('svetka'); if (c) c.visible = true;
    var deck = SVETKA_GOSSIP[0];
    var voiceLabel = pick(deck.intros);
    var gossip = pick(deck.gossip);
    var photo = pick(SVETKA_PHOTOS);
    postMessage('svetka', {
      kind: 'incoming',
      senderName: 'Светка',
      text: voiceLabel + '\n\n(не слушается)'
    });
    setTimeout(function () {
      postMessage('svetka', {
        kind: 'incoming',
        senderName: 'Светка',
        photo: photo.src,
        photoAlt: photo.alt,
        text: gossip
      });
    }, 1000);
    STATE._svetka_pending = true;
  }

  function beatPavelDay9() {
    if (STATE.beat_pavel_day9) return;
    STATE.beat_pavel_day9 = true;
    var c = findContact('pavel'); if (c) c.visible = true;
    postMessage('pavel', { kind: 'incoming', senderName: 'Павел', text: 'марина, если честно — я думаю о тебе каждый день уже которую неделю. я знаю что ты не хочешь. но ты должна это услышать.' });
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
      photo: 'img/events/mama_pie.webp',
      photoAlt: 'мамины пироги',
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
      photo: 'img/events/mama_letter.webp',
      photoAlt: 'мамино письмо',
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

  // ========== SPRINT 01 — Kirill Love Arc ==========

  function beatKirillLove1() {
    if (STATE.beat_kirill_love_1) return;
    if ((STATE.kirill_affection || 0) < 3) return;
    if (STATE.kirill_blocked) return;
    STATE.beat_kirill_love_1 = true;
    var c = findContact('kirill'); if (c) c.visible = true;

    postMessage('kirill', {
      kind: 'incoming',
      senderName: 'Кирилл',
      text: 'слушай, я тут подумал. я понимаю что звучит странно, но ты мне нравишься не только на ужинах.'
    });
    setTimeout(function () {
      postMessage('kirill', {
        kind: 'incoming',
        senderName: 'Кирилл',
        text: 'у тебя в глазах что-то такое — как будто ты сражаешься с драконом и никому не рассказываешь. я это вижу. и мне хочется просто сидеть рядом.'
      });
    }, 1200);
    setTimeout(function () {
      postMessage('kirill', {
        kind: 'incoming',
        senderName: 'Кирилл',
        text: 'как ты вообще?'
      });
    }, 2400);
    postMessage('scratch', { kind: 'system', text: 'Кирилл написал что-то странное · открой чат' });
    STATE._kirill_love1_pending = true;
    STATE.kirill_invite_active = true;
    STATE.kirill_invite_expires_day = (STATE.day || 1) + 2;
  }

  function beatKirillLove2() {
    if (STATE.beat_kirill_love_2) return;
    if ((STATE.kirill_affection || 0) < 4) return;
    if (STATE.kirill_blocked) return;
    STATE.beat_kirill_love_2 = true;
    var c = findContact('kirill'); if (c) c.visible = true;

    postMessage('kirill', {
      kind: 'incoming',
      senderName: 'Кирилл',
      text: 'марин, давай встретимся. не ради ужина. просто пройдёмся, я хочу с тобой поговорить.'
    });
    setTimeout(function () {
      postMessage('kirill', {
        kind: 'incoming',
        senderName: 'Кирилл',
        text: 'у меня нет плана, нет повода. просто хочу быть рядом пару часов. как тебе?'
      });
    }, 1100);
    STATE._kirill_love2_pending = true;
    STATE.kirill_invite_active = true;
    STATE.kirill_invite_expires_day = (STATE.day || 1) + 2;
    postMessage('scratch', { kind: 'system', text: 'Кирилл зовёт без повода · открой чат' });
  }

  function beatKirillLoveFinal() {
    if (STATE.beat_kirill_love_final) return;
    if ((STATE.kirill_affection || 0) < 5) return;
    if (STATE.kirill_blocked) return;
    STATE.beat_kirill_love_final = true;
    var c = findContact('kirill'); if (c) c.visible = true;

    postMessage('kirill', {
      kind: 'incoming',
      senderName: 'Кирилл',
      text: 'марина. я за эти недели понял одну штуку.'
    });
    setTimeout(function () {
      postMessage('kirill', {
        kind: 'incoming',
        senderName: 'Кирилл',
        text: 'ты не лёгкая. ты не ангел. ты иногда уставшая и злая. но когда ты говоришь о своей работе — у тебя в голосе огонь. и я хочу быть тем, кто этот огонь слушает, когда ты приходишь домой.'
      });
    }, 1200);
    setTimeout(function () {
      postMessage('kirill', {
        kind: 'incoming',
        senderName: 'Кирилл',
        text: 'я не прошу переехать. я не прошу обещаний. я прошу только разрешения. быть.'
      });
    }, 2400);
    setTimeout(function () {
      postMessage('scratch', { kind: 'system', text: '────── строчка в блокнот ──────' });
    }, 3600);
    setTimeout(function () {
      postOutgoing('scratch', 'я не ожидала. вообще. от него, от себя, от этого месяца.');
    }, 4000);
    setTimeout(function () {
      postOutgoing('scratch', 'кажется я влюбилась. и самое странное — мне не страшно.');
    }, 4800);
    setTimeout(function () {
      STATE.love_ending_unlocked = true;
      save();
      postMessage('scratch', { kind: 'system', text: '❤️ love ending разблокирован' });
    }, 5600);
    STATE._kirill_love_final_pending = true;
  }

  function beatDenis(day) {
    var flag = 'beat_denis' + day;
    if (STATE[flag]) return;
    STATE[flag] = true;
    var c = findContact('denis'); if (c) c.visible = true;
    var texts = {
      3: 'марин, задолбал сидеть дома. поехали на регату в субботу? море, ветер, никаких писем',
      6: 'слушай, давай на кофе сходим? нашёл новое место на углу, тебе понравится. час, не больше',
      9: 'перестань работать хоть на день. гулять поехали на набережную? я занесу вино',
      15: 'марина, парус-тур в субботу. 5 человек, яхта, вечер. место есть для тебя',
      27: 'новый год через 3 дня. у меня на квартире посиделки, не пропусти'
    };
    var photos = {
      3: 'img/events/regatta.webp',
      6: 'img/events/denis_coffee_spot.webp',
      9: 'img/events/street_window.webp',
      15: 'img/events/denis_yacht.webp',
      27: 'img/events/denis_new_year.webp'
    };
    postMessage('denis', {
      kind: 'incoming',
      senderName: 'Денис',
      photo: photos[day] || 'img/events/street_window.webp',
      photoAlt: day === 3 ? 'регата' : day === 6 ? 'кофейня' : day === 15 ? 'яхта' : day === 27 ? 'новый год' : 'гулянка',
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
    postMessage('olya', { kind: 'incoming', senderName: 'Оля Петрова', photo: 'img/events/olya_pyramid.webp', photoAlt: 'клуб женщин', text: 'Мариночка приветик! Это Оля Петрова, мы учились вместе в 11-Б. Помнишь меня?' });
    setTimeout(function () {
      postMessage('olya', { kind: 'incoming', senderName: 'Оля Петрова', text: 'У меня появилась уникальная возможность для женщин которые хотят изменить жизнь и финансы. Можно я расскажу 5 минут?' });
    }, 900);
    setTimeout(function () {
      postMessage('olya', { kind: 'incoming', senderName: 'Оля Петрова', text: 'Это не пирамида, это клуб ✨ инвестиция всего $200, возвращается х3 за 2 месяца гарантированно' });
    }, 1800);
    STATE._olya_pending = true;
    postMessage('scratch', { kind: 'system', text: 'одноклассница пишет · открой чат' });
  }

  // SPRINT 20 — Kirill arc expansion: 5 new scenes + conflict beat
  function beatKirillScene11() {
    if (STATE.beat_kirill_scene11) return;
    if (!STATE.kirill_unlocked || STATE.kirill_blocked) return;
    STATE.beat_kirill_scene11 = true;
    var c = findContact('kirill'); if (c) c.visible = true;
    postMessage('kirill', {
      kind: 'incoming',
      senderName: 'Кирилл',
      text: 'вчера ты странно себя вела на ужине. сказала "я в порядке" три раза. это обычно значит обратное. я не давлю, просто — если что, я тут.'
    });
  }

  function beatKirillScene13() {
    if (STATE.beat_kirill_scene13) return;
    if (!STATE.kirill_unlocked || STATE.kirill_blocked) return;
    STATE.beat_kirill_scene13 = true;
    var c = findContact('kirill'); if (c) c.visible = true;
    postMessage('kirill', {
      kind: 'incoming',
      senderName: 'Кирилл',
      text: 'покажу тебе одну штуку. я с 17 лет пишу в блокноты, никогда не показывал никому. вот страница 47 из прошлого года.'
    });
    setTimeout(function () {
      postMessage('kirill', {
        kind: 'incoming',
        senderName: 'Кирилл',
        text: '«все настоящее — тихое. и когда я найду её, я её узнаю по тишине.»\n\nэто я писал когда мне было 28. тебе — не говорю зачем показываю.'
      });
    }, 1100);
  }

  // SPRINT 20 — CONFLICT beat
  function beatKirillConflict16() {
    if (STATE.beat_kirill_conflict16) return;
    if (!STATE.kirill_unlocked || STATE.kirill_blocked) return;
    STATE.beat_kirill_conflict16 = true;
    var c = findContact('kirill'); if (c) c.visible = true;
    postMessage('kirill', {
      kind: 'incoming',
      senderName: 'Кирилл',
      text: 'марина. я видел что ты отвечала Павлу в 2 часа ночи. три дня подряд. я не ревную, я просто спрашиваю.'
    });
    setTimeout(function () {
      postMessage('kirill', {
        kind: 'incoming',
        senderName: 'Кирилл',
        text: 'если ты возвращаешься туда — скажи сейчас. я не буду мешать.'
      });
    }, 1200);
    postMessage('scratch', { kind: 'system', text: '⚠ Кирилл конфликт · открой чат' });
    STATE._kirill_conflict_pending = true;
  }

  function beatKirillResolution19() {
    if (STATE.beat_kirill_resolution19) return;
    if (!STATE.kirill_unlocked || STATE.kirill_blocked) return;
    // Resolution triggers only if affection survived conflict (>=4)
    if ((STATE.kirill_affection || 0) < 4) return;
    STATE.beat_kirill_resolution19 = true;
    var c = findContact('kirill'); if (c) c.visible = true;
    postMessage('kirill', {
      kind: 'incoming',
      senderName: 'Кирилл',
      text: 'прости за тот вопрос про Павла. я не имел права. просто испугался что теряю тебя раньше чем узнал.'
    });
    setTimeout(function () {
      postMessage('kirill', {
        kind: 'incoming',
        senderName: 'Кирилл',
        text: 'я учусь доверять. медленно, но учусь.'
      });
    }, 1200);
    STATE.kirill_affection = (STATE.kirill_affection || 0) + 1;
    STATE.comfort = Math.min(100, (STATE.comfort || 0) + 5);
  }

  function beatKirillPreFinale24() {
    if (STATE.beat_kirill_prefinale24) return;
    if (!STATE.kirill_unlocked || STATE.kirill_blocked) return;
    if ((STATE.kirill_affection || 0) < 5) return;
    STATE.beat_kirill_prefinale24 = true;
    var c = findContact('kirill'); if (c) c.visible = true;
    postMessage('kirill', {
      kind: 'incoming',
      senderName: 'Кирилл',
      text: 'через неделю закончится этот твой первый месяц. ты устанешь, я знаю. я просто хочу сказать — мне всё равно сдашь ты три проекта или один. я с тобой.'
    });
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
    postMessage('krypta', { kind: 'incoming', senderName: 'БРАТ крипта', photo: 'img/events/krypta_moon.webp', photoAlt: 'крипто-луна', text: 'БРАТ' });
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

  // ========== SPRINT 14 — Guaranteed economy drain events ==========

  function beatDrainCharger() {
    if (STATE.beat_drain_charger) return;
    STATE.beat_drain_charger = true;
    STATE.cash -= 60;
    postBank(-60, 'зарядка для ноутбука');
    postMessage('scratch', {
      kind: 'outgoing',
      photo: 'img/events/charger_broken.webp',
      photoAlt: 'сломанная зарядка',
      text: 'зарядка сдохла. прямо посреди работы. новая — $60. без неё никак.'
    });
    postSystem('scratch', '⚡ −$60 · зарядка для ноутбука');
  }

  function beatDrainPhone() {
    if (STATE.beat_drain_phone) return;
    STATE.beat_drain_phone = true;
    STATE.cash -= 80;
    postBank(-80, 'ремонт экрана телефона');
    postMessage('scratch', {
      kind: 'outgoing',
      photo: 'img/events/phone_cracked.webp',
      photoAlt: 'треснувший экран',
      text: 'уронила телефон. экран в паутине. без него нет связи с клиентами. ремонт $80.'
    });
    postSystem('scratch', '📱 −$80 · ремонт экрана');
  }

  function beatDrainDentist() {
    if (STATE.beat_drain_dentist) return;
    STATE.beat_drain_dentist = true;
    STATE.cash -= 150;
    STATE.hours = Math.max(0, STATE.hours - 2);
    postBank(-150, 'стоматолог · срочный');
    postMessage('scratch', {
      kind: 'outgoing',
      photo: 'img/events/dentist_receipt.webp',
      photoAlt: 'чек стоматолога',
      text: 'зуб. проснулась от боли в 5 утра. стоматолог $150, без вариантов. полдня потеряно.'
    });
    postSystem('scratch', '🦷 −$150 · −2h · стоматолог');
  }

  function beatDrainElectric() {
    if (STATE.beat_drain_electric) return;
    STATE.beat_drain_electric = true;
    STATE.cash -= 100;
    postBank(-100, 'электричество + интернет');
    postMessage('scratch', {
      kind: 'outgoing',
      photo: 'img/events/electric_bill.webp',
      photoAlt: 'квитанция',
      text: 'пришёл счёт за электричество и интернет. $100. автосписание. ничего не сделаешь.'
    });
    postSystem('scratch', '💡 −$100 · коммуналка');
  }

  // ========== SPRINT 14 — Khozyaika arc enhancement ==========

  // Pre-day-12: annoying beats
  function beatKhozyaikaDay3Noise() {
    if (STATE.beat_khozyaika_day3_noise) return;
    STATE.beat_khozyaika_day3_noise = true;
    var c = findContact('khozyaika'); if (c) c.visible = true;
    postMessage('khozyaika', {
      kind: 'incoming',
      senderName: 'Наталья Валерьевна',
      photo: 'img/events/khozyaika_noise.webp',
      photoAlt: 'хозяйка у двери',
      text: 'Марина, соседи с первого этажа жаловались на шум. Вы работаете после 23:00? Пожалуйста, тише печатайте на клавиатуре. У нас дом 1978 года, слышимость как в коммуналке. Я серьёзно.'
    });
    STATE.comfort = Math.max(0, STATE.comfort - 5);
    postSystem('scratch', '−5 комфорт · хозяйка жалуется на шум');
  }

  function beatKhozyaikaDay5Electric() {
    if (STATE.beat_khozyaika_day5_electric) return;
    STATE.beat_khozyaika_day5_electric = true;
    var c = findContact('khozyaika'); if (c) c.visible = true;
    postMessage('khozyaika', {
      kind: 'incoming',
      senderName: 'Наталья Валерьевна',
      photo: 'img/events/khozyaika_meters.webp',
      photoAlt: 'электросчётчик',
      text: 'Марина, вы сегодня снимаете показания электросчётчика? Я за ваш свет плачу, мне надо знать сколько. Скиньте фото. И сразу: почему розетка на кухне воняет? Вы что-то включали кроме чайника?'
    });
    STATE._khozyaika_electric_pending = true;
  }

  function beatKhozyaikaDay7Damage() {
    if (STATE.beat_khozyaika_day7_damage) return;
    STATE.beat_khozyaika_day7_damage = true;
    var c = findContact('khozyaika'); if (c) c.visible = true;
    postMessage('khozyaika', {
      kind: 'incoming',
      senderName: 'Наталья Валерьевна',
      photo: 'img/events/khozyaika_damage.webp',
      photoAlt: 'царапина на линолеуме',
      text: 'Марина, я тут была у вас пока вы на работе. Обнаружила ЦАРАПИНУ на линолеуме в прихожей. Это было до вас или после? Мне важно для страховки.'
    });
    setTimeout(function () {
      postMessage('khozyaika', {
        kind: 'incoming',
        senderName: 'Наталья Валерьевна',
        text: 'И ещё — в ванной потёк кран. Вызовите сантехника сами, $50 за выезд. Я не обязана.'
      });
    }, 1000);
    STATE.cash -= 50;
    postBank(-50, 'сантехник по требованию хозяйки');
    postSystem('scratch', '🔧 −$50 · хозяйка заставила вызвать сантехника');
  }

  function beatKhozyaikaDay9Chain() {
    if (STATE.beat_khozyaika_day9_chain) return;
    STATE.beat_khozyaika_day9_chain = true;
    var c = findContact('khozyaika'); if (c) c.visible = true;
    postMessage('khozyaika', {
      kind: 'incoming',
      senderName: 'Наталья Валерьевна',
      photo: 'img/events/khozyaika_tarot.webp',
      photoAlt: 'карты таро',
      text: 'Марина, это ОЧЕНЬ ВАЖНО. Перешлите это сообщение пяти людям: «квартира, в которой живёт женщина-фаундер, накапливает карму неудач если не распространять энергию благодарности». Мне так психолог-астролог сказал. Она раньше работала в МЧС.'
    });
    STATE._khozyaika_chain_pending = true;
  }

  // Post-day-12: sweet beats
  function beatKhozyaikaPost12(variant) {
    var flagKey = 'beat_khozyaika_post12_' + variant;
    if (STATE[flagKey]) return;
    STATE[flagKey] = true;
    var c = findContact('khozyaika'); if (c) c.visible = true;
    var texts = {
      flowers: 'Мариночка, надеюсь вы покушали сегодня. 🌸 Я вот вчера пирог с капустой пекла, думала про вас. Мурка тоже сидит и мурлычет — чувствует что вы хорошая. Держитесь, родная!',
      quote1: 'Марина, видела мотивирующий пост: «Сильная женщина — не та что не плачет, а та что плачет и всё равно делает». Это про вас. 💪🌸 Вы справитесь, я чувствую.',
      quote2: 'Мариночка, как дела? Я тут свечку за вас в церкви поставила. Не за квартиру — за вас лично. Мурка тоже передаёт привет 🐱 P.S. комод в порядке, не переживайте.'
    };
    // Photo only for quote2 ("свечку поставила") — matches khozyaika_sweet aesthetic
    var msg = {
      kind: 'incoming',
      senderName: 'Наталья Валерьевна',
      text: texts[variant] || texts.flowers
    };
    if (variant === 'quote2') {
      msg.photo = 'img/events/khozyaika_sweet.webp';
      msg.photoAlt = 'свечка и фото Мурки';
    }
    postMessage('khozyaika', msg);
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
              STATE.kirill_invite_active = true;
              STATE.kirill_invite_expires_day = (STATE.day || 1) + 2;
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
    // SPRINT 14 — guaranteed drain events (fire before story beats)
    if (day === 3) beatDrainCharger();
    if (day === 6) beatDrainPhone();
    if (day === 8) beatDrainDentist();
    if (day === 11) beatDrainElectric();
    // SPRINT 14 — khozyaika pre-day-12 annoyance
    if (day === 3) beatKhozyaikaDay3Noise();
    if (day === 5) beatKhozyaikaDay5Electric();
    if (day === 7) beatKhozyaikaDay7Damage();
    if (day === 9) beatKhozyaikaDay9Chain();
    // SPRINT 14 — khozyaika post-day-12 sweetness
    if (day === 14) beatKhozyaikaPost12('flowers');
    if (day === 17) beatKhozyaikaPost12('quote1');
    if (day === 21) beatKhozyaikaPost12('quote2');
    // v2.1.1 — 30-day arc with tighter Khozyaika spam
    if (day === 2) { beatKhozyaikaDay2Komod(); beatPavelNightDay2(); }
    if (day === 3) { beatDenis(3); beatOlya(); }
    if (day === 4) beatKhozyaika1(); // счётчики воды
    if (day === 5) { beatAnnaOffer(); beatPavelDay5(); beatTimConsultIntro(); }
    if (day === 10 && STATE.auto_reach_out) beatTimTier2Offer();
    if (day === 16 && STATE.auto_brief_lead) beatTimTier3Offer();
    // (tier 4 removed — work_on_project stays manual)
    if (day === 28) beatTimCreator();
    if (day === 6) { beatSosedIntro(); svetkaBeat('beat_svetka_day6'); beatDenis(6); }
    if (day === 7) beatPavelDay7();
    if (day === 8) beatMama6();
    if (day === 9) { beatLenaDay9(); beatPavelDay9(); beatKirillIntro(); beatDenis(9); }
    if (day === 3) svetkaBeat('beat_svetka_day3');
    if (day === 10) svetkaBeat('beat_svetka_day10');
    if (day === 14) svetkaBeat('beat_svetka_day14');
    if (day === 18) svetkaBeat('beat_svetka_day18');
    if (day === 22) svetkaBeat('beat_svetka_day22');
    if (day === 26) svetkaBeat('beat_svetka_day26');
    // Sprint 07 late-game density
    if (day === 13) beatPavelD13();
    if (day === 17) { beatPavelD17(); beatOlyaRetry(); }
    if (day === 18) beatKryptaRetry();
    if (day === 20) beatMamaD20();
    if (day === 21) beatPavelD21();
    if (day === 22) { beatKhozyaikaD22(); beatDenisD22(); }
    if (day === 24) beatOlyaFinal();
    if (day === 25) { beatPavelD25(); beatKryptaFinal(); }
    if (day === 27) beatKhozyaikaD27();
    // Настя параллельная arc
    if (day === 6) beatNastyaD6();
    if (day === 11) beatNastyaD11();
    if (day === 16) beatNastyaD16();
    if (day === 20) beatNastyaD20();
    if (day === 25) beatNastyaD25();
    if (day === 30) beatNastyaD30();
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
    // SPRINT 20 — Kirill arc expansion
    if (day === 11) beatKirillScene11();
    if (day === 13) beatKirillScene13();
    if (day === 16) beatKirillConflict16();
    if (day === 19) beatKirillResolution19();
    if (day === 24) beatKirillPreFinale24();
    if (day === 22) beatKirillLove1();
    if (day === 26) { beatKrypta(); beatKirillLove2(); }
    if (day === 27) beatDenis(27);
    if (day === 29) beatMamaFinal();
    if (day === 30) beatKirillLoveFinal();

    // One-shot flavor spam: ~35% chance of a random pop-up per day
    if (day >= 2 && Math.random() < 0.35) {
      setTimeout(function () { beatSpamOneshot(day); }, 1800);
    }

    // Delayed callbacks processed each day
    processPendingCallbacks(day);
  }

  // ========== passive costs (single source) ==========

  function processPassive(day) {
    // Base daily drains (survival economy v2.1.1 — tightened per playtest feedback)
    STATE.cash -= 45; // daily: метро + кофе + подписки + мелочи + вайбы
    if (STATE.hunger == null) STATE.hunger = 100;
    if (STATE.comfort == null) STATE.comfort = 60;
    STATE.hunger = Math.max(0, STATE.hunger - 25); // SPRINT 14 — even more punishing
    STATE.comfort = Math.max(0, STATE.comfort - 10); // SPRINT 14 — increased decay

    // Low hunger → sharp energy drain (stronger v2.1.1)
    if (STATE.hunger < 30) {
      STATE.energy = Math.max(0, STATE.energy - 15);
      postMessage('scratch', { kind: 'system', text: '🍔 голодно · −15⚡ · надо поесть' });
    }
    if (STATE.hunger < 10) {
      STATE.comfort = Math.max(0, STATE.comfort - 5);
      postMessage('scratch', { kind: 'system', text: '🍔 на пределе · руки дрожат · не могу работать нормально' });
    }
    // Low comfort → impulsive purchase + more frequent
    if (STATE.comfort < 35 && Math.random() < 0.60) { // SPRINT 14 — more impulse
      var impulse = 50 + Math.floor(Math.random() * 50);
      STATE.cash -= impulse;
      postBank(-impulse, 'импульсивная покупка · комфорт низкий');
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

    // SPRINT 13 — Tim automation tiers (3 tiers, narrative as Marina POV)
    if (STATE.auto_reach_out) {
      STATE.leads = (STATE.leads || 0) + 1;
      postMessage('scratch', { kind: 'outgoing', text: pick(AUTO_REACH_NARRATIVE) });
      // Visual: ghost-fire reach_out button with particle burst
      setTimeout(function () {
        try { funnelBurstReachOut(true); } catch (e) {}
      }, 600);
    }
    if (STATE.auto_brief_lead && STATE.leads > 0) {
      STATE.leads -= 1;
      STATE.qualified_leads = (STATE.qualified_leads || 0) + 1;
      postMessage('scratch', { kind: 'outgoing', text: pick(AUTO_BRIEF_NARRATIVE) });
      setTimeout(function () {
        try { spawnParticle({ from: 'brief_lead', to: 'send_offer', kind: 'red', icon: '📞', duration: 700 }); } catch (e) {}
      }, 900);
    }
    if (STATE.auto_send_offer && STATE.qualified_leads > 0 && !STATE.bank_locked) {
      STATE.qualified_leads -= 1;
      // Auto-create project with 10% lower payout than manual (since no torgi)
      var autoBudget = 180 + Math.floor(Math.random() * 60);
      var autoUpfront = Math.floor(autoBudget * 0.4);
      var autoFinal = autoBudget - autoUpfront;
      STATE.cash += autoUpfront;
      STATE.active_projects.push({
        id: (STATE.active_projects.length + STATE.delivered_projects + 100),
        clientId: 'scratch',
        client: pick(['ai lead saas','ai d2c','ai b2b','ai study']),
        progress: 0,
        work_units_done: 0,
        work_units_total: 6, // SPRINT 15 rev2 — same as manual
        upfront_paid: autoUpfront,
        final_due: autoFinal,
        final_payment: autoFinal,
        started_day: STATE.day,
        deadline_day: STATE.day + 10, // SPRINT 15 — match manual deadline
        status: 'active'
      });
      postBank(autoUpfront, 'AI оффер принят · upfront');
      postMessage('scratch', { kind: 'outgoing', text: pick(AUTO_OFFER_NARRATIVE) });
      setTimeout(function () {
        try { spawnParticle({ from: 'send_offer', to: 'work_on_project', kind: 'red', icon: '📄', duration: 700 }); } catch (e) {}
      }, 1200);
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

    // SPRINT 01 — love ending bonus
    var $card = $('#win-overlay .overlay-card');
    $card.find('.love-bonus').remove();
    if (STATE.love_ending_unlocked) {
      var $love = $('<div class="love-bonus">').html(
        '<div class="love-kicker">❤️ LOVE ENDING UNLOCKED</div>' +
        '<p>ты не только дожила до конца месяца — ты ещё и влюбилась.</p>' +
        '<p>Кирилл не был персонажем. он был человеком. и ты это увидела.</p>' +
        '<p class="love-quiet">в следующем месяце он рядом.</p>'
      );
      $card.find('.overlay-body').after($love);
    }
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
        'отдохни и попробуй ещё раз — следующий месяц скоро.',
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
            clientId: 'anna',
            client: 'лендинг анны',
            progress: 0,
            work_units_done: 0,
            work_units_total: 6, // SPRINT 15 — was missing, project never tracked completion
            upfront_paid: 250,
            final_due: 300,
            final_payment: 300,
            started_day: STATE.day,
            deadline_day: STATE.day + 10, // SPRINT 15 — was missing, project never expired
            status: 'active'
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

    // SPRINT 14.4 rev3 — populate footer version dynamically (single source = VERSION)
    $('#footer-version').text('v' + VERSION + ' survival');

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
      // Mobile: slide chat view in
      if (window.innerWidth <= 640) {
        document.body.classList.add('chat-open');
      }
    });

    // Mobile chat back button — slide back to list view
    $(document).on('click', '#chat-back', function () {
      document.body.classList.remove('chat-open');
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
        case 'hangout_denis': openChat('denis'); break; // always route to chat (per-event pricing)
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

    // SPRINT 17 — Desktop keyboard shortcuts
    // Only active on desktop (>640px) to avoid conflicts with mobile keyboards
    $(document).on('keydown', function (e) {
      if (window.innerWidth <= 640) return;
      // Ignore shortcuts while typing in form inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      // Ignore if any overlay is visible (intro/win/lose)
      if ($('#intro-overlay').is(':visible') || $('#win-overlay').is(':visible') || $('#lose-overlay').is(':visible')) return;

      // SPRINT 17 rev2 — filter by :visible too (not just :not([disabled]))
      // to skip mobile-hide buttons and off-screen ones
      var dig = parseInt(e.key, 10);
      if (dig >= 1 && dig <= 9) {
        e.preventDefault();
        var $btns = $('#dock-buttons .dock-btn:not([disabled]):visible');
        var $btn = $btns.eq(dig - 1);
        if ($btn.length) $btn.click();
        return;
      }
      // Esc — close chat (mobile) or do nothing on desktop
      if (e.key === 'Escape') {
        if (document.body.classList.contains('chat-open')) {
          document.body.classList.remove('chat-open');
        }
        return;
      }
      // Space or Enter — end day (primary accessible action)
      // SPRINT 17 rev2 — skip if focus is on button/link/input to avoid
      // overriding native activation on focused elements
      if (e.key === ' ' || e.key === 'Enter') {
        var tag = e.target && e.target.tagName;
        if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        var $end = $('.dock-btn[data-action="end_day"]:not([disabled]):visible');
        if ($end.length) {
          e.preventDefault();
          $end.click();
        }
        return;
      }
      // Arrow keys — navigate contacts list
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var $list = $('#contacts-list .contact-item');
        if ($list.length === 0) return;
        var $active = $list.filter('.active');
        var idx = $active.length ? $list.index($active) : -1;
        idx = (e.key === 'ArrowDown') ? (idx + 1) % $list.length
                                       : (idx - 1 + $list.length) % $list.length;
        $list.eq(idx).click();
      }
    });
  }

  window.Marina = {
    init: init,
    version: VERSION,
    _state: function () { return STATE; },
    _reset: function () { clearState(); location.reload(); },
    _actLamp: actLamp,
    currentChat: currentChat
  };

  $(function () { init(); });
})();
