// engine.js — scene state machine + render
// Координирует сцены, dialogue, choices, progress, audio.

import { Dialogue } from './dialogue.js';
import { Choices } from './choices.js';
import { Audio } from './audio.js';
import {
  loadState,
  saveState,
  resetState,
  applyChoice,
  completeChapter,
  getStarsForChapter,
  getNewBadgesForChapter,
  getBadgeMeta,
  trackCertificateCTA,
  BADGES,
} from './progress.js';
import { chapter1 } from './scenes/chapter1.js';
import { chapter2 } from './scenes/chapter2.js';
import { chapter3 } from './scenes/chapter3.js';
import { showLeadForm } from './leadform.js';

const CHAPTERS = {
  ch1: chapter1,
  ch2: chapter2,
  ch3: chapter3,
};

const FINAL_CHAPTER_ID = 'ch3';

const ASSET_BASE = 'assets';

export class Engine {
  constructor(root) {
    this.root = root;
    this.state = loadState();
    this.audio = new Audio();
    this.audio.setMuted(this.state.audioMuted);
    this.currentChapter = null;
    this.currentScene = null;

    // Detect prefers-reduced-motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.state.reducedMotion = mq.matches;

    this.elements = {
      title: root.querySelector('[data-screen="title"]'),
      scene: root.querySelector('[data-screen="scene"]'),
      chapterEnd: root.querySelector('[data-screen="chapter-end"]'),
      certificate: root.querySelector('[data-screen="certificate"]'),
      bg: root.querySelector('[data-role="bg"]'),
      character: root.querySelector('[data-role="character"]'),
      location: root.querySelector('[data-role="location"]'),
      dialogBox: root.querySelector('[data-role="dialog-box"]'),
      dialogSpeaker: root.querySelector('[data-role="speaker"]'),
      dialogText: root.querySelector('[data-role="text"]'),
      choicesContainer: root.querySelector('[data-role="choices"]'),
      xpBar: root.querySelector('[data-role="xp-fill"]'),
      xpLabel: root.querySelector('[data-role="xp-label"]'),
      chapterLabel: root.querySelector('[data-role="chapter-label"]'),
      muteBtn: root.querySelector('[data-role="mute"]'),
    };

    this.dialogue = new Dialogue(this.elements.dialogBox);
    this.dialogue.setReducedMotion(this.state.reducedMotion);
    this.choices = new Choices(this.elements.choicesContainer, this.audio);
    this.choices.onContinue = () => this.advanceAfterChoice();

    this.bindUI();
    this.showScreen('title');
  }

  bindUI() {
    // Title screen buttons
    const startBtn = this.root.querySelector('[data-action="start"]');
    const continueBtn = this.root.querySelector('[data-action="continue"]');
    const certBtn = this.root.querySelector('[data-action="show-certificate"]');

    if (startBtn) startBtn.addEventListener('click', () => this.startGame());
    if (continueBtn) continueBtn.addEventListener('click', () => this.continueGame());
    if (certBtn) certBtn.addEventListener('click', () => this.showCertificateScreen());

    // Mute button
    if (this.elements.muteBtn) {
      this.updateMuteIcon();
      this.elements.muteBtn.addEventListener('click', () => this.toggleMute());
    }

    // Dialog box tap-to-skip
    if (this.elements.dialogBox) {
      this.elements.dialogBox.addEventListener('click', () => this.handleDialogTap());
    }

    // Show/hide continue button based on save
    if (continueBtn) {
      const hasSave = this.state.currentSceneId && !this.state.completedAt;
      continueBtn.style.display = hasSave ? '' : 'none';
    }
    if (certBtn) {
      certBtn.style.display = this.state.completedAt ? '' : 'none';
    }
  }

  toggleMute() {
    this.state.audioMuted = !this.state.audioMuted;
    this.audio.setMuted(this.state.audioMuted);
    saveState(this.state);
    this.updateMuteIcon();
  }

  updateMuteIcon() {
    if (!this.elements.muteBtn) return;
    this.elements.muteBtn.textContent = this.state.audioMuted ? '🔇' : '🔊';
  }

  async startGame() {
    await this.audio.init();
    this.audio.startAmbient();
    this.state = resetState();
    this.state.startedAt = Date.now();
    this.state.currentChapter = 'ch1';
    saveState(this.state);
    this.loadChapter('ch1');
    this.playScene('ch1-s1');
  }

  async continueGame() {
    await this.audio.init();
    this.audio.startAmbient();
    if (!this.state.currentSceneId) {
      this.startGame();
      return;
    }
    const chapterId = this.state.currentSceneId.split('-')[0];
    this.loadChapter(chapterId);
    this.playScene(this.state.currentSceneId);
  }

  loadChapter(chapterId) {
    const chapter = CHAPTERS[chapterId];
    if (!chapter) {
      console.error(`Chapter ${chapterId} not loaded yet`);
      return;
    }
    this.currentChapter = chapter;
    this.elements.chapterLabel.textContent = `Глава ${chapterId.replace('ch', '')} · ${chapter.subtitle}`;
    this.updateXPBar();
  }

  updateXPBar() {
    if (!this.currentChapter) return;
    const ch = this.state.chapters[this.currentChapter.id];
    const pct = (ch.xp / ch.maxXP) * 100;
    if (this.elements.xpBar) this.elements.xpBar.style.width = `${pct}%`;
    if (this.elements.xpLabel) this.elements.xpLabel.textContent = `XP: ${ch.xp}/${ch.maxXP}`;
  }

  playScene(sceneId) {
    if (sceneId === 'CHAPTER_END') {
      this.endCurrentChapter();
      return;
    }
    const scene = this.currentChapter.scenes.find((s) => s.id === sceneId);
    if (!scene) {
      console.error(`Scene ${sceneId} not found`);
      return;
    }
    this.currentScene = scene;
    this.state.currentSceneId = sceneId;
    saveState(this.state);

    this.showScreen('scene');
    this.renderSceneVisuals(scene);
    this.choices.hide();

    this.dialogIndex = 0;
    this.showNextDialogLine();
  }

  renderSceneVisuals(scene) {
    if (this.elements.bg) {
      this.elements.bg.style.backgroundImage = scene.bg ? `url(${ASSET_BASE}/bg/${scene.bg}.jpg)` : '';
      this.elements.bg.dataset.bgKey = scene.bg || '';
    }
    if (this.elements.character) {
      this.elements.character.style.backgroundImage = scene.character ? `url(${ASSET_BASE}/chars/${scene.character}.jpg)` : '';
      this.elements.character.dataset.charKey = scene.character || '';
    }
    if (this.elements.location) {
      this.elements.location.textContent = scene.location || '';
      this.elements.location.style.display = scene.location ? '' : 'none';
    }
  }

  showNextDialogLine() {
    const lines = this.currentScene.dialog || [];
    if (this.dialogIndex >= lines.length) {
      // All dialog shown — proceed to choice or next scene
      this.afterDialog();
      return;
    }
    const line = lines[this.dialogIndex++];
    this.elements.dialogBox.style.display = '';
    this.dialogue.show(line, () => this.showNextDialogLine());
  }

  handleDialogTap() {
    if (this.choices.container.style.display === 'flex') return; // choices visible — ignore
    this.dialogue.handleTap();
  }

  afterDialog() {
    this.elements.dialogBox.style.display = 'none';
    if (this.currentScene.choice) {
      this.choices.showQuestion(this.currentScene.choice, (idx, option) => {
        this.state = applyChoice(this.state, this.currentScene.id, idx, option);
        this.updateXPBar();
        if (option.badge && this.audio) this.audio.play('badge');
      });
    } else {
      // No choice — auto-advance
      this.advanceToNext();
    }
  }

  advanceAfterChoice() {
    this.choices.hide();
    this.advanceToNext();
  }

  advanceToNext() {
    const next = this.currentScene.next;
    if (!next) {
      this.endCurrentChapter();
      return;
    }
    this.playScene(next);
  }

  endCurrentChapter() {
    const chapterId = this.currentChapter.id;
    this.state = completeChapter(this.state, chapterId);
    this.audio.play('chapterEnd');
    this.showChapterEndScreen(chapterId);
  }

  showChapterEndScreen(chapterId) {
    const stars = getStarsForChapter(this.state, chapterId);
    const newBadges = getNewBadgesForChapter(this.state, chapterId);
    const ch = this.state.chapters[chapterId];
    const nextChapterId = chapterId === 'ch1' ? 'ch2' : chapterId === 'ch2' ? 'ch3' : null;

    const root = this.elements.chapterEnd;
    root.innerHTML = '';

    const title = document.createElement('h2');
    title.textContent = `Глава ${chapterId.replace('ch', '')} завершена`;
    root.appendChild(title);

    const starsEl = document.createElement('div');
    starsEl.className = 'stars';
    starsEl.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    root.appendChild(starsEl);

    const xpEl = document.createElement('div');
    xpEl.className = 'xp-summary';
    xpEl.textContent = `XP: ${ch.xp} / ${ch.maxXP}`;
    root.appendChild(xpEl);

    if (newBadges.length > 0) {
      const badgesTitle = document.createElement('div');
      badgesTitle.className = 'badges-title';
      badgesTitle.textContent = 'Получены ачивки:';
      root.appendChild(badgesTitle);

      const badgesList = document.createElement('div');
      badgesList.className = 'badges-list';
      newBadges.forEach((bid) => {
        const meta = getBadgeMeta(bid);
        if (!meta) return;
        const card = document.createElement('div');
        card.className = 'badge-card';
        card.innerHTML = `<div class="badge-id">${bid}</div><div class="badge-name">${meta.name}</div>`;
        badgesList.appendChild(card);
      });
      root.appendChild(badgesList);
    }

    if (nextChapterId && CHAPTERS[nextChapterId]) {
      const nextLabel = document.createElement('div');
      nextLabel.className = 'next-label';
      nextLabel.textContent = `Следующая глава: «${CHAPTERS[nextChapterId].subtitle}»`;
      root.appendChild(nextLabel);

      const nextBtn = document.createElement('button');
      nextBtn.className = 'btn-primary';
      nextBtn.textContent = '▶ Дальше';
      nextBtn.addEventListener('click', () => {
        this.audio.play('click');
        this.loadChapter(nextChapterId);
        this.playScene(`${nextChapterId}-s1`);
      });
      root.appendChild(nextBtn);
    }

    // Триггер лид-формы — после финальной главы (ч1 в G3-сборке, ч3 после G10)
    const isFinal = chapterId === FINAL_CHAPTER_ID;
    if (isFinal) {
      this.state.completedAt = Date.now();
      saveState(this.state);
      const leadBtn = document.createElement('button');
      leadBtn.className = 'btn-primary';
      leadBtn.textContent = '🎯 Получить разбор от Тима';
      leadBtn.addEventListener('click', async () => {
        this.audio.play('click');
        const result = await showLeadForm({
          source: `game-${chapterId}-final`,
          onComplete: (r) => {
            if (r?.submitted) {
              trackCertificateCTA(`lead_form_submitted_${chapterId}`);
            }
          },
        });
        // После формы — показать сертификат (даже если skip)
        this.showCertificateScreen();
      });
      root.appendChild(leadBtn);

      const certBtn = document.createElement('button');
      certBtn.className = 'btn-secondary';
      certBtn.textContent = '📜 Просто сертификат';
      certBtn.addEventListener('click', () => {
        this.audio.play('click');
        this.showCertificateScreen();
      });
      root.appendChild(certBtn);
    }

    const replayBtn = document.createElement('button');
    replayBtn.className = 'btn-secondary';
    replayBtn.textContent = '↻ Переиграть главу';
    replayBtn.addEventListener('click', () => {
      this.audio.play('click');
      this.replayChapter(chapterId);
    });
    root.appendChild(replayBtn);

    this.showScreen('chapter-end');
  }

  replayChapter(chapterId) {
    const ch = this.state.chapters[chapterId];
    ch.xp = 0;
    ch.completed = false;
    ch.choices = {};
    saveState(this.state);
    this.loadChapter(chapterId);
    this.playScene(`${chapterId}-s1`);
  }

  showCertificateScreen() {
    const root = this.elements.certificate;
    root.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'cert-card';

    const title = document.createElement('h1');
    title.textContent = 'СЕРТИФИКАТ';
    card.appendChild(title);

    const sub = document.createElement('h2');
    sub.textContent = 'AI ДЛЯ ПРЕДПРИНИМАТЕЛЯ';
    card.appendChild(sub);

    const name = document.createElement('div');
    name.className = 'cert-name';
    name.textContent = window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || 'Имя не указано';
    card.appendChild(name);

    const body = document.createElement('div');
    body.className = 'cert-body';
    body.textContent = 'прошёл курс с Понедельника по Пятницу';
    card.appendChild(body);

    const totalStars = ['ch1', 'ch2', 'ch3'].reduce((sum, id) => sum + getStarsForChapter(this.state, id), 0);
    const stars = document.createElement('div');
    stars.className = 'cert-stars';
    stars.textContent = '★'.repeat(totalStars) + '☆'.repeat(9 - totalStars);
    card.appendChild(stars);

    const date = document.createElement('div');
    date.className = 'cert-date';
    date.textContent = new Date().toISOString().slice(0, 10);
    card.appendChild(date);

    const author = document.createElement('div');
    author.className = 'cert-author';
    author.innerHTML = '<img src="../static/branding/tim_bw.jpg" alt="Тим Зинин"><span>Тим Зинин<br>tim.zinin@gmail.com</span>';
    card.appendChild(author);

    root.appendChild(card);

    const ctaBtn = document.createElement('a');
    ctaBtn.className = 'btn-primary cert-cta';
    ctaBtn.textContent = '📞 Записаться на разбор с Тимом';
    ctaBtn.href = 'https://t.me/timzinin';
    ctaBtn.target = '_blank';
    ctaBtn.addEventListener('click', () => {
      trackCertificateCTA('contact_tim');
    });
    root.appendChild(ctaBtn);

    const shareBtn = document.createElement('button');
    shareBtn.className = 'btn-secondary';
    shareBtn.textContent = '📤 Поделиться сертификатом';
    shareBtn.addEventListener('click', () => {
      trackCertificateCTA('share_certificate');
      // html2canvas integration in Sprint G5
      alert('Скоро будет — функция сохранения сертификата в PNG');
    });
    root.appendChild(shareBtn);

    const replayBtn = document.createElement('button');
    replayBtn.className = 'btn-tertiary';
    replayBtn.textContent = '🔁 Начать заново';
    replayBtn.addEventListener('click', () => {
      trackCertificateCTA('replay');
      this.state = resetState();
      this.startGame();
    });
    root.appendChild(replayBtn);

    this.showScreen('certificate');
  }

  showScreen(name) {
    Object.entries(this.elements).forEach(([key, el]) => {
      if (!el) return;
      if (['title', 'scene', 'chapterEnd', 'certificate'].includes(key)) {
        const screenKey = key === 'chapterEnd' ? 'chapter-end' : key;
        el.style.display = (screenKey === name) ? '' : 'none';
      }
    });
  }

  // ===== Test hooks (для skill develop-web-game) =====

  exposeTestHooks() {
    window.render_game_to_text = () => {
      const ch = this.currentChapter ? this.state.chapters[this.currentChapter.id] : null;
      return JSON.stringify({
        screen: this.getCurrentScreen(),
        chapterId: this.currentChapter?.id || null,
        sceneId: this.currentScene?.id || null,
        chapterXP: ch?.xp || 0,
        chapterMaxXP: ch?.maxXP || 0,
        chapterStars: this.currentChapter ? getStarsForChapter(this.state, this.currentChapter.id) : 0,
        badges: [...this.state.badges],
        dialogIndex: this.dialogIndex,
        dialogVisible: this.elements.dialogBox?.style.display !== 'none',
        choicesVisible: this.elements.choicesContainer?.style.display === 'flex',
        choicesState: this.elements.choicesContainer?.dataset.state || '',
        muted: this.state.audioMuted,
        reducedMotion: this.state.reducedMotion,
      });
    };

    window.advanceTime = (ms) => {
      // Skip dialogue animation if running
      if (this.dialogue.isAnimating()) {
        this.dialogue.skipped = true;
      }
    };

    window.gameEngine = this; // for debugging in Sprint G3
  }

  getCurrentScreen() {
    if (this.elements.title?.style.display !== 'none') return 'title';
    if (this.elements.certificate?.style.display !== 'none') return 'certificate';
    if (this.elements.chapterEnd?.style.display !== 'none') return 'chapter-end';
    if (this.elements.scene?.style.display !== 'none') return 'scene';
    return 'unknown';
  }
}
