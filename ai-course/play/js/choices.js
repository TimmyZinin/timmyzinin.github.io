// choices.js — рендер вариантов выбора и feedback
// Вызывается из engine когда у сцены есть `choice`.

export class Choices {
  constructor(container, audio) {
    this.container = container;
    this.audio = audio;
    this.onSelect = null;
    this.onContinue = null;
  }

  // Show the question + 2-3 option buttons.
  showQuestion(choice, onSelect) {
    this.onSelect = onSelect;
    this.container.innerHTML = '';
    this.container.dataset.state = 'question';

    const card = document.createElement('div');
    card.className = 'choice-card';

    const q = document.createElement('div');
    q.className = 'choice-question';
    q.textContent = choice.question;
    card.appendChild(q);

    const list = document.createElement('div');
    list.className = 'choice-options';

    choice.options.forEach((option, idx) => {
      const btn = document.createElement('button');
      btn.className = 'choice-option';
      btn.type = 'button';
      btn.textContent = option.label;
      btn.dataset.index = idx;
      btn.addEventListener('click', () => this.handleSelect(idx, option, btn));
      list.appendChild(btn);
    });

    card.appendChild(list);
    this.container.appendChild(card);
    this.container.style.display = 'flex';
  }

  handleSelect(idx, option, btn) {
    // Mark selected, disable others
    const allBtns = this.container.querySelectorAll('.choice-option');
    allBtns.forEach((b) => {
      b.disabled = true;
      if (b === btn) b.classList.add('is-selected');
    });

    // Play SFX
    if (this.audio) {
      if (option.verdict === 'correct') this.audio.play('correct');
      else if (option.verdict === 'wrong') this.audio.play('wrong');
      else this.audio.play('click');
    }

    // Callback to engine to update state
    if (this.onSelect) this.onSelect(idx, option);

    // Show feedback
    setTimeout(() => this.showFeedback(option), 350);
  }

  showFeedback(option) {
    this.container.dataset.state = 'feedback';

    const fb = document.createElement('div');
    fb.className = `choice-feedback choice-feedback--${option.verdict}`;

    const icon = document.createElement('span');
    icon.className = 'choice-feedback-icon';
    icon.textContent = option.verdict === 'correct' ? '✓' : option.verdict === 'wrong' ? '✗' : '△';
    fb.appendChild(icon);

    const text = document.createElement('div');
    text.className = 'choice-feedback-text';
    text.textContent = option.feedback;
    fb.appendChild(text);

    if (option.lessonRef) {
      const lessonLink = document.createElement('div');
      lessonLink.className = 'choice-lesson-ref';
      lessonLink.textContent = `Это разбирали в Уроке ${option.lessonRef.module}.${option.lessonRef.lesson}: «${option.lessonRef.title}»`;
      fb.appendChild(lessonLink);
    }

    if (option.xp > 0) {
      const xpBadge = document.createElement('span');
      xpBadge.className = 'choice-xp';
      xpBadge.textContent = `+${option.xp} XP`;
      fb.appendChild(xpBadge);
    }

    this.container.appendChild(fb);

    const nextBtn = document.createElement('button');
    nextBtn.className = 'choice-next';
    nextBtn.type = 'button';
    nextBtn.textContent = 'Дальше →';
    nextBtn.addEventListener('click', () => {
      if (this.audio) this.audio.play('click');
      if (this.onContinue) this.onContinue();
    });
    this.container.appendChild(nextBtn);
  }

  hide() {
    this.container.style.display = 'none';
    this.container.innerHTML = '';
    this.container.dataset.state = '';
  }
}
