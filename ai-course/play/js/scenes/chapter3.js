// Глава 3 — «Пятница: полная парадигма работы» (v2 — Евгений-edition)
// 7 сцен, 5 точек выбора. Закрепляет уроки 3.1-3.5 (Tools/MCP/Skills/Agents/Hooks).
// Финальная сцена → лид-форма (триггерится из engine.js по FINAL_CHAPTER_ID='ch3').

export const chapter3 = {
  id: 'ch3',
  title: 'Пятница',
  subtitle: 'Tools, MCP, Skills, Agents, Hooks',
  maxXP: 110,
  scenes: [
    // ===== СЦЕНА 3.1 — Hook: пятница, 5 типов задач =====
    {
      id: 'ch3-s1',
      bg: 'bg-coworking',
      character: 'char-eugene-confident',
      location: 'Коворкинг, пятница, 09:40',
      dialog: [
        { speaker: 'Евгений', text: 'Пятница. На столе — 5 разных задач. И первый рабочий день с Claude Code.', mode: 'inner' },
        { speaker: 'Евгений', text: 'Вчера понял: claude — это не «ещё один чат». Это набор инструментов внутри одного окна.', mode: 'inner' },
      ],
      next: 'ch3-s2',
    },

    // ===== СЦЕНА 3.2 — Tools: Olег прислал 200стр контракт =====
    {
      id: 'ch3-s2',
      bg: 'bg-coworking',
      character: 'char-oleg-client',
      location: 'Звонок от Олега, 10:15',
      dialog: [
        { speaker: 'Олег', text: 'Жень, привет. Прислал контракт от юристов клиента — 200 страниц. Нужно: найти все упоминания нашей ответственности и переписать рисковые формулировки.' },
        { speaker: 'Евгений', text: 'Принял. К обеду пришлю.', mode: 'inner' },
        { speaker: 'Евгений', text: 'Claude Code умеет: Read (читать файл), Edit (править), Bash (запускать команды). Что выбрать?', mode: 'inner' },
      ],
      choice: {
        question: 'Какой инструмент Claude использует?',
        options: [
          {
            label: 'Read — прочитать и пересказать',
            xp: 8,
            verdict: 'partial',
            feedback: 'Половина задачи. Найти упоминания — да. Но переписать формулировки — нужен Edit.',
            lessonRef: { module: 1, lesson: 10, title: 'Tools: Read / Edit / Bash' },
          },
          {
            label: 'Read + Edit — найти и переписать в файле',
            xp: 25,
            verdict: 'correct',
            feedback: 'Точно. Claude найдёт упоминания (Read), предложит правки (Edit), ты подтвердишь diff’ом — и файл готов.',
            lessonRef: { module: 1, lesson: 10, title: 'Tools: Read / Edit / Bash' },
            badge: 'B05',
          },
          {
            label: 'Bash — запустить grep по файлу',
            xp: 10,
            verdict: 'partial',
            feedback: 'Найдёт места, но не перепишет. Для бизнес-задач нужна связка Read+Edit.',
            lessonRef: { module: 1, lesson: 10, title: 'Tools: Read / Edit / Bash' },
          },
        ],
      },
      next: 'ch3-s3',
    },

    // ===== СЦЕНА 3.3 — MCP: Марина и выгрузки Сбера =====
    {
      id: 'ch3-s3',
      bg: 'bg-coworking',
      character: 'char-marina-ops',
      location: 'Личка Telegram, 11:50',
      dialog: [
        { speaker: 'Марина', text: 'Жень, опять выгружаю транзакции из Сбер-Бизнеса в Excel вручную. Третий час. Можно как-то автоматом?' },
        { speaker: 'Евгений', text: 'Слышал про MCP — модель может «дотягиваться» до внешних сервисов. Сбера среди них пока нет, но Google Sheets и Notion — есть.', mode: 'inner' },
      ],
      choice: {
        question: 'Что Марине посоветовать?',
        options: [
          {
            label: 'Поставить Google Sheets MCP — Claude сам обновляет таблицу',
            xp: 25,
            verdict: 'correct',
            feedback: 'Это и есть MCP — разъём между AI и сервисом. Claude через MCP дописывает строки в Sheets, Марина просто кидает CSV.',
            lessonRef: { module: 1, lesson: 11, title: 'MCP: разъёмы AI к твоим сервисам' },
            badge: 'B06',
          },
          {
            label: 'Написать Python-скрипт',
            xp: 12,
            verdict: 'partial',
            feedback: 'Сработает, но Марина не разраб. MCP — без кода, готовое решение.',
            lessonRef: { module: 1, lesson: 11, title: 'MCP: разъёмы AI к твоим сервисам' },
          },
          {
            label: 'Нанять помощника на 3 часа в неделю',
            xp: 5,
            verdict: 'wrong',
            feedback: 'Вернулся в дорогую рутину. Цель — высвободить часы Марины, не просто перекинуть.',
            lessonRef: { module: 1, lesson: 11, title: 'MCP: разъёмы AI к твоим сервисам' },
          },
        ],
      },
      next: 'ch3-s4',
    },

    // ===== СЦЕНА 3.4 — Skills: рутина 3 раза в день =====
    {
      id: 'ch3-s4',
      bg: 'bg-coworking',
      character: 'char-eugene-master',
      location: 'Коворкинг, 13:20',
      dialog: [
        { speaker: 'Евгений', text: '«Сделай отчёт по кампании Олега за вчера», «Сделай отчёт по кампании Б за вчера»…', mode: 'inner' },
        { speaker: 'Евгений', text: 'Каждый раз пишу промпт заново. И каждый раз чуть-чуть по-разному — отчёты выглядят неодинаково.', mode: 'inner' },
        { speaker: 'Евгений', text: 'Claude Code зовёт это Skill — переиспользуемый промпт. Один раз описал — потом просто зовёшь по имени.', mode: 'inner' },
      ],
      choice: {
        question: 'Как поступить с рутиной?',
        options: [
          {
            label: 'Сделать Skill «daily-report» один раз',
            xp: 25,
            verdict: 'correct',
            feedback: 'Точно. Один раз 20 минут — потом каждый день экономишь 10. К концу месяца — 5 часов.',
            lessonRef: { module: 1, lesson: 12, title: 'Skills: переиспользуемые промпты' },
            badge: 'B07',
          },
          {
            label: 'Скопировать-вставить промпт каждый раз',
            xp: 5,
            verdict: 'wrong',
            feedback: 'Это и есть та рутина, от которой ушли. Одна формула — один Skill.',
            lessonRef: { module: 1, lesson: 12, title: 'Skills: переиспользуемые промпты' },
          },
          {
            label: 'Делать руками в Excel',
            xp: 0,
            verdict: 'wrong',
            feedback: 'Возврат в исходную точку. Suggestion: запиши промпт как Skill сегодня же.',
            lessonRef: { module: 1, lesson: 12, title: 'Skills: переиспользуемые промпты' },
          },
        ],
      },
      next: 'ch3-s5',
    },

    // ===== СЦЕНА 3.5 — Agents: маркетинг-план на квартал =====
    {
      id: 'ch3-s5',
      bg: 'bg-coworking',
      character: 'char-eugene-master',
      location: 'Коворкинг, 15:00',
      dialog: [
        { speaker: 'Евгений', text: 'Олег попросил план маркетинга на следующий квартал. Это: проанализировать прошлый, посмотреть конкурентов, придумать 5 гипотез, разложить по неделям.', mode: 'inner' },
        { speaker: 'Евгений', text: 'Это не один промпт. Это последовательность задач, каждая зависит от предыдущей.', mode: 'inner' },
        { speaker: 'Евгений', text: 'Agent в Claude Code умеет такое: ставь финальную цель, он сам декомпозирует.', mode: 'inner' },
      ],
      choice: {
        question: 'Что делать?',
        options: [
          {
            label: 'Запустить Agent с целью «Q3-маркетинг-план»',
            xp: 25,
            verdict: 'correct',
            feedback: 'Точно. Agent сам сделает 5 шагов, ты валидируешь итог. Экономит часы.',
            lessonRef: { module: 1, lesson: 13, title: 'Agents: многошаговые задачи' },
            badge: 'B08',
          },
          {
            label: 'Сидеть и писать каждый шаг вручную в одном чате',
            xp: 10,
            verdict: 'partial',
            feedback: 'Сработает, но будешь тратить полдня на координацию. Agent делает то же за 30 минут.',
            lessonRef: { module: 1, lesson: 13, title: 'Agents: многошаговые задачи' },
          },
          {
            label: 'Делегировать стажёру',
            xp: 8,
            verdict: 'partial',
            feedback: 'Стажёр без AI = неделя. Agent + ты-проверяющий = полдня.',
            lessonRef: { module: 1, lesson: 13, title: 'Agents: многошаговые задачи' },
          },
        ],
      },
      next: 'ch3-s6',
    },

    // ===== СЦЕНА 3.6 — Hooks: уведомления при правках =====
    {
      id: 'ch3-s6',
      bg: 'bg-coworking',
      character: 'char-eugene-master',
      location: 'Коворкинг, 17:30',
      dialog: [
        { speaker: 'Евгений', text: 'Договорные файлы лежат в общей папке. Если кто-то правит — хорошо бы узнавать в Telegram.', mode: 'inner' },
        { speaker: 'Евгений', text: 'Claude Code умеет Hooks — реакции на события. Запись в файл → бот в TG → уведомление.', mode: 'inner' },
      ],
      choice: {
        question: 'Как уведомления настроить?',
        options: [
          {
            label: 'Hook PostToolUse: при Edit договоров — push в Telegram',
            xp: 25,
            verdict: 'correct',
            feedback: 'Это и есть Hook. Один раз настроил — каждое изменение договорных файлов сразу видишь.',
            lessonRef: { module: 1, lesson: 14, title: 'Hooks: реакции на события' },
            badge: 'B09',
          },
          {
            label: 'Каждое утро открывать папку и сравнивать с вчера',
            xp: 5,
            verdict: 'wrong',
            feedback: 'Та же рутина что Марина с выгрузками Сбера. Hooks решают это за 0 секунд.',
            lessonRef: { module: 1, lesson: 14, title: 'Hooks: реакции на события' },
          },
          {
            label: 'Просить юриста писать каждый раз',
            xp: 8,
            verdict: 'partial',
            feedback: 'Зависишь от человека и его внимательности. Hook не забудет.',
            lessonRef: { module: 1, lesson: 14, title: 'Hooks: реакции на события' },
          },
        ],
      },
      next: 'ch3-s7',
    },

    // ===== СЦЕНА 3.7 — Final reflection: парадигма понятна =====
    {
      id: 'ch3-s7',
      bg: 'bg-office-evening',
      character: 'char-eugene-confident',
      location: 'Дом, вечер пятницы',
      dialog: [
        { speaker: 'Евгений', text: 'Понедельник: ChatGPT упёрся. Среда: Claude Code в терминале. Пятница: Tools, MCP, Skills, Agents, Hooks.', mode: 'inner' },
        { speaker: 'Евгений', text: 'AI — это не «вторая голова, которая думает за меня». Это набор инструментов в моих руках. Каждый — для своей задачи.', mode: 'inner' },
        { speaker: 'Евгений', text: 'Управлять AI-инструментами — это новая компетенция. Как управлять командой, только инструменты не уходят в отпуск.', mode: 'inner' },
        { speaker: 'Евгений', text: 'Я понял парадигму. С чем я ещё не разобрался — узнаю по ходу. Но сейчас уже могу делегировать рутину.', mode: 'inner' },
      ],
      next: 'CHAPTER_END',
    },
  ],
};
