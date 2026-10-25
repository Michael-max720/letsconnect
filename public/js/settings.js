// public/js/settings.js
// Display, language and region settings. Needs translations.js loaded BEFORE it.
// Saved in localStorage (per device) and applied before the page paints.

const SETTINGS_KEY = 'lc_settings';
let _settings = null;

function detectLanguage() {
  const short = String(navigator.language || 'en').slice(0, 2).toLowerCase();
  const found = LANGUAGES.find((l) => l.code === short && !l.soon && STRINGS[l.code]);
  return found ? found.code : 'en';
}

function defaultSettings() {
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return {
    theme: prefersDark ? 'dark' : 'light',
    brightness: 100,
    fontScale: 100,
    view: 'grid',
    language: detectLanguage(),
    region: 'KE',
  };
}

function loadSettings() {
  if (!_settings) {
    try {
      _settings = { ...defaultSettings(), ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) };
    } catch (err) {
      _settings = defaultSettings();
    }
  }
  return { ..._settings };
}

function applySettings(s) {
  const root = document.documentElement;
  root.setAttribute('data-theme', s.theme);
  root.setAttribute('data-view', s.view);
  root.style.setProperty('--font-scale', s.fontScale / 100);
  // Brightness is a black overlay: 100% = no overlay, 40% = 42% black.
  root.style.setProperty('--dim', (((100 - s.brightness) / 100) * 0.7).toFixed(2));
  // Language: sets the page language and reading direction (Arabic reads right-to-left)
  const lang = LANGUAGES.find((l) => l.code === s.language) || LANGUAGES[0];
  root.setAttribute('lang', lang.code);
  root.setAttribute('dir', lang.dir || 'ltr');
}

function saveSetting(key, value) {
  const s = loadSettings();
  s[key] = value;
  _settings = s;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (err) { /* private mode */ }
  applySettings(s);
  return s;
}

// ---------- translation helpers ----------
// t('ev.found', { n: 5 })  ->  "5 events found" in the chosen language (falls back to English)
function t(key, vars) {
  const lang = loadSettings().language;
  let text = (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;
  if (vars) Object.keys(vars).forEach((k) => { text = text.split('{' + k + '}').join(vars[k]); });
  return text;
}

// Translates static HTML marked with data-i18n, data-i18n-placeholder, data-i18n-aria
function applyTranslations(root) {
  root = root || document;
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
}

// ---------- flags, regions, prices ----------
// Flags are SVG images (flag-icons), because Windows cannot draw flag emoji.
function flag(countryCode) {
  return `<span class="fi fi-${String(countryCode).toLowerCase()}" aria-hidden="true"></span>`;
}

function currentLanguage() {
  return LANGUAGES.find((l) => l.code === loadSettings().language) || LANGUAGES[0];
}
function currentRegion() {
  return REGIONS.find((r) => r.code === loadSettings().region) || REGIONS[0];
}
function regionName(code) {
  try {
    return new Intl.DisplayNames([loadSettings().language, 'en'], { type: 'region' }).of(code);
  } catch (err) {
    return code;
  }
}

// Prices are stored and charged in KES. In other regions we show an approximate
// local amount next to the real KES price.
function formatPrice(kes) {
  const amount = Number(kes);
  const kesText = 'KES ' + amount.toLocaleString('en');
  const region = currentRegion();
  if (region.currency === 'KES') return kesText;
  try {
    const converted = amount * region.perKes;
    const local = new Intl.NumberFormat(loadSettings().language, {
      style: 'currency',
      currency: region.currency,
      maximumFractionDigits: converted >= 100 ? 0 : 2,
    }).format(converted);
    return '≈ ' + local + ' (' + kesText + ')';
  } catch (err) {
    return kesText;
  }
}

// ---------- start-up ----------
applySettings(loadSettings());

(function loadFlagStyles() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/vendor/flags/css/flag-icons.min.css';
  document.head.appendChild(link);
})();

document.addEventListener('DOMContentLoaded', () => applyTranslations());

// Button click feedback: every .btn flashes the "pressed" colour briefly
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn');
  if (!btn) return;
  btn.classList.add('is-clicked');
  setTimeout(() => btn.classList.remove('is-clicked'), 450);
});

// ---------- settings panel ----------
function openSettingsPanel(opener, openSection) {
  if (document.getElementById('settings-panel')) return;
  const lang = currentLanguage();
  const region = currentRegion();

  const languageItems = LANGUAGES.map((l) => `
    <button type="button" class="pick-item" data-lang="${l.code}" ${l.soon ? 'disabled' : ''}>
      ${flag(l.flag)}
      <span class="pick-name">${l.native}<small>${l.english}</small></span>
      ${l.beta ? '<span class="pick-tag">Beta</span>' : ''}${l.soon ? '<span class="pick-tag">Soon</span>' : ''}
    </button>`).join('');

  const regionItems = REGIONS.map((r) => `
    <button type="button" class="pick-item" data-region="${r.code}">
      ${flag(r.code)}
      <span class="pick-name">${regionName(r.code)}<small>${r.currency}</small></span>
    </button>`).join('');

  const overlay = document.createElement('div');
  overlay.id = 'settings-panel';
  overlay.className = 'panel-overlay';
  overlay.innerHTML = `
    <div class="panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div class="panel-head">
        <h2 id="settings-title">${t('set.title')}</h2>
        <button class="icon-btn" id="settings-close" aria-label="${t('set.close')}">&#10005;</button>
      </div>

      <details class="setting picker" id="lang-details">
        <summary><span class="setting-label">${t('set.language')}</span>
          <span class="picker-current">${flag(lang.flag)} ${lang.native}</span></summary>
        <div class="pick-list">${languageItems}</div>
      </details>

      <details class="setting picker" id="region-details">
        <summary><span class="setting-label">${t('set.region')}</span>
          <span class="picker-current">${flag(region.code)} ${regionName(region.code)} · ${region.currency}</span></summary>
        <div class="pick-list">${regionItems}</div>
        <p class="field-hint">${t('set.currencyNote')}</p>
      </details>

      <div class="setting">
        <span class="setting-label">${t('set.theme')}</span>
        <div class="seg" role="group" aria-label="${t('set.theme')}">
          <button class="seg-btn" data-key="theme" data-val="light">${t('set.light')}</button>
          <button class="seg-btn" data-key="theme" data-val="dark">${t('set.dark')}</button>
        </div>
      </div>

      <div class="setting">
        <label class="setting-label" for="brightness-range">${t('set.brightness')} <span id="brightness-val"></span></label>
        <input type="range" id="brightness-range" min="40" max="100" step="5">
      </div>

      <div class="setting">
        <span class="setting-label">${t('set.textSize')}</span>
        <div class="seg" role="group" aria-label="${t('set.textSize')}">
          <button class="seg-btn" data-key="fontScale" data-val="90" aria-label="${t('set.textSize')} 90%">A−</button>
          <button class="seg-btn" data-key="fontScale" data-val="100" aria-label="${t('set.textSize')} 100%">A</button>
          <button class="seg-btn" data-key="fontScale" data-val="120" aria-label="${t('set.textSize')} 120%">A+</button>
          <button class="seg-btn" data-key="fontScale" data-val="140" aria-label="${t('set.textSize')} 140%">A++</button>
        </div>
      </div>

      <div class="setting">
        <span class="setting-label">${t('set.layout')}</span>
        <div class="seg" role="group" aria-label="${t('set.layout')}">
          <button class="seg-btn" data-key="view" data-val="grid">${t('set.grid')}</button>
          <button class="seg-btn" data-key="view" data-val="list">${t('set.list')}</button>
        </div>
      </div>

      <button class="btn btn-outline" id="settings-reset">${t('set.reset')}</button>
    </div>`;
  document.body.appendChild(overlay);

  if (openSection === 'language') overlay.querySelector('#lang-details').open = true;

  const range = overlay.querySelector('#brightness-range');
  const rangeVal = overlay.querySelector('#brightness-val');

  // Highlight whichever options are currently chosen
  function refresh() {
    const cur = loadSettings();
    overlay.querySelectorAll('.seg-btn').forEach((b) => {
      const on = String(cur[b.dataset.key]) === b.dataset.val;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on);
    });
    overlay.querySelectorAll('[data-lang]').forEach((b) => {
      const on = b.dataset.lang === cur.language;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on);
    });
    overlay.querySelectorAll('[data-region]').forEach((b) => {
      const on = b.dataset.region === cur.region;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on);
    });
    range.value = cur.brightness;
    rangeVal.textContent = cur.brightness + '%';
  }
  refresh();

  overlay.querySelectorAll('.seg-btn').forEach((b) => {
    b.addEventListener('click', () => {
      const val = b.dataset.key === 'fontScale' ? Number(b.dataset.val) : b.dataset.val;
      saveSetting(b.dataset.key, val);
      refresh();
    });
  });
  range.addEventListener('input', () => {
    saveSetting('brightness', Number(range.value));
    refresh();
  });

  // Language / region change the text and prices on the page, so the page reloads
  overlay.querySelectorAll('[data-lang]').forEach((b) => {
    b.addEventListener('click', () => { saveSetting('language', b.dataset.lang); window.location.reload(); });
  });
  overlay.querySelectorAll('[data-region]').forEach((b) => {
    b.addEventListener('click', () => { saveSetting('region', b.dataset.region); window.location.reload(); });
  });

  overlay.querySelector('#settings-reset').addEventListener('click', () => {
    localStorage.removeItem(SETTINGS_KEY);
    _settings = null;
    window.location.reload();
  });

  // Closing: X button, click outside the panel, or Escape. Focus returns to the opener.
  function close() {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    if (opener) opener.focus();
  }
  function onKey(e) { if (e.key === 'Escape') close(); }
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('#settings-close').addEventListener('click', close);
  overlay.querySelector('#settings-close').focus();
}