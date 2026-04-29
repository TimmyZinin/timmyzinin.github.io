// Глава 2 — «Среда: регистрация, оплата, установка» (v2 — Евгений-edition)
// 6 сцен, 4 точки выбора. Закрепляет уроки 2.1-2.4.

export const chapter2 = {
  id: 'ch2',
  title: 'Среда',
  subtitle: 'Регистрация, оплата, установка',
  maxXP: 85,
  scenes: [
    // ===== СЦЕНА 2.1 — Hook: попытка зарегаться =====
    {
      id: 'ch2-s1',
      bg: 'bg-coffeeshop-moscow',
      character: 'char-eugene-master',
      location: 'Кофейня в Москве, среда, 11:20',
      dialog: [
        { speaker: 'Евгений', text: 'Открыл claude.ai. Ввёл +7 999 — отказ. «Phone number not supported».', mode: 'inner' },
        { speaker: 'Евгений', text: 'Ясно. Anthropic пока не для российских номеров. Нужен зарубежный.', mode: 'inner' },
      ],
      next: 'ch2-s2',
    },

    // ===== СЦЕНА 2.2 — Choice: виртуальный номер =====
    {
      id: 'ch2-s2',
      bg: 'bg-coffeeshop-moscow',
      character: 'char-eugene-surprised',
      location: 'Кофейня. Открыты вкладки с сервисами',
      dialog: [
        { speaker: 'Евгений', text: 'Гуглю. Вариантов три: разовый SMS-приём через sms-activate, eSIM Airalo, посредник.', mode: 'inner' },
        { speaker: 'Евгений', text: 'Anthropic присылает не только SMS-код регистрации, но иногда верификации позже. Один номер на одну попытку — рискованно.', mode: 'inner' },
      ],
      choice: {
        question: 'Какой номер выбрать?',
        options: [
          {
            label: 'sms-activate.ru — разовый приём $0.30',
            xp: 5,
            verdict: 'partial',
            feedback: 'Дёшево, но если Anthropic пришлёт повторное SMS через месяц — номер уже не твой. Risky для долгой подписки.',
            lessonRef: { module: 1, lesson: 6, title: 'Виртуальные номера 2026' },
          },
          {
            label: 'Airalo eSIM (UK/Польша) ~$5',
            xp: 20,
            verdict: 'correct',
            feedback: 'Лучший вариант. Номер закреплён за тобой, eSIM работает в твоём телефоне, повторные SMS приходят.',
            lessonRef: { module: 1, lesson: 6, title: 'Виртуальные номера 2026' },
          },
          {
            label: 'Попросить друга в Турции',
            xp: 10,
            verdict: 'partial',
            feedback: 'Работает, но зависишь от друга. Если он смотрит TikTok когда нужен код — простой.',
            lessonRef: { module: 1, lesson: 6, title: 'Виртуальные номера 2026' },
          },
        ],
      },
      next: 'ch2-s3',
    },

    // ===== СЦЕНА 2.3 — Choice: оплата $20 Pro =====
    {
      id: 'ch2-s3',
      bg: 'bg-coffeeshop-moscow',
      character: 'char-eugene-master',
      location: 'Кофейня. Anthropic billing page открыт',
      dialog: [
        { speaker: 'Евгений', text: 'Аккаунт создан. Теперь Pro — $20/мес. Российская карта не пройдёт.', mode: 'inner' },
        { speaker: 'Евгений', text: 'Варианты: казахская карта Wise, посредник Oplatym.ru, агрегатор BotHub.', mode: 'inner' },
      ],
      choice: {
        question: 'Чем платить?',
        options: [
          {
            label: 'Казахская карта Wise (если уже есть)',
            xp: 20,
            verdict: 'correct',
            feedback: 'Прямая оплата, никаких комиссий посредников, привязан как обычная карта.',
            lessonRef: { module: 1, lesson: 7, title: 'Оплата Anthropic из РФ 2026' },
            badge: 'B03',
          },
          {
            label: 'Oplatym.ru — посредник $25',
            xp: 12,
            verdict: 'partial',
            feedback: 'Работает, но +$5 комиссии каждый месяц = $60/год. Проще завести Wise один раз.',
            lessonRef: { module: 1, lesson: 7, title: 'Оплата Anthropic из РФ 2026' },
          },
          {
            label: 'BotHub — агрегатор Claude API',
            xp: 8,
            verdict: 'partial',
            feedback: 'Это другая модель — платишь за токены, не подписку. Подходит если редко используешь, но без Claude Code.',
            lessonRef: { module: 1, lesson: 7, title: 'Оплата Anthropic из РФ 2026' },
          },
        ],
      },
      next: 'ch2-s4',
    },

    // ===== СЦЕНА 2.4 — Установка Claude Code =====
    {
      id: 'ch2-s4',
      bg: 'bg-laptop-screen',
      character: 'char-eugene-master',
      location: 'Кофейня. Терминал открыт впервые в жизни',
      dialog: [
        { speaker: 'Евгений', text: 'Pro оплачен. Гайд говорит: открыть Терминал и выполнить команду.', mode: 'inner' },
        { speaker: 'Евгений', text: 'Терминал — это вот эта чёрная штука с курсором. Никогда не открывал.', mode: 'inner' },
        { speaker: 'Евгений', text: 'На сайте три варианта установки: curl-инсталлер, npm, или скачать .pkg.', mode: 'inner' },
      ],
      choice: {
        question: 'Какую команду запустить?',
        options: [
          {
            label: 'curl https://claude.ai/install.sh | sh — официальный скрипт',
            xp: 20,
            verdict: 'correct',
            feedback: 'Это рекомендованный путь. Скрипт автоматически проверит зависимости и поставит claude в PATH.',
            lessonRef: { module: 1, lesson: 8, title: 'Первая команда в терминале' },
          },
          {
            label: 'npm install -g @anthropic-ai/claude-code',
            xp: 15,
            verdict: 'partial',
            feedback: 'Тоже работает, но требует установленного Node.js. Если Node нет — упадёт.',
            lessonRef: { module: 1, lesson: 8, title: 'Первая команда в терминале' },
          },
          {
            label: 'Скачать .pkg с сайта и кликнуть',
            xp: 8,
            verdict: 'partial',
            feedback: 'Вариант есть, но устаревает быстрее. Curl-инсталлер всегда тянет последнюю версию.',
            lessonRef: { module: 1, lesson: 8, title: 'Первая команда в терминале' },
          },
        ],
      },
      next: 'ch2-s5',
    },

    // ===== СЦЕНА 2.5 — IDE vs терминал =====
    {
      id: 'ch2-s5',
      bg: 'bg-laptop-screen',
      character: 'char-eugene-master',
      location: 'Терминал, claude установлен',
      dialog: [
        { speaker: 'Евгений', text: 'Установился. Гайд предлагает поставить расширение в VS Code — будет красивее.', mode: 'inner' },
        { speaker: 'Евгений', text: 'Я не разработчик. VS Code мне точно нужен?', mode: 'inner' },
      ],
      choice: {
        question: 'Где работать?',
        options: [
          {
            label: 'Только терминал',
            xp: 12,
            verdict: 'partial',
            feedback: 'Для старта норм. Но когда AI правит файлы — глазами хочется видеть diff. Тут IDE удобнее.',
            lessonRef: { module: 1, lesson: 9, title: 'Терминал vs IDE-расширение' },
          },
          {
            label: 'VS Code + Claude Code расширение',
            xp: 18,
            verdict: 'correct',
            feedback: 'Лучший компромисс. Терминал внутри VS Code, файлы видны рядом, изменения — diff’ом.',
            lessonRef: { module: 1, lesson: 9, title: 'Терминал vs IDE-расширение' },
          },
          {
            label: 'Cursor IDE',
            xp: 10,
            verdict: 'partial',
            feedback: 'Это IDE для программистов. Для предпринимателя — избыточно. VS Code хватит.',
            lessonRef: { module: 1, lesson: 9, title: 'Терминал vs IDE-расширение' },
          },
        ],
      },
      next: 'ch2-s6',
    },

    // ===== СЦЕНА 2.6 — Cliffhanger: первый рабочий ответ =====
    {
      id: 'ch2-s6',
      bg: 'bg-laptop-screen',
      character: 'char-claude-presence',
      location: 'VS Code, claude запущен',
      dialog: [
        { speaker: 'Евгений', text: 'Положил бриф Олега в папку. Печатаю: «прочитай brief-oleg.pdf и найди 5 рисков».', mode: 'inner' },
        { speaker: 'Claude', text: 'Прочитал. 5 рисков:\n1. Сроки кампании в брифе совпадают с майскими — низкая открываемость email.\n2. KPI на CTR без указания базового — невозможно измерить.\n3. Бюджет на креативы 15% — мало для нового сегмента.\n4. ...', mode: 'ai' },
        { speaker: 'Евгений', text: '90 секунд. ChatGPT мне такое не давал — он бы сказал «загрузите фрагмент».', mode: 'inner' },
        { speaker: 'Евгений', text: 'Работает. Завтра — пятница. Полный рабочий день уже на этом.', mode: 'inner' },
      ],
      next: 'CHAPTER_END',
    },
  ],
};
