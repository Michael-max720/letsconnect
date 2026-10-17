// public/js/settings.js
// Display settings (theme, brightness, text size, grid/list view).
// Saved in localStorage so they persist per device, and applied BEFORE the
// page paints (this file is loaded in <head>) to avoid a light-mode flash.

const SETTINGS_KEY = 'lc_settings';

function defaultSettings() {
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return { theme: prefersDark ? 'dark' : 'light', brightness: 100, fontScale: 100, view: 'grid' };
}

function loadSettings() {
  try {
    return { ...defaultSettings(), ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) };
  } catch (err) {
    return defaultSettings();
  }
}

function applySettings(s) {
  const root = document.documentElement;
  root.setAttribute('data-theme', s.theme);
  root.setAttribute('data-view', s.view);
  root.style.setProperty('--font-scale', s.fontScale / 100);
  // Brightness is a black overlay: 100% = no overlay, 40% = 42% black.
  root.style.setProperty('--dim', (((100 - s.brightness) / 100) * 0.7).toFixed(2));
}

function saveSetting(key, value) {
  const s = loadSettings();
  s[key] = value;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (err) { /* private mode */ }
  applySettings(s);
  return s;
}

applySettings(loadSettings());

// --- Button click feedback: every .btn flashes the "pressed" colour briefly ---
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn');
  if (!btn) return;
  btn.classList.add('is-clicked');
  setTimeout(() => btn.classList.remove('is-clicked'), 450);
});

// --- Settings panel (opened from the nav) ---
function openSettingsPanel(opener) {
  if (document.getElementById('settings-panel')) return;
  const s = loadSettings();

  const overlay = document.createElement('div');
  overlay.id = 'settings-panel';
  overlay.className = 'panel-overlay';
  overlay.innerHTML = `
    <div class="panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div class="panel-head">
        <h2 id="settings-title">Display settings</h2>
        <button class="icon-btn" id="settings-close" aria-label="Close settings">&#10005;</button>
      </div>

      <div class="setting">
        <span class="setting-label">Theme</span>
        <div class="seg" role="group" aria-label="Theme">
          <button class="seg-btn" data-key="theme" data-val="light">Light</button>
          <button class="seg-btn" data-key="theme" data-val="dark">Dark</button>
        </div>
      </div>

      <div class="setting">
        <label class="setting-label" for="brightness-range">Brightness <span id="brightness-val"></span></label>
        <input type="range" id="brightness-range" min="40" max="100" step="5">
      </div>

      <div class="setting">
        <span class="setting-label">Text size</span>
        <div class="seg" role="group" aria-label="Text size">
          <button class="seg-btn" data-key="fontScale" data-val="90">Small</button>
          <button class="seg-btn" data-key="fontScale" data-val="100">Normal</button>
          <button class="seg-btn" data-key="fontScale" data-val="120">Large</button>
          <button class="seg-btn" data-key="fontScale" data-val="140">Extra</button>
        </div>
      </div>

      <div class="setting">
        <span class="setting-label">Event layout</span>
        <div class="seg" role="group" aria-label="Event layout">
          <button class="seg-btn" data-key="view" data-val="grid">Grid</button>
          <button class="seg-btn" data-key="view" data-val="list">List</button>
        </div>
      </div>

      <button class="btn btn-outline" id="settings-reset">Reset to defaults</button>
    </div>`;
  document.body.appendChild(overlay);

  const range = overlay.querySelector('#brightness-range');
  const rangeVal = overlay.querySelector('#brightness-val');

  // Highlight whichever option is currently chosen
  function refresh() {
    const cur = loadSettings();
    overlay.querySelectorAll('.seg-btn').forEach((b) => {
      const on = String(cur[b.dataset.key]) === b.dataset.val;
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
  overlay.querySelector('#settings-reset').addEventListener('click', () => {
    localStorage.removeItem(SETTINGS_KEY);
    applySettings(loadSettings());
    refresh();
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