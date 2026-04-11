# «Марина в огне»

Браузерная текстовая игра про первые дни фаундера контент-студии. Лид-магнит для консультаций Тима Зинина.

**Live:** https://timzinin.com/marina/

## О проекте

«Марина в огне» — это fork [A Dark Room](https://github.com/doublespeakgames/adarkroom) (Michael Townsend / Doublespeak Games, MPL-2.0), переработанный под narrative «жизни фаундера» с встроенной механикой лидогенерации.

v1a содержит:
- 2 акта: пустой кабинет → первые заказы
- 3 ресурса: часы (бюджет дня), лиды (прогрессия), энергия (burnout pool)
- 1 сценарная встреча (Тим, открывает action «rest»)
- 1 финальный экран с формой обратной связи
- Ориентировочное время прохождения: 8–15 минут

## Стек

- Vanilla JS + jQuery 1.10 (наследуется от A Dark Room)
- Zero build step
- GitHub Pages-compatible
- localStorage save state (key: `marina-fire:v1:state`)
- Lead submission через FastAPI proxy `https://marshall.timzinin.com/quest-api/lead`

## Лицензия

Mozilla Public License 2.0 — см. [LICENSE.md](LICENSE.md) и [NOTICE](NOTICE).

**Важно:** это модифицированное произведение. Модифицированные файлы помечены заголовком со ссылкой на MPL 2.0. Исходный код всех модификаций доступен в этом публичном репозитории.

Audio assets оригинального A Dark Room **удалены** из этого fork'а (неясные права на музыкальные композиции). v1a проигрывается в тишине.

## Credit

Спасибо Michael Townsend и Doublespeak Games за A Dark Room — проверенную временем минималистичную engine.

## Development

```bash
git clone https://github.com/TimmyZinin/marina-v-ogne.git
cd marina-v-ogne
python3 -m http.server 8080
# open http://localhost:8080/
```

## QA matrix (v1a)

- Chrome latest (desktop)
- Safari latest (desktop + iOS)
- Firefox latest (desktop)

jQuery 1.10 (2013) считается unsupported upstream, но рабочим в современных браузерах. При breakage — открывайте issue.
