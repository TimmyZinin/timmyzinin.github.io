/* Marina i18n runtime — SPRINT 49
 * Loads ru/en/tr/pt locale dictionaries via separate <script> tags (window.MARINA_I18N_*)
 * or via fetch when locale files are JSON.
 *
 * Public API: window.MarinaI18n
 *   - t(key, vars)      → string with {var} interpolation, fallback chain active→en→ru
 *   - tArray(key)       → array (for random-pick text banks)
 *   - tPick(key)        → random item from array
 *   - tPlural(key, n)   → Intl.PluralRules-aware string (key.one/few/many/other)
 *   - init(opts)        → loads locale data, sets active language, applies DOM swap
 *   - setLang(lang)     → persists + reapplies, fires 'marina:langchange' event
 *   - getLang()         → current locale
 *   - detectSystem()    → maps navigator.language → ru|en|tr|pt
 *
 * Storage: localStorage['marina-fire:lang'] (sibling of state, not part of save)
 * Resolution priority: URL ?lang= > localStorage > navigator > 'en' fallback
 */

(function () {
  'use strict';

  var LANG_KEY = 'marina-fire:lang';
  var SUPPORTED = ['ru', 'en', 'tr', 'pt'];
  var FALLBACK_CHAIN = ['en', 'ru'];
  var _lang = null;
  var _dicts = {}; // { ru: {...}, en: {...}, tr: {...}, pt: {...} }
  var _warned = {}; // dedup [i18n-miss] warnings
  var _ready = false;

  function resolve(dict, key) {
    if (!dict) return undefined;
    var parts = key.split('.');
    var cur = dict;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null || typeof cur !== 'object') return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function interpolate(str, vars) {
    if (!vars || typeof str !== 'string') return str;
    return str.replace(/\{(\w+)\}/g, function (_, k) {
      return vars[k] != null ? vars[k] : '{' + k + '}';
    });
  }

  function t(key, vars) {
    var v = resolve(_dicts[_lang], key);
    if (v === undefined) {
      for (var i = 0; i < FALLBACK_CHAIN.length && v === undefined; i++) {
        if (FALLBACK_CHAIN[i] !== _lang) v = resolve(_dicts[FALLBACK_CHAIN[i]], key);
      }
    }
    if (v === undefined) {
      if (!_warned[key]) {
        try { console.warn('[i18n-miss]', _lang, key); } catch (e) {}
        _warned[key] = 1;
      }
      return '[MISSING:' + key + ']';
    }
    return typeof v === 'string' ? interpolate(v, vars) : v;
  }

  function tArray(key) {
    var v = t(key);
    if (Array.isArray(v)) return v;
    if (typeof v === 'string' && v.indexOf('[MISSING:') === 0) return [v];
    return [v];
  }

  function tPick(key) {
    var arr = tArray(key);
    if (!arr || !arr.length) return '[MISSING:' + key + ']';
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function tPlural(key, n) {
    var rules;
    try {
      rules = new Intl.PluralRules(_lang);
    } catch (e) {
      rules = null;
    }
    var cat = rules ? rules.select(n) : (n === 1 ? 'one' : 'other');
    var v = resolve(_dicts[_lang], key + '.' + cat);
    if (v === undefined) v = resolve(_dicts[_lang], key + '.other');
    if (v === undefined) {
      for (var i = 0; i < FALLBACK_CHAIN.length && v === undefined; i++) {
        v = resolve(_dicts[FALLBACK_CHAIN[i]], key + '.' + cat) ||
            resolve(_dicts[FALLBACK_CHAIN[i]], key + '.other');
      }
    }
    if (v === undefined) return '[MISSING:' + key + '.' + cat + ']';
    return interpolate(v, { n: n });
  }

  function detectSystem() {
    var nav = ((typeof navigator !== 'undefined' && navigator.language) || 'en').toLowerCase();
    if (/^ru|^uk|^be|^kk/.test(nav)) return 'ru';
    if (/^tr/.test(nav)) return 'tr';
    if (/^pt/.test(nav)) return 'pt';
    if (/^en/.test(nav)) return 'en';
    return 'en';
  }

  function readUrlLang() {
    try {
      var url = new URL(window.location.href);
      var l = url.searchParams.get('lang');
      if (l && SUPPORTED.indexOf(l) !== -1) return l;
    } catch (e) {}
    return null;
  }

  function readStoredLang() {
    try {
      var l = localStorage.getItem(LANG_KEY);
      if (l && SUPPORTED.indexOf(l) !== -1) return l;
    } catch (e) {}
    return null;
  }

  function persistLang(lang) {
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
  }

  function applyDomSwap() {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = _lang || 'ru';
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var key = el.getAttribute('data-i18n');
      if (!key) continue;
      var val = t(key);
      if (typeof val === 'string') el.textContent = val;
    }
    var attrs = document.querySelectorAll('[data-i18n-attr]');
    for (var j = 0; j < attrs.length; j++) {
      var ae = attrs[j];
      // format: data-i18n-attr="title:key.path,placeholder:other.key"
      var spec = ae.getAttribute('data-i18n-attr');
      if (!spec) continue;
      var pairs = spec.split(',');
      for (var k = 0; k < pairs.length; k++) {
        var pair = pairs[k].split(':');
        if (pair.length !== 2) continue;
        var attrName = pair[0].trim();
        var attrKey = pair[1].trim();
        ae.setAttribute(attrName, t(attrKey));
      }
    }
  }

  function setLang(lang) {
    if (SUPPORTED.indexOf(lang) === -1) lang = 'en';
    _lang = lang;
    persistLang(lang);
    applyDomSwap();
    try {
      window.dispatchEvent(new CustomEvent('marina:langchange', { detail: { lang: lang } }));
    } catch (e) {}
  }

  function loadFromGlobals() {
    // expects window.MARINA_I18N_RU, MARINA_I18N_EN, MARINA_I18N_TR, MARINA_I18N_PT
    if (typeof window.MARINA_I18N_RU !== 'undefined') _dicts.ru = window.MARINA_I18N_RU;
    if (typeof window.MARINA_I18N_EN !== 'undefined') _dicts.en = window.MARINA_I18N_EN;
    if (typeof window.MARINA_I18N_TR !== 'undefined') _dicts.tr = window.MARINA_I18N_TR;
    if (typeof window.MARINA_I18N_PT !== 'undefined') _dicts.pt = window.MARINA_I18N_PT;
  }

  function loadFromFetch(callback) {
    var loaded = 0;
    var total = SUPPORTED.length;
    // Cache-bust via window.MARINA_I18N_VERSION (set by host page) or fallback timestamp
    var cacheBust = (typeof window !== 'undefined' && window.MARINA_I18N_VERSION) || '2.10.4';
    SUPPORTED.forEach(function (lang) {
      var url = 'i18n/' + lang + '.json?v=' + cacheBust;
      try {
        fetch(url, { cache: 'default' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (data) {
            if (data) _dicts[lang] = data;
            loaded++;
            if (loaded === total && callback) callback();
          })
          .catch(function () {
            loaded++;
            if (loaded === total && callback) callback();
          });
      } catch (e) {
        loaded++;
        if (loaded === total && callback) callback();
      }
    });
  }

  function init(opts) {
    opts = opts || {};
    var autodetect = opts.autodetect !== false;
    var onReady = opts.onReady || null;

    var resolved = readUrlLang() || readStoredLang() || (autodetect ? detectSystem() : 'en');
    _lang = resolved;

    // Try globals first (synchronous)
    loadFromGlobals();
    var hasAny = Object.keys(_dicts).length > 0;

    var finalize = function () {
      _ready = true;
      // Persist resolved lang only if it came from URL or autodetect (not stored)
      if (!readStoredLang()) persistLang(_lang);
      applyDomSwap();
      if (onReady) onReady();
      try {
        window.dispatchEvent(new CustomEvent('marina:i18nready', { detail: { lang: _lang } }));
      } catch (e) {}
    };

    if (hasAny) {
      finalize();
    } else {
      // Fetch JSON files
      loadFromFetch(finalize);
    }
    return _lang;
  }

  function getLang() { return _lang; }
  function isReady() { return _ready; }
  function getSupported() { return SUPPORTED.slice(); }

  window.MarinaI18n = {
    t: t,
    tArray: tArray,
    tPick: tPick,
    tPlural: tPlural,
    init: init,
    setLang: setLang,
    getLang: getLang,
    isReady: isReady,
    detectSystem: detectSystem,
    getSupported: getSupported,
    LANG_KEY: LANG_KEY
  };
})();
