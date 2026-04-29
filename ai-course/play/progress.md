Original prompt: «делай игру нормальную - опиши как будет выглядтеь все от и до, планчик нахуячь» + «используй /game-development скилл и сделай описание игры и вобще все чтобы было по канонам разработки» + после критики антагонистов («ты предлагаешь курс для интегратора который будет хуесосить интеграторов, в чём логика?») и подтверждения жанра Visual Novel + выбора OpenRouter Gemini 2.5 Flash Image (НЕ Flux), а также позиционирования Тима как «преподаватель + консультант, обучение first».

# Progress (Sprint G3 — Vertical Slice)

## Done
- 7 game-bibles в `docs/GAME-*.md` (G1)
- Wireframes + text-prototype Главы 1 (G2)
- `js/engine.js` — scene state machine с tap-to-skip, render hooks, save/resume
- `js/dialogue.js` — typewriter с tap-to-skip, поддержка mode (inner/tutorial/mentor/ai)
- `js/choices.js` — 2-3 варианта + feedback с урок-ссылкой + XP-плашка
- `js/progress.js` — XP, badges (B01-B09), localStorage `gameProgress.v2`, sync через `/api/cta-click`
- `js/audio.js` — Web Audio с lazy-load, silent fail если SFX-файлы отсутствуют
- `js/scenes/chapter1.js` — все 7 сцен Главы 1 с диалогами и выборами
- `css/game.css` — pop-art Лихтенштейн (cream/navy/red/yellow/gold) + responsive 320-768+ + reduced-motion
- `index.html` — entry-point с screen-router и Telegram WebApp SDK

## TODO для следующего агента
1. Запустить Playwright smoke-тест: `node "$WEB_GAME_CLIENT" --url http://localhost:8000/webapp/game/ --click-selector "[data-action='start']" --iterations 8 --pause-ms 400`
2. Проверить screenshots каждой сцены — нет ли horizontal scroll, всё ли влазит
3. Сгенерировать 5 фонов + 4 персонажа Главы 1 через `scripts/generate_game_assets.py` (OpenRouter Gemini 2.5 Flash Image, **НЕ Flux**). Промпты в `docs/GAME-ART-BIBLE.md`. Стратегия consistency: master-portrait first, потом позы с reference image.
4. /codex-review на js/ + index.html
5. SEC чеклист (5 пунктов) перед deploy
6. Deploy на Contabo VPS 30 (scp + docker compose up)
7. Verify: Тим открывает в TG на телефоне

## Известные ограничения
- Главы 2 и 3 (chapter2.js, chapter3.js) — placeholder в engine.js. Реальные сцены — Sprint G4
- Аудио SFX-файлы пока отсутствуют — игра работает без звука
- Сертификат — базовый layout, html2canvas-экспорт в Sprint G5
- Анимации scene-transition — Sprint G5

## Тех-требования develop-web-game skill
- ✅ `window.render_game_to_text()` экспонирован в engine.exposeTestHooks()
- ✅ `window.advanceTime(ms)` экспонирован (skip dialogue animation)
- ✅ Single canvas-like layout (DOM элементы поверх .scene-bg)
- ✅ Минимум текста на старте (только заголовок + кнопки)
- ✅ Mute toggle visible

## Style-prefix для Gemini генерации (копировать буквально)
```
Pop-art illustration in the style of Roy Lichtenstein.
Halftone Ben-Day dots, thick black outlines (3-4px width),
flat saturated colors, no soft shading, no photorealism, no gradients.
Strict color palette ONLY:
- vibrant red #E63946
- warm cream #FBF8F3
- deep navy #0B1426
- yellow #FFD23F
- gold #C9A75F
Composition: centered subject, clear silhouette readable in black.
No text in image, no logos, no watermarks, no signatures.
```
