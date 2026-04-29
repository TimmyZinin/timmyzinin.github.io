# Sergey's Run to 1 Billion — Game Design Document

> Лид-магнит-игра, расширение pitch-сайта `timzinin.com/sergey-marketplace/`. 8-bit pixel runner о пути YouTravel.me от 350M к 1B ₽ выручки.

**Издание 01 · ZININ × YOUTRAVEL · 2026**

---

## 1. Концепт

Игрок управляет Сергеем Пахомовым (фаундером YouTravel.me) и за 7 коротких уровней проводит компанию от 350 миллионов до 1 миллиарда рублей выручки. Каждый уровень — это один из 7 фиксов из стратегического pitch-документа Тима Зинина. Финальный босс — Трипстер.

Игра — продолжение разговора. Сергей открывает ссылку Тима, читает стратегию, а затем играет в собственную миссию. Геймификация работы фаундера: «ваш путь к миллиарду — это семь левелов, не одна кнопка».

### Целевая аудитория
- **Primary:** Сергей Пахомов, фаундер YouTravel.me — единственный человек, чьё мнение здесь имеет значение
- **Secondary:** травел-фаундеры/маркетплейсы, кто получит ссылку через сарафан
- **Возраст:** 30-45, технологически грамотные, играли в Mario/Sonic в детстве

### Tone & Voice
- Русский язык
- Charming, slightly cheeky, but smart — не пародия, не стёб над Сергеем
- Player IS Sergey. Игра уважительна к фаундеру, но честна про дыры в бизнесе

### Платформа
- Web, single-file HTML, открывается в браузере без установки
- Деплой: `https://timzinin.com/sergey-marketplace/game/`
- Контролы: клавиатура (WASD/стрелки + пробел) + touch на мобильных

---

## 2. Mechanics

### Core loop
Side-scrolling auto-runner. Сергей бежит вправо, игрок управляет прыжками и таймингом. Собирает ₽-монеты (= выручка), избегает препятствий (= проблемы бизнеса). После каждого уровня — карточка с заработанной суммой и накопленным итогом.

### Controls
| Action | Keyboard | Touch |
|---|---|---|
| Jump | Space / W / ↑ | Tap "↑" button |
| Move (limited) | A/D / ←/→ | Left/right pads |
| Pause | P / Esc | Pause icon |

### Player character — Сергей
- 16×24 px спрайт
- Синий пиджак, галстук, лёгкая щетина — читается как «фаундер»
- 3 жизни (сердечки). 3 удара = game over с надписью «ROI negative»
- Анимации: idle (2 frames), run (4 frames), jump (1 frame), hurt (flash)

### Collectibles
| Item | Value | Visual |
|---|---|---|
| ₽ coin (basic) | 1 000 ₽ | Cream coin with ₽ glyph, 4-frame rotation |
| ₽ coin (silver) | 10 000 ₽ | Larger, cream-ochre |
| ₽ coin (gold) | 100 000 ₽ | Ochre, glowing |
| Premium gem | 200 000 ₽ | Oxblood diamond (only L3) |
| Heart | +1 life (max 3) | Pixel heart, oxblood |
| AUTHOR power-up | 5s super-speed + invuln | Yulia silhouette icon |
| Travel Club badge | 10s 2× coins | Cream badge with ★ |

### Hazards
| Obstacle | Behaviour | Damage |
|---|---|---|
| Tripster bird | Flies horizontal at head height | -1 HP |
| CAC monster | Ground monster, drains ₽ on touch (-50k) | -1 HP |
| SEO wall | Static spike wall, must jump | -1 HP |
| Ad billboard | Static, fills coin slot if missed | block coin |
| Tripster boss | Final boss, throws ad-projectiles | -1 HP per hit |

### Win/Lose
- **Win:** добежать до конца уровня 7 (Listing Quality / Tripster boss). Total ≥ 1 000 000 000 ₽ → endings card «1 МИЛЛИАРД ₽ ДОСТИГНУТ»
- **Lose:** 3 удара принято или упал в пропасть → карточка «ROI negative — попробуй ещё раз», retry уровня

---

## 3. Levels (7 коротких, ~30-45 секунд каждый)

Каждый уровень = один из 7 фиксов. Бэкграунд, музыка и геймплейный твист уникальны.

### Level 1 — «Focus» (ЦА: женщины 25-45)
- **Биом:** городской парк, силуэты-болельщицы на фоне
- **Геймплей:** узкий коридор, обычные монеты, обучение прыжкам
- **Цель:** ~5 000 000 ₽ за уровень
- **Темп музыки:** 110 BPM

### Level 2 — «Repeat Rate» (8% → 22%)
- **Биом:** улица с витринами авторских туров
- **Геймплей:** появляется «второй клиент» — призрачный спутник, бегущий следом и удваивающий монеты
- **Цель:** ~12 000 000 ₽
- **Tempo:** 115 BPM

### Level 3 — «Premium Tier» (AOV 200-400k)
- **Биом:** горный кулуар, премиум-вид
- **Геймплей:** мало монет, но крупные (Premium gems по 200k)
- **Цель:** ~25 000 000 ₽
- **Tempo:** 100 BPM, минорная подложка

### Level 4 — «B2B Incentive»
- **Биом:** силуэты бизнес-центров (Tinkoff, Avito, Yandex стилизованно)
- **Геймплей:** кластеры монет (корпоративные сделки), но между ними длинные провалы
- **Цель:** ~80 000 000 ₽
- **Tempo:** 120 BPM, marching feel

### Level 5 — «International»
- **Биом:** море, пальмы, силуэты флагов (TR, IL, AE, GE, DE)
- **Геймплей:** длинные прыжки между плавающими платформами
- **Цель:** ~150 000 000 ₽
- **Tempo:** 105 BPM, world-music feel (псевдо-восточная гамма)

### Level 6 — «Curator» (лёгкость выбора)
- **Биом:** кабинет Юли, 3 двери в каждом блоке
- **Геймплей:** каждые ~5 секунд игрок видит развилку из 3 путей. Один с большими монетами, два с препятствиями. Если выбрал правильно → bonus
- **Цель:** ~250 000 000 ₽
- **Tempo:** 95 BPM, intimate feel

### Level 7 — «Listing Quality» (FINAL BOSS: TRIPSTER)
- **Биом:** ринг, тёмный задник, спот-лайт
- **Геймплей:**
  - Tripster (большая красная птица, 32×32) делает 3 атаки: horizontal dive, ad-projectile, screen-flash
  - Игрок собирает «Chat with Author» tokens (cream chat bubbles), которые наносят урон Трипстеру
  - 5 токенов = победа
- **Цель:** добить до 1 000 000 000 ₽
- **Tempo:** 130 BPM, intense

### Math балансировки
| Уровень | Старт ₽ | Конец ₽ | Per coin avg |
|---|---|---|---|
| 1 | 350M | 355M | 1k |
| 2 | 355M | 367M | 2k (×2 boost) |
| 3 | 367M | 392M | 50k+ |
| 4 | 392M | 472M | 5k cluster |
| 5 | 472M | 622M | 10k+ |
| 6 | 622M | 872M | curator bonus 50k |
| 7 | 872M | **1 000M+** | boss tokens 25M |

---

## 4. Art Direction

### Visual style
- **8-bit pixel art**, NES-era constraints with modern palette
- Internal render: 320×180, scaled 4× to 1280×720 via `image-rendering: pixelated`
- Все спрайты рисуются программно через `ctx.fillRect` (нет внешних PNG)

### Palette (16 colors max, brand-aligned)
Прямой match с pitch-сайтом (`oklch` → hex approximations):

| Slot | Hex | Use |
|---|---|---|
| paper | `#f4ecdc` | sky/HUD background |
| paper-2 | `#e8dec6` | UI panels |
| ink | `#1a1410` | text, outlines |
| ink-soft | `#3d342c` | shadows |
| oxblood | `#7a2418` | Tripster, hazards, hearts |
| burgundy | `#4f1a14` | dark accents |
| ochre | `#c89a3e` | gold coins, sun |
| moss | `#5a7a3a` | grass, foliage |
| sky-1 | `#a8c4d4` | far parallax |
| sky-2 | `#d4c8a8` | mid parallax |
| sergey-blue | `#3a4878` | Sergey suit |
| sergey-skin | `#e8c4a0` | Sergey face |
| coin-cream | `#f0e0a8` | basic coin |
| coin-gold | `#e8b048` | gold coin |
| white | `#fafafa` | highlights |
| black | `#0a0806` | deep shadow |

### Background parallax (3 layers)
1. **Far:** mountains/skyline silhouettes (slowest, 0.2× scroll)
2. **Mid:** hills/buildings (0.5× scroll)
3. **Near:** ground tiles + foreground decoration (1× scroll)

### Sergey character
- Body: blue jacket (sergey-blue), tie (oxblood)
- Head: skin colour + dark hair, лёгкая щетина (single dark pixel under nose for read)
- Total 16×24 px

### HUD
- Top-left: ₽ counter (large pixel font, ochre)
- Top-center: level name in Russian
- Top-right: 3 hearts
- Bottom: subtle «ZININ × YOUTRAVEL — Издание 01» at 50% opacity

---

## 5. Audio

### Music
- **Web Audio API** synthesis: square + triangle + noise oscillators
- Background loops per level, 8-16 bars
- C major / A minor / D dorian (level dependent)
- Channels:
  - Square 1 — lead melody
  - Square 2 — harmony
  - Triangle — bass
  - Noise — drums

### SFX
| Event | Sound |
|---|---|
| Coin pickup | C6 → E6 blip, 80ms |
| Jump | A4 → C5 rising, 100ms |
| Hit | E2 noise burst, 200ms |
| Power-up | Major arpeggio C-E-G-C, 300ms |
| Level complete | 4-note victory: G-C-E-G, 600ms |
| Game over | Descending C-A-F-D, 800ms |
| Win (1B) | Full fanfare, 2s |

Все звуки генерируются runtime через `AudioContext`. Нет внешних файлов.

---

## 6. Technical constraints

- **Single file:** `index.html` — HTML + inline CSS + inline JS
- **No frameworks:** vanilla JS only
- **No build step:** opens directly in browser
- **60 FPS:** `requestAnimationFrame` with delta-time
- **Mobile:** touch overlay при viewport <768px
- **Asset budget:** all sprites generated programmatically; no external images
- **File size goal:** <120 KB minified
- **Browser support:** Chrome/Safari/Firefox latest 2 versions

### Analytics
- Umami: `b00703aa-b94d-457b-8071-46d9ce71968a`
- Custom events:
  - `game_start`
  - `level_complete_{1..7}`
  - `game_over_{level}`
  - `game_win` (1B reached)
  - `cta_back_to_strategy`

### Performance
- Sprite atlases drawn once to offscreen canvases, reused
- Object pooling for coins/projectiles
- Cap delta-time at 100ms (prevent tunnelling после tab switch)

---

## 7. Future expansion (out of scope for v1)

- Leaderboard (top 100 fastest 1B runs) → требует backend
- Multiplayer co-op: Сергей + Юля в split screen
- Mobile app wrapper (Cordova/Capacitor)
- Расширение до 12 уровней с новыми темами (Listing Quality, Brand Voice, Tech Stack)
- Personalized version: после загрузки CSV с метриками клиента — генерация уровней под их данные
- NFT-style «Founder card» по итогам прохождения (joke, but trackable)

---

## 8. Acceptance criteria (v1)

- [ ] Single file `game/index.html` opens in Chrome offline
- [ ] All 7 levels playable end-to-end
- [ ] Win condition reachable (1B ₽)
- [ ] Game over → retry без перезагрузки
- [ ] Mobile touch controls работают на iPhone Safari
- [ ] Audio: chiptune music + 7 SFX events
- [ ] Final win card содержит CTA-link обратно на `/sergey-marketplace/`
- [ ] Umami скрипт подключён и трекает game_start
- [ ] OG meta + canonical настроены
- [ ] Всё на русском (HUD, level names, dialogues, CTAs)

---

*GDD v1.0 — Тим Зинин, 29 апреля 2026.*
