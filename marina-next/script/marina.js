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
  var APP_VERSION = '2.10.0-tr-soundtrack';
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
    'бот Тима написал за меня 20 холодок пока я спала. один из них ответил. я просто пью кофе и читаю. это странно',
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
      // SPRINT 36 — one-time Kirill food delivery if Marina ignores dates
      beat_kirill_food_delivery: false,
      // SPRINT 41 — day 29 morning-after light romantic beat
      beat_kirill_day29_morning: false,
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
      // SPRINT 28 — mid-game rescue flags (each fires once)
      rescue_mama_money_used: false,
      rescue_hospital_used: false,
      rescue_lena_breakdown_used: false,
      rescue_father_used: false,
      // SPRINT 29 — rescue overlay choice state
      _rescue_active: false,
      _rescue_type: null,
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
      _krypta_retry_pending: false, // SPRINT 38b
      _krypta_final_pending: false, // SPRINT 38b
      _mama6_pending: false,
      _mama17_pending: false,
      _olya_pending: false,
      _olya_retry_pending: false, // SPRINT 39
      _olya_final_pending: false, // SPRINT 39
      _pavel_pending: false,
      _pavel_d17_pending: false, // SPRINT 38b
      _sosed_pending: false,
      _svetka_pending: false,
      _tim_consult_pending: false,
      _tim_tier2_pending: false,
      _tim_tier3_pending: false,
      _vera_pending: false,
      _nastya_partnership_pending: false, // SPRINT 38b — Nastya partnership choice
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
    var COMPATIBLE_VERSIONS = ['2.2.0', '2.2.1', '2.2.2', '2.2.3', '2.2.4', '2.2.5', '2.2.6', '2.2.7', '2.2.8', '2.2.9', '2.3.0', '2.3.1', '2.3.2', '2.3.3', '2.3.4', '2.3.5', '2.3.6', '2.3.7', '2.3.8', '2.3.9', '2.4.0', '2.4.1', '2.4.2', '2.4.3', '2.5.0', '2.5.1', '2.5.2', '2.5.3', '2.5.4', '2.5.5', '2.5.6', '2.5.7', '2.5.8', '2.6.0', '2.6.1', '2.6.2', '2.6.3', '2.6.4', '2.6.5', '2.6.6', '2.6.7', '2.6.8', '2.6.9', '2.7.0', '2.1.1'];
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

  // SPRINT 49 — i18n shim helpers
  // tStr(key, fallback): resolve string via MarinaI18n.t() with literal fallback
  // tPickOr(key, fallbackArr): resolve random-pick text bank via i18n with constant array fallback
  // currentLang(): get active locale, default 'ru'
  function tStr(key, fallback) {
    if (window.MarinaI18n && typeof window.MarinaI18n.t === 'function') {
      var v = window.MarinaI18n.t(key);
      if (typeof v === 'string' && v.indexOf('[MISSING:') !== 0) return v;
    }
    return fallback;
  }
  function tPickOr(key, fallbackArr) {
    if (window.MarinaI18n && typeof window.MarinaI18n.tPick === 'function') {
      var v = window.MarinaI18n.tPick(key);
      if (typeof v === 'string' && v.indexOf('[MISSING:') !== 0) return v;
    }
    return pick(fallbackArr);
  }
  function currentLang() {
    if (window.MarinaI18n && typeof window.MarinaI18n.getLang === 'function') {
      return window.MarinaI18n.getLang() || 'ru';
    }
    return 'ru';
  }

  // SPRINT 22 — Umami custom event tracking (privacy-respecting)
  // SPRINT 49 — auto-injects {lang} into every event payload
  function track(event, data) {
    try {
      var d = data || {};
      d.lang = currentLang();
      if (window.umami && typeof window.umami.track === 'function') {
        window.umami.track(event, d);
      }
    } catch (e) {}
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
    // SPRINT 49 — labels/costs/reasons via tStr() with RU literal fallback
    var actions = [];
    if (STATE.lamp_on) {
      // Воронка: искать → созвон → оффер → работать → ночная работа
      actions.push({
        id: 'reach_out',
        label: (STATE.auto_reach_out ? '🤖 ' : '') + tStr('action.reach_out.label', 'искать клиентов'),
        cost: STATE.auto_reach_out ? tStr('action.reach_out.cost_auto', 'AI делает') : tStr('action.reach_out.cost', '1ч · −5⚡'),
        auto: STATE.auto_reach_out,
        disabled: STATE.auto_reach_out || STATE.hours < COST.reach_out.h || STATE.energy < COST.reach_out.e,
        reason: STATE.auto_reach_out ? tStr('action.reach_out.reason_auto', 'AI автоматизирован') : (STATE.hours < COST.reach_out.h ? tStr('action.reach_out.reason_no_hours', 'нет часов') : tStr('action.reach_out.reason_no_energy', 'нет энергии')),
        primary: !STATE.auto_reach_out && STATE.hours > 0,
        hideOnMobile: STATE.hours < COST.reach_out.h
      });
      actions.push({
        id: 'brief_lead',
        label: (STATE.auto_brief_lead ? '🤖 ' : '') + tStr('action.brief_lead.label', 'созвон с лидом'),
        cost: STATE.auto_brief_lead ? tStr('action.brief_lead.cost_auto', 'AI делает') : tStr('action.brief_lead.cost', '1ч · −3⚡'),
        auto: STATE.auto_brief_lead,
        badge: !STATE.auto_brief_lead && STATE.leads > 0 ? STATE.leads : null,
        badgeHot: STATE.leads > 0,
        disabled: STATE.auto_brief_lead || STATE.leads < 1 || STATE.hours < COST.brief_lead.h || STATE.energy < COST.brief_lead.e,
        reason: STATE.auto_brief_lead ? tStr('action.brief_lead.reason_auto', 'AI автоматизирован') : (STATE.leads < 1 ? tStr('action.brief_lead.reason_no_leads', 'нет лидов') : (STATE.hours < COST.brief_lead.h ? tStr('action.brief_lead.reason_no_hours', 'нет часов') : tStr('action.brief_lead.reason_no_energy', 'нет энергии'))),
        hideOnMobile: STATE.hours < COST.brief_lead.h
      });
      actions.push({
        id: 'send_offer',
        label: (STATE.auto_send_offer ? '🤖 ' : '') + tStr('action.send_offer.label', 'отправить оффер'),
        cost: STATE.auto_send_offer ? tStr('action.send_offer.cost_auto', 'AI делает') : tStr('action.send_offer.cost', '1ч'),
        auto: STATE.auto_send_offer,
        badge: !STATE.auto_send_offer && STATE.qualified_leads > 0 ? STATE.qualified_leads : null,
        badgeHot: STATE.qualified_leads > 0,
        disabled: STATE.auto_send_offer || STATE.qualified_leads < 1 || STATE.hours < COST.send_offer.h || STATE.bank_locked,
        reason: STATE.auto_send_offer ? tStr('action.send_offer.reason_auto', 'AI автоматизирован') : (STATE.bank_locked ? tStr('action.send_offer.reason_bank_locked', 'счёт заблокирован') : (STATE.qualified_leads < 1 ? tStr('action.send_offer.reason_no_qualified', 'нет брифов') : tStr('action.send_offer.reason_no_hours', 'нет часов'))),
        hideOnMobile: STATE.hours < COST.send_offer.h
      });
      actions.push({
        id: 'work_on_project', label: tStr('action.work_on_project.label', 'делать работу'), cost: tStr('action.work_on_project.cost', '2ч · −5⚡'),
        badge: STATE.active_projects.length > 0 ? STATE.active_projects.length : null,
        disabled: STATE.active_projects.length === 0 || STATE.hours < COST.work_on_project.h || STATE.energy < COST.work_on_project.e,
        reason: STATE.active_projects.length === 0 ? tStr('action.work_on_project.reason_no_projects', 'нет проектов') : (STATE.hours < COST.work_on_project.h ? tStr('action.work_on_project.reason_no_hours', 'нет часов') : tStr('action.work_on_project.reason_no_energy', 'нет энергии')),
        hideOnMobile: STATE.hours < COST.work_on_project.h
      });
      // SPRINT 40 — night work mutually exclusive with day work.
      var dayWorkAvail = STATE.hours >= COST.work_on_project.h;
      actions.push({
        id: 'work_night', label: tStr('action.work_night.label', '🌙 ночная работа'), cost: tStr('action.work_night.cost', '−15⚡ · −15💚'),
        disabled: STATE.active_projects.length === 0 || STATE.day < 3 || STATE.energy < COST.work_night.e || dayWorkAvail,
        reason: STATE.day < 3 ? tStr('action.work_night.reason_too_early', 'доступно с дня 3') : (STATE.active_projects.length === 0 ? tStr('action.work_night.reason_no_projects', 'нет проектов') : (dayWorkAvail ? tStr('action.work_night.reason_day_work_first', 'сначала рабочий день') : tStr('action.work_night.reason_no_energy', 'мало энергии'))),
        hideOnMobile: STATE.active_projects.length === 0 || STATE.day < 3 || dayWorkAvail
      });
      // Еда + отдых + шопинг — SPRINT 35 — eating allowed even when hours=0
      actions.push({
        id: 'eat_home',
        label: tStr('action.eat_home.label', '🍝 поесть дома'),
        cost: STATE.hours >= 1 ? tStr('action.eat_home.cost_day', '1ч · −$15') : tStr('action.eat_home.cost_evening', 'ужин · −$15'),
        badge: STATE.hunger < 30 ? '!' : null,
        badgePulse: STATE.hunger < 30,
        disabled: STATE.cash < COST.eat_home.c || STATE.bank_locked,
        reason: STATE.bank_locked ? tStr('action.eat_home.reason_bank_locked', 'счёт заблокирован') : tStr('action.eat_home.reason_no_money', 'не хватает денег')
      });
      actions.push({
        id: 'eat_out',
        label: tStr('action.eat_out.label', '🥗 кафе'),
        cost: STATE.hours >= 1 ? tStr('action.eat_out.cost_day', '1ч · −$35') : tStr('action.eat_out.cost_evening', 'ужин · −$35'),
        disabled: STATE.cash < COST.eat_out.c || STATE.bank_locked,
        reason: STATE.bank_locked ? tStr('action.eat_out.reason_bank_locked', 'счёт заблокирован') : tStr('action.eat_out.reason_no_money', 'не хватает денег')
      });
      actions.push({
        id: 'rest', label: tStr('action.rest.label', '☕ перерыв'), cost: tStr('action.rest.cost', '1ч · +30⚡'),
        badge: STATE.energy < 30 ? '!' : null,
        badgePulse: STATE.energy < 30,
        disabled: STATE.hours < COST.rest.h || STATE.energy >= 100 || STATE.coffee_stacks >= 4,
        reason: STATE.energy >= 100 ? tStr('action.rest.reason_max_energy', 'энергия максимум') : (STATE.coffee_stacks >= 4 ? tStr('action.rest.reason_too_much_coffee', 'кофе перелит') : tStr('action.rest.reason_no_hours', 'нет часов'))
      });
      actions.push({
        id: 'shopping', label: tStr('action.shopping.label', '🛍 шопинг'), cost: tStr('action.shopping.cost', '2ч · −$80'),
        disabled: STATE.day < 5 || STATE.cash < COST.shopping.c || STATE.hours < COST.shopping.h || STATE.bank_locked,
        reason: STATE.day < 5 ? tStr('action.shopping.reason_too_early', 'с дня 5') : (STATE.bank_locked ? tStr('action.shopping.reason_bank_locked', 'счёт заблокирован') : tStr('action.shopping.reason_no_resources', 'не хватает ресурсов')),
        hideOnMobile: STATE.day < 5 || STATE.cash < COST.shopping.c || STATE.bank_locked
      });
      // Social actions — только если анлокнуты
      if (STATE.kirill_unlocked && !STATE.kirill_blocked) {
        var kirillInviteActive = !!STATE.kirill_invite_active;
        actions.push({
          id: 'date_kirill',
          label: tStr('action.date_kirill.label', '💔 свидание (Кирилл)'),
          cost: tStr('action.date_kirill.cost', '3ч · −10⚡'),
          badge: kirillInviteActive ? '!' : null,
          badgePulse: kirillInviteActive,
          disabled: !kirillInviteActive || STATE.hours < COST.date_kirill.h || STATE.energy < COST.date_kirill.e || (STATE.kirill_date_count >= 4 && !STATE.bank_locked),
          reason: !kirillInviteActive ? tStr('action.date_kirill.reason_no_invite', 'Кирилл сейчас не зовёт') : (STATE.energy < COST.date_kirill.e ? tStr('action.date_kirill.reason_no_energy', 'нет энергии') : tStr('action.date_kirill.reason_no_hours', 'не хватает часов')),
          hideOnMobile: !kirillInviteActive
        });
      }
      if (STATE.beat_denis3 || STATE.beat_denis6 || STATE.beat_denis9 || STATE.beat_denis15) {
        var hasDenisPending = STATE._denis3_pending || STATE._denis6_pending || STATE._denis9_pending || STATE._denis15_pending || STATE._denis27_pending;
        actions.push({
          id: 'hangout_denis', label: tStr('action.hangout_denis.label', '🎉 с Денисом'),
          cost: hasDenisPending ? tStr('action.hangout_denis.cost_pending', 'ответь в чат') : tStr('action.hangout_denis.cost_waiting', 'ждёт приглашения'),
          badge: hasDenisPending ? '!' : null,
          badgePulse: hasDenisPending,
          disabled: !hasDenisPending,
          reason: tStr('action.hangout_denis.reason_no_invite', 'ответь на приглашение Дениса в чате'),
          hideOnMobile: !hasDenisPending
        });
      }
      // SPRINT 34 — when hours=0, end_day becomes the only meaningful action.
      var hoursOver = STATE.hours <= 0;
      actions.push({
        id: 'end_day',
        label: hoursOver ? tStr('action.end_day.label_forced', '🌙 лечь спать — день закончен') : tStr('action.end_day.label', '🌙 лечь спать'),
        cost: tStr('action.end_day.cost', 'конец дня'),
        disabled: false,
        primary: hoursOver
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
      var $lamp = $('<button class="dock-btn">').attr('data-action', 'lamp').text(tStr('action.lamp.label', 'включить компьютер'));
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
        text: tPickOr('text.morning.hangover', HANGOVER_MORNINGS)
      });
      postSystem('scratch', tStr('system.hangover_note', '☕ после ночной работы · энергия не восстановилась'));
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
        text: tPickOr('text.morning.hungry', HUNGRY_MORNINGS)
      });
      return;
    }
    if (m != null && m < 25) {
      postMessage('scratch', { kind: 'outgoing', text: tPickOr('text.morning.sad', SAD_MORNINGS) });
      return;
    }
    if (e < 30) {
      postMessage('scratch', { kind: 'outgoing', text: tPickOr('text.morning.tired', TIRED_MORNINGS) });
      return;
    }
    // Fine morning — only 25% chance (not every day)
    if (Math.random() < 0.25) {
      postMessage('scratch', { kind: 'outgoing', text: tPickOr('text.morning.fine', FINE_MORNINGS) });
    }
  }

  // SPRINT 12 — Dynamic brand subtitle based on Marina's state
  function renderBrandStatus() {
    var $sub = $('.brand-subtitle');
    if ($sub.length === 0) return;
    var h = STATE.hunger || 100;
    var e = STATE.energy || 100;
    var m = STATE.comfort || 60;
    var status = tStr('brand.version_prefix', 'теледрам v') + VERSION;
    if (STATE.bank_locked) status = tStr('brand.status.bank_locked', '🔒 счёт заблокирован');
    else if (h < 20) status = tStr('brand.status.very_hungry', '🍔 очень голодна');
    else if (e < 20) status = tStr('brand.status.exhausted', '⚡ на пределе');
    else if (m < 20) status = tStr('brand.status.sad', '💔 грустит');
    else if (h < 35 || e < 35 || m < 30) status = tStr('brand.status.tired', '😮‍💨 устала');
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
      msg = tStr('crisis.bank_locked', '🔒 СЧЁТ ЗАБЛОКИРОВАН ПО 115-ФЗ · ещё {daysLeft} дн.').replace('{daysLeft}', daysLeft);
      cls = 'crit';
    } else if (h != null && h < 15) {
      msg = tStr('crisis.starving', '🍔 МАРИНА ГОЛОДАЕТ · энергия падает быстро · поешь');
      cls = 'crit';
    } else if (e < 15) {
      msg = tStr('crisis.burnout', '⚡ МАРИНА НА ПРЕДЕЛЕ · перерыв срочно');
      cls = 'crit';
    } else if (c < -500) {
      msg = tStr('crisis.broke', '💰 БАЛАНС КРИТИЧЕСКИЙ · −${absCash} · сдай проект или теряешь квартиру').replace('{absCash}', Math.abs(c));
      cls = 'crit';
    } else if (m != null && m < 15) {
      msg = tStr('crisis.comfort_zero', '💔 КОМФОРТ ОБНУЛИЛСЯ · ты сгораешь · шопинг/еда/друзья');
      cls = 'crit';
    } else if (h != null && h < 50) {
      // SPRINT 23 — earlier hunger warn so daily food becomes mandatory
      msg = tStr('crisis.hungry_warn', '🍔 голодно · хочется настоящей еды');
      cls = 'warn';
    } else if (e < 30) {
      msg = tStr('crisis.tired_warn', '⚡ устала · пора отдохнуть');
      cls = 'warn';
    }

    // SPRINT 23 — render to BOTH banners (mobile top + desktop in-chat).
    // CSS hides the irrelevant one per breakpoint.
    var $bannerChat = $('#crisis-banner-chat');
    if (msg) {
      $banner.text(msg).attr('class', 'crisis-banner ' + cls).show();
      if ($bannerChat.length) $bannerChat.text(msg).attr('class', 'crisis-banner crisis-banner-chat ' + cls).show();
    } else {
      $banner.hide();
      if ($bannerChat.length) $bannerChat.hide();
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

    // SPRINT 31 — realistic founder day 9:00 → 23:00 (14h real, 8 game hours)
    // each game-hour = 1.75 real hours. hours=8 -> 9:00, hours=0 -> 23:00
    var hoursLeft = Math.max(0, STATE.hours);
    var realHourFloat = 9 + (HOURS_PER_DAY - hoursLeft) * 1.75;
    var clockH = Math.floor(realHourFloat) % 24;
    var clockM = Math.round((realHourFloat - Math.floor(realHourFloat)) * 60);
    if (clockM === 60) { clockM = 0; clockH = (clockH + 1) % 24; }
    var clockStr = (clockH < 10 ? '0' : '') + clockH + ':' + (clockM < 10 ? '0' : '') + clockM;

    function _esc(s) { return String(s).replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
    var parts = [];
    var hudDayTip  = tStr('hud.tip.day',    'День {day} из {max}. Месяц закончится на {max}-й день — нужно сдать ≥3 проекта, иметь cash≥0, энергию≥25, голод≥30, комфорт≥20.').replace('{day}', STATE.day).replace(/\{max\}/g, FINALE_DAY);
    var hudHourTip = tStr('hud.tip.hours',  'Сейчас {clock}. День Марины: 9:00 → 23:00 (14 реальных часов = 8 рабочих слотов). Когда слоты кончатся — нажми «лечь спать».').replace('{clock}', clockStr);
    var hudCashTip = tStr('hud.tip.cash',   'Деньги Марины. Старт $500. Каждый день −$45 пассив + аренда $500 (день 10/20) + неизбежные траты ($60/$80/$150/$100). Если падёт ниже −$1500 — выселение.');
    parts.push('<div class="r-pill r-day" title="' + _esc(hudDayTip) + '"><span class="r-icon">🗓️</span><span class="r-val">' + STATE.day + '</span><span class="r-max">/' + FINALE_DAY + '</span></div>');
    var hUnit = tStr('hud.unit.hours_short', 'ч');
    parts.push('<div class="r-pill r-hours" title="' + _esc(hudHourTip) + '"><span class="r-icon">⏱️</span><span class="r-val">' + clockStr + '</span><span class="r-max">·' + hoursLeft + hUnit + '</span></div>');
    var cashCls = STATE.cash < 0 ? 'crit' : (STATE.cash < 200 ? 'warn' : 'ok');
    parts.push('<div class="r-pill r-cash ' + cashCls + '" title="' + _esc(hudCashTip) + '"><span class="r-icon">💰</span><span class="r-val">$' + STATE.cash + '</span></div>');

    // SPRINT 27 — rent countdown pill: показывает следующую аренду + сколько дней
    // SPRINT 34 — after rescue, next payment is end-of-month (day 30) not hidden
    var rentDay = null;
    if (STATE.day < 10 && !STATE.beat_rent_10) rentDay = 10;
    else if (STATE.day < 20 && !STATE.beat_rent_20 && !STATE.beat_khozyaika_rescue) rentDay = 20;
    else if (STATE.beat_khozyaika_rescue && STATE.day < FINALE_DAY) rentDay = FINALE_DAY;
    if (rentDay !== null) {
      var daysLeft = rentDay - STATE.day;
      var rentCls = daysLeft <= 2 ? 'crit' : (daysLeft <= 5 ? 'warn' : 'ok');
      var canPay = STATE.cash >= 500;
      // SPRINT 31 — progress bar: countdown from 10 days to 0, fill grows as deadline approaches
      var rentFill = Math.max(0, Math.min(100, (10 - daysLeft) * 10));
      var rentTipBase = canPay
        ? tStr('hud.tip.rent_ok', 'Следующая аренда: $500 на день {rentDay}. Осталось {daysLeft} дн. ✓ хватает.')
        : tStr('hud.tip.rent_short', 'Следующая аренда: $500 на день {rentDay}. Осталось {daysLeft} дн. Не хватает ${shortBy} — заработай или продай услугу.');
      var rentTitle = rentTipBase.replace('{rentDay}', rentDay).replace('{daysLeft}', daysLeft).replace('{shortBy}', 500 - STATE.cash);
      var dUnit = tStr('hud.unit.days_short', 'дн');
      parts.push('<div class="r-pill r-rent ' + rentCls + '" title="' + _esc(rentTitle) + '"><span class="r-icon">🏠</span><span class="r-val">$500</span><span class="r-max">·' + daysLeft + dUnit + '</span><div class="r-bar"><div class="r-fill" style="width:' + rentFill + '%"></div></div></div>');
    }
    var e = STATE.energy;
    var hudEnergyTip  = tStr('hud.tip.energy',  'Энергия (0-100). Падает от работы и плохого сна. Восстанавливается ночью (полностью только если поела). Если ниже 25 на финале — проигрыш.');
    parts.push('<div class="r-pill r-energy ' + colorClass(e) + '" title="' + _esc(hudEnergyTip) + '"><span class="r-icon">⚡</span><span class="r-val">' + e + '</span><div class="r-bar"><div class="r-fill" style="width:' + e + '%"></div></div></div>');
    var h = STATE.hunger || 100;
    var hudHungerTip  = tStr('hud.tip.hunger',  'Голод (0-100). Каждый день −30. Ниже 50 — работа замедляется, ниже 30 — энергия падает. Голод=0 на день 4+ — Марина свалилась. Поешь дома (−$15) или в кафе (−$35).');
    parts.push('<div class="r-pill r-hunger ' + colorClass(h) + '" title="' + _esc(hudHungerTip) + '"><span class="r-icon">🍔</span><span class="r-val">' + h + '</span><div class="r-bar"><div class="r-fill" style="width:' + h + '%"></div></div></div>');
    var m = STATE.comfort || 0;
    var hudComfortTip = tStr('hud.tip.comfort', 'Комфорт / настроение (0-100). Каждый день −10. Ниже 35 — импульсивные покупки. Ниже 5 на день 15+ — нервы могут сдать. Шопинг, кафе, друзья (Денис) поднимают.');
    parts.push('<div class="r-pill r-comfort ' + colorClass(m) + '" title="' + _esc(hudComfortTip) + '"><span class="r-icon">💚</span><span class="r-val">' + m + '</span><div class="r-bar"><div class="r-fill" style="width:' + m + '%"></div></div></div>');

    if (STATE.bank_locked) {
      var daysLeft = Math.max(0, (STATE.bank_locked_until || STATE.day) - STATE.day);
      var hudLockedTip = tStr('hud.tip.bank_locked', 'Счёт заблокирован по 115-ФЗ (подозрительная транзакция). Все траты невозможны: еда, оффер, шопинг. Ждать {daysLeft} дней до разблокировки.').replace('{daysLeft}', daysLeft);
      var hudLockedLabel = tStr('hud.tip.bank_locked_label', '115-ФЗ');
      var dUnitL = tStr('hud.unit.day_short', 'д');
      parts.push('<div class="r-pill r-locked" title="' + _esc(hudLockedTip) + '"><span class="r-icon">🔒</span><span class="r-val">' + _esc(hudLockedLabel) + '</span><span class="r-max">· ' + daysLeft + dUnitL + '</span></div>');
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
    var wasUnread = contact.unread > 0;
    contact.unread = 0;
    STATE.current_chat = contactId;
    Bubbles.renderContacts(STATE);
    Bubbles.renderChatHeader(STATE, contact);
    renderChatPinned(contactId);
    Bubbles.replayThread(STATE, contactId);
    Bubbles.clearChipsArea();
    renderThreadContextActions(contactId);
    save();
    track('chat_opened', { contact: contactId, day: STATE.day, unread_before: wasUnread ? 1 : 0 });
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
    var deltaSuffix = tStr('bubble.bank.delta_suffix_7d', 'за последние 7 дней');
    var deltaText = (delta >= 0 ? '+' : '') + '$' + delta + ' ' + deltaSuffix;

    var lockBanner = '';
    if (STATE.bank_locked) {
      var daysLeft = Math.max(0, (STATE.bank_locked_until || STATE.day) - STATE.day);
      var lockPrefix = tStr('bubble.bank.lock_prefix', '🔒 115-ФЗ · заблокирован · ещё');
      var lockUnit = tStr('bubble.bank.lock_unit', 'дн.');
      lockBanner = '<div class="bb-delta neg">' + lockPrefix + ' ' + daysLeft + ' ' + lockUnit + '</div>';
    }

    var balanceLabel = tStr('bubble.bank.current_balance_label', 'ТЕКУЩИЙ БАЛАНС');
    var html = '<div class="bank-balance-card">' +
      '<div class="bb-label">' + balanceLabel + '</div>' +
      '<div class="bb-value ' + cashClass + '">$' + STATE.cash + '</div>' +
      '<div class="bb-delta ' + deltaClass + '">' + deltaText + '</div>' +
      lockBanner +
      '</div>';
    $pinned.html(html);
  }

  function renderThreadContextActions(contactId) {
    // SPRINT 38c — Anna intro + referral chips routed via openChat too
    if (contactId === 'anna' && STATE._anna_pending) { renderAnnaChoice(); return; }
    if (contactId === 'anna' && STATE._anna_referral_pending) { renderAnnaReferralChoice(); return; }
    // SPRINT 41 — Tim creator 4th wall break: Telegram subscribe (was inline form)
    if (contactId === 'tim' && STATE.beat_tim_creator_fired && !STATE.lead_submitted) {
      Bubbles.renderReplyChips([
        { id: 'tg_subscribe', label: tStr('chip.tim_creator.tg_subscribe', '🔔 подписаться на @timofeyzinin в Telegram') },
        { id: 'tg_later',     label: tStr('chip.tim_creator.tg_later', 'позже') }
      ], function (opt) {
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'tg_subscribe') {
          STATE.lead_submitted = true; // reuse flag to suppress chip after click
          track('telegram_cta_clicked', { overlay: 'tim_creator' });
          // Open Telegram channel in new tab
          var w = window.open('https://t.me/timofeyzinin', '_blank', 'noopener');
          if (!w) { /* popup blocked — link still visible in chat */ }
          postOutgoing('tim', tStr('system.tim_creator.subscribed', 'подписалась 👍'));
          setTimeout(function () {
            postIncoming('tim', tStr('system.tim_creator.thanks', 'спасибо! увидимся в канале.'), Bubbles.localizedContactName(findContact('tim')));
          }, 900);
        } else {
          postOutgoing('tim', tStr('system.tim_creator.later', 'позже подпишусь.'));
        }
        save(); renderDock();
      });
      return;
    }
    // Tim tier 1 — auto_reach_out
    // SPRINT 26 — keep pending if cash insufficient so player can retry later
    if (contactId === 'tim' && STATE._tim_consult_pending && !STATE.auto_reach_out) {
      Bubbles.renderReplyChips([
        { id: 'buy', label: tStr('chip.tim_tier1.buy', 'купить автофарминг ($200)') },
        { id: 'later', label: tStr('chip.tim_tier1.later', 'подумаю позже') }
      ], function (opt) {
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'buy' && STATE.cash >= 200 && !STATE.bank_locked) {
          STATE._tim_consult_pending = false; // success — clear pending
          STATE.cash -= 200;
          STATE.auto_reach_out = true;
          postBank(-200, tStr('system.payment.tim_tier1', 'Тим · автофарминг лидов'));
          postOutgoing('tim', tStr('system.tim_tier1.yes', 'беру. переведу $200.'));
          setTimeout(function () {
            postIncoming('tim', tStr('system.tim_tier1.confirmed', 'отлично, настроил. с завтрашнего дня +1 лид в день автоматом.'), Bubbles.localizedContactName(findContact('tim')));
          }, 900);
        } else if (opt.id === 'buy') {
          // Insufficient — keep pending, Tim follows up
          postOutgoing('tim', tStr('system.tim_tier1.no_funds', 'денег пока не хватает. вернусь когда будет.'));
          setTimeout(function () {
            var why = STATE.bank_locked ? 'когда счёт разблокируют' : ('когда будет $200, у тебя сейчас $' + STATE.cash);
            postIncoming('tim', tStr('system.tim_tier1.no_funds_reply', 'без проблем. предложение в силе — пиши {why}.').replace('{why}', why), Bubbles.localizedContactName(findContact('tim')));
          }, 900);
        } else {
          STATE._tim_consult_pending = false; // explicit "later" — clear pending
          postOutgoing('tim', tStr('system.tim_tier1.later', 'хорошо, пока не сейчас.'));
        }
        save(); renderDock();
      });
      return;
    }
    // Tim tier 2 — auto_brief_lead
    if (contactId === 'tim' && STATE._tim_tier2_pending && !STATE.auto_brief_lead) {
      Bubbles.renderReplyChips([
        { id: 'buy', label: tStr('chip.tim_tier2.buy', 'купить авто-созвоны ($300)') },
        { id: 'later', label: tStr('chip.tim_tier2.later', 'нет') }
      ], function (opt) {
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'buy' && STATE.cash >= 300 && !STATE.bank_locked) {
          STATE._tim_tier2_pending = false;
          STATE.cash -= 300;
          STATE.auto_brief_lead = true;
          postBank(-300, tStr('system.payment.tim_tier2', 'Тим · AI созвоны'));
          postOutgoing('tim', tStr('system.tim_tier2.yes', 'беру, настраивай.'));
          setTimeout(function () {
            postIncoming('tim', tStr('system.tim_tier2.confirmed', 'готово. AI будет квалифицировать лиды каждое утро.'), Bubbles.localizedContactName(findContact('tim')));
          }, 900);
        } else if (opt.id === 'buy') {
          // Keep pending for retry — distinguish bank_locked vs low cash
          if (STATE.bank_locked) {
            postOutgoing('tim', tStr('system.tim_tier2.bank_locked', 'счёт заблокирован, не могу перевести.'));
            setTimeout(function () {
              postIncoming('tim', tStr('system.tim_tier2.bank_locked_reply', 'ок, как разблокируют — напиши.'), Bubbles.localizedContactName(findContact('tim')));
            }, 900);
          } else {
            postOutgoing('tim', tStr('system.tim_tier2.short_cash', 'не хватает ${shortage}. вернусь позже.').replace('{shortage}', (300 - STATE.cash)));
            setTimeout(function () {
              postIncoming('tim', tStr('system.tim_tier2.short_cash_reply', 'предложение остаётся. как накопишь — пиши.'), Bubbles.localizedContactName(findContact('tim')));
            }, 900);
          }
        } else {
          STATE._tim_tier2_pending = false;
          postOutgoing('tim', tStr('system.tim_tier2.no', 'пока нет.'));
        }
        save(); renderDock();
      });
      return;
    }
    // Tim tier 3 — auto_send_offer
    if (contactId === 'tim' && STATE._tim_tier3_pending && !STATE.auto_send_offer) {
      Bubbles.renderReplyChips([
        { id: 'buy', label: tStr('chip.tim_tier3.buy', 'купить AI-оффер ($400)') },
        { id: 'later', label: tStr('chip.tim_tier3.later', 'нет') }
      ], function (opt) {
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'buy' && STATE.cash >= 400 && !STATE.bank_locked) {
          STATE._tim_tier3_pending = false;
          STATE.cash -= 400;
          STATE.auto_send_offer = true;
          postBank(-400, tStr('system.payment.tim_tier3', 'Тим · AI оффер'));
          postOutgoing('tim', tStr('system.tim_tier3.yes', 'беру.'));
          setTimeout(function () {
            postIncoming('tim', tStr('system.tim_tier3.confirmed', 'настроил. AI будет сам отправлять офферы и принимать контракты.'), Bubbles.localizedContactName(findContact('tim')));
          }, 900);
        } else if (opt.id === 'buy') {
          if (STATE.bank_locked) {
            postOutgoing('tim', tStr('system.tim_tier3.bank_locked', 'счёт заблокирован.'));
            setTimeout(function () {
              postIncoming('tim', tStr('system.tim_tier3.bank_locked_reply', 'жду пока разблокируют. слот за тобой.'), Bubbles.localizedContactName(findContact('tim')));
            }, 900);
          } else {
            postOutgoing('tim', tStr('system.tim_tier3.short_cash', 'не хватает ${shortage}.').replace('{shortage}', (400 - STATE.cash)));
            setTimeout(function () {
              postIncoming('tim', tStr('system.tim_tier3.short_cash_reply', 'когда подкопишь — напиши, оставлю слот.'), Bubbles.localizedContactName(findContact('tim')));
            }, 900);
          }
        } else {
          STATE._tim_tier3_pending = false;
          postOutgoing('tim', tStr('system.tim_tier3.no', 'нет.'));
        }
        save(); renderDock();
      });
      return;
    }
    // (tier 4 removed — work_on_project stays manual by design)
    // Khozyaika 1 — счётчики воды
    if (contactId === 'khozyaika' && STATE._khozyaika1_pending) {
      Bubbles.renderReplyChips([
        { id: 'send', label: tStr('chip.khozyaika1.send', 'отправить показания (−1h)') },
        { id: 'ignore', label: tStr('chip.khozyaika1.ignore', 'забить (−$100 штраф через 3 дня)') }
      ], function (opt) {
        STATE._khozyaika1_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'send') {
          postOutgoing('khozyaika', tStr('system.khozyaika.water_sent', 'отправила показания, фото прикреплено.'));
          STATE.hours = Math.max(0, STATE.hours - 1);
          postMessage('scratch', { kind: 'system', text: '−1h · счётчики' });
        } else {
          postOutgoing('khozyaika', tStr('system.khozyaika.ok', 'ок.'));
          // SPRINT 25 rev2 — align with auto-fine deadline (day+3, was day+2)
          STATE.pending_callbacks.push({ trigger_day: STATE.day + 3, type: 'khozyaika_fine' });
        }
        save(); renderDock();
      });
      return;
    }
    // Khozyaika 2 — тикток
    if (contactId === 'khozyaika' && STATE._khozyaika2_pending) {
      Bubbles.renderReplyChips([
        { id: 'like', label: tStr('chip.khozyaika2.like', 'лайкнуть и подписаться (−1h)') },
        { id: 'refuse', label: tStr('chip.khozyaika2.refuse', 'отказать (−5 комфорт)') }
      ], function (opt) {
        STATE._khozyaika2_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'like') {
          postOutgoing('khozyaika', tStr('system.khozyaika.tiktok_yes', 'подписалась, лайкнула. удачи с Сатурном.'));
          STATE.hours = Math.max(0, STATE.hours - 1);
        } else {
          postOutgoing('khozyaika', tStr('system.khozyaika.tiktok_no', 'хозяйка, простите, не подписываюсь на тиктоках.'));
          STATE.comfort = Math.max(0, STATE.comfort - 5);
        }
        save(); renderDock();
      });
      return;
    }
    // Khozyaika 3 — кошка
    if (contactId === 'khozyaika' && STATE._khozyaika3_pending) {
      Bubbles.renderReplyChips([
        { id: 'help', label: tStr('chip.khozyaika3.help', 'помочь искать (−2h, +10 комфорт)') },
        { id: 'refuse', label: tStr('chip.khozyaika3.refuse', 'нет времени (−5 комфорт)') }
      ], function (opt) {
        STATE._khozyaika3_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'help') {
          postOutgoing('khozyaika', tStr('system.khozyaika.cat_help', 'сейчас спущусь, помогу.'));
          STATE.hours = Math.max(0, STATE.hours - 2);
          STATE.comfort = Math.min(100, STATE.comfort + 10);
          setTimeout(function () {
            postIncoming('khozyaika', tStr('system.khozyaika.cat_found', 'кошка нашлась! спала под диваном. спасибо!'), Bubbles.localizedContactName(findContact('khozyaika')));
            save();
          }, 1500);
        } else {
          postOutgoing('khozyaika', tStr('system.khozyaika.cat_busy', 'извините, я сейчас не могу. работа.'));
          STATE.comfort = Math.max(0, STATE.comfort - 5);
        }
        save(); renderDock();
      });
      return;
    }
    // Khozyaika 4 — гороскоп (flavor only)
    if (contactId === 'khozyaika' && STATE._khozyaika4_pending) {
      Bubbles.renderReplyChips([
        { id: 'thanks', label: tStr('chip.khozyaika4.thanks', 'спасибо, буду знать') }
      ], function () {
        STATE._khozyaika4_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        postOutgoing('khozyaika', tStr('system.khozyaika.horoscope', 'спасибо хозяйка. астрология — мимо меня.'));
        STATE.comfort = Math.min(100, STATE.comfort + 2);
        save(); renderDock();
      });
      return;
    }
    // SPRINT 14 — Khozyaika day 5 electric meter
    if (contactId === 'khozyaika' && STATE._khozyaika_electric_pending) {
      Bubbles.renderReplyChips([
        { id: 'send', label: tStr('chip.khozyaika_electric.send', 'отправить фото (−1h)') },
        { id: 'later', label: tStr('chip.khozyaika_electric.later', 'потом отправлю (−5 комфорт)') }
      ], function (opt) {
        STATE._khozyaika_electric_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'send') {
          postOutgoing('khozyaika', tStr('system.khozyaika.electric_sent', 'отправила фото счётчика. розетка нормальная.'));
          STATE.hours = Math.max(0, STATE.hours - 1);
        } else {
          postOutgoing('khozyaika', tStr('system.khozyaika.electric_later', 'хозяйка, отправлю позже.'));
          STATE.comfort = Math.max(0, STATE.comfort - 5);
        }
        save(); renderDock();
      });
      return;
    }
    // SPRINT 14 — Khozyaika day 9 chain letter
    if (contactId === 'khozyaika' && STATE._khozyaika_chain_pending) {
      Bubbles.renderReplyChips([
        { id: 'forward', label: tStr('chip.khozyaika_chain.forward', 'переслать 5 людям (−1h)') },
        { id: 'refuse', label: tStr('chip.khozyaika_chain.refuse', 'не буду (−5 комфорт)') }
      ], function (opt) {
        STATE._khozyaika_chain_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'forward') {
          postOutgoing('khozyaika', tStr('system.khozyaika.chain_yes', 'хорошо, переслала.'));
          STATE.hours = Math.max(0, STATE.hours - 1);
          setTimeout(function () {
            postIncoming('khozyaika', tStr('system.khozyaika.chain_thanks', 'СПАСИБО! карма дома восстановлена! 🙏✨'), Bubbles.localizedContactName(findContact('khozyaika')));
          }, 800);
        } else {
          postOutgoing('khozyaika', tStr('system.khozyaika.chain_no', 'хозяйка, я не верю в это.'));
          STATE.comfort = Math.max(0, STATE.comfort - 5);
          setTimeout(function () {
            postIncoming('khozyaika', tStr('system.khozyaika.chain_no_reply', 'ну как хотите. но если что случится — я предупреждала.'), Bubbles.localizedContactName(findContact('khozyaika')));
          }, 800);
        }
        save(); renderDock();
      });
      return;
    }
    // Pavel loan
    if (contactId === 'pavel' && STATE._pavel_pending) {
      Bubbles.renderReplyChips([
        { id: 'lend', label: tStr('chip.pavel.lend', 'дать $300 в долг') },
        { id: 'refuse', label: tStr('chip.pavel.refuse', 'отказать') }
      ], function (opt) {
        STATE._pavel_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'lend') {
          postOutgoing('pavel', tStr('system.pavel.loan_yes', 'ладно. держи.'));
          STATE.cash -= 300;
          postBank(-300, tStr('system.payment.pavel_loan', 'в долг · Павлу'));
          postMessage('scratch', { kind: 'system', text: '−$300 · отданы Павлу' });
          // Delayed callback
          STATE.pending_callbacks = STATE.pending_callbacks || [];
          STATE.pending_callbacks.push({ trigger_day: STATE.day + 3, type: 'pavel_return' });
        } else {
          postOutgoing('pavel', tStr('system.pavel.loan_no', 'не сейчас, извини.'));
          postMessage('scratch', { kind: 'system', text: tStr('system.scratch.refused_pavel', 'Павлу отказала') });
        }
        save(); renderDock();
      });
      return;
    }
    // SPRINT 38b — Pavel day 17 'давай встретимся на кофе' (both options = decline)
    if (contactId === 'pavel' && STATE._pavel_d17_pending) {
      Bubbles.renderReplyChips([
        { id: 'soft',  label: tStr('chip.pavel_d17.soft', 'мягко отказать · «не сейчас, Паш. правда занята»') },
        { id: 'hard',  label: tStr('chip.pavel_d17.hard', 'жёстко отказать · «нет. больше не пиши»') }
      ], function (opt) {
        STATE._pavel_d17_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'soft') {
          postOutgoing('pavel', tStr('system.pavel.busy', 'не сейчас. правда занята месяцем-фаундером.'));
          STATE.comfort = Math.max(0, STATE.comfort - 3);
          setTimeout(function () {
            postIncoming('pavel', tStr('system.pavel.busy_reply', 'понял. удачи тебе.'), Bubbles.localizedContactName(findContact('pavel')));
          }, 1000);
        } else {
          postOutgoing('pavel', tStr('system.pavel.stop', 'нет. больше не пиши, пожалуйста.'));
          STATE.comfort = Math.min(100, STATE.comfort + 5); // closure feels good
          // Block further Pavel beats — он отстаёт
          STATE.beat_pavel_d21 = true;
          STATE.beat_pavel_d25 = true;
          setTimeout(function () {
            postIncoming('pavel', tStr('system.pavel.stop_reply', 'ок. больше не буду.'), Bubbles.localizedContactName(findContact('pavel')));
          }, 1000);
          postMessage('scratch', { kind: 'system', text: tStr('system.scratch.pavel_done', 'Павел больше не пишет · +5💚 закрытый гештальт') });
        }
        save(); renderDock();
      });
      return;
    }
    // Mama day 6
    if (contactId === 'mama' && STATE._mama6_pending) {
      Bubbles.renderReplyChips([
        { id: 'send', label: tStr('chip.mama6.send', 'перевести $200') },
        { id: 'defer', label: tStr('chip.mama6.defer', 'не сейчас, мам') }
      ], function (opt) {
        STATE._mama6_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'send') {
          postOutgoing('mama', tStr('system.mama.medicine_yes', 'перевела, мам. береги себя.'));
          STATE.cash -= 200;
          postBank(-200, tStr('system.payment.mama_medicine', 'маме · лекарства'));
          postMessage('scratch', { kind: 'system', text: '−$200 · маме' });
        } else {
          postOutgoing('mama', tStr('system.mama.medicine_no', 'мам, сейчас не могу. в следующий раз. обещаю.'));
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
        { id: 'come', label: tStr('chip.mama17.come', 'приеду в выходные') },
        { id: 'later', label: tStr('chip.mama17.later', 'потом, работа') }
      ], function (opt) {
        STATE._mama17_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'come') {
          postOutgoing('mama', tStr('system.mama.pies_yes', 'буду в воскресенье. соскучилась.'));
          STATE.energy = Math.min(100, STATE.energy + 40);
          postMessage('scratch', { kind: 'system', text: '+40⚡ · пироги работают' });
        } else {
          postOutgoing('mama', tStr('system.mama.pies_no', 'мам, проект горит. позже, ладно?'));
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
        var denyReason = STATE.bank_locked ? tStr('chip.denis.deny_bank_locked', 'счёт заблокирован') :
                         (STATE.cash < dCost ? tStr('chip.denis.deny_short_cash', 'не хватает ${shortage}').replace('{shortage}', (dCost - STATE.cash)) :
                         (STATE.hours < 2 ? tStr('chip.denis.deny_no_hours', 'нет 2 часов') : null));
        Bubbles.renderReplyChips([
          {
            id: 'go',
            label: tStr('chip.denis.go', 'поехать (−${cost}, +60⚡, +25💚, −2h)').replace('{cost}', '$' + dCost) + (canAfford ? '' : ' · ' + denyReason),
            disabled: !canAfford
          },
          { id: 'skip', label: tStr('chip.denis.skip', 'не сейчас') }
        ], function (opt) {
          // SPRINT 14.1 rev4 — re-evaluate guards against CURRENT STATE (not stale closure).
          // Codex caught bypass: player opens chat while affordable, spends money
          // elsewhere, returns and clicks "go" — render-time canAfford was true.
          if (opt.id === 'go') {
            var liveBankLocked = STATE.bank_locked;
            var liveCash = STATE.cash;
            var liveHours = STATE.hours;
            if (liveBankLocked || liveCash < dCost || liveHours < 2) {
              var reason = liveBankLocked ? tStr('chip.denis.deny_bank_locked', 'счёт заблокирован') :
                           (liveCash < dCost ? tStr('chip.denis.deny_short_cash', 'не хватает ${shortage}').replace('{shortage}', (dCost - liveCash)) : tStr('chip.denis.deny_no_hours', 'нет 2 часов'));
              postOutgoing('denis', tStr('system.denis.skip', 'слушай, не сейчас. не могу — {reason}.').replace('{reason}', reason));
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
            postOutgoing('denis', tStr('system.denis.go', 'ладно, поехали. работа подождёт.'));
            STATE.cash -= dCost;
            STATE.energy = Math.min(100, STATE.energy + 60);
            STATE.comfort = Math.min(100, STATE.comfort + 25); // SPRINT 33 — Denis raises comfort too
            STATE.hours = Math.max(0, STATE.hours - 2);
            postBank(-dCost, tStr('system.payment.denis', 'с Денисом'));
            postMessage('scratch', { kind: 'outgoing', text: tPickOr('text.hangout_denis', HANGOUT_DENIS_TEXT) });
            postMessage('scratch', { kind: 'system', text: '−$' + dCost + ' · +60⚡ · +25💚 · −2h · день ожил' });
          } else {
            postOutgoing('denis', tStr('system.denis.no', 'не сегодня. работа.'));
            postMessage('scratch', { kind: 'system', text: tStr('system.scratch.refused_denis', 'Денису отказала') });
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
        { id: 'invest', label: tStr('chip.olya.invest', 'вложить $200 в клуб') },
        { id: 'listen', label: tStr('chip.olya.listen', 'послушать 5 минут (−1h)') },
        { id: 'delete', label: tStr('chip.olya.delete', 'удалить из контактов') }
      ], function (opt) {
        STATE._olya_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'invest') {
          postOutgoing('olya', tStr('system.olya.invest_200', 'ок, перевожу $200.'));
          STATE.cash -= 200;
          STATE.comfort = Math.max(0, STATE.comfort - 15);
          postBank(-200, tStr('system.payment.olya_club', 'Оля «клуб женщин» · 0 возврата'));
          postMessage('scratch', { kind: 'system', text: '−$200 · −15 комфорт · клуб Оли сгорел' });
          setTimeout(function () {
            postIncoming('olya', tStr('system.olya.invest_thanks', 'спасибо дорогая! ты на пути к новой жизни 🌸'), Bubbles.localizedContactName(findContact('olya')));
          }, 1500);
        } else if (opt.id === 'listen') {
          postOutgoing('olya', tStr('system.olya.listen', 'у меня 5 минут. рассказывай.'));
          STATE.hours = Math.max(0, STATE.hours - 1);
        } else {
          postMessage('scratch', { kind: 'system', text: tStr('system.scratch.olya_removed', 'Оля удалена из контактов') });
        }
        save(); renderDock();
      });
      return;
    }
    // SPRINT 39 — Оля retry (day 17) chip
    if (contactId === 'olya' && STATE._olya_retry_pending) {
      Bubbles.renderReplyChips([
        { id: 'invest400', label: tStr('chip.olya_retry.invest400', 'вложить $400 в новый уровень (риск)') },
        { id: 'block',     label: tStr('chip.olya_retry.block', '🚫 заблокировать Олю · больше не пишет') },
        { id: 'ignore',    label: tStr('chip.olya_retry.ignore', 'игнор · она напишет снова через неделю') }
      ], function (opt) {
        STATE._olya_retry_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'invest400') {
          postOutgoing('olya', tStr('system.olya.invest_400', 'перевожу $400. в последний раз.'));
          STATE.cash -= 400;
          STATE.comfort = Math.max(0, STATE.comfort - 20);
          postBank(-400, tStr('system.payment.olya_400', 'Оля · клуб новый уровень · 0 возврата'));
          postMessage('scratch', { kind: 'system', text: '−$400 · −20 комфорт · клуб Оли всё ещё пирамида' });
        } else if (opt.id === 'block') {
          postMessage('scratch', { kind: 'system', text: '🚫 Оля заблокирована · больше не пишет' });
          STATE.beat_olya_final = true; // suppress final
          STATE.comfort = Math.min(100, STATE.comfort + 3);
        } else {
          postMessage('scratch', { kind: 'system', text: tStr('system.scratch.olya_ignored', 'Оля проигнорирована') });
        }
        save(); renderDock();
      });
      return;
    }
    // SPRINT 39 — Оля final (day 24) chip
    if (contactId === 'olya' && STATE._olya_final_pending) {
      Bubbles.renderReplyChips([
        { id: 'pity150', label: tStr('chip.olya_final.pity150', 'дать $150 чтобы отстала') },
        { id: 'no',      label: tStr('chip.olya_final.no', '«Оля, нет. на этом всё»') }
      ], function (opt) {
        STATE._olya_final_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'pity150') {
          postOutgoing('olya', tStr('system.olya.pity_150', '$150 последние. больше не пиши.'));
          STATE.cash -= 150;
          postBank(-150, tStr('system.payment.olya_150', 'Оля · последняя жалость'));
          STATE.comfort = Math.max(0, STATE.comfort - 5);
        } else {
          postOutgoing('olya', tStr('system.olya.final_no', 'нет. на этом всё.'));
          STATE.comfort = Math.min(100, STATE.comfort + 5);
          postMessage('scratch', { kind: 'system', text: '✓ закрыла тему с Олей · +5💚' });
        }
        save(); renderDock();
      });
      return;
    }

    // Кирилл (Tinder intro → unlocks date action)
    if (contactId === 'kirill' && STATE._kirill_pending) {
      Bubbles.renderReplyChips([
        { id: 'yes', label: tStr('chip.kirill_intro.yes', 'встретимся (разблокировать свидания)') },
        { id: 'no', label: tStr('chip.kirill_intro.no', 'не мой типаж') }
      ], function (opt) {
        STATE._kirill_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'yes') {
          postOutgoing('kirill', tStr('system.kirill.meet', 'хорошо, давай встретимся. не обещаю ничего серьёзного.'));
          STATE.kirill_unlocked = true;
          STATE.kirill_affection = (STATE.kirill_affection || 0) + 3;
          // Activate date invitation window (expires in 2 days)
          STATE.kirill_invite_active = true;
          STATE.kirill_invite_expires_day = (STATE.day || 1) + 2;
          postMessage('scratch', { kind: 'system', text: tStr('system.scratch.kirill_unlocked', 'Кирилл разблокировал свидания · ⏳ окно 2 дня') });
        } else {
          postOutgoing('kirill', tStr('system.kirill.not_type', 'извини, ты не мой типаж.'));
          STATE.kirill_blocked = true;
        }
        save(); renderDock();
      });
      return;
    }

    // Kirill love arc — mid-late game warm messages
    if (contactId === 'kirill' && STATE._kirill_love1_pending) {
      Bubbles.renderReplyChips([
        { id: 'warm', label: tStr('chip.kirill_love1.warm', 'ответить искренне · +💚 Кирилл, +5💚 настроение') },
        { id: 'cool', label: tStr('chip.kirill_love1.cool', 'отшутиться · −💚 Кирилл') }
      ], function (opt) {
        STATE._kirill_love1_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'warm') {
          postOutgoing('kirill', tStr('system.kirill.honest', 'спасибо. мне сейчас сложно, но я тебя слышу. и мне важно что ты видишь.'));
          STATE.kirill_affection = (STATE.kirill_affection || 0) + 2;
          STATE.comfort = Math.min(100, STATE.comfort + 5);
        } else {
          postOutgoing('kirill', tStr('system.kirill.deflect', 'ох лично, сохрани на потом. я в процессе.'));
          STATE.kirill_affection = Math.max(0, (STATE.kirill_affection || 0) - 2);
        }
        save(); renderDock();
      });
      return;
    }
    if (contactId === 'kirill' && STATE._kirill_love2_pending) {
      Bubbles.renderReplyChips([
        { id: 'yes',   label: tStr('chip.kirill_love2.yes', 'да, встретимся · +💚 Кирилл, −3ч сегодня') },
        { id: 'defer', label: tStr('chip.kirill_love2.defer', 'не сейчас, работа') }
      ], function (opt) {
        STATE._kirill_love2_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'yes') {
          postOutgoing('kirill', tStr('system.kirill.walk', 'давай. просто погуляем.'));
          STATE.hours = Math.max(0, STATE.hours - 3);
          STATE.comfort = Math.min(100, STATE.comfort + 15);
          STATE.kirill_affection = (STATE.kirill_affection || 0) + 2;
        } else {
          postOutgoing('kirill', tStr('system.kirill.busy', 'сейчас не могу. проекты горят.'));
          STATE.kirill_affection = Math.max(0, (STATE.kirill_affection || 0) - 1);
        }
        save(); renderDock();
      });
      return;
    }
    if (contactId === 'kirill' && STATE._kirill_love_final_pending) {
      Bubbles.renderReplyChips([
        { id: 'yes_love', label: tStr('chip.kirill_love_final.yes_love', '«да. я тоже.»') },
        { id: 'scared', label: tStr('chip.kirill_love_final.scared', '«Кирилл, я боюсь, но хочу попробовать»') }
      ], function (opt) {
        STATE._kirill_love_final_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'yes_love') {
          postOutgoing('kirill', tStr('system.kirill.me_too', 'да. я тоже.'));
        } else {
          postOutgoing('kirill', tStr('system.kirill.try_us', 'я боюсь. но я хочу попробовать быть с тобой.'));
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
        { id: 'sorry', label: tStr('chip.kirill_complaint.sorry', 'прости (−15 комфорт)') },
        { id: 'defend', label: tStr('chip.kirill_complaint.defend', 'я просто не могла (−10 комфорт)') }
      ], function (opt) {
        STATE._kirill_complaint_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'sorry') {
          postOutgoing('kirill', tStr('system.kirill.sorry_look', 'прости. я понимаю как это выглядит.'));
          STATE.comfort = Math.max(0, STATE.comfort - 15);
        } else {
          postOutgoing('kirill', tStr('system.kirill.bank_excuse', 'у меня был счёт заблокирован. мне было нечем.'));
          STATE.comfort = Math.max(0, STATE.comfort - 10);
        }
        save(); renderDock();
      });
      return;
    }
    // SPRINT 38b — Nastya partnership choice (day 20 offer)
    if (contactId === 'nastya' && STATE._nastya_partnership_pending) {
      Bubbles.renderReplyChips([
        { id: 'join',   label: tStr('chip.nastya_partnership.join', 'согласиться · +$200 upfront, +1 проект на неделю') },
        { id: 'maybe',  label: tStr('chip.nastya_partnership.maybe', 'подумаю · сохранить вариант') },
        { id: 'decline',label: tStr('chip.nastya_partnership.decline', 'нет, я одна справлюсь') }
      ], function (opt) {
        STATE._nastya_partnership_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'join') {
          postOutgoing('nastya', tStr('system.nastya.partner_yes', 'беру половину. скидывай детали.'));
          STATE.cash += 200;
          postBank(200, 'upfront · партнёрство с Настей');
          // Add a project: shared work, 4 units, 7-day deadline, $200 final
          STATE.active_projects.push({
            id: STATE.active_projects.length + STATE.delivered_projects + 1,
            clientId: 'nastya',
            client: 'настина половина',
            progress: 0,
            work_units_done: 0,
            work_units_total: 4, // smaller than solo project — Nastya does half
            upfront_paid: 200,
            final_due: 200,
            final_payment: 200,
            started_day: STATE.day,
            deadline_day: STATE.day + 7,
            status: 'active'
          });
          STATE.comfort = Math.min(100, STATE.comfort + 10);
          postMessage('scratch', { kind: 'system', text: tStr('system.scratch.nastya_partnership', '🤝 партнёрство с Настей · +$200 + новый проект (4 units, 7 дн) · +10💚') });
          setTimeout(function () {
            postIncoming('nastya', tStr('system.nastya.partner_thanks', 'кайф, спасибо. закидываю бриф в почту, начинаем завтра.'), Bubbles.localizedContactName(findContact('nastya')));
          }, 1000);
        } else if (opt.id === 'maybe') {
          postOutgoing('nastya', tStr('system.nastya.partner_think', 'дай мне сутки подумать.'));
          // Keep visible for re-trigger possibility — re-set pending so chip stays
          // (simple version: just acknowledge; lost forever — Nastya finds another partner)
          setTimeout(function () {
            postIncoming('nastya', tStr('system.nastya.partner_think_reply', 'жду, но недолго — клиент торопит.'), Bubbles.localizedContactName(findContact('nastya')));
          }, 900);
        } else {
          postOutgoing('nastya', tStr('system.nastya.partner_no', 'спасибо что предложила. сама справлюсь.'));
          STATE.kirill_affection = STATE.kirill_affection; // no-op marker
          setTimeout(function () {
            postIncoming('nastya', tStr('system.nastya.partner_no_reply', 'ок, удачи. найду кого-нибудь ещё.'), Bubbles.localizedContactName(findContact('nastya')));
          }, 900);
        }
        save(); renderDock();
      });
      return;
    }
    // SPRINT 20 — Kirill conflict (Pavel night messages)
    // SPRINT 38b — chip labels in human language (no leaked code identifiers)
    if (contactId === 'kirill' && STATE._kirill_conflict_pending) {
      Bubbles.renderReplyChips([
        { id: 'honest',    label: tStr('chip.kirill_conflict.honest', 'я с ним не возвращаюсь · +💚 Кирилл, −5💚 (тяжёлый разговор)') },
        { id: 'defensive', label: tStr('chip.kirill_conflict.defensive', 'это не твоё дело · −💚 Кирилл') },
        { id: 'leave',     label: tStr('chip.kirill_conflict.leave', 'может мы и правда рано… · 💔 расстаться с Кириллом') }
      ], function (opt) {
        STATE._kirill_conflict_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'honest') {
          postOutgoing('kirill', tStr('system.kirill.honest_him', 'нет. он просто пишет. я отвечаю коротко и сплю. я тут, с тобой.'));
          STATE.kirill_affection = (STATE.kirill_affection || 0) + 2;
          STATE.comfort = Math.max(0, STATE.comfort - 5);
        } else if (opt.id === 'defensive') {
          postOutgoing('kirill', tStr('system.kirill.defensive', 'это не твоё дело с кем я переписываюсь.'));
          STATE.kirill_affection = Math.max(0, (STATE.kirill_affection || 0) - 2);
        } else {
          postOutgoing('kirill', tStr('system.kirill.time', 'может мы правда поторопились. мне нужно время.'));
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
        { id: 'send', label: tStr('chip.krypta.send', 'ПЕРЕВОЖУ $100 (5% шанс х10)') },
        { id: 'bot', label: tStr('chip.krypta.bot', 'ты бот?') },
        { id: 'ignore', label: tStr('chip.krypta.ignore', 'игнор') }
      ], function (opt) {
        STATE._krypta_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'send') {
          postOutgoing('krypta', tStr('system.krypta.invest_100', 'брат, перевожу $100. не подведи.'));
          STATE.cash -= 100;
          postBank(-100, tStr('system.payment.krypta_100', 'перевод на «крипту»'));
          // Schedule 115-ФЗ bank lock for next day
          STATE.pending_callbacks.push({ trigger_day: STATE.day + 1, type: 'bank_lock_115' });
          postMessage('scratch', { kind: 'system', text: tStr('system.scratch.suspicious_txn', 'подозрительная транзакция · жди последствий') });
        } else if (opt.id === 'bot') {
          postOutgoing('krypta', tStr('system.krypta.bot_check', 'ты бот?'));
          setTimeout(function () {
            postIncoming('krypta', tStr('system.krypta.not_bot', 'БРАТ НЕ БОТ Я РЕАЛЬНЫЙ БРАТ'), Bubbles.localizedContactName(findContact('krypta')));
          }, 800);
        } else {
          postMessage('scratch', { kind: 'system', text: tStr('system.scratch.krypta_ignored', 'БРАТ проигнорирован') });
        }
        save(); renderDock();
      });
      return;
    }

    // SPRINT 38b — БРАТ крипта retry (day 18) — chip choice
    if (contactId === 'krypta' && STATE._krypta_retry_pending) {
      Bubbles.renderReplyChips([
        { id: 'send_50',  label: tStr('chip.krypta_retry.send_50', 'перевести $50 (5% шанс х10)') },
        { id: 'block',    label: tStr('chip.krypta_retry.block', 'заблокировать БРАТА · больше не пишет') },
        { id: 'ignore',   label: tStr('chip.krypta_retry.ignore', 'игнор · он напишет снова через неделю') }
      ], function (opt) {
        STATE._krypta_retry_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'send_50') {
          postOutgoing('krypta', tStr('system.krypta.invest_50', 'ладно, $50. последний раз.'));
          STATE.cash -= 50;
          postBank(-50, tStr('system.payment.krypta_50', 'БРАТ крипта · второй заход'));
          STATE.pending_callbacks.push({ trigger_day: STATE.day + 1, type: 'bank_lock_115' });
          postMessage('scratch', { kind: 'system', text: '⚠ ещё одна подозрительная транзакция — жди последствий' });
        } else if (opt.id === 'block') {
          postMessage('scratch', { kind: 'system', text: '🚫 БРАТ крипта заблокирован · больше не пишет' });
          STATE.beat_krypta_final = true; // suppress final retry too
          STATE.comfort = Math.min(100, STATE.comfort + 3);
        } else {
          postMessage('scratch', { kind: 'system', text: tStr('system.scratch.krypta_ignored', 'БРАТ проигнорирован') });
        }
        save(); renderDock();
      });
      return;
    }

    // SPRINT 38b — БРАТ крипта final desperation (day 25)
    if (contactId === 'krypta' && STATE._krypta_final_pending) {
      Bubbles.renderReplyChips([
        { id: 'pity_30', label: tStr('chip.krypta_final.pity_30', 'из жалости $30') },
        { id: 'no',      label: tStr('chip.krypta_final.no', '«нет, Брат. на этом всё»') }
      ], function (opt) {
        STATE._krypta_final_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'pity_30') {
          postOutgoing('krypta', tStr('system.krypta.invest_30', 'на хостинг. удачи.'));
          STATE.cash -= 30;
          postBank(-30, tStr('system.payment.krypta_30', 'БРАТ крипта · последняя жалость'));
          STATE.comfort = Math.max(0, STATE.comfort - 3);
        } else {
          postOutgoing('krypta', tStr('system.krypta.final_no', 'нет, Брат. на этом всё.'));
          STATE.comfort = Math.min(100, STATE.comfort + 5);
          postMessage('scratch', { kind: 'system', text: '✓ закрыла тему с БРАТОМ · +5💚' });
        }
        save(); renderDock();
      });
      return;
    }

    // Артур (эx-босс) — potentially $800 project
    if (contactId === 'artur' && STATE._artur_pending) {
      Bubbles.renderReplyChips([
        { id: 'visit', label: tStr('chip.artur.visit', 'подойти в офис (−4h)') },
        { id: 'refuse', label: tStr('chip.artur.refuse', 'отказать') }
      ], function (opt) {
        STATE._artur_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'visit') {
          postOutgoing('artur', tStr('system.artur.meet_yes', 'хорошо, завтра в 10.'));
          STATE.hours = Math.max(0, STATE.hours - 4);
          setTimeout(function () {
            if (Math.random() < 0.40) {
              // Hit — $800 project offer
              postIncoming('artur', tStr('system.artur.project_offer', '{name}, есть проект на $800 — серьёзный клиент, 10 дней.').replace('{name}', tStr('contact.heroine.firstname', 'Марина')), Bubbles.localizedContactName(findContact('artur')));
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
              postIncoming('artur', tStr('system.artur.pass', 'извини, понял что мы сейчас не заинтересованы.'), Bubbles.localizedContactName(findContact('artur')));
              postMessage('scratch', { kind: 'system', text: tStr('system.scratch.artur_wasted', 'Артур зря вызвал · потеряла 4 часа') });
            }
            save(); renderDock();
          }, 1500);
        } else {
          postOutgoing('artur', tStr('system.artur.not_ready', 'извини, не готова.'));
        }
        save(); renderDock();
      });
      return;
    }

    // Вера Николаевна — помочь внучке
    if (contactId === 'vera' && STATE._vera_pending) {
      Bubbles.renderReplyChips([
        { id: 'help', label: tStr('chip.vera.help', 'помочь Алисе (−2h, +10 комфорт)') },
        { id: 'refuse', label: tStr('chip.vera.refuse', 'вежливо отказать (−3 комфорт)') }
      ], function (opt) {
        STATE._vera_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'help') {
          postOutgoing('vera', tStr('system.vera.help_yes', 'да конечно помогу. скиньте стихи.'));
          STATE.hours = Math.max(0, STATE.hours - 2);
          STATE.comfort = Math.min(100, STATE.comfort + 10);
        } else {
          postOutgoing('vera', tStr('system.vera.help_no', 'простите — у меня сейчас много работы.'));
          STATE.comfort = Math.max(0, STATE.comfort - 3);
        }
        save(); renderDock();
      });
      return;
    }

    // Светка — сплетни (SPRINT 06)
    if (contactId === 'svetka' && STATE._svetka_pending) {
      Bubbles.renderReplyChips([
        { id: 'listen', label: tStr('chip.svetka.listen', '«слушать» сплетню (−1h, +15💚)') },
        { id: 'ignore', label: tStr('chip.svetka.ignore', 'не сейчас (−5💚)') }
      ], function (opt) {
        STATE._svetka_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'listen') {
          postOutgoing('svetka', tStr('system.svetka.gossip_yes', 'ааа рассказывай подробнее'));
          STATE.hours = Math.max(0, STATE.hours - 1);
          STATE.comfort = Math.min(100, STATE.comfort + 15);
          setTimeout(function () {
            postIncoming('svetka', tStr('system.svetka.gossip_thanks', 'ТЫ ЛУЧШАЯ я тебя обожаю 💕 расскажу всё на кофе в воскресенье'), Bubbles.localizedContactName(findContact('svetka')));
          }, 1000);
        } else {
          postOutgoing('svetka', tStr('system.svetka.busy', 'не могу, проект горит. позже'));
          STATE.comfort = Math.max(0, STATE.comfort - 5);
        }
        save(); renderDock();
      });
      return;
    }
    // Сосед снизу — протёк
    if (contactId === 'sosed' && STATE._sosed_pending) {
      Bubbles.renderReplyChips([
        { id: 'come', label: tStr('chip.sosed.come', 'спуститься (−1h)') },
        { id: 'ignore', label: tStr('chip.sosed.ignore', 'игнорировать (переспросит day+1)') }
      ], function (opt) {
        STATE._sosed_pending = false;
        Bubbles.clearChipsArea();
        bumpInteraction();
        if (opt.id === 'come') {
          postOutgoing('sosed', tStr('system.sosed.check', 'сейчас спущусь, посмотрим.'));
          STATE.hours = Math.max(0, STATE.hours - 1);
          setTimeout(function () {
            postIncoming('sosed', tStr('system.sosed.false', 'оказалось не от вас. извините за беспокойство.'), Bubbles.localizedContactName(findContact('sosed')));
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

  // SPRINT 42 — confetti burst for win overlay (CSS-only, GPU-friendly)
  function spawnConfetti(count) {
    var n = count || 80;
    var colors = ['#ff6b3d', '#ffd166', '#65c77e', '#7cc4ff', '#ff6b95', '#c197ff', '#ffffff'];
    for (var i = 0; i < n; i++) {
      (function (idx) {
        var $c = $('<div class="confetti">');
        var startX = window.innerWidth * (0.1 + Math.random() * 0.8);
        var startY = -20 - Math.random() * 80;
        var endX = startX + (Math.random() - 0.5) * 400;
        var endY = window.innerHeight + 60;
        var rotEnd = (Math.random() - 0.5) * 1080;
        var size = 6 + Math.random() * 8;
        var color = colors[idx % colors.length];
        $c.css({
          left: startX + 'px',
          top: startY + 'px',
          width: size + 'px',
          height: (size * (0.5 + Math.random() * 1.2)) + 'px',
          background: color,
          transform: 'rotate(0deg)',
          opacity: '1'
        });
        $(document.body).append($c);
        var dur = 2200 + Math.random() * 1800;
        var delay = idx * 18;
        setTimeout(function () {
          $c.css({
            transition: 'transform ' + dur + 'ms cubic-bezier(0.2, 0.7, 0.4, 1), top ' + dur + 'ms cubic-bezier(0.3, 0.6, 0.5, 1), left ' + dur + 'ms ease-out, opacity ' + (dur - 400) + 'ms ease-in',
            top: endY + 'px',
            left: endX + 'px',
            transform: 'rotate(' + rotEnd + 'deg)',
            opacity: '0.85'
          });
        }, delay);
        setTimeout(function () { $c.remove(); }, dur + delay + 400);
      })(i);
    }
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
    track('game_started', { version: APP_VERSION });
    postMessage('scratch', {
      text: tStr('system.scratch.boot_day1', 'день 1. 9:00. ноутбук открыт. чат пуст. кофе остыл. пора начинать.'),
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
      var hitChance = e >= 70 ? 0.60 : (e >= 40 ? 0.48 : 0.30); // SPRINT 34 — eased back +10%
      hit = roll < hitChance;
      if (hit) STATE.reach_out_misses = 0;
      else STATE.reach_out_misses += 1;
    }

    // BLOCK J — particle burst on click
    funnelBurstReachOut(hit);

    runAction(function () {
      postOutgoing('scratch', tPickOr('text.reach_out.outgoing', REACH_OUT_TEXT.outgoing));

      if (hit) {
        STATE.leads += 1;
        setTimeout(function () {
          postSystem('scratch', tStr('system.scratch.lead_hit', '+1 лид · кто-то ответил'));
          postIncoming('scratch', tPickOr('text.reach_out.hit_reply', REACH_OUT_TEXT.hit_reply), tStr('system.reach_out.unknown_contact', 'незнакомый контакт'));
        }, 600);
      } else {
        setTimeout(function () {
          postSystem('scratch', tPickOr('text.reach_out.miss_silence', REACH_OUT_TEXT.miss_silence));
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
      postOutgoing('scratch', tPickOr('text.brief', BRIEF_TEXT));
      setTimeout(function () {
        postSystem('scratch', tStr('system.scratch.qualified', '+1 квалифицированный лид · можно отправить оффер'));
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
      postOutgoing('scratch', tStr('system.scratch.send_offer', 'отправляю предложение'));
      setTimeout(function () {
        postIncoming('scratch',
          'клиент пишет: «у меня бюджет $' + baseBudget + ', сроки — неделя»',
          'клиент');
        // Offer torgi chips
        Bubbles.renderReplyChips([
          { id: 'accept',   label: tStr('chip.torgi.accept', 'согласиться (${price})').replace('{price}', '$' + baseBudget), cost: '100% accept' },
          { id: 'counter1', label: tStr('chip.torgi.counter1', 'поторговаться (${price})').replace('{price}', '$' + (baseBudget + 150)), cost: '70% accept' },
          { id: 'counter2', label: tStr('chip.torgi.counter2', 'жёстко (${price})').replace('{price}', '$' + (baseBudget + 350)), cost: '40% accept' },
          { id: 'decline',  label: tStr('chip.torgi.decline', 'отказать, искать следующего') }
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
      postIncoming('scratch', tStr('system.scratch.client_pass', 'ок, ищите других'), tStr('system.scratch.client_label', 'клиент'));
      save(); renderDock();
      return;
    }

    if (accepted) {
      postOutgoing('scratch', tStr(choice === 'accept' ? 'system.scratch.client_accept' : 'system.scratch.client_terms', choice === 'accept' ? 'окей, беру' : 'давайте на этих условиях'));
      setTimeout(function () {
        postIncoming('scratch', tStr('system.scratch.client_signed', 'отлично, договор подписываем · срок неделя'), tStr('system.scratch.client_label', 'клиент'));
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
        postBank(upfront, tStr('system.payment.upfront', 'поступление по договору #{id}').replace('{id}', project.id));
        postSystem('scratch', tStr('system.scratch.contract_signed', 'контракт · upfront ${upfront} · срок: день {deadline}').replace('{upfront}', upfront).replace('{deadline}', project.deadline_day));
        save(); renderDock();
      }, 800);
    } else {
      postOutgoing('scratch', tStr('system.scratch.negotiate', 'давайте подумаем и обсудим'));
      setTimeout(function () {
        postIncoming('scratch', tStr('system.scratch.client_decline', 'извините, нам это не подходит'), tStr('system.scratch.client_label', 'клиент'));
        postSystem('scratch', tStr('system.scratch.deal_lost', 'сделка сорвалась · лид сгорел'));
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
      postOutgoing('scratch', STATE.hunger < 50 ? tPickOr('text.work_hungry', WORK_TEXT_HUNGRY) : tPickOr('text.work', WORK_TEXT));
      setTimeout(function () {
        var extra = '';
        if (STATE.hunger < 30) extra = ' · 🍔 голод снижает прогресс';
        else if (STATE.hunger < 50) extra = ' · 🍔 голодно';
        if (STATE._hangover_active) extra += ' · ☕ похмелье';
        // SPRINT 34 — show units progress explicitly so player sees movement
        var totalU = p.work_units_total || 3;
        postSystem('scratch', tStr('system.scratch.project_progress', 'проект #{id} · {done}/{total} units · {pct}%').replace('{id}', p.id).replace('{done}', (p.work_units_done || 0).toFixed(1)).replace('{total}', totalU).replace('{pct}', Math.floor(p.progress)) + extra);
        if (p.work_units_done >= (p.work_units_total || 3)) {
          // Delivered — money particle flies to cash pill
          STATE.active_projects.shift();
          STATE.delivered_projects += 1;
          var payment = p.final_due || p.final_payment || 0;
          STATE.cash += payment;
          p.status = 'delivered';
          track('project_delivered', { project_id: p.id, client: p.client || 'n/a', payment: payment, day: STATE.day, delivered_total: STATE.delivered_projects });
          spawnParticle({ from: 'work_on_project', to: 'cash', kind: 'money', icon: '$', duration: 800 });
          setTimeout(function () {
            postSystem('scratch', tStr('system.scratch.project_delivered', 'проект #{id} сдан · клиент принял').replace('{id}', p.id));
            postBank(payment, tStr('system.payment.project_final', 'финал по проекту #{id}').replace('{id}', p.id));
            save(); renderDock();
            // SPRINT 51 — share moment on FIRST project delivered (~45% player reach)
            if (STATE.delivered_projects === 1 && window.MarinaViral) {
              try {
                var $scratchThread = document.getElementById('chat-thread');
                if ($scratchThread && STATE.current_chat === 'scratch') {
                  var shareBlock = document.createElement('div');
                  shareBlock.className = 'bubble system viral-first-project-inline';
                  $scratchThread.appendChild(shareBlock);
                  window.MarinaViral.renderCardForSurface('first_project', STATE, shareBlock);
                }
              } catch (e) {}
            }
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
      postOutgoing('scratch', tPickOr('text.rest', REST_TEXT));
      setTimeout(function () {
        if (gain >= 30) postSystem('scratch', tStr('system.scratch.energy_gain', '+{gain} энергии').replace('{gain}', gain));
        else postSystem('scratch', tStr('system.scratch.coffee_overdose', 'кофе перелит · +{gain} энергии').replace('{gain}', gain));
      }, 500);
    });
  }

  // ===== BLOCK B new actions: food / comfort / dates =====

  // SPRINT 35 — eating allowed even when hours=0 (evening meal doesn't cost work hours)
  function actEatHome() {
    if (STATE.bank_locked) return;
    if (STATE.cash < COST.eat_home.c) return;
    // Eating in the evening is free of work-hour cost (only deducts during work day)
    var hCost = STATE.hours >= COST.eat_home.h ? COST.eat_home.h : 0;
    STATE.hours = Math.max(0, STATE.hours - hCost);
    STATE.cash -= COST.eat_home.c;
    STATE.hunger = Math.min(100, STATE.hunger + COST.eat_home.f);
    STATE.comfort = Math.min(100, STATE.comfort + COST.eat_home.m);

    runAction(function () {
      postOutgoing('scratch', tPickOr('text.eat_home', EAT_HOME_TEXT));
      setTimeout(function () {
        var hint = hCost === 0 ? ' · ужин перед сном' : '';
        postSystem('scratch', tStr('system.scratch.eat_home', '+{food} сытости · −${cost}').replace('{food}', COST.eat_home.f).replace('{cost}', COST.eat_home.c) + hint);
      }, 400);
    });
  }

  function actEatOut() {
    if (STATE.bank_locked) return;
    if (STATE.cash < COST.eat_out.c) return;
    var hCost2 = STATE.hours >= COST.eat_out.h ? COST.eat_out.h : 0;
    STATE.hours = Math.max(0, STATE.hours - hCost2);
    STATE.cash -= COST.eat_out.c;
    STATE.hunger = Math.min(100, STATE.hunger + COST.eat_out.f);
    STATE.comfort = Math.min(100, STATE.comfort + COST.eat_out.m);

    runAction(function () {
      postOutgoing('scratch', tPickOr('text.eat_out', EAT_OUT_TEXT));
      setTimeout(function () {
        var hint2 = hCost2 === 0 ? ' · ужин в кафе перед сном' : '';
        postSystem('scratch', tStr('system.scratch.eat_out', '+{food} сытости · +{comfort} комфорт · −${cost}').replace('{food}', COST.eat_out.f).replace('{comfort}', COST.eat_out.m).replace('{cost}', COST.eat_out.c) + hint2);
        postBank(-COST.eat_out.c, tStr('system.payment.eat_out', 'кафе на углу'));
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
      postOutgoing('scratch', tPickOr('text.shopping', SHOPPING_TEXT));
      setTimeout(function () {
        postSystem('scratch', tStr('system.scratch.shopping', '+{comfort} комфорт · −${cost}').replace('{comfort}', COST.shopping.m).replace('{cost}', COST.shopping.c));
        postBank(-COST.shopping.c, tStr('system.payment.shopping', 'маленький шопинг'));
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
      postOutgoing('scratch', tPickOr('text.date_kirill', DATE_KIRILL_TEXT));
      setTimeout(function () {
        postSystem('scratch', tStr('system.scratch.date_kirill', '+{food} сытости · +{comfort} комфорт · −3h · −10⚡').replace('{food}', COST.date_kirill.f).replace('{comfort}', COST.date_kirill.m));
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
    // SPRINT 40 — block night work if there are still day-work hours.
    // Mutually exclusive with actWorkOnProject (Tim: 'одновременно работать не должны').
    if (STATE.hours >= COST.work_on_project.h) return;
    // No hours check beyond mutual exclusion — night work happens AFTER the day's hours
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
      // SPRINT 34 — show explicit work_units in system message (Tim: 'progress не идёт')
      var totalUnits = p.work_units_total || 3;
      if (fatigueBug) {
        p.work_units_done = Math.max(0, (p.work_units_done || 0) - 0.5);
        postOutgoing('scratch', tStr('system.scratch.night_bug', 'опять баг в коде ночью · переделала утром то что сломала'));
      } else {
        p.progress = Math.min(100, (p.progress || 0) + nightProgress);
        p.work_units_done = (p.work_units_done || 0) + 1.5; // night = 1.5 units
        postOutgoing('scratch', tPickOr('text.work_night', WORK_NIGHT_TEXT));
      }
      setTimeout(function () {
        var unitsTxt = ' · ' + p.work_units_done.toFixed(1) + '/' + totalUnits + ' units';
        if (fatigueBug) {
          postSystem('scratch', tStr('system.scratch.night_warn', '⚠ ночная работа · усталость · −0.5 unit') + unitsTxt);
        } else {
          postSystem('scratch', tStr('system.scratch.night_units', 'проект #{id} · +1.5 units{extra} · −15⚡ ночной режим · завтра будет тяжело').replace('{id}', p.id).replace('{extra}', unitsTxt));
        }
        if (p.work_units_done >= (p.work_units_total || 3)) {
          // Delivered (via night work)
          STATE.active_projects.shift();
          STATE.delivered_projects += 1;
          var nightPayment = p.final_due || p.final_payment || 0;
          STATE.cash += nightPayment;
          p.status = 'delivered';
          track('project_delivered', { project_id: p.id, client: p.client || 'n/a', payment: nightPayment, day: STATE.day, delivered_total: STATE.delivered_projects, night: true });
          setTimeout(function () {
            postSystem('scratch', tStr('system.scratch.project_delivered', 'проект #{id} сдан · клиент принял').replace('{id}', p.id));
            postBank(nightPayment, tStr('system.payment.project_final', 'финал по проекту #{id}').replace('{id}', p.id));
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
    // SPRINT 34 — show next-rent countdown on night overlay
    var nextRentDay = null;
    if (prevDay < 10 && !STATE.beat_rent_10) nextRentDay = 10;
    else if (prevDay < 20 && !STATE.beat_rent_20 && !STATE.beat_khozyaika_rescue) nextRentDay = 20;
    else if (STATE.beat_khozyaika_rescue && prevDay < FINALE_DAY) nextRentDay = FINALE_DAY; // post-rescue: next pay = end of month
    var rentLine = '';
    if (nextRentDay !== null) {
      var dl = nextRentDay - prevDay;
      rentLine = ' · 🏠 аренда через ' + dl + ' дн (день ' + nextRentDay + ')';
    }
    $text.text('ночь · день ' + prevDay + ' позади' + rentLine);
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
        // SPRINT 22 — milestone events every 5 days
        if (STATE.day % 5 === 0 && STATE.day <= 30) {
          track('day_reached', { day: STATE.day, cash: STATE.cash, delivered: STATE.delivered_projects });
          // SPRINT 51 — end-of-day share opportunity at 5/10/15/20/25 (soft, non-modal)
          if (window.MarinaViral && STATE.day >= 5 && STATE.day < 30) {
            try {
              var $scratchForShare = document.getElementById('chat-thread');
              if ($scratchForShare && STATE.current_chat === 'scratch') {
                var dayShareBlock = document.createElement('div');
                dayShareBlock.className = 'bubble system viral-day-milestone-inline';
                $scratchForShare.appendChild(dayShareBlock);
                window.MarinaViral.renderCardForSurface('end_of_day', STATE, dayShareBlock);
              }
            } catch (e) {}
          }
        }
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
          postSystem('scratch', tStr('system.scratch.month_over', '— месяц закончился. день {day} позади. —').replace('{day}', FINALE_DAY));
          checkEndings(true);
          STATE.day = FINALE_DAY;
          return;
        }

        postSystem('scratch', tStr('system.scratch.day_over', '— конец дня {day} · новый день начался —').replace('{day}', prevDay));
        postSystem('scratch', tStr('system.scratch.morning', 'день {day} · 8 часов впереди · ${cash}').replace('{day}', STATE.day).replace('{cash}', STATE.cash));

        if (STATE.day === FINALE_DAY - 1) {
          postSystem('scratch', tStr('system.scratch.last_workday', 'это последний рабочий день этого месяца · пора заканчивать проекты'));
        }
        if (STATE.day === FINALE_DAY) {
          postSystem('scratch', tStr('system.scratch.last_day', 'последний день месяца · сегодня всё решится'));
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
        if (STATE.day >= 27 && window.MarinaAudio && window.MarinaAudio.playFinaleTrack) { // SPRINT 42 — earlier finale music
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
      senderName: Bubbles.localizedContactName(findContact('lena')),
      photo: 'img/events/lena_coffee.webp',
      photoAlt: 'кофейня',
      text: tStr('beat.lena_intro.message', 'эй, подруга. услышала что ты ушла из агентства.\n\nпервая неделя всегда самая тяжёлая — я была там. через пару дней скину контакты. держись.')
    });
    Bubbles.renderContacts(STATE);
  }

  function beatAnnaOffer() {
    if (STATE.beat_anna_offer) return;
    STATE.beat_anna_offer = true;
    var c = findContact('anna'); if (c) c.visible = true;
    postMessage('anna', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('anna')),
      photo: 'img/events/anna_landing_sketch.webp',
      photoAlt: 'wireframe лендинга',
      text: tStr('beat.anna_offer.intro', 'привет. лена про тебя рассказала.\n\nу меня небольшой проект — двустраничник, $200 upfront + $250 на сдаче. срок 6 дней. если готова быстро — берём?')
    });
    postMessage('scratch', { kind: 'system', text: tStr('beat.anna_offer.scratch_cue', 'Анна написала · ответь ей') });
    STATE._anna_pending = true;
  }

  function beatAnnaReferral() {
    if (STATE.beat_anna_referral) return;
    STATE.beat_anna_referral = true;
    // Anna возвращается с новым проектом если первый был сдан
    if (STATE.delivered_projects >= 1) {
      postMessage('anna', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('anna')),
        text: tStr('beat.anna_referral.intro', 'марина, привет. мне понравилось как ты сделала. у меня второй проект — email-последовательность для другого клиента. $350 upfront + $450 на сдаче. 7 дней. берёшь?')
      });
      postMessage('scratch', { kind: 'system', text: tStr('beat.anna_referral.scratch_cue', 'Анна с новым проектом · открой чат') });
      STATE._anna_referral_pending = true;
    }
  }

  function beatLenaDay9() {
    if (STATE.beat_lena_day9) return;
    STATE.beat_lena_day9 = true;
    postMessage('lena', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('lena')),
      text: tStr('beat.lena_day9.message', 'как держишься? я тут смотрю новости — обнимаю. скину тебе пару контактов днями если найду что-то стоящее.')
    });
  }

  // ========== Тим as automation consultant (SPRINT 06) ==========
  // Arc: day 5 intro → buys automation tiers → day 28 4th-wall-break → lead form
  // 4 tiers unlock in sequence: $200 auto_reach_out → $300 auto_brief_lead →
  // $400 auto_send_offer → $500 auto_work_project. Each tier makes that action
  // auto-trigger once per day in processPassive (passive income generation).

  var TIM_TIERS = [
    { id: 'auto_reach_out',   label: tStr('chip.tim_tiers.auto_reach_out', 'Автофарминг холодных лидов'), price: 200 },
    { id: 'auto_brief_lead',  label: tStr('chip.tim_tiers.auto_brief_lead', 'Авто-созвоны с лидами'),      price: 300 },
    { id: 'auto_send_offer',  label: tStr('chip.tim_tiers.auto_send_offer', 'Авто-оффер и торг'),          price: 400 }
  ];

  function beatTimConsultIntro() {
    if (STATE.beat_tim_consult_intro) return;
    STATE.beat_tim_consult_intro = true;
    var c = findContact('tim'); if (c) { c.visible = true; c.online = true; }

    postMessage('tim', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('tim')),
      photo: 'img/events/tim_kas_view.webp',
      photoAlt: 'вид из каша',
      text: tStr('beat.tim_consult_intro.msg1', 'привет, марина. лена мне про тебя рассказала. я консультант по автоматизации и AI.')
    });
    setTimeout(function () {
      postMessage('tim', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('tim')),
        text: tStr('beat.tim_consult_intro.msg2', 'смотри: я могу прикрутить ИИ к твоему процессу поиска клиентов. ты заплатишь один раз, и я настрою систему которая будет искать клиентов за тебя, пока ты спишь.')
      });
    }, 1200);
    setTimeout(function () {
      postMessage('tim', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('tim')),
        text: tStr('beat.tim_consult_intro.msg3', 'первый уровень — автофарминг холодки. $200. каждый день +1 лид без твоего участия. хочешь попробовать?')
      });
    }, 2400);
    STATE._tim_consult_pending = true;
    postMessage('scratch', { kind: 'system', text: tStr('beat.tim_consult_intro.scratch_cue', 'Тим предлагает автоматизацию · открой чат') });
  }

  function beatTimTier2Offer() {
    if (STATE.beat_tim_tier2_offer) return;
    STATE.beat_tim_tier2_offer = true;
    postMessage('tim', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('tim')),
      text: tStr('beat.tim_tier2_offer.message', 'смотрю твоя система работает. теперь могу автоматизировать созвоны — AI делает brief за тебя. $300. +1 квалифицированный лид в день.')
    });
    STATE._tim_tier2_pending = true;
  }

  function beatTimTier3Offer() {
    if (STATE.beat_tim_tier3_offer) return;
    STATE.beat_tim_tier3_offer = true;
    postMessage('tim', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('tim')),
      text: tStr('beat.tim_tier3_offer.message', 'третий уровень: AI сам отправляет офферы и торгуется по базовой стратегии. $400. +1 оффер отправлен в день.')
    });
    STATE._tim_tier3_pending = true;
  }

  // (tier 4 removed — see SPRINT 13)

  // Day 28 — 4th wall break (moved from interaction-based to late-game beat)
  // SPRINT 41 — formal 4th-wall break (Tim approved verbatim style)
  function beatTimCreator() {
    if (STATE.beat_tim_creator_fired) return;
    STATE.beat_tim_creator_fired = true;
    var c = findContact('tim'); if (c) { c.visible = true; c.online = true; }
    STATE.notebook_available = true;

    postMessage('tim', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('tim')),
      text: tStr('beat.tim_creator_fired.msg1', 'Привет. Спасибо большое, что играешь в мою игру.')
    });
    setTimeout(function () {
      postMessage('tim', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('tim')),
        text: tStr('beat.tim_creator_fired.msg2', 'Я не просто персонаж этой игры — я её создатель. И да, я действительно занимаюсь автоматизацией, связанной с искусственным интеллектом.')
      });
    }, 1500);
    setTimeout(function () {
      postMessage('tim', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('tim')),
        text: tStr('beat.tim_creator_fired.msg3', 'Если тебе понравилась моя игра — не забудь, пожалуйста, лайкнуть её, подписаться на мои соцсети и посоветовать игру друзьям.')
      });
    }, 3000);
    setTimeout(function () {
      postMessage('tim', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('tim')),
        text: tStr('beat.tim_creator_fired.msg4', 'А если тебе или кому-то из знакомых для бизнеса потребуется автоматизация — ну, ты поняла, к кому обращаться 😉')
      });
    }, 4500);
    setTimeout(function () {
      postMessage('tim', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('tim')),
        text: tStr('beat.tim_creator_fired.msg5', 'Удачи. До конца месяца осталось совсем немного. Подписывайся на меня в Telegram — кнопка ниже 👇')
      });
    }, 6000);
    postMessage('scratch', { kind: 'system', text: tStr('beat.tim_creator_fired.scratch_cue', '❕ сообщение от Тима (реального) · открой чат') });
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
      senderName: Bubbles.localizedContactName(findContact('khozyaika')),
      text: tStr('beat.khozyaika_day1_rent.msg1', 'Марина, добрый день! На всякий случай напоминаю: оплата за квартиру $500 первого числа каждой декады — 10, 20 и 30. Поздравляю с новой главой в жизни!')
    });
    setTimeout(function () {
      postMessage('khozyaika', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('khozyaika')),
        text: tStr('beat.khozyaika_day1_rent.msg2', 'И если вдруг задержка — дайте знать. Я приду с ключами уже со своим дворником. У него характер.')
      });
    }, 1200);
    postMessage('scratch', { kind: 'system', text: tStr('beat.khozyaika_day1_rent.scratch_cue', 'хозяйка напомнила про аренду · 10/20/30 число · $500') });
  }

  function beatKhozyaikaDay2Komod() {
    if (STATE.beat_khozyaika_komod) return;
    STATE.beat_khozyaika_komod = true;
    var c = findContact('khozyaika'); if (c) c.visible = true;
    postMessage('khozyaika', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('khozyaika')),
      text: tStr('beat.khozyaika_day2_komod.msg1', 'Марина, мне сегодня приснилось что вы поцарапали комод в прихожей. Комод этот от дедушки, ручная работа, ему 60 лет. Я его берегу.')
    });
    setTimeout(function () {
      postMessage('khozyaika', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('khozyaika')),
        text: tStr('beat.khozyaika_day2_komod.msg2', 'Ничего страшного, конечно, просто на всякий случай — осмотрите его, пожалуйста. И напишите мне фото. Я волнуюсь.')
      });
    }, 1000);
  }

  function beatKhozyaika1() {
    if (STATE.beat_khozyaika_1) return;
    STATE.beat_khozyaika_1 = true;
    var c = findContact('khozyaika'); if (c) c.visible = true;
    postMessage('khozyaika', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('khozyaika')),
      photo: 'img/events/khozyaika_water_meters.webp',
      photoAlt: 'счётчики воды',
      text: tStr('beat.khozyaika_1_water.message', 'Марина, добрый день! Не забудьте передать показания счётчиков горячей и холодной воды до 10 числа. ВАЖНО: обязательно с фотографией сертифицированного образца. Иначе штраф $100. Наталья В.')
    });
    postMessage('scratch', { kind: 'system', text: tStr('beat.khozyaika_1_water.scratch_cue', 'хозяйка требует счётчики · открой чат · дедлайн +3 дня') });
    STATE._khozyaika1_pending = true;
    // SPRINT 25 — auto-fine if unanswered after 3 days
    STATE.pending_callbacks.push({ trigger_day: STATE.day + 3, type: 'khozyaika_unanswered_water' });
  }

  function beatKhozyaika2() {
    if (STATE.beat_khozyaika_2) return;
    STATE.beat_khozyaika_2 = true;
    var c = findContact('khozyaika'); if (c) c.visible = true;
    postMessage('khozyaika', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('khozyaika')),
      text: tStr('beat.khozyaika_2_tiktok.message', 'Мариночка, я сняла видео с нашим домом для тиктока. Можете лайкнуть и подписаться на @natalya_vmore? Мне важно как бабе-стрельцу, я сейчас на сатурновом транзите и дом это моя точка опоры.')
    });
    postMessage('scratch', { kind: 'system', text: tStr('beat.khozyaika_2_tiktok.scratch_cue', 'хозяйка про тикток · открой чат') });
    STATE._khozyaika2_pending = true;
  }

  function beatKhozyaika3() {
    if (STATE.beat_khozyaika_3) return;
    STATE.beat_khozyaika_3 = true;
    var c = findContact('khozyaika'); if (c) c.visible = true;
    postMessage('khozyaika', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('khozyaika')),
      photo: 'img/events/khozyaika_cat.webp',
      photoAlt: 'кошка Мурка',
      text: tStr('beat.khozyaika_3_cat.message', 'SOS МАРИНА! Кошка Мурка сбежала из квартиры на восьмом этаже. Помогите расклеить объявления по району, вы же дома работаете? У вас время есть. Срочно пожалуйста.')
    });
    postMessage('scratch', { kind: 'system', text: tStr('beat.khozyaika_3_cat.scratch_cue', 'хозяйка потеряла кошку · открой чат') });
    STATE._khozyaika3_pending = true;
  }

  function beatKhozyaika4() {
    if (STATE.beat_khozyaika_4) return;
    STATE.beat_khozyaika_4 = true;
    var c = findContact('khozyaika'); if (c) c.visible = true;
    postMessage('khozyaika', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('khozyaika')),
      photo: 'img/events/khozyaika_tarot.webp',
      photoAlt: 'карты таро',
      text: tStr('beat.khozyaika_4_horoscope.message', 'Марина, читала ваш гороскоп на месяц. Скорпионы в этом месяце в огне. Деньги НЕ давайте Весам (особенно Весам в очках). Это важно для кармы дома, я переживаю как за родную.')
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
      senderName: Bubbles.localizedContactName(findContact('khozyaika')),
      text: tStr('beat.khozyaika_rescue.msg1', 'Марина, добрый день. У меня к вам разговор важный и странный.')
    });
    setTimeout(function () {
      postMessage('khozyaika', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('khozyaika')),
        text: tStr('beat.khozyaika_rescue.msg2', 'Я вчера перед сном смотрела видео одной блогерши из Таиланда — она там про карму дома рассказывала. И знаете что? Она сказала что если собственница жилья помогает молодой фаундерше в первый месяц — у неё третий глаз открывается. А мне надо открыть, я уже кукушку на птичьем рынке спрашивала про своё будущее.')
      });
    }, 1200);
    setTimeout(function () {
      postMessage('khozyaika', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('khozyaika')),
        text: tStr('beat.khozyaika_rescue.msg3', 'Короче. Аренду за первую половину месяца — я вам прощаю. Перевела обратно. До конца месяца — живите спокойно, думайте о деле. У меня высшие задачи, не подведите — у меня третий глаз на кону.')
      });
    }, 2400);
    setTimeout(function () {
      // Mechanical effect: +$500 refund + comfort relief
      STATE.cash += 500;
      STATE.comfort = Math.min(100, (STATE.comfort || 60) + 15);
      postBank(500, tStr('beat.khozyaika_rescue.bank_memo', 'возврат аренды от хозяйки · карма дома'));
      postMessage('scratch', { kind: 'system', text: tStr('beat.khozyaika_rescue.scratch_refund', 'хозяйка вернула аренду · +$500 · месяц продлён') });
      postMessage('scratch', { kind: 'system', text: tStr('beat.khozyaika_rescue.scratch_half_month', '━━━ половина месяца позади ━━━') });
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
      senderName: Bubbles.localizedContactName(findContact('pavel')),
      photo: 'img/events/bank_sms.webp',
      photoAlt: 'скриншот — обещаю вернуть',
      text: tStr('beat.pavel_intro.message', 'слушай, у меня жёсткая ситуация — нужно $300 на пару недель. верну $450, честно. помоги, пожалуйста.')
    });
    postMessage('scratch', { kind: 'system', text: tStr('beat.pavel_intro.scratch_cue', 'бывший просит денег · открой чат') });
    STATE._pavel_pending = true;
  }

  // SPRINT 06 — бывший пишет чаще до Кирилла
  function beatPavelNightDay2() {
    if (STATE.beat_pavel_night_day2) return;
    STATE.beat_pavel_night_day2 = true;
    var c = findContact('pavel'); if (c) c.visible = true;
    postMessage('pavel', { kind: 'incoming', senderName: Bubbles.localizedContactName(findContact('pavel')), text: tStr('beat.pavel_night_day2.message', 'привет, спишь?') });
  }

  function beatPavelDay5() {
    if (STATE.beat_pavel_day5) return;
    STATE.beat_pavel_day5 = true;
    var c = findContact('pavel'); if (c) c.visible = true;
    postMessage('pavel', { kind: 'incoming', senderName: Bubbles.localizedContactName(findContact('pavel')), photo: 'img/events/pavel_roof.webp', photoAlt: 'крыша', text: tStr('beat.pavel_day5.msg1', 'я тут вспомнил, как мы с тобой в Питере сидели на Мойке. помнишь?') });
    setTimeout(function () {
      postMessage('pavel', { kind: 'incoming', senderName: Bubbles.localizedContactName(findContact('pavel')), text: tStr('beat.pavel_day5.msg2', 'тебе было 23, мне 27. я был дурак и не понимал ничего. прости если что.') });
    }, 1200);
  }

  function beatPavelDay7() {
    if (STATE.beat_pavel_day7) return;
    STATE.beat_pavel_day7 = true;
    var c = findContact('pavel'); if (c) c.visible = true;
    postMessage('pavel', { kind: 'incoming', senderName: Bubbles.localizedContactName(findContact('pavel')), text: tStr('beat.pavel_day7.message', 'слушай, ты сейчас одна? в смысле по жизни.') });
  }

  // ========== SPRINT 07 — Late-game density beats ==========

  function beatKhozyaikaD22() {
    if (STATE.beat_khozyaika_d22) return;
    STATE.beat_khozyaika_d22 = true;
    var c = findContact('khozyaika'); if (c) c.visible = true;
    postMessage('khozyaika', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('khozyaika')),
      text: tStr('beat.khozyaika_d22.message', 'Марина, я вчера видела сон будто у нас в подъезде появился домовой в форме кошки. Мурка теперь на подоконнике смотрит в одну точку третий день. Вы не против если я загляну освятить квартиру батюшкой?')
    });
  }

  function beatKhozyaikaD27() {
    if (STATE.beat_khozyaika_d27) return;
    STATE.beat_khozyaika_d27 = true;
    var c = findContact('khozyaika'); if (c) c.visible = true;
    postMessage('khozyaika', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('khozyaika')),
      text: tStr('beat.khozyaika_d27.message', 'Марина, на следующей неделе полнолуние в Раке. В это время комоды особенно уязвимы. Пожалуйста, не ставьте на него горячие чашки и не включайте китайских мантр рядом. И вообще лучше выйти из квартиры между 23:00 и 01:00.')
    });
  }

  function beatOlyaRetry() {
    if (STATE.beat_olya_retry) return;
    STATE.beat_olya_retry = true;
    var c = findContact('olya'); if (c) c.visible = true;
    postMessage('olya', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('olya')),
      photo: 'img/events/olya_product.webp',
      photoAlt: 'продукт клуба',
      text: tStr('beat.olya_retry.message', 'Мариночка, как ты? Я тут обновление по нашему клубу — мы запускаем НОВЫЙ уровень. Всего $400, но ты получаешь в три раза больше активаций. Подумай, я верю в тебя!')
    });
    STATE._olya_retry_pending = true; // SPRINT 39 — chip
    postMessage('scratch', { kind: 'system', text: tStr('beat.olya_retry.scratch_cue', 'Оля Петрова снова пишет · открой чат') });
  }

  function beatOlyaFinal() {
    if (STATE.beat_olya_final) return;
    STATE.beat_olya_final = true;
    var c = findContact('olya'); if (c) c.visible = true;
    postMessage('olya', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('olya')),
      text: tStr('beat.olya_final.message', 'Марина, я понимаю что ты сомневаешься. Но вот скриншот моего дохода за месяц: $3200 чистыми. И это не предел. Последнее предложение: $150, заходишь бесплатным уровнем и начинаешь зарабатывать.')
    });
    STATE._olya_final_pending = true; // SPRINT 39 — chip
  }

  function beatKryptaRetry() {
    if (STATE.beat_krypta_retry) return;
    STATE.beat_krypta_retry = true;
    var c = findContact('krypta'); if (c) c.visible = true;
    postMessage('krypta', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('krypta')),
      photo: 'img/events/krypta_wallet.webp',
      photoAlt: 'крипто-кошелёк',
      text: tStr('beat.krypta_retry.message', 'БРАТ алё ты жива? смотри SOLANA х3 за неделю я говорил! у меня есть ещё 1 слот. $50 минимум, на следующей неделе $500. не упусти')
    });
    // SPRINT 38b — open chip so player can decline / engage (was no reply path)
    STATE._krypta_retry_pending = true;
    postMessage('scratch', { kind: 'system', text: tStr('beat.krypta_retry.scratch_cue', 'БРАТ крипта снова пишет · открой чат') });
  }

  function beatKryptaFinal() {
    if (STATE.beat_krypta_final) return;
    STATE.beat_krypta_final = true;
    var c = findContact('krypta'); if (c) c.visible = true;
    postMessage('krypta', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('krypta')),
      text: tStr('beat.krypta_final.message', 'сестра, скажу честно. у меня не было $100. они пошли на оплату хостинга для моего блога. но завтра реально точно ракета. прости брат. больше не будет. $30?')
    });
    // SPRINT 38b — chip for final retry too
    STATE._krypta_final_pending = true;
  }

  function beatPavelD13() {
    if (STATE.beat_pavel_d13) return;
    STATE.beat_pavel_d13 = true;
    var c = findContact('pavel'); if (c) c.visible = true;
    postMessage('pavel', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('pavel')),
      photo: 'img/events/pavel_bridge.webp',
      photoAlt: 'мост ночью',
      text: tStr('beat.pavel_d13.message', 'марина я вчера был в твоём доме. просто проходил. вспомнил крышу куда мы поднимались в мае 2022. помнишь?')
    });
  }

  function beatPavelD17() {
    if (STATE.beat_pavel_d17) return;
    STATE.beat_pavel_d17 = true;
    var c = findContact('pavel'); if (c) c.visible = true;
    postMessage('pavel', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('pavel')),
      text: tStr('beat.pavel_d17.message', 'слушай. а если я серьёзно. давай встретимся на чашку кофе. без возврата денег, без истории. как старые знакомые.')
    });
    // SPRINT 38b — два варианта отказа (Тим: 'нужно два варианта ответа, оба отказ')
    STATE._pavel_d17_pending = true;
    postMessage('scratch', { kind: 'system', text: tStr('beat.pavel_d17.scratch_cue', 'Павел зовёт на кофе · открой чат') });
  }

  function beatPavelD21() {
    if (STATE.beat_pavel_d21) return;
    STATE.beat_pavel_d21 = true;
    var c = findContact('pavel'); if (c) c.visible = true;
    postMessage('pavel', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('pavel')),
      text: tStr('beat.pavel_d21.message', 'марин, слышал у тебя кто-то появился. может не стоит? ты меня лучше знаешь.')
    });
  }

  function beatPavelD25() {
    if (STATE.beat_pavel_d25) return;
    STATE.beat_pavel_d25 = true;
    var c = findContact('pavel'); if (c) c.visible = true;
    postMessage('pavel', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('pavel')),
      text: tStr('beat.pavel_d25.message', 'ну и ладно. удачи. я всегда был рядом когда тебе было сложно. помни.')
    });
  }

  function beatMamaD20() {
    if (STATE.beat_mama_d20) return;
    STATE.beat_mama_d20 = true;
    var c = findContact('mama'); if (c) c.visible = true;
    postMessage('mama', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('mama')),
      text: tStr('beat.mama_d20.message', 'доча, соседка спрашивает какой у тебя бизнес. я сказала что ты творческая, всё пишешь. она говорит это хорошо. у её дочки такой же бизнес, но та получает зарплату в мвд. но я тебя не сравниваю.')
    });
  }

  function beatDenisD22() {
    if (STATE.beat_denis_d22) return;
    STATE.beat_denis_d22 = true;
    var c = findContact('denis'); if (c) c.visible = true;
    postMessage('denis', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('denis')),
      text: tStr('beat.denis_d22.message', 'марин, слышал про тебя от общих. гордимся. держись. кстати — парус-тур на выходных, присоединяйся.')
    });
  }

  // Настя — параллельная arc коллеги-фаундера
  function beatNastyaD6() {
    if (STATE.beat_nastya_d6) return;
    STATE.beat_nastya_d6 = true;
    var c = findContact('nastya'); if (c) c.visible = true;
    postMessage('nastya', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('nastya')),
      photo: 'img/events/nastya_desk.webp',
      photoAlt: 'рабочий стол',
      text: tStr('beat.nastya_d6.msg1', 'привет! я Настя, тоже фрилансер, мы вроде в одном чате в telegram были. хотела спросить — как ты справляешься с первыми неделями без офиса?')
    });
    setTimeout(function () {
      postMessage('nastya', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('nastya')),
        text: tStr('beat.nastya_d6.msg2', 'у меня прям паника каждое утро. но я вот начала выписывать три задачи в день вместо десяти. помогает.')
      });
    }, 1100);
  }

  function beatNastyaD11() {
    if (STATE.beat_nastya_d11) return;
    STATE.beat_nastya_d11 = true;
    var c = findContact('nastya'); if (c) c.visible = true;
    postMessage('nastya', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('nastya')),
      text: tStr('beat.nastya_d11.message', 'ооо я сегодня закрыла второй проект. чувствую себя богиней. и одновременно засыпаю стоя. как оно у тебя?')
    });
  }

  function beatNastyaD16() {
    if (STATE.beat_nastya_d16) return;
    STATE.beat_nastya_d16 = true;
    var c = findContact('nastya'); if (c) c.visible = true;
    postMessage('nastya', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('nastya')),
      photo: 'img/events/nastya_coworking.webp',
      photoAlt: 'коворкинг',
      text: tStr('beat.nastya_d16.message', 'слушай, думала. нам надо объединяться. одна хорошо, но вдвоём быстрее. может посидим, обсудим?')
    });
  }

  // SPRINT 38b — Nastya partnership now actionable: chip choice with real reward
  function beatNastyaD20() {
    if (STATE.beat_nastya_d20) return;
    STATE.beat_nastya_d20 = true;
    var c = findContact('nastya'); if (c) c.visible = true;
    postMessage('nastya', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('nastya')),
      text: tStr('beat.nastya_d20.message', 'у меня проект на двух, клиент крупный. половину могу тебе отдать. $200 upfront прямо сейчас + $200 на сдаче через неделю. только делай хорошо. интересно?')
    });
    postMessage('scratch', { kind: 'system', text: tStr('beat.nastya_d20.scratch_cue', 'Настя предлагает партнёрство · открой чат') });
    STATE._nastya_partnership_pending = true;
  }

  function beatNastyaD25() {
    if (STATE.beat_nastya_d25) return;
    STATE.beat_nastya_d25 = true;
    var c = findContact('nastya'); if (c) c.visible = true;
    postMessage('nastya', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('nastya')),
      text: tStr('beat.nastya_d25.message', 'марин, я серьёзно думаю о партнёрстве. давай после месяца встретимся и обсудим. у меня есть план.')
    });
  }

  function beatNastyaD30() {
    if (STATE.beat_nastya_d30) return;
    STATE.beat_nastya_d30 = true;
    var c = findContact('nastya'); if (c) c.visible = true;
    postMessage('nastya', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('nastya')),
      text: tStr('beat.nastya_d30.message', 'ты дожила. я горжусь. давай встретимся в воскресенье, я принесу вино и план на следующий месяц.')
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

  // SPRINT 38c — pick unique gossip per beat (no repeats — Tim screenshot showed dup)
  function pickUnused(arr, usedKey) {
    STATE[usedKey] = STATE[usedKey] || [];
    var available = arr.filter(function (_, i) { return STATE[usedKey].indexOf(i) === -1; });
    if (available.length === 0) {
      STATE[usedKey] = []; // reset cycle if all used
      available = arr.slice();
    }
    var idx = Math.floor(Math.random() * available.length);
    var realIdx = arr.indexOf(available[idx]);
    STATE[usedKey].push(realIdx);
    return available[idx];
  }

  function svetkaBeat(key) {
    if (STATE[key]) return;
    STATE[key] = true;
    var c = findContact('svetka'); if (c) c.visible = true;
    var deck = SVETKA_GOSSIP[0];
    var voiceLabel = pickUnused(deck.intros, '_svetka_intros_used');
    var gossip = pickUnused(deck.gossip, '_svetka_gossip_used');
    var photo = pickUnused(SVETKA_PHOTOS, '_svetka_photos_used');
    postMessage('svetka', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('svetka')),
      text: voiceLabel + '\n\n' + tStr('beat.svetka.no_audio_note', '(не слушается)')
    });
    setTimeout(function () {
      postMessage('svetka', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('svetka')),
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
    postMessage('pavel', { kind: 'incoming', senderName: Bubbles.localizedContactName(findContact('pavel')), text: tStr('beat.pavel_day9.message', 'марина, если честно — я думаю о тебе каждый день уже которую неделю. я знаю что ты не хочешь. но ты должна это услышать.') });
  }

  function beatMama6() {
    if (STATE.beat_mama6) return;
    STATE.beat_mama6 = true;
    var c = findContact('mama'); if (c) c.visible = true;
    postMessage('mama', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('mama')),
      photo: 'img/events/cat_window.webp',
      photoAlt: 'кошка у окна',
      text: tStr('beat.mama6.message', 'доча, я на лекарства не могу накопить в этом месяце. если можешь помочь — $200 скинь. если нет — я понимаю, у тебя и так сложно.')
    });
    postMessage('scratch', { kind: 'system', text: tStr('beat.mama6.scratch_cue', 'мама написала · открой чат') });
    STATE._mama6_pending = true;
  }

  function beatMama17() {
    if (STATE.beat_mama17) return;
    STATE.beat_mama17 = true;
    var c = findContact('mama'); if (c) c.visible = true;
    postMessage('mama', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('mama')),
      photo: 'img/events/mama_pie.webp',
      photoAlt: 'мамины пироги',
      text: tStr('beat.mama17.message', 'ты там живая? звонков нет уже неделю. пирогов наготовила, приезжай в субботу.')
    });
    STATE._mama17_pending = true;
  }

  function beatMama24() {
    if (STATE.beat_mama24) return;
    STATE.beat_mama24 = true;
    var c = findContact('mama'); if (c) c.visible = true;
    postMessage('mama', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('mama')),
      photo: 'img/events/mama_letter.webp',
      photoAlt: 'мамино письмо',
      text: tStr('beat.mama24.message', 'доча, я скучаю. звони когда сможешь. хоть на 5 минут.')
    });
  }

  function beatMamaFinal() {
    if (STATE.beat_mama29) return;
    STATE.beat_mama29 = true;
    var c = findContact('mama'); if (c) c.visible = true;
    postMessage('mama', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('mama')),
      text: tStr('beat.mama_final.message', 'доча. я всё это время не знала как ты. завтра последний день месяца. я просто скажу: горжусь тобой. что бы ни было. позвони когда сможешь.')
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
      senderName: Bubbles.localizedContactName(findContact('kirill')),
      text: tStr('beat.kirill_love1.msg1', 'слушай, я тут подумал. я понимаю что звучит странно, но ты мне нравишься не только на ужинах.')
    });
    setTimeout(function () {
      postMessage('kirill', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('kirill')),
        text: tStr('beat.kirill_love1.msg2', 'у тебя в глазах что-то такое — как будто ты сражаешься с драконом и никому не рассказываешь. я это вижу. и мне хочется просто сидеть рядом.')
      });
    }, 1200);
    setTimeout(function () {
      postMessage('kirill', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('kirill')),
        text: tStr('beat.kirill_love1.msg3', 'как ты вообще?')
      });
    }, 2400);
    postMessage('scratch', { kind: 'system', text: tStr('beat.kirill_love1.scratch_cue', 'Кирилл написал что-то странное · открой чат') });
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
      senderName: Bubbles.localizedContactName(findContact('kirill')),
      text: tStr('beat.kirill_love2.msg1', 'марин, давай встретимся. не ради ужина. просто пройдёмся, я хочу с тобой поговорить.')
    });
    setTimeout(function () {
      postMessage('kirill', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('kirill')),
        text: tStr('beat.kirill_love2.msg2', 'у меня нет плана, нет повода. просто хочу быть рядом пару часов. как тебе?')
      });
    }, 1100);
    STATE._kirill_love2_pending = true;
    STATE.kirill_invite_active = true;
    STATE.kirill_invite_expires_day = (STATE.day || 1) + 2;
    postMessage('scratch', { kind: 'system', text: tStr('beat.kirill_love2.scratch_cue', 'Кирилл зовёт без повода · открой чат') });
  }

  function beatKirillLoveFinal() {
    if (STATE.beat_kirill_love_final) return;
    if ((STATE.kirill_affection || 0) < 5) return;
    if (STATE.kirill_blocked) return;
    STATE.beat_kirill_love_final = true;
    var c = findContact('kirill'); if (c) c.visible = true;

    postMessage('kirill', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('kirill')),
      text: tStr('beat.kirill_love_final.msg1', 'марина. я за эти недели понял одну штуку.')
    });
    setTimeout(function () {
      postMessage('kirill', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('kirill')),
        text: tStr('beat.kirill_love_final.msg2', 'ты не лёгкая. ты не ангел. ты иногда уставшая и злая. но когда ты говоришь о своей работе — у тебя в голосе огонь. и я хочу быть тем, кто этот огонь слушает, когда ты приходишь домой.')
      });
    }, 1200);
    setTimeout(function () {
      postMessage('kirill', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('kirill')),
        text: tStr('beat.kirill_love_final.msg3', 'я не прошу переехать. я не прошу обещаний. я прошу только разрешения. быть.')
      });
    }, 2400);
    setTimeout(function () {
      postMessage('scratch', { kind: 'system', text: tStr('beat.kirill_love_final.notebook_separator', '────── строчка в блокнот ──────') });
    }, 3600);
    setTimeout(function () {
      postOutgoing('scratch', tStr('beat.kirill_love_final.marina_journal1', 'я не ожидала. вообще. от него, от себя, от этого месяца.'));
    }, 4000);
    setTimeout(function () {
      postOutgoing('scratch', tStr('beat.kirill_love_final.marina_journal2', 'кажется я влюбилась. и самое странное — мне не страшно.'));
    }, 4800);
    setTimeout(function () {
      STATE.love_ending_unlocked = true;
      save();
      postMessage('scratch', { kind: 'system', text: tStr('beat.kirill_love_final.love_unlock_note', '❤️ love ending разблокирован') });
    }, 5600);
    STATE._kirill_love_final_pending = true;
  }

  function beatDenis(day) {
    var flag = 'beat_denis' + day;
    if (STATE[flag]) return;
    STATE[flag] = true;
    var c = findContact('denis'); if (c) c.visible = true;
    var texts = {
      3: tStr('beat.denis.day3.text', 'марин, задолбал сидеть дома. поехали на регату в субботу? море, ветер, никаких писем'),
      6: tStr('beat.denis.day6.text', 'слушай, давай на кофе сходим? нашёл новое место на углу, тебе понравится. час, не больше'),
      9: tStr('beat.denis.day9.text', 'перестань работать хоть на день. гулять поехали на набережную? я занесу вино'),
      15: tStr('beat.denis.day15.text', 'марина, парус-тур в субботу. 5 человек, яхта, вечер. место есть для тебя'),
      27: tStr('beat.denis.day27.text', 'новый год через 3 дня. у меня на квартире посиделки, не пропусти')
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
      senderName: Bubbles.localizedContactName(findContact('denis')),
      photo: photos[day] || 'img/events/street_window.webp',
      photoAlt: tStr('beat.denis.day' + day + '.photo_alt', 'гулянка с денисом') || tStr('beat.denis.fallback_alt', 'гулянка'),
      text: texts[day] || tStr('beat.denis.fallback_text', 'привет, как ты там?')
    });
    postMessage('scratch', { kind: 'system', text: tStr('beat.denis.scratch_cue', 'Денис зовёт гулять · открой чат') });
    STATE['_denis' + day + '_pending'] = true;
  }

  // ========== spam / humor dialogues (13 individual contacts) ==========

  // Recurring spam characters (6) — have reply chips + state effects (BLOCK A, I)
  // Each triggered via fireDayBeats on specific day, with own beat function.

  function beatOlya() {
    if (STATE.beat_olya) return;
    STATE.beat_olya = true;
    var c = findContact('olya'); if (c) c.visible = true;
    postMessage('olya', { kind: 'incoming', senderName: Bubbles.localizedContactName(findContact('olya')), photo: 'img/events/olya_pyramid.webp', photoAlt: 'клуб женщин', text: tStr('beat.olya_intro.msg1', 'Мариночка приветик! Это Оля Петрова, мы учились вместе в 11-Б. Помнишь меня?') });
    setTimeout(function () {
      postMessage('olya', { kind: 'incoming', senderName: Bubbles.localizedContactName(findContact('olya')), text: tStr('beat.olya_intro.msg2', 'У меня появилась уникальная возможность для женщин которые хотят изменить жизнь и финансы. Можно я расскажу 5 минут?') });
    }, 900);
    setTimeout(function () {
      postMessage('olya', { kind: 'incoming', senderName: Bubbles.localizedContactName(findContact('olya')), text: tStr('beat.olya_intro.msg3', 'Это не пирамида, это клуб ✨ инвестиция всего $200, возвращается х3 за 2 месяца гарантированно') });
    }, 1800);
    STATE._olya_pending = true;
    postMessage('scratch', { kind: 'system', text: tStr('beat.olya_intro.scratch_cue', 'одноклассница пишет · открой чат') });
  }

  // SPRINT 20 — Kirill arc expansion: 5 new scenes + conflict beat
  // SPRINT 38 — Scene11 rewritten: works whether dates happened or not
  function beatKirillScene11() {
    if (STATE.beat_kirill_scene11) return;
    if (!STATE.kirill_unlocked || STATE.kirill_blocked) return;
    STATE.beat_kirill_scene11 = true;
    var c = findContact('kirill'); if (c) c.visible = true;
    // Variant A: had dinner — refer to it
    // Variant B: just intro'd, no dates yet — just check in
    var hadDate = (STATE.kirill_date_count || 0) > 0;
    var text = hadDate
      ? tStr('beat.kirill_scene11.variant_had_date', 'вчера ты странно себя вела на ужине. три раза сказала «я в порядке». это обычно значит обратное. я не давлю — просто, если что, я тут.')
      : tStr('beat.kirill_scene11.variant_no_date', 'привет. знаю, ты в работе и времени нет. я не пропадаю, просто хочу чтобы ты знала: я тут. как ты вообще?');
    postMessage('kirill', { kind: 'incoming', senderName: Bubbles.localizedContactName(findContact('kirill')), text: text });
  }

  // SPRINT 38 — Scene13 gated: this is intimate, requires earned trust.
  // If NOT earned (no dates, low affection) — postpones the journal moment to a lighter check-in.
  function beatKirillScene13() {
    if (STATE.beat_kirill_scene13) return;
    if (!STATE.kirill_unlocked || STATE.kirill_blocked) return;
    STATE.beat_kirill_scene13 = true;
    var c = findContact('kirill'); if (c) c.visible = true;
    var earnedTrust = (STATE.kirill_date_count || 0) >= 1 || (STATE.kirill_affection || 0) >= 4;
    if (earnedTrust) {
      // Original intimate journal beat
      postMessage('kirill', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('kirill')),
        text: tStr('beat.kirill_scene13.trust_msg1', 'покажу тебе одну штуку. я с 17 лет пишу в блокноты, никогда не показывал никому. вот страница 47 из прошлого года.')
      });
      setTimeout(function () {
        postMessage('kirill', {
          kind: 'incoming',
          senderName: Bubbles.localizedContactName(findContact('kirill')),
          text: tStr('beat.kirill_scene13.trust_msg2', '«все настоящее — тихое. и когда я найду её, я её узнаю по тишине.»\n\nэто я писал когда мне было 28. тебе — не говорю зачем показываю.')
        });
      }, 1100);
    } else {
      // Light surface-level beat — gauge interest before opening up
      postMessage('kirill', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('kirill')),
        text: tStr('beat.kirill_scene13.light_msg', 'слушай, расскажи когда у тебя получится выдохнуть на час. я в кафе на лиговке зайду — кофе хороший, тишина. без обязательств.')
      });
    }
  }

  // SPRINT 20 — CONFLICT beat
  function beatKirillConflict16() {
    if (STATE.beat_kirill_conflict16) return;
    if (!STATE.kirill_unlocked || STATE.kirill_blocked) return;
    // SPRINT 38 — conflict beat only fires if relationship has substance.
    // Otherwise Kirill has no standing to ask about Pavel.
    var hasSubstance = (STATE.kirill_date_count || 0) >= 1 || (STATE.kirill_affection || 0) >= 4;
    if (!hasSubstance) {
      STATE.beat_kirill_conflict16 = true; // mark so it doesn't retry; skip beat
      return;
    }
    STATE.beat_kirill_conflict16 = true;
    var c = findContact('kirill'); if (c) c.visible = true;
    postMessage('kirill', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('kirill')),
      text: tStr('beat.kirill_conflict16.msg1', 'марина. я слышал что тебе пишет Павел — твой бывший. не спрашиваю подробностей, просто — скажи честно: он в твоей жизни сейчас или нет?')
    });
    setTimeout(function () {
      postMessage('kirill', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('kirill')),
        text: tStr('beat.kirill_conflict16.msg2', 'если ты возвращаешься туда — скажи сейчас. я не буду мешать.')
      });
    }, 1200);
    postMessage('scratch', { kind: 'system', text: tStr('beat.kirill_conflict16.scratch_cue', '⚠ Кирилл конфликт · открой чат') });
    STATE._kirill_conflict_pending = true;
  }

  function beatKirillResolution19() {
    if (STATE.beat_kirill_resolution19) return;
    if (!STATE.kirill_unlocked || STATE.kirill_blocked) return;
    // SPRINT 20 rev2 — threshold 4→3 so defensive path doesn't create dead-end
    // (pre-conflict aff max is 5, defensive -2 leaves 3 → must still reach resolution)
    if ((STATE.kirill_affection || 0) < 3) return;
    STATE.beat_kirill_resolution19 = true;
    var c = findContact('kirill'); if (c) c.visible = true;
    postMessage('kirill', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('kirill')),
      text: tStr('beat.kirill_resolution19.msg1', 'прости за тот вопрос про Павла. я не имел права. просто испугался что теряю тебя раньше чем узнал.')
    });
    setTimeout(function () {
      postMessage('kirill', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('kirill')),
        text: tStr('beat.kirill_resolution19.msg2', 'я учусь доверять. медленно, но учусь.')
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
      senderName: Bubbles.localizedContactName(findContact('kirill')),
      text: tStr('beat.kirill_prefinale24.message', 'через неделю закончится этот твой первый месяц. ты устанешь, я знаю. я просто хочу сказать — мне всё равно сдашь ты три проекта или один. я с тобой.')
    });
  }

  // SPRINT 36 — Kirill brings dinner if Marina ignored him + is starving (once per game)
  function beatKirillFoodDelivery() {
    if (STATE.beat_kirill_food_delivery) return;
    if (!STATE.kirill_unlocked) return;
    if (STATE.kirill_blocked) return;
    if (STATE.kirill_date_count > 0) return; // only triggers if she's been ignoring him
    if (STATE.hunger > 35) return; // only when actually hungry
    STATE.beat_kirill_food_delivery = true;
    var c = findContact('kirill'); if (c) c.visible = true;
    postMessage('kirill', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('kirill')),
      text: tStr('beat.kirill_food_delivery.msg1', 'не отвечаешь, не выходишь. знаю, ты в работе. оставил у двери пакет — суп из «Чебурашки», два хачапури, баклава. поешь, ладно? я не буду заходить.')
    });
    setTimeout(function () {
      postMessage('kirill', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('kirill')),
        text: tStr('beat.kirill_food_delivery.msg2', 'когда сможешь — напиши, что доела. это я для своего спокойствия.')
      });
    }, 1500);
    STATE.hunger = 100;
    STATE.comfort = 100;
    postMessage('scratch', { kind: 'system', text: tStr('beat.kirill_food_delivery.scratch_cue', '🥡 Кирилл оставил ужин у двери · +100 голод · +100 комфорт') });
    STATE.kirill_affection = (STATE.kirill_affection || 0) + 1;
  }

  function beatKirillIntro() {
    if (STATE.beat_kirill) return;
    STATE.beat_kirill = true;
    var c = findContact('kirill'); if (c) c.visible = true;
    postMessage('kirill', { kind: 'incoming', senderName: Bubbles.localizedContactName(findContact('kirill')), text: tStr('beat.kirill_intro.msg1', 'ну привет') });
    setTimeout(function () {
      postMessage('kirill', { kind: 'incoming', senderName: Bubbles.localizedContactName(findContact('kirill')), text: tStr('beat.kirill_intro.msg2', 'я тебя на тиндере лайкнул три недели назад. ты молчала. я всё-таки настойчивый') });
    }, 900);
    setTimeout(function () {
      postMessage('kirill', { kind: 'incoming', senderName: Bubbles.localizedContactName(findContact('kirill')), text: tStr('beat.kirill_intro.msg3', 'может встретимся? я угощаю ужином. любое кафе на выбор') });
    }, 1800);
    STATE._kirill_pending = true;
    postMessage('scratch', { kind: 'system', text: tStr('beat.kirill_intro.scratch_cue', 'Кирилл пишет · открой чат') });
  }

  function beatKrypta() {
    if (STATE.beat_krypta) return;
    STATE.beat_krypta = true;
    var c = findContact('krypta'); if (c) c.visible = true;
    postMessage('krypta', { kind: 'incoming', senderName: Bubbles.localizedContactName(findContact('krypta')), photo: 'img/events/krypta_moon.webp', photoAlt: 'крипто-луна', text: tStr('beat.krypta_intro.msg1', 'БРАТ') });
    setTimeout(function () {
      postMessage('krypta', { kind: 'incoming', senderName: Bubbles.localizedContactName(findContact('krypta')), text: tStr('beat.krypta_intro.msg2', 'СОЛАНА ЛЕТИТ 🚀🚀🚀 1000X ЭТОТ МЕСЯЦ') });
    }, 700);
    setTimeout(function () {
      postMessage('krypta', { kind: 'incoming', senderName: Bubbles.localizedContactName(findContact('krypta')), text: tStr('beat.krypta_intro.msg3', 'скидываешь $100 на кошелёк — делаешь $100000. проверено. ловлю момент один. решай быстрее') });
    }, 1500);
    STATE._krypta_pending = true;
    postMessage('scratch', { kind: 'system', text: tStr('beat.krypta_intro.scratch_cue', 'какой-то брат-крипта пишет · открой чат') });
  }

  function beatArtur() {
    if (STATE.beat_artur) return;
    STATE.beat_artur = true;
    var c = findContact('artur'); if (c) c.visible = true;
    postMessage('artur', { kind: 'incoming', senderName: Bubbles.localizedContactName(findContact('artur')), text: tStr('beat.artur.msg1', 'марина привет. я понимаю что ты ушла не на лучшей ноте') });
    setTimeout(function () {
      postMessage('artur', { kind: 'incoming', senderName: Bubbles.localizedContactName(findContact('artur')), text: tStr('beat.artur.msg2', 'но у меня есть тема. подойди завтра в 10 в старый офис, объясню лично. это взаимовыгодно') });
    }, 1000);
    STATE._artur_pending = true;
    postMessage('scratch', { kind: 'system', text: tStr('beat.artur.scratch_cue', 'бывший босс написал · открой чат') });
  }

  function beatVera() {
    if (STATE.beat_vera) return;
    STATE.beat_vera = true;
    var c = findContact('vera'); if (c) c.visible = true;
    postMessage('vera', { kind: 'incoming', senderName: Bubbles.localizedContactName(findContact('vera')), text: tStr('beat.vera.msg1', 'Марина Сергеевна, здравствуйте! Это Вера Николаевна, ваша учительница по литературе.') });
    setTimeout(function () {
      postMessage('vera', { kind: 'incoming', senderName: Bubbles.localizedContactName(findContact('vera')), text: tStr('beat.vera.msg2', 'Я в одноклассниках увидела что вы открыли своё дело. Горжусь вами! У меня есть внучка Алиса. Она пишет стихи. Не могли бы вы помочь ей продвинуться в интернете?') });
    }, 1100);
    STATE._vera_pending = true;
  }

  function beatSosedIntro() {
    if (STATE.beat_sosed) return;
    STATE.beat_sosed = true;
    var c = findContact('sosed'); if (c) c.visible = true;
    postMessage('sosed', { kind: 'incoming', senderName: Bubbles.localizedContactName(findContact('sosed')), text: tStr('beat.sosed_intro.msg1', 'здравствуйте. это ваш сосед снизу, квартира 23') });
    setTimeout(function () {
      postMessage('sosed', { kind: 'incoming', senderName: Bubbles.localizedContactName(findContact('sosed')), text: tStr('beat.sosed_intro.msg2', 'у меня на потолке появилось пятно. я думаю это от вас. спустите поговорить?') });
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
    postBank(-60, tStr('beat.drain_charger.bank_memo', 'зарядка для ноутбука'));
    postMessage('scratch', {
      kind: 'outgoing',
      photo: 'img/events/charger_broken.webp',
      photoAlt: 'сломанная зарядка',
      text: tStr('beat.drain_charger.marina_note', 'зарядка сдохла. прямо посреди работы. новая — $60. без неё никак.')
    });
    postSystem('scratch', tStr('beat.drain_charger.system_line', '⚡ −$60 · зарядка для ноутбука'));
  }

  function beatDrainPhone() {
    if (STATE.beat_drain_phone) return;
    STATE.beat_drain_phone = true;
    STATE.cash -= 80;
    postBank(-80, tStr('beat.drain_phone.bank_memo', 'ремонт экрана телефона'));
    postMessage('scratch', {
      kind: 'outgoing',
      photo: 'img/events/phone_cracked.webp',
      photoAlt: 'треснувший экран',
      text: tStr('beat.drain_phone.marina_note', 'уронила телефон. экран в паутине. без него нет связи с клиентами. ремонт $80.')
    });
    postSystem('scratch', tStr('beat.drain_phone.system_line', '📱 −$80 · ремонт экрана'));
  }

  function beatDrainDentist() {
    if (STATE.beat_drain_dentist) return;
    STATE.beat_drain_dentist = true;
    STATE.cash -= 150;
    STATE.hours = Math.max(0, STATE.hours - 2);
    postBank(-150, tStr('beat.drain_dentist.bank_memo', 'стоматолог · срочный'));
    postMessage('scratch', {
      kind: 'outgoing',
      photo: 'img/events/dentist_receipt.webp',
      photoAlt: 'чек стоматолога',
      text: tStr('beat.drain_dentist.marina_note', 'зуб. проснулась от боли в 5 утра. стоматолог $150, без вариантов. полдня потеряно.')
    });
    postSystem('scratch', tStr('beat.drain_dentist.system_line', '🦷 −$150 · −2h · стоматолог'));
  }

  function beatDrainElectric() {
    if (STATE.beat_drain_electric) return;
    STATE.beat_drain_electric = true;
    STATE.cash -= 100;
    postBank(-100, tStr('beat.drain_electric.bank_memo', 'электричество + интернет'));
    postMessage('scratch', {
      kind: 'outgoing',
      photo: 'img/events/electric_bill.webp',
      photoAlt: 'квитанция',
      text: tStr('beat.drain_electric.marina_note', 'пришёл счёт за электричество и интернет. $100. автосписание. ничего не сделаешь.')
    });
    postSystem('scratch', tStr('beat.drain_electric.system_line', '💡 −$100 · коммуналка'));
  }

  // ========== SPRINT 14 — Khozyaika arc enhancement ==========

  // Pre-day-12: annoying beats
  function beatKhozyaikaDay3Noise() {
    if (STATE.beat_khozyaika_day3_noise) return;
    STATE.beat_khozyaika_day3_noise = true;
    var c = findContact('khozyaika'); if (c) c.visible = true;
    postMessage('khozyaika', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('khozyaika')),
      photo: 'img/events/khozyaika_noise.webp',
      photoAlt: 'хозяйка у двери',
      text: tStr('beat.khozyaika_day3_noise.message', 'Марина, соседи с первого этажа жаловались на шум. Вы работаете после 23:00? Пожалуйста, тише печатайте на клавиатуре. У нас дом 1978 года, слышимость как в коммуналке. Я серьёзно.')
    });
    STATE.comfort = Math.max(0, STATE.comfort - 5);
    postSystem('scratch', tStr('beat.khozyaika_day3_noise.system_line', '−5 комфорт · хозяйка жалуется на шум'));
  }

  function beatKhozyaikaDay5Electric() {
    if (STATE.beat_khozyaika_day5_electric) return;
    STATE.beat_khozyaika_day5_electric = true;
    var c = findContact('khozyaika'); if (c) c.visible = true;
    postMessage('khozyaika', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('khozyaika')),
      photo: 'img/events/khozyaika_meters.webp',
      photoAlt: 'электросчётчик',
      text: tStr('beat.khozyaika_day5_electric.message', 'Марина, вы сегодня снимаете показания электросчётчика? Я за ваш свет плачу, мне надо знать сколько. Скиньте фото. И сразу: почему розетка на кухне воняет? Вы что-то включали кроме чайника?')
    });
    STATE._khozyaika_electric_pending = true;
    // SPRINT 25 — auto-fine if unanswered after 3 days
    STATE.pending_callbacks.push({ trigger_day: STATE.day + 3, type: 'khozyaika_unanswered_electric' });
  }

  function beatKhozyaikaDay7Damage() {
    if (STATE.beat_khozyaika_day7_damage) return;
    STATE.beat_khozyaika_day7_damage = true;
    var c = findContact('khozyaika'); if (c) c.visible = true;
    postMessage('khozyaika', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('khozyaika')),
      photo: 'img/events/khozyaika_damage.webp',
      photoAlt: 'царапина на линолеуме',
      text: tStr('beat.khozyaika_day7_damage.msg1', 'Марина, я тут была у вас пока вы на работе. Обнаружила ЦАРАПИНУ на линолеуме в прихожей. Это было до вас или после? Мне важно для страховки.')
    });
    setTimeout(function () {
      postMessage('khozyaika', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('khozyaika')),
        text: tStr('beat.khozyaika_day7_damage.msg2', 'И ещё — в ванной потёк кран. Вызовите сантехника сами, $50 за выезд. Я не обязана.')
      });
    }, 1000);
    STATE.cash -= 50;
    postBank(-50, tStr('beat.khozyaika_day7_damage.bank_memo', 'сантехник по требованию хозяйки'));
    postSystem('scratch', tStr('beat.khozyaika_day7_damage.system_line', '🔧 −$50 · хозяйка заставила вызвать сантехника'));
  }

  function beatKhozyaikaDay9Chain() {
    if (STATE.beat_khozyaika_day9_chain) return;
    STATE.beat_khozyaika_day9_chain = true;
    var c = findContact('khozyaika'); if (c) c.visible = true;
    postMessage('khozyaika', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('khozyaika')),
      photo: 'img/events/khozyaika_chain.webp',
      photoAlt: 'письмо счастья',
      text: tStr('beat.khozyaika_day9_chain.message', 'Марина, это ОЧЕНЬ ВАЖНО. Перешлите это сообщение пяти людям: «квартира, в которой живёт женщина-фаундер, накапливает карму неудач если не распространять энергию благодарности». Мне так психолог-астролог сказал. Она раньше работала в МЧС.')
    });
    STATE._khozyaika_chain_pending = true;
    // SPRINT 25 — comfort drop if unanswered after 3 days
    STATE.pending_callbacks.push({ trigger_day: STATE.day + 3, type: 'khozyaika_unanswered_chain' });
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
      senderName: Bubbles.localizedContactName(findContact('khozyaika')),
      text: texts[variant] || texts.flowers
    };
    if (variant === 'quote2') {
      msg.photo = 'img/events/khozyaika_sweet.webp';
      msg.photoAlt = tStr('beat.khozyaika_post12.photo_alt_quote2', 'свечка и фото Мурки');
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
              senderName: Bubbles.localizedContactName(findContact('pavel')),
              text: tStr('system.callback.pavel_return_text', 'спасибо что выручила. держу слово — вернул $450. без задержек.')
            });
            postBank(450, tStr('system.callback.pavel_return_bank', 'возврат от Павла (с процентом)'));
          } else {
            postMessage('pavel', {
              kind: 'incoming',
              senderName: Bubbles.localizedContactName(findContact('pavel')),
              text: tStr('system.callback.pavel_delay', 'привет. у меня тут затяжка. через неделю-две.')
            });
            postMessage('scratch', { kind: 'system', text: tStr('system.callback.pavel_week_note', 'Павел обещает через неделю...') });
            // Reschedule once
            if (!cb.retried) {
              keep.push({ trigger_day: day + 4, type: 'pavel_silence', retried: true });
            }
          }
        } else if (cb.type === 'pavel_silence') {
          postMessage('pavel', {
            kind: 'incoming',
            senderName: Bubbles.localizedContactName(findContact('pavel')),
            text: tStr('system.callback.pavel_broken_promise', 'прости. не получилось.')
          });
          postMessage('scratch', { kind: 'system', text: tStr('system.callback.pavel_no_return_note', 'Павел не вернул деньги') });
        } else if (cb.type === 'bank_lock_115') {
          // BLOCK I — 115-ФЗ bank block activates
          STATE.bank_locked = true;
          STATE.bank_locked_until = STATE.day + 6;
          postMessage('bank', {
            kind: 'bank',
            meta: { bank_name: 'Т-Банк', amount: 0 },
            text: tStr('system.callback.bank_115_lock', 'Счёт ВРЕМЕННО ЗАБЛОКИРОВАН по 115-ФЗ. Подозрительная транзакция на криптобиржу. До выяснения — операции недоступны.')
          });
          postMessage('scratch', { kind: 'system', text: tStr('system.callback.bank_lock_note', '🔒 счёт заблокирован · 6 дней · не можешь тратить деньги') });
          // Кирилл пишет приглашение на свидание (free food, plate girl loop)
          if (!STATE.kirill_blocked) {
            setTimeout(function () {
              var k = findContact('kirill'); if (k) k.visible = true;
              postMessage('kirill', {
                kind: 'incoming',
                senderName: Bubbles.localizedContactName(findContact('kirill')),
                text: tStr('system.callback.kirill_free_dinner', 'привет. хочешь в кафе вечером? я угощаю, тебе ничего не надо')
              });
              STATE.kirill_invite_active = true;
              STATE.kirill_invite_expires_day = (STATE.day || 1) + 2;
            }, 1800);
          }
        } else if (cb.type === 'khozyaika_fine') {
          STATE.cash -= 100;
          postBank(-100, tStr('system.callback.khozyaika_fine_meters_bank', 'штраф за счётчики · хозяйка'));
          postMessage('khozyaika', {
            kind: 'incoming',
            senderName: Bubbles.localizedContactName(findContact('khozyaika')),
            text: tStr('system.callback.khozyaika_fine_meters', 'Я же предупреждала про счётчики. Штраф $100 списан. Будьте ответственнее.')
          });
        } else if (cb.type === 'khozyaika_unanswered_water') {
          // SPRINT 25 rev2 — auto-fine if pending; suppress after khozyaika rescue (sweet phase)
          if (STATE._khozyaika1_pending && !STATE.beat_khozyaika_rescue) {
            STATE._khozyaika1_pending = false;
            STATE.cash -= 100;
            postBank(-100, tStr('system.callback.khozyaika_water_fine_bank', 'штраф · нет показаний воды'));
            postMessage('khozyaika', {
              kind: 'incoming',
              senderName: Bubbles.localizedContactName(findContact('khozyaika')),
              text: tStr('system.callback.khozyaika_water_fine_msg', 'Марина, дедлайн прошёл. Показания не получены. Штраф $100 списан с депозита. Очень разочарована.')
            });
            postMessage('scratch', { kind: 'system', text: tStr('system.callback.khozyaika_water_fine_scratch', '🔻 −$100 · хозяйка не дождалась показаний') });
          } else if (STATE._khozyaika1_pending && STATE.beat_khozyaika_rescue) {
            // Rescue already happened — clear pending silently, no penalty
            STATE._khozyaika1_pending = false;
          }
        } else if (cb.type === 'khozyaika_unanswered_electric') {
          if (STATE._khozyaika_electric_pending && !STATE.beat_khozyaika_rescue) {
            STATE._khozyaika_electric_pending = false;
            STATE.cash -= 80;
            postBank(-80, tStr('system.callback.khozyaika_electric_fine_bank', 'штраф · нет показаний электро'));
            postMessage('khozyaika', {
              kind: 'incoming',
              senderName: Bubbles.localizedContactName(findContact('khozyaika')),
              text: tStr('system.callback.khozyaika_electric_fine_msg', 'Электросчётчик ждала три дня. Штраф $80. И розетку на кухне всё-таки проверьте.')
            });
            postMessage('scratch', { kind: 'system', text: tStr('system.callback.khozyaika_electric_fine_scratch', '🔻 −$80 · электросчётчик не отправлен') });
          } else if (STATE._khozyaika_electric_pending && STATE.beat_khozyaika_rescue) {
            STATE._khozyaika_electric_pending = false;
          }
        } else if (cb.type === 'khozyaika_unanswered_chain') {
          if (STATE._khozyaika_chain_pending && !STATE.beat_khozyaika_rescue) {
            STATE._khozyaika_chain_pending = false;
            STATE.comfort = Math.max(0, STATE.comfort - 8);
            postMessage('khozyaika', {
              kind: 'incoming',
              senderName: Bubbles.localizedContactName(findContact('khozyaika')),
              text: tStr('system.callback.khozyaika_chain_fine_msg', 'Не переслали письмо. Я же говорила про карму. Теперь не удивляйтесь.')
            });
            postMessage('scratch', { kind: 'system', text: tStr('system.callback.khozyaika_chain_fine_scratch', '🔻 −8 комфорт · хозяйка обиделась') });
          } else if (STATE._khozyaika_chain_pending && STATE.beat_khozyaika_rescue) {
            STATE._khozyaika_chain_pending = false;
          }
        } else if (cb.type === 'sosed_retry') {
          postMessage('sosed', {
            kind: 'incoming',
            senderName: Bubbles.localizedContactName(findContact('sosed')),
            text: tStr('system.callback.sosed_retry', 'вы где? я жду уже сутки. пятно стало больше.')
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
    if (day === 29) { beatMamaFinal(); beatKirillDay29Morning(); }
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
    // SPRINT 34 — eased $45 -> $35 (Tim feedback: 'не получается в ноль вырулить')
    STATE.cash -= 35; // daily: метро + кофе + подписки + мелочи + вайбы
    if (STATE.hunger == null) STATE.hunger = 100;
    if (STATE.comfort == null) STATE.comfort = 60;
    STATE.hunger = Math.max(0, STATE.hunger - 30); // SPRINT 23 — daily food required (was 25)
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
      postBank(-impulse, tStr('system.passive.impulse_memo', 'импульсивная покупка · комфорт низкий'));
    }
    // High comfort → energy regen
    if (STATE.comfort >= 70) {
      STATE.energy = Math.min(100, STATE.energy + 3);
    }

    // 30-day arc passive expenses
    if (day === 10 && !STATE.beat_rent_10) {
      STATE.beat_rent_10 = true;
      STATE.cash -= 500;
      postBank(-500, tStr('system.passive.rent_1_memo', 'аренда · первая декада'));
    }
    if (day === 20 && !STATE.beat_rent_20) {
      STATE.beat_rent_20 = true;
      // SPRINT 27 rev2 — rescue skips 2nd rent (matches HUD pill promise)
      if (STATE.beat_khozyaika_rescue) {
        postMessage('khozyaika', {
          kind: 'incoming',
          senderName: Bubbles.localizedContactName(findContact('khozyaika')),
          text: tStr('system.passive.khozyaika_rent_forgive', 'Мариночка, помните я обещала — аренда до конца месяца не нужна. Не забудьте 🌸')
        });
        postMessage('scratch', { kind: 'system', text: tStr('system.passive.khozyaika_rent_forgive_scratch', '🏠 хозяйка простила вторую декаду · −$0') });
      } else {
        STATE.cash -= 500;
        postBank(-500, tStr('system.passive.rent_2_memo', 'аренда · вторая декада'));
      }
    }
    if (day === 7 && !STATE.beat_food) {
      STATE.beat_food = true;
      STATE.cash -= 150;
      postBank(-150, tStr('system.passive.food_basic_memo', 'продукты · базовая закупка'));
    }

    // 115-ФЗ bank lock tick (BLOCK I)
    if (STATE.bank_locked && STATE.bank_locked_until && STATE.day >= STATE.bank_locked_until) {
      STATE.bank_locked = false;
      STATE.bank_locked_until = null;
      postBank(0, tStr('system.bank_unlock.memo', 'блокировка снята · счёт разморожен'));
      postMessage('bank', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('bank')),
        text: tStr('system.bank_unlock.msg', 'Блокировка снята. Спасибо за ожидание. Операции доступны.')
      });
      // Кирилл пишет про тарелочницу если были свидания при блокировке
      if (STATE.plate_girl_count >= 2) {
        setTimeout(function () {
          postMessage('kirill', {
            kind: 'incoming',
            senderName: Bubbles.localizedContactName(findContact('kirill')),
            text: tStr('system.kirill_plate_girl.msg1_prefix', 'слушай. я за последние 2 недели угостил тебя ужином ') + STATE.plate_girl_count + tStr('system.kirill_plate_girl.msg1_suffix', ' раз. ты ни разу не предложила свой счёт.')
          });
          postMessage('kirill', {
            kind: 'incoming',
            senderName: Bubbles.localizedContactName(findContact('kirill')),
            text: tStr('system.kirill_plate_girl.msg2', 'ты тарелочница. я не в обиде, но давай на этом закончим.')
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
            postBank(p.final_due || 0, p.client + tStr('system.contracts.finished_bank_memo_suffix', ' · финал за проект'));
          } else {
            // Missed deadline
            var roll = Math.random();
            if (roll < 0.4) {
              // Clawback
              p.status = 'clawback';
              STATE.cash -= (p.upfront_paid || 0);
              STATE.comfort = Math.max(0, STATE.comfort - 15);
              postBank(-(p.upfront_paid || 0), p.client + tStr('system.contracts.clawback_bank_memo_suffix', ' · возврат аванса (срыв сроков)'));
              postMessage(p.clientId || 'anna', {
                kind: 'incoming',
                senderName: p.client,
                text: tStr('system.contracts.clawback_client_msg_prefix', 'Марина, мы договаривались на ') + p.deadline_day + tStr('system.contracts.clawback_client_msg_suffix', ' день. Я жду уже неделю. Верни аванс — я больше не могу ждать.')
              });
            } else {
              p.status = 'missed';
              STATE.comfort = Math.max(0, STATE.comfort - 8);
              postMessage(p.clientId || 'anna', {
                kind: 'incoming',
                senderName: p.client,
                text: tStr('system.contracts.missed_client_msg', 'ничего. найдём другого. извини.')
              });
            }
          }
        }
      });
    }

    // SPRINT 13 — Tim automation tiers (3 tiers, narrative as Marina POV)
    if (STATE.auto_reach_out) {
      STATE.leads = (STATE.leads || 0) + 1;
      postMessage('scratch', { kind: 'outgoing', text: tPickOr('text.auto.reach_narrative', AUTO_REACH_NARRATIVE) });
      // Visual: ghost-fire reach_out button with particle burst
      setTimeout(function () {
        try { funnelBurstReachOut(true); } catch (e) {}
      }, 600);
    }
    if (STATE.auto_brief_lead && STATE.leads > 0) {
      STATE.leads -= 1;
      STATE.qualified_leads = (STATE.qualified_leads || 0) + 1;
      postMessage('scratch', { kind: 'outgoing', text: tPickOr('text.auto.brief_narrative', AUTO_BRIEF_NARRATIVE) });
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
        client: pick(tPickOr('system.auto_project_clients', ['ai lead saas','ai d2c','ai b2b','ai study'])),
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
      postBank(autoUpfront, tStr('system.passive.auto_offer_bank_memo', 'AI оффер принят · upfront'));
      postMessage('scratch', { kind: 'outgoing', text: tPickOr('text.auto.offer_narrative', AUTO_OFFER_NARRATIVE) });
      setTimeout(function () {
        try { spawnParticle({ from: 'send_offer', to: 'work_on_project', kind: 'red', icon: '📄', duration: 700 }); } catch (e) {}
      }, 1200);
    }
    // SPRINT 41 — Day 29 morning-after light romantic beat.
  // Hints something happened the night before, without explicit content.
  // Only fires if love arc has earned trust (affection >= 5 OR love final unlocked).
  function beatKirillDay29Morning() {
    if (STATE.beat_kirill_day29_morning) return;
    if (STATE.kirill_blocked) return;
    if (!STATE.kirill_unlocked) return;
    var earned = (STATE.kirill_affection || 0) >= 5 || STATE.beat_kirill_love_2 || STATE.love_ending_unlocked;
    if (!earned) return;
    STATE.beat_kirill_day29_morning = true;
    var c = findContact('kirill'); if (c) { c.visible = true; c.online = true; }
    postMessage('kirill', {
      kind: 'incoming',
      senderName: Bubbles.localizedContactName(findContact('kirill')),
      text: tStr('beat.kirill_day29_morning.msg1', 'доброе утро. кофе на кухне, свежий. ушёл тихо, чтобы не будить.')
    });
    setTimeout(function () {
      postMessage('kirill', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('kirill')),
        text: tStr('beat.kirill_day29_morning.msg2', 'спасибо что вчера. редко бывает так спокойно.')
      });
    }, 1400);
    setTimeout(function () {
      postMessage('kirill', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('kirill')),
        text: tStr('beat.kirill_day29_morning.msg3', 'если что — я тут. без давления. просто здесь.')
      });
    }, 2800);
    STATE.kirill_affection = (STATE.kirill_affection || 0) + 1;
    STATE.comfort = Math.min(100, STATE.comfort + 10);
    postMessage('scratch', { kind: 'system', text: tStr('beat.kirill_day29_morning.system_line', '☕ +10💚 утро начинается тихо') });
  }

  // SPRINT 36 — Kirill brings dinner if Marina ignored him + is hungry (once)
    try { beatKirillFoodDelivery(); } catch (e) {}

    // Lena lifeline — available only after day 14 (after khozyaika rescue).
    // До day 12 player должен дойти в минусе — тогда хозяйка спасает. После 14 —
    // lena подстраховывает вторую половину если что.
    if (STATE.cash < 0 && !STATE.lena_lifeline_used && STATE.day > 14) {
      STATE.lena_lifeline_used = true;
      STATE.cash += 300;
      postMessage('lena', {
        kind: 'incoming',
        senderName: Bubbles.localizedContactName(findContact('lena')),
        text: tStr('system.passive.lena_lifeline_msg', 'подруга, у меня есть $300 наличкой на пару недель. не спорь. отдашь как сможешь.')
      });
      postBank(300, tStr('system.passive.lena_lifeline_bank', 'перевод от Лены · lifeline'));
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
    if (STATE._rescue_active) return; // already showing rescue overlay

    // SPRINT 29 — pick first applicable rescue type (player choice via overlay).
    // True lose only at FINALE_DAY+ when all rescues exhausted or finale check.
    var rescueType = null;
    if (STATE.hunger !== undefined && STATE.hunger <= 5 && STATE.day >= 4 && !STATE.rescue_hospital_used && STATE.day < FINALE_DAY) {
      rescueType = 'hospital';
    } else if (STATE.comfort !== undefined && STATE.comfort <= 3 && STATE.day >= 8 && !STATE.rescue_lena_breakdown_used && STATE.day < FINALE_DAY) {
      rescueType = 'lena_breakdown';
    } else if (STATE.cash < -1500 && !STATE.rescue_father_used && STATE.day < FINALE_DAY) {
      rescueType = 'father';
    } else if (STATE.cash < -800 && !STATE.rescue_mama_money_used && STATE.day < FINALE_DAY) {
      rescueType = 'mama_money';
    }
    if (rescueType) {
      showRescue(rescueType);
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
      showLose('no_traction', tStr('ending.win.reason_no_traction', '30 дней · ни одного закрытого проекта'));
    } else {
      showLose('burnout', tStr('ending.win.reason_burnout', 'месяц закончился · проектов не добила'));
    }
  }

  // SPRINT 29 — Rescue overlay with player choice (call OR restart)
  var RESCUE_CONFIG = {
    mama_money: {
      kicker: 'денег почти не осталось',
      reason: 'счёт ушёл в красную зону. дальше будет тяжелее.',
      body: 'у тебя минус $800. ещё пара дней — и не на что будет даже хлеб купить. кому позвонить?',
      caller: 'мама',
      callBtn: '📞 позвонить маме',
      hero: 'img/endings/lose_parents.webp',
      onApply: function () {
        STATE.cash += 700;
        STATE.comfort = Math.min(100, STATE.comfort + 20);
        STATE.hours = 0;
        postBank(700, tStr('system.payment.mama_rescue', 'мама перевела'));
        postMessage('mama', { kind: 'incoming', senderName: Bubbles.localizedContactName(findContact('mama')), text: tStr('rescue.mama_money.mama_msg', 'доча, я перевела $700. не возражай. поешь, отдохни. я люблю тебя.') });
        postMessage('scratch', { kind: 'system', text: tStr('rescue.mama_money.scratch_note', '💌 мама прислала $700 + 20 комфорт · ты в строю') });
      }
    },
    hospital: {
      kicker: 'марина свалилась',
      reason: 'четыре дня без нормальной еды. голова кружится.',
      body: 'хозяйка увидела как ты вошла в подъезд держась за стену. вызвала скорую. ты в больнице. кому позвонить?',
      caller: 'мама',
      callBtn: '📞 позвонить маме',
      hero: 'img/endings/lose_hospital.webp',
      onApply: function () {
        STATE.hunger = 80;
        STATE.energy = Math.max(40, STATE.energy);
        STATE.comfort = Math.min(100, STATE.comfort + 25);
        STATE.hours = 0;
        postMessage('mama', { kind: 'incoming', senderName: Bubbles.localizedContactName(findContact('mama')), text: tStr('rescue.hospital.mama_msg', 'я приехала. ничего не говори. ешь суп. потом поспишь. хозяйка молодец что позвонила.') });
        postMessage('scratch', { kind: 'system', text: tStr('rescue.hospital.scratch_note', '🏥 мама с супом + 80 голод + 25 комфорт · день потерян') });
      }
    },
    lena_breakdown: {
      kicker: 'комфорт обнулился',
      reason: 'нервы сдают. ты сидишь и не можешь начать ничего делать.',
      body: 'если сейчас не сделать паузу — будет хуже. кому позвонить?',
      caller: 'Лена',
      callBtn: '📞 позвонить Лене',
      hero: 'img/endings/lose_hospital.webp',
      onApply: function () {
        STATE.comfort = 70;
        STATE.energy = Math.min(100, STATE.energy + 30);
        STATE.hours = 0;
        postMessage('lena', { kind: 'incoming', senderName: Bubbles.localizedContactName(findContact('lena')), text: tStr('rescue.lena_breakdown.lena_msg', 'еду к тебе. собирай сумку, переночуешь у меня. без споров.') });
        postMessage('scratch', { kind: 'system', text: tStr('rescue.lena_breakdown.scratch_note', '🛋 подруга забрала к себе · +30⚡ +70 комфорт · день потерян') });
      }
    },
    father: {
      kicker: 'деньги в глубоком минусе',
      reason: 'минус $1500. это уже не «тяжёлый месяц», это катастрофа.',
      body: 'нужно срочно стабилизироваться. кому позвонить?',
      caller: 'родители',
      callBtn: '📞 позвонить родителям',
      hero: 'img/endings/lose_parents.webp',
      onApply: function () {
        STATE.cash = 200;
        STATE.comfort = Math.min(100, STATE.comfort + 15);
        STATE.hours = 0;
        postMessage('mama', { kind: 'incoming', senderName: Bubbles.localizedContactName(findContact('mama')), text: tStr('rescue.father.mama_msg', 'папа выехал. забирает тебя на пару дней. это не провал, это пауза.') });
        postMessage('scratch', { kind: 'system', text: tStr('rescue.father.scratch_note', '🏡 родители помогли · cash $200 · +15 комфорт · ты в безопасности') });
      }
    }
  };

  function showRescue(type) {
    var cfg = RESCUE_CONFIG[type];
    if (!cfg) return;
    STATE._rescue_active = true;
    STATE._rescue_type = type;
    save();
    var $card = $('#rescue-overlay .overlay-card');
    $card.find('.ending-hero').remove();
    if (cfg.hero) {
      $('<img class="ending-hero" />').attr('src', cfg.hero).attr('alt', tStr('rescue.overlay_alt', 'кризис')).prependTo($card);
    }
    $('#rescue-kicker').text(cfg.kicker);
    $('#rescue-reason').text(cfg.reason);
    $('#rescue-body').empty().append($('<p>').text(cfg.body));
    $('#rescue-call').text(cfg.callBtn);
    $('#rescue-overlay').show();
    track('rescue_offered', { type: type, day: STATE.day });
  }

  function applyRescue() {
    var type = STATE._rescue_type;
    var cfg = RESCUE_CONFIG[type];
    if (!cfg) return;
    // Mark used flag
    if (type === 'mama_money') STATE.rescue_mama_money_used = true;
    else if (type === 'hospital') STATE.rescue_hospital_used = true;
    else if (type === 'lena_breakdown') STATE.rescue_lena_breakdown_used = true;
    else if (type === 'father') STATE.rescue_father_used = true;
    cfg.onApply();
    STATE._rescue_active = false;
    STATE._rescue_type = null;
    track('rescue_accepted', { type: type, day: STATE.day });
    save();
    $('#rescue-overlay').hide();
    renderDock();
    // SPRINT 51 — inject viral share card on rescue (primary surface)
    try {
      if (window.MarinaViral) {
        var $rescueCard = $('#rescue-overlay .overlay-card')[0];
        if ($rescueCard) window.MarinaViral.renderCardForSurface('rescue', STATE, $rescueCard);
      }
    } catch (e) {}
  }

  function showWin() {
    STATE.ending_seen = 'win';
    save();
    track('game_won', {
      delivered: STATE.delivered_projects,
      love: !!STATE.love_ending_unlocked,
      auto_tiers: (STATE.auto_reach_out ? 1 : 0) + (STATE.auto_brief_lead ? 1 : 0) + (STATE.auto_send_offer ? 1 : 0)
    });
    var stats = STATE.delivered_projects + ' проекта сданы · $' + STATE.cash + ' · энергия ' + STATE.energy + '/100';
    $('#win-stats').text(stats);

    // SPRINT 01 — love ending bonus
    var $card = $('#win-overlay .overlay-card');
    $card.find('.love-bonus').remove();
    // SPRINT 28 — hero image based on win type
    $card.find('.ending-hero').remove();
    var winHero = STATE.love_ending_unlocked ? 'img/endings/win_love.webp' : 'img/endings/win_main.webp';
    $('<img class="ending-hero" />').attr('src', winHero).attr('alt', tStr('ending.win.hero_alt', 'победа')).prependTo($card);
    // SPRINT 42 — confetti burst on win
    try { spawnConfetti(120); } catch (e) {}
    if (STATE.love_ending_unlocked) {
      var $love = $('<div class="love-bonus">').html(
        '<div class="love-kicker">❤️ LOVE ENDING — ДВА ГОДА СПУСТЯ</div>' +
        '<p>в первую неделю Кирилл написал тебе в Tinder. настойчивый, немного слишком — но под приглашениями на ужин было искреннее терпение.</p>' +
        '<p>ты долго не отвечала, потом пошла «просто посмотреть». просто не получилось.</p>' +
        '<p>он привозил еду, когда ты не могла выйти из дома. слушал, когда ты рассказывала про хозяйку, счёт по 115-ФЗ и проекты, которые горели. не пытался спасать — просто был рядом.</p>' +
        '<p class="para-gap">через полгода вы съехались. он сказал: «давай попробуем». ты сказала: «давай».</p>' +
        '<p>через год ты открыла агентство «Марина AI» — автоматизация для малого бизнеса: лиды, воронки, обработка входящих, AI-саппорт. первых трёх клиентов привела Лена. Анна подняла свой двустраничник до полноценного сайта — взяла. Тим дал тебе методологию тиров и помог собрать команду.</p>' +
        '<p>через два года — офис в центре города, шесть человек в штате, $40k/мес MRR, три постоянных корпоративных клиента. Кирилл ушёл из найма и стал CTO твоего агентства. вы перестали делить «моё» и «твоё» — у вас одно общее.</p>' +
        '<p class="para-gap">сегодня суббота. вы сидите в вашем любимом кафе у окна. на столе пионы — от него, без повода. он смеётся над чем-то твоим, ты смеёшься в ответ.</p>' +
        '<p>ты помнишь тот день 1, когда батарейка была на 20% и никто не писал. сейчас батарейка полная, пишут все, и ты выбираешь кому отвечать.</p>' +
        '<p class="love-quiet">это не концовка. это твоя жизнь, ставшая ею по-настоящему.</p>'
      );
      $card.find('.overlay-body').after($love);
    }
    // SPRINT 51 — inject viral share card on win (secondary surface)
    try {
      if (window.MarinaViral) {
        $card.find('.viral-share-block').remove();
        window.MarinaViral.renderCardForSurface('win', STATE, $card[0]);
      }
    } catch (e) {}
    $('#win-overlay').show();
  }

  function showLose(reason, reasonText) {
    STATE.ending_seen = 'lose_' + reason;
    save();
    track('game_lost', { reason: reason, day: STATE.day });
    $('#lose-reason').text(reasonText);
    // SPRINT 51 — inject viral share card on lose (PRIMARY surface — highest reach)
    try {
      if (window.MarinaViral) {
        var $loseCard = $('#lose-overlay .overlay-card');
        $loseCard.find('.viral-share-block').remove();
        window.MarinaViral.renderCardForSurface('lose', STATE, $loseCard[0]);
      }
    } catch (e) {}

    // SPRINT 28 — set hero image based on lose reason
    var $card = $('#lose-overlay .overlay-card');
    $card.find('.ending-hero').remove();
    var heroSrc = null;
    if (reason === 'eviction') heroSrc = 'img/endings/lose_parents.webp';
    else if (reason === 'no_traction') heroSrc = 'img/endings/lose_empty_inbox.webp';
    else heroSrc = 'img/endings/lose_hospital.webp'; // burnout default
    if (heroSrc) {
      $('<img class="ending-hero" />').attr('src', heroSrc).attr('alt', tStr('ending.lose.hero_alt', 'финал'))
        .prependTo($card);
    }

    // Build narrative body by reason type
    var $body = $('#lose-body').empty();
    var lines = [];
    if (reason === 'eviction') {
      lines = [
        'к концу месяца денег так и не хватило. папа приехал, забрал тебя домой.',
        'мама встретила пирогом и обнимашками. ничего не сказала про работу.',
        'на кухне старая занавеска с детства. ты заплакала первый раз за месяц.',
        'это не провал — это пауза. в следующий заход ты будешь умнее.',
        ''
      ];
    } else if (reason === 'no_traction') {
      lines = [
        '30 дней прошло. ни одного закрытого проекта.',
        'может, формат контент-студии не твой. или время было неподходящее.',
        'мама позвонила: «приезжай, отдохни, перезагрузишься».',
        'это не провал — это информация. о себе, о рынке, о том как не надо.',
        ''
      ];
    } else if (reason === 'burnout') {
      lines = [
        'ты доехала до 30-го дня, но проектов не добила.',
        'комфорт обнулился, тело отказывается. Лена забрала тебя на сутки.',
        'утром мама прислала: «я знаю что ты устала. я тут».',
        'первый месяц всегда самый беспощадный. ты выжила. это уже победа.',
        ''
      ];
    } else {
      lines = [tStr('ending.lose.fallback.0', 'бывает.')];
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
        track('lead_submitted', { day: STATE.day });
        STATE.leads += 2;
        STATE.cash += 200;
        STATE.energy = Math.min(100, STATE.energy + 15);

        postMessage('tim', {
          kind: 'incoming',
          senderName: Bubbles.localizedContactName(findContact('tim')),
          text: tStr('system.lead_form.tim_message', 'прочитал. спасибо что без фильтров.\n\nтри вещи на завтра утром:\n1. разложить почту по воронке (cold / качественный / в работе / сдано)\n2. срезать одну мёртвую задачу — ту, что откладываешь четвёртый день\n3. забронировать два часа без чата, писать одно дело\n\nзакину шаблоны — увидишь эффект.')
        });
        postBank(200, tStr('system.lead_form.bank_memo', 'Тим закинул шаблоны · оплата от клиента который ждал'));
        postMessage('scratch', { kind: 'system', text: tStr('system.lead_form.scratch_cue', '+2 лида · +$200 · +15 энергии · automation on') });
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

  // SPRINT 38c — Anna referral (day 21) — second project chip
  function renderAnnaReferralChoice() {
    if (!STATE._anna_referral_pending) return;
    Bubbles.renderReplyChips([
      { id: 'take',    label: tStr('beat.anna_referral.chip_take', 'взять второй проект ($350 upfront + $450 final, 7 дн)') },
      { id: 'decline', label: tStr('beat.anna_referral.chip_decline', 'отказать (не вытяну)') }
    ], function (opt) {
      STATE._anna_referral_pending = false;
      Bubbles.clearChipsArea();
      bumpInteraction();
      if (opt.id === 'take') {
        postOutgoing('anna', tStr('system.anna_referral_choice.take_outgoing', tStr('system.anna_choice.take_outgoing', 'беру. скидывай договор')));
        setTimeout(function () {
          postIncoming('anna', tStr('system.anna_referral_choice.take_reply', tStr('system.anna_choice.take_reply', 'ура, отправила')), 'Анна');
          var project = {
            id: STATE.active_projects.length + STATE.delivered_projects + 1,
            clientId: 'anna',
            client: tStr('system.anna_referral_choice.client_label', 'email-серия для Анны #2'),
            progress: 0,
            work_units_done: 0,
            work_units_total: 6,
            upfront_paid: 350,
            final_due: 450,
            final_payment: 450,
            started_day: STATE.day,
            deadline_day: STATE.day + 7,
            status: 'active'
          };
          STATE.active_projects.push(project);
          STATE.cash += 350;
          postBank(350, tStr('system.anna_referral_choice.take_bank_memo', 'upfront · второй проект Анны'));
          postMessage('scratch', { kind: 'system', text: tStr('system.anna_referral_choice.take_scratch_prefix', '+$350 upfront · проект #') + project.id + tStr('system.anna_referral_choice.take_scratch_suffix', ' (Анна #2)') });
          save(); renderDock();
        }, 700);
      } else {
        postOutgoing('anna', tStr('system.anna_referral_choice.decline_outgoing', 'Аня, не сейчас. не вытяну второй параллельно.'));
        setTimeout(function () {
          postIncoming('anna', tStr('system.anna_referral_choice.decline_reply', 'поняла, береги себя. найду другого.'), 'Анна');
          save(); renderDock();
        }, 600);
      }
    });
  }

  function renderAnnaChoice() {
    if (!STATE._anna_pending) return;
    Bubbles.renderReplyChips([
      { id: 'anna_take', label: tStr('beat.anna_offer.chip_take', 'взять проект ($250 upfront + $300 final)') },
      { id: 'anna_decline', label: tStr('beat.anna_offer.chip_decline', 'отказать (слишком быстро)') }
    ], function (opt) {
      STATE._anna_pending = false;
      if (opt.id === 'anna_take') {
        postOutgoing('anna', tStr('system.anna_referral.yes', 'беру. скидывай договор'));
        setTimeout(function () {
          postIncoming('anna', tStr('system.anna_referral.sent', 'ура, отправила'), Bubbles.localizedContactName(findContact('anna')));
          var project = {
            id: STATE.active_projects.length + STATE.delivered_projects + 1,
            clientId: 'anna',
            client: tStr('system.anna_choice.client_label', 'лендинг анны'),
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
          postBank(250, tStr('system.anna_choice.take_bank_memo', 'upfront · проект анны'));
          postMessage('scratch', { kind: 'system', text: tStr('system.anna_choice.take_scratch_prefix', '+$250 upfront · проект #') + project.id + tStr('system.anna_choice.take_scratch_suffix', ' в работе') });
          Bubbles.clearChipsArea();
          save(); renderDock();
        }, 600);
      } else {
        postOutgoing('anna', tStr('system.anna_choice.decline_outgoing', 'прости, не сейчас'));
        setTimeout(function () {
          postIncoming('anna', tStr('system.anna_choice.decline_reply', 'поняла. удачи'), 'Анна');
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

    // SPRINT 52 — language mismatch detection (v3): FULL state reset when
    // current locale ≠ stored locale OR persisted bubbles have wrong alphabet.
    // Beat-flags depend on bubble history (флажки `beat_*: true` без bubbles
    // → пустые чаты). Easier to reset everything and let the game replay
    // intro + beats fresh in current language.
    var _curLang = (window.MarinaI18n && window.MarinaI18n.getLang && window.MarinaI18n.getLang()) || 'ru';
    function _bubbleHasMismatch() {
      if (!STATE.threads || typeof STATE.threads !== 'object') return false;
      var cyrPattern = /[А-Яа-яёЁ]/;
      for (var tid in STATE.threads) {
        if (!Object.prototype.hasOwnProperty.call(STATE.threads, tid)) continue;
        var msgs = STATE.threads[tid] || [];
        for (var i = 0; i < msgs.length; i++) {
          var txt = msgs[i] && msgs[i].text;
          if (typeof txt !== 'string') continue;
          var hasCyr = cyrPattern.test(txt);
          if (_curLang !== 'ru' && hasCyr) return true;
          if (_curLang === 'ru' && !hasCyr && /[a-z]{3,}/i.test(txt)) return true;
        }
      }
      return false;
    }
    var _shouldClear = (STATE._lang_stamp && STATE._lang_stamp !== _curLang) || _bubbleHasMismatch();
    if (_shouldClear) {
      var _wasLang = STATE._lang_stamp || 'unknown';
      try { console.log('[i18n] full state reset due to language switch:', _wasLang, '→', _curLang); } catch (e) {}
      // Wipe state entirely; lang stamp persists via separate localStorage key
      clearState();
      STATE = defaultState();
      STATE._lang_stamp = _curLang;
      saveState();
    } else if (!STATE._lang_stamp) {
      STATE._lang_stamp = _curLang;
      saveState();
    }

    // SPRINT 14.4 rev3 — populate footer version dynamically (single source = VERSION)
    $('#footer-version').text('v' + VERSION + ' survival');

    // Render initial state
    Bubbles.renderContacts(STATE);
    openChat(STATE.current_chat || 'scratch');
    renderDock();

    // SPRINT 49 — re-render HUD when i18n becomes ready (initial render may have used RU fallback).
    // Event may have ALREADY fired before marina.js init() — check current state too.
    function _i18nReready() {
      try { renderDock(); Bubbles.renderContacts(STATE); } catch (e) {}
    }
    if (window.MarinaI18n && window.MarinaI18n.isReady && window.MarinaI18n.isReady()) {
      // i18n ready by the time marina init runs — re-render now
      _i18nReready();
    }
    window.addEventListener('marina:i18nready', _i18nReready);
    window.addEventListener('marina:langchange', _i18nReready);

    // SPRINT 52 (codex-fix HIGH-1) — on mid-run language switch, do FULL state
    // reset (same path as init detection). Just clearing threads while keeping
    // beat_*/projects/pending flags leaves story consumed but chat empty.
    // Reload page so beats/intro can replay cleanly in new locale.
    window.addEventListener('marina:langchange', function (ev) {
      try {
        var newLang = (ev.detail && ev.detail.lang) || (window.MarinaI18n && window.MarinaI18n.getLang());
        if (STATE._lang_stamp && newLang && STATE._lang_stamp !== newLang) {
          // Full reset — same as init() mismatch path. Reload triggers fresh boot in new locale.
          clearState();
          // Replace STATE in-place with fresh defaults + stamped lang, then saveState().
          STATE = defaultState();
          STATE._lang_stamp = newLang;
          saveState();
          // Hard reload so init() runs fresh, beats replay in new locale
          location.reload();
        }
      } catch (e) {}
    });

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
      track('intro_dismissed', { day: STATE.day });
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
      // SPRINT 38c — Anna referral (day 21) also needs chip
      if (id === 'anna' && STATE._anna_referral_pending) {
        renderAnnaReferralChoice();
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
      track('action_used', { action: name, day: STATE.day, hours: STATE.hours_left });
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

    // SPRINT 28 — dock collapse toggle (mobile UX: see full chat)
    $('#dock-collapse').on('click', function () {
      var collapsed = document.body.classList.toggle('dock-collapsed');
      var $btn = $('#dock-collapse');
      $btn.text(collapsed ? '⇧' : '⇕');
      $btn.attr('title', collapsed ? 'развернуть панель действий' : 'свернуть панель (видеть полный чат)');
      $btn.attr('aria-label', collapsed ? 'развернуть' : 'свернуть');
    });

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

    // SPRINT 28 — restart buttons in win/lose overlays (no confirm — user already at end)
    $('#lose-restart, #win-restart').on('click', function () {
      clearState();
      sessionStorage.removeItem(SESSION_KEY);
      location.reload();
    });

    // SPRINT 29 — rescue overlay handlers
    $('#rescue-call').on('click', function () { applyRescue(); });
    $('#rescue-restart').on('click', function () {
      clearState();
      sessionStorage.removeItem(SESSION_KEY);
      location.reload();
    });
    // SPRINT 30 — track Telegram CTA clicks per overlay (don't preventDefault — link still opens)
    $(document).on('click', '.tg-cta', function () {
      var overlay = $(this).attr('data-overlay') || 'unknown';
      track('telegram_cta_clicked', { overlay: overlay });
    });

    // SPRINT 32 — custom tooltip popup for HUD pills (works on touch + hover)
    var $hudTooltip = $('#hud-tooltip');
    var hudTooltipTimer = null;
    function showHudTooltip(target, text) {
      var rect = target.getBoundingClientRect();
      $hudTooltip.text(text).show();
      var ttRect = $hudTooltip[0].getBoundingClientRect();
      // Position below the pill, centered horizontally, clamp to viewport
      var left = rect.left + rect.width / 2 - ttRect.width / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - ttRect.width - 8));
      var top = rect.bottom + 6;
      // If would go off-screen bottom, place above
      if (top + ttRect.height > window.innerHeight - 8) top = rect.top - ttRect.height - 6;
      $hudTooltip.css({ left: left + 'px', top: top + 'px' });
    }
    function hideHudTooltip() { $hudTooltip.hide(); clearTimeout(hudTooltipTimer); }
    // Desktop hover
    $(document).on('mouseenter', '.r-pill[title]', function () {
      var t = $(this).attr('data-tip') || $(this).attr('title');
      if (!t) return;
      // Suppress native title only while we show ours
      $(this).attr('data-tip', t).removeAttr('title');
      showHudTooltip(this, t);
    });
    $(document).on('mouseleave', '.r-pill[data-tip]', function () {
      hideHudTooltip();
      // Restore title for next render cycle (renderHud rebuilds, so this is safety only)
      var t = $(this).attr('data-tip');
      if (t && !$(this).attr('title')) $(this).attr('title', t);
    });
    // SPRINT 38c — Touch tap on HUD pill (Tim: 'на мобильном не работает').
    // Use click on document, find closest .r-pill (handles children .r-icon/.r-val/.r-bar taps).
    // Also fire on touchstart for fast feedback before browser synthesizes click.
    function showPillTooltip(pill) {
      if (window.innerWidth > 640) return; // desktop uses hover
      var $p = $(pill);
      var t = $p.attr('data-tip') || $p.attr('title');
      if (!t) return;
      $p.attr('data-tip', t).removeAttr('title');
      showHudTooltip(pill, t);
      clearTimeout(hudTooltipTimer);
      hudTooltipTimer = setTimeout(hideHudTooltip, 4500);
    }
    $(document).on('click touchstart', function (e) {
      var pill = $(e.target).closest('.r-pill').get(0);
      if (pill && (pill.hasAttribute('title') || pill.hasAttribute('data-tip'))) {
        e.stopPropagation();
        showPillTooltip(pill);
      } else if (!$(e.target).closest('#hud-tooltip').length) {
        hideHudTooltip();
      }
    });
    // (old standalone click-outside handler removed — merged into combined click/touchstart above)
    // Restore rescue overlay on reload (player closed tab during crisis)
    if (STATE._rescue_active && STATE._rescue_type) {
      showRescue(STATE._rescue_type);
    }

    // SPRINT 17 — Desktop keyboard shortcuts
    // Only active on desktop (>640px) to avoid conflicts with mobile keyboards
    $(document).on('keydown', function (e) {
      if (window.innerWidth <= 640) return;
      // Ignore shortcuts while typing in form inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      // Ignore if any overlay is visible (intro/win/lose)
      if ($('#intro-overlay').is(':visible') || $('#win-overlay').is(':visible') || $('#lose-overlay').is(':visible') || $('#rescue-overlay').is(':visible')) return;

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
      // SPRINT 38c — REMOVED Space/Enter end_day shortcut.
      // Tim feedback: 'день случайно закончился, ничего не нажимал'.
      // Space/Enter too easy to hit accidentally. End day requires deliberate click on dock button.
      if (false && (e.key === ' ' || e.key === 'Enter')) {
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
    state: function () { return STATE; },
    _reset: function () { clearState(); location.reload(); },
    _actLamp: actLamp,
    currentChat: currentChat
  };

  $(function () { init(); });
})();
