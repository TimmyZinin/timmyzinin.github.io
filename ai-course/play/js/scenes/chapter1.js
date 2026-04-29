// Глава 1 — «Понедельник: ChatGPT упёрся в потолок» (v2 — Евгений-edition)
// 7 сцен, 5 точек выбора. Закрепляет уроки 1.1-1.5.
// См. docs/GAME-STORY-BIBLE-v2.md и docs/GAME-LEARNING-MAP-v2.md

export const chapter1 = {
  id: 'ch1',
  title: 'Понедельник',
  subtitle: 'ChatGPT упёрся в потолок',
  maxXP: 95,
  scenes: [
    // ===== СЦЕНА 1.1 — Hook: «Тридцать чатов» =====
    {
      id: 'ch1-s1',
      bg: 'bg-office-day-modern',
      character: 'char-eugene-master',
      location: 'Домашний офис, утро понедельника',
      dialog: [
        { speaker: 'Евгений', text: 'За выходные — тридцать чатов в ChatGPT. И всё разрозненно.', mode: 'inner' },
        { speaker: 'Евгений', text: 'Где я писал про оффер для Олега? Уже не вспомню.', mode: 'inner' },
        { speaker: 'Подсказка', text: 'Тыкни любую кнопку — продолжишь. Внизу появятся выборы.', mode: 'tutorial' },
        { speaker: 'Подсказка', text: 'XP-бар сверху — твой прогресс по главе. Думай как сделал бы ты сам.', mode: 'tutorial' },
      ],
      next: 'ch1-s2',
    },

    // ===== СЦЕНА 1.2 — Trigger: 80-страничный бриф =====
    {
      id: 'ch1-s2',
      bg: 'bg-office-day-modern',
      character: 'char-eugene-surprised',
      location: 'Домашний офис, открыт почтовый клиент',
      dialog: [
        { speaker: 'Олег (письмо)', text: 'Евгений, привет. Прислал ТЗ на лендинг и кампанию по новой линейке. PDF на 80 страниц. К пятнице нужны замечания и смета.' },
        { speaker: 'Евгений', text: 'Восемьдесят страниц. До пятницы. Ну ладно.' },
        { speaker: 'Евгений', text: 'Пробую загрузить в ChatGPT… ответ фрагментарный. Половину контекста теряет.', mode: 'inner' },
      ],
      choice: {
        question: 'Какой инструмент взять для длинного PDF?',
        options: [
          {
            label: 'Продолжить читать в ChatGPT',
            xp: 5,
            verdict: 'partial',
            feedback: 'Сработает на 60%. С длинными PDF web-чат теряет контекст.',
            lessonRef: { module: 1, lesson: 1, title: 'Три типа AI-инструмента' },
          },
          {
            label: 'Загрузить в Claude.ai (длинный контекст)',
            xp: 15,
            verdict: 'correct',
            feedback: 'Да. У Claude больше контекстное окно — длинные документы он держит лучше ChatGPT.',
            lessonRef: { module: 1, lesson: 1, title: 'Три типа AI-инструмента' },
          },
          {
            label: 'Открыть Claude Code в терминале',
            xp: 10,
            verdict: 'partial',
            feedback: 'Направление правильное, но ты ещё не установил его. К Главе 2 поставим.',
            lessonRef: { module: 1, lesson: 1, title: 'Три типа AI-инструмента' },
          },
        ],
      },
      next: 'ch1-s3',
    },

    // ===== СЦЕНА 1.3 — Confusion: что НЕ давать AI =====
    {
      id: 'ch1-s3',
      bg: 'bg-office-day-modern',
      character: 'char-eugene-master',
      location: 'Домашний офис, через 20 минут',
      dialog: [
        { speaker: 'Евгений', text: 'В брифе — личные данные клиента, банковские реквизиты, копия паспорта подписанта.', mode: 'inner' },
        { speaker: 'Евгений', text: 'Это в чат загружать вообще можно?', mode: 'inner' },
        { speaker: 'Евгений', text: 'Сегодня в новостях — у кого-то слили промпты. Не будем рисковать данными клиента.', mode: 'inner' },
      ],
      choice: {
        question: 'Что отдать AI вместе с брифом?',
        options: [
          {
            label: 'Загрузить файл целиком как есть',
            xp: 0,
            verdict: 'wrong',
            feedback: 'Нельзя. Паспорт, реквизиты, договор с подписями — за пределы конторы не должны выходить.',
            lessonRef: { module: 1, lesson: 2, title: 'Безопасность данных' },
          },
          {
            label: 'Удалить чувствительные страницы перед загрузкой',
            xp: 20,
            verdict: 'correct',
            feedback: 'Правильно. Чек-лист «что не давать AI» в Уроке 1.2.',
            lessonRef: { module: 1, lesson: 2, title: 'Безопасность данных' },
            badge: 'B02',
          },
          {
            label: 'Спросить у Олега письменное согласие',
            xp: 10,
            verdict: 'partial',
            feedback: 'Можно, но это замедлит. Быстрее — отрезать чувствительное и работать с остальным.',
            lessonRef: { module: 1, lesson: 2, title: 'Безопасность данных' },
          },
        ],
      },
      next: 'ch1-s4',
    },

    // ===== СЦЕНА 1.4 — Mentor moment: Codex vs Claude Code =====
    {
      id: 'ch1-s4',
      bg: 'bg-office-day-modern',
      character: 'char-eugene-master',
      location: 'Telegram, канал «AI Happens»',
      dialog: [
        { speaker: 'TG-канал', text: 'OpenAI Codex 1.0 GA: агент в IDE для разработчиков. $20-200/мес.' },
        { speaker: 'Евгений', text: 'Codex — это что? Это же ChatGPT? Или другое?', mode: 'inner' },
        { speaker: 'Знакомый CTO (комменты)', text: 'Codex — для программистов, в IDE. Если ты не разраб — смотри Claude Code в терминале. Дешевле и не требует понимать код.' },
      ],
      choice: {
        question: 'Какой инструмент брать предпринимателю?',
        options: [
          {
            label: 'Купить Codex ($20-200/мес)',
            xp: 0,
            verdict: 'wrong',
            feedback: 'Дорогой и заточен под код в IDE. Тебе как владельцу бизнеса не нужен.',
            lessonRef: { module: 1, lesson: 3, title: 'Codex vs Claude Code: цена и фокус' },
          },
          {
            label: 'Изучить Claude Code',
            xp: 20,
            verdict: 'correct',
            feedback: 'Точно. Claude Code входит в Claude Pro ($20/мес), работает с твоими файлами в терминале, не требует знания программирования.',
            lessonRef: { module: 1, lesson: 3, title: 'Codex vs Claude Code: цена и фокус' },
            badge: 'B01',
          },
          {
            label: 'Остаться на ChatGPT',
            xp: 5,
            verdict: 'partial',
            feedback: 'ChatGPT мощный, но в браузере. Без работы с твоими файлами и без памяти между сессиями — для тебя сегодня мало.',
            lessonRef: { module: 1, lesson: 3, title: 'Codex vs Claude Code: цена и фокус' },
          },
        ],
      },
      next: 'ch1-s5',
    },

    // ===== СЦЕНА 1.5 — First trial: первый ответ от Claude.ai =====
    {
      id: 'ch1-s5',
      bg: 'bg-laptop-screen',
      character: 'char-claude-presence',
      location: 'Claude.ai, бриф загружен (без чувствительных страниц)',
      dialog: [
        { speaker: 'Евгений', text: 'Прикрепил отрезанный бриф. Что просить?', mode: 'inner' },
        { speaker: 'Claude', text: 'Готов. Что нужно сделать?', mode: 'ai' },
      ],
      choice: {
        question: 'Как сформулировать промпт?',
        options: [
          {
            label: '«Сделай красиво»',
            xp: 0,
            verdict: 'wrong',
            feedback: 'Слишком расплывчато. Чем конкретнее запрос — тем лучше результат.',
            lessonRef: { module: 1, lesson: 4, title: 'Структурный промпт' },
          },
          {
            label: '«Найди 5 рисков и 5 точек роста чека, в формате таблицы»',
            xp: 15,
            verdict: 'correct',
            feedback: 'Это рабочая формула. Числовое ограничение + категория + формат.',
            lessonRef: { module: 1, lesson: 4, title: 'Структурный промпт' },
          },
          {
            label: '«Сделай как для умного коллеги»',
            xp: 10,
            verdict: 'partial',
            feedback: 'Близко. Но конкретный формат лучше «как для коллеги».',
            lessonRef: { module: 1, lesson: 4, title: 'Структурный промпт' },
          },
        ],
      },
      next: 'ch1-s6',
    },

    // ===== СЦЕНА 1.6 — Decision: «надо разобраться с Claude Code» =====
    {
      id: 'ch1-s6',
      bg: 'bg-office-evening',
      character: 'char-eugene-confident',
      location: 'Домашний офис, вечер. Закрытый ноутбук',
      dialog: [
        { speaker: 'Евгений', text: 'Claude.ai — лучше ChatGPT для длинных документов. Но всё равно браузер.', mode: 'inner' },
        { speaker: 'Евгений', text: 'А Claude Code — это уже другой уровень. Файлы на моём компе. Память между сессиями.', mode: 'inner' },
        { speaker: 'Евгений', text: 'Закладку на гайд Habr поставил. Надо завтра попробовать.', mode: 'inner' },
      ],
      choice: {
        question: 'Что делать дальше?',
        options: [
          {
            label: 'Завтра поставлю и попробую',
            xp: 25,
            verdict: 'correct',
            feedback: 'Так и работает обучение: одна неделя — один инструмент. К пятнице делегируешь рутину.',
            lessonRef: { module: 1, lesson: 5, title: 'Когда учить самому' },
          },
          {
            label: 'Заплатить кому-то чтобы поставил',
            xp: 10,
            verdict: 'partial',
            feedback: 'Можно, но без понимания не сможешь поддерживать. Лучше понять самому, и если упрёшься — позвать.',
            lessonRef: { module: 1, lesson: 5, title: 'Когда учить самому' },
          },
          {
            label: 'Ждать пока проще станет',
            xp: 0,
            verdict: 'wrong',
            feedback: 'За эту неделю «проще» не станет. Конкуренты уже разобрались.',
            lessonRef: { module: 1, lesson: 5, title: 'Когда учить самому' },
          },
        ],
      },
      next: 'ch1-s7',
    },

    // ===== СЦЕНА 1.7 — Cliffhanger: «получилось» =====
    {
      id: 'ch1-s7',
      bg: 'bg-office-evening',
      character: 'char-eugene-confident',
      location: 'Домашний офис, поздний вечер',
      dialog: [
        { speaker: 'Евгений', text: 'Впервые за выходные я не открыл инстаграм за 4 часа. Что-то полезное делал.', mode: 'inner' },
        { speaker: 'Евгений', text: 'Завтра среда. Идём дальше.', mode: 'inner' },
      ],
      next: 'CHAPTER_END',
    },
  ],
};
