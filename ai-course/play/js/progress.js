// progress.js — XP, badges, save/resume, sync с backend
// localStorage key: gameProgress.v2
// API: POST /api/progress (existing endpoint), POST /api/cta-click (для game_completed_chapter_N)

import { apiUrl } from './api-base.js';

const STORAGE_KEY = 'gameProgress.v2';

const DEFAULT_STATE = {
  currentChapter: null,    // 'ch1' | 'ch2' | 'ch3' | 'CERTIFICATE' | null
  currentSceneId: null,    // 'ch1-s1' etc
  chapters: {
    ch1: { xp: 0, maxXP: 95, completed: false, choices: {} },
    ch2: { xp: 0, maxXP: 85, completed: false, choices: {} },
    ch3: { xp: 0, maxXP: 110, completed: false, choices: {} },
  },
  badges: [],              // ['B01', 'B02', ...]
  audioMuted: false,
  reducedMotion: false,
  highScore: 0,
  startedAt: null,
  completedAt: null,
};

const BADGES = {
  B01: { name: 'Не сдался', description: 'Открыл курс, а не загуглил наобум', chapter: 1 },
  B02: { name: 'Понял разницу', description: 'Различил ChatGPT vs Claude vs Codex', chapter: 1 },
  B03: { name: 'Не дал лишнего', description: 'Не отдал AI паспорт/реквизиты', chapter: 1 },
  B04: { name: 'Открыл терминал', description: 'Не испугался чёрного экрана', chapter: 2 },
  B05: { name: 'Установил', description: 'Правильная команда установки Claude Code', chapter: 2 },
  B06: { name: 'Заплатил по-белому', description: 'Pyypl, не перекуп', chapter: 2 },
  B07: { name: 'Прочитал 80 страниц за 12 минут', description: 'Тулы, не агенты', chapter: 3 },
  B08: { name: 'Знаю когда звать', description: 'Дошёл до видеозвонка с Тимом', chapter: 3 },
  B09: { name: 'Прошёл всю неделю', description: 'Закрыл Главу 3 на 100% XP', chapter: 3 },
};

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    // Migrate if structure changed
    return { ...DEFAULT_STATE, ...parsed, chapters: { ...DEFAULT_STATE.chapters, ...(parsed.chapters || {}) } };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save progress:', e);
  }
}

export function resetState() {
  // Keep badges and highScore for replay value
  const current = loadState();
  const fresh = {
    ...DEFAULT_STATE,
    badges: current.badges,
    highScore: current.highScore,
    audioMuted: current.audioMuted,
    reducedMotion: current.reducedMotion,
  };
  saveState(fresh);
  return fresh;
}

export function applyChoice(state, sceneId, optionIndex, option) {
  const chapterId = sceneId.split('-')[0]; // 'ch1-s2' → 'ch1'
  const chapter = state.chapters[chapterId];
  if (!chapter) return state;

  // Idempotent: same choice doesn't double-count
  if (chapter.choices[sceneId]) return state;

  chapter.choices[sceneId] = { optionIndex, xp: option.xp, verdict: option.verdict };
  chapter.xp += option.xp;

  if (option.badge && !state.badges.includes(option.badge)) {
    state.badges.push(option.badge);
  }

  saveState(state);
  return state;
}

export function completeChapter(state, chapterId) {
  const chapter = state.chapters[chapterId];
  if (!chapter || chapter.completed) return state;

  chapter.completed = true;
  state.currentChapter = chapterId;

  // Total XP for high-score (sum across completed chapters)
  const totalXP = Object.values(state.chapters)
    .filter((c) => c.completed)
    .reduce((sum, c) => sum + c.xp, 0);
  state.highScore = Math.max(state.highScore, totalXP);

  // Final badge: 100% XP across all 3 chapters
  if (chapterId === 'ch3' && allChaptersFullXP(state) && !state.badges.includes('B09')) {
    state.badges.push('B09');
  }

  saveState(state);
  syncCompletionToBackend(chapterId, chapter.xp, chapter.maxXP);
  return state;
}

function allChaptersFullXP(state) {
  return ['ch1', 'ch2', 'ch3'].every((id) => {
    const c = state.chapters[id];
    return c && c.xp >= c.maxXP;
  });
}

export function getStarsForChapter(state, chapterId) {
  const chapter = state.chapters[chapterId];
  if (!chapter || chapter.maxXP === 0) return 0;
  const pct = chapter.xp / chapter.maxXP;
  if (pct >= 0.9) return 3;
  if (pct >= 0.6) return 2;
  if (pct >= 0.3) return 1;
  return 0;
}

export function getBadgeMeta(badgeId) {
  return BADGES[badgeId] || null;
}

export function getNewBadgesForChapter(state, chapterId) {
  return state.badges.filter((bid) => BADGES[bid]?.chapter === parseInt(chapterId.replace('ch', ''), 10));
}

// ===== Backend sync =====

function getInitData() {
  // Telegram WebApp initData (validated server-side)
  if (window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData;
  }
  return '';
}

async function syncCompletionToBackend(chapterId, xp, maxXP) {
  const initData = getInitData();
  const stars = (() => {
    const pct = xp / maxXP;
    if (pct >= 0.9) return 3;
    if (pct >= 0.6) return 2;
    if (pct >= 0.3) return 1;
    return 0;
  })();
  try {
    const res = await fetch(apiUrl('/api/cta-click'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initData,
        module_slug: `game-${chapterId}`,
        cta_type: `game_completed_${chapterId}_${stars}stars`,
      }),
    });
    if (!res.ok) console.warn('Sync failed:', res.status);
  } catch (e) {
    console.warn('Sync error:', e);
  }
}

export async function trackCertificateCTA(buttonType) {
  // buttonType: 'contact_tim' | 'share_certificate' | 'replay'
  const initData = getInitData();
  try {
    await fetch(apiUrl('/api/cta-click'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initData,
        module_slug: 'game-final',
        cta_type: `game_${buttonType}`,
      }),
    });
  } catch (e) {
    console.warn('CTA tracking error:', e);
  }
}

export { BADGES, DEFAULT_STATE };
