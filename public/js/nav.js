// public/js/nav.js
// Builds the site header + navigation on any page that calls renderNav('tabKey').
// Mobile: logo + settings/account on top, icon tab bar at the bottom.
// Desktop: logo left, tabs centred, settings/account right.
// Icons: Bootstrap Icons (MIT licence), embedded as inline SVG so they work offline.

const ICONS = {
  'house': {
    line: '<path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.708L2 8.207V13.5A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V8.207l.646.647a.5.5 0 0 0 .708-.708L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293zM13 7.207V13.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V7.207l5-5z"/>',
    fill: '<path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.708L8 2.207l6.646 6.647a.5.5 0 0 0 .708-.708L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293z"/><path d="m8 3.293 6 6V13.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5V9.293z"/>',
  },
  'person-plus': {
    line: '<path d="M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H1s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C9.516 10.68 8.289 10 6 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/><path fill-rule="evenodd" d="M13.5 5a.5.5 0 0 1 .5.5V7h1.5a.5.5 0 0 1 0 1H14v1.5a.5.5 0 0 1-1 0V8h-1.5a.5.5 0 0 1 0-1H13V5.5a.5.5 0 0 1 .5-.5"/>',
    fill: '<path d="M1 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/><path fill-rule="evenodd" d="M13.5 5a.5.5 0 0 1 .5.5V7h1.5a.5.5 0 0 1 0 1H14v1.5a.5.5 0 0 1-1 0V8h-1.5a.5.5 0 0 1 0-1H13V5.5a.5.5 0 0 1 .5-.5"/>',
  },
  'ticket-perforated': {
    line: '<path d="M4 4.85v.9h1v-.9zm7 0v.9h1v-.9zm-7 1.8v.9h1v-.9zm7 0v.9h1v-.9zm-7 1.8v.9h1v-.9zm7 0v.9h1v-.9zm-7 1.8v.9h1v-.9zm7 0v.9h1v-.9z"/><path d="M1.5 3A1.5 1.5 0 0 0 0 4.5V6a.5.5 0 0 0 .5.5 1.5 1.5 0 1 1 0 3 .5.5 0 0 0-.5.5v1.5A1.5 1.5 0 0 0 1.5 13h13a1.5 1.5 0 0 0 1.5-1.5V10a.5.5 0 0 0-.5-.5 1.5 1.5 0 0 1 0-3A.5.5 0 0 0 16 6V4.5A1.5 1.5 0 0 0 14.5 3zM1 4.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 .5.5v1.05a2.5 2.5 0 0 0 0 4.9v1.05a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-1.05a2.5 2.5 0 0 0 0-4.9z"/>',
    fill: '<path d="M0 4.5A1.5 1.5 0 0 1 1.5 3h13A1.5 1.5 0 0 1 16 4.5V6a.5.5 0 0 1-.5.5 1.5 1.5 0 0 0 0 3 .5.5 0 0 1 .5.5v1.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 11.5V10a.5.5 0 0 1 .5-.5 1.5 1.5 0 1 0 0-3A.5.5 0 0 1 0 6zm4-1v1h1v-1zm1 3v-1H4v1zm7 0v-1h-1v1zm-1-2h1v-1h-1zm-6 3H4v1h1zm7 1v-1h-1v1zm-7 1H4v1h1zm7 1v-1h-1v1zm-8 1v1h1v-1zm7 1h1v-1h-1z"/>',
  },
  'person': {
    line: '<path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z"/>',
    fill: '<path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/>',
  },
  'grid': {
    line: '<path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5z"/>',
    fill: '<path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5z"/>',
  },
  'people': {
    line: '<path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1zm-7.978-1L7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002-.014.002zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4m3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0M6.936 9.28a6 6 0 0 0-1.23-.247A7 7 0 0 0 5 9c-4 0-5 3-5 4q0 1 1 1h4.216A2.24 2.24 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816M4.92 10A5.5 5.5 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275ZM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0m3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4"/>',
    fill: '<path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5.784 6A2.24 2.24 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.3 6.3 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1zM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5"/>',
  },
  'bar-chart-line': {
    line: '<path d="M11 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h1V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7h1zm1 12h2V2h-2zm-3 0V7H7v7zm-5 0v-3H2v3z"/>',
    fill: '<path d="M11 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h1V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7h1z"/>',
  },
  'qr-code-scan': {
    line: '<path d="M0 .5A.5.5 0 0 1 .5 0h3a.5.5 0 0 1 0 1H1v2.5a.5.5 0 0 1-1 0zm12 0a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0V1h-2.5a.5.5 0 0 1-.5-.5M.5 12a.5.5 0 0 1 .5.5V15h2.5a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5v-3a.5.5 0 0 1 .5-.5m15 0a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1 0-1H15v-2.5a.5.5 0 0 1 .5-.5M4 4h1v1H4z"/><path d="M7 2H2v5h5zM3 3h3v3H3zm2 8H4v1h1z"/><path d="M7 9H2v5h5zm-4 1h3v3H3zm8-6h1v1h-1z"/><path d="M9 2h5v5H9zm1 1v3h3V3zM8 8v2h1v1H8v1h2v-2h1v2h1v-1h2v-1h-3V8zm2 2H9V9h1zm4 2h-1v1h-2v1h3zm-4 2v-1H8v1z"/><path d="M12 9h2V8h-2z"/>',
  },
  'sliders': {
    line: '<path fill-rule="evenodd" d="M11.5 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M9.05 3a2.5 2.5 0 0 1 4.9 0H16v1h-2.05a2.5 2.5 0 0 1-4.9 0H0V3zM4.5 7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M2.05 8a2.5 2.5 0 0 1 4.9 0H16v1H6.95a2.5 2.5 0 0 1-4.9 0H0V8zm9.45 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m-2.45 1a2.5 2.5 0 0 1 4.9 0H16v1h-2.05a2.5 2.5 0 0 1-4.9 0H0v-1z"/>',
  },
  'box-arrow-right': {
    line: '<path fill-rule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0z"/><path fill-rule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z"/>',
  },
  'box-arrow-in-right': {
    line: '<path fill-rule="evenodd" d="M6 3.5a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 0-1 0v2A1.5 1.5 0 0 0 6.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-8A1.5 1.5 0 0 0 5 3.5v2a.5.5 0 0 0 1 0z"/><path fill-rule="evenodd" d="M11.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H1.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z"/>',
  },
  'bell': {
    line: '<path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2M8 1.918l-.797.161A4 4 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4 4 0 0 0-3.203-3.92zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5 5 0 0 1 13 6c0 .88.32 4.2 1.22 6"/>',
    fill: '<path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2m.995-14.901a1 1 0 1 0-1.99 0A5 5 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901"/>',
  },
    'heart': {
    line: '<path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143q.09.083.176.171a3 3 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15"/>',
    fill: '<path fill-rule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314"/>',
  },
};

// filled = true gives the solid version (used for the active tab)
function icon(name, filled) {
  const set = ICONS[name];
  const body = (filled && set.fill) ? set.fill : set.line;
  return `<svg class="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">${body}</svg>`;
}

// mobileOnly tabs are hidden on desktop (Profile lives in the account menu there)
const NAV_TABS = {
  guest: [
    { key: 'home', labelKey: 'nav.events', icon: 'house', href: '/events.html' },
    { key: 'login', labelKey: 'nav.login', icon: 'box-arrow-in-right', href: '/login.html', mobileOnly: true },
    { key: 'signup', labelKey: 'nav.signup', icon: 'person-plus', href: '/register.html', mobileOnly: true },
  ],
  attendee: [
    { key: 'home', labelKey: 'nav.home', icon: 'house', href: '/events.html' },
    { key: 'saved', labelKey: 'nav.saved', icon: 'heart', href: '/saved.html' },
    { key: 'updates', labelKey: 'nav.updates', icon: 'bell', href: '/updates.html', badge: 'updates-badge' },
    { key: 'tickets', labelKey: 'nav.tickets', icon: 'ticket-perforated', href: '/my-tickets.html' },
    { key: 'profile', labelKey: 'nav.profile', icon: 'person', href: '/profile.html', mobileOnly: true },
  ],
  organiser: [
    { key: 'home', labelKey: 'nav.dashboard', icon: 'grid', href: '/organiser-dashboard.html' },
    { key: 'agents', labelKey: 'nav.agents', icon: 'people', href: '/organiser-agents.html' },
    { key: 'reports', labelKey: 'nav.reports', icon: 'bar-chart-line', href: '/organiser-reports.html' },
    { key: 'profile', labelKey: 'nav.profile', icon: 'person', href: '/profile.html', mobileOnly: true },
  ],
  admin: [
    { key: 'home', labelKey: 'nav.dashboard', icon: 'grid', href: '/admin-dashboard.html' },
    { key: 'profile', labelKey: 'nav.profile', icon: 'person', href: '/profile.html', mobileOnly: true },
  ],
  gate_agent: [
    { key: 'home', labelKey: 'nav.scan', icon: 'qr-code-scan', href: '/gate-scan.html' },
    { key: 'profile', labelKey: 'nav.profile', icon: 'person', href: '/profile.html', mobileOnly: true },
  ],
};

async function renderNav(activeTab) {
  let session = null;
  try {
    session = await api('/auth/me');
  } catch (err) {
    session = null; // visitor not logged in: still show a header so they can browse
  }

  const items = NAV_TABS[session ? session.role : 'guest'] || [];

  // Visitors who sign up or log in from this page come back to it afterwards
  const nextQ = '?next=' + encodeURIComponent(window.location.pathname + window.location.search);

  const tabsHtml = items.map((tab) => {
    const active = tab.key === activeTab;
    const href = (!session && (tab.key === 'login' || tab.key === 'signup')) ? tab.href + nextQ : tab.href;
    return `
    <a href="${href}" class="${active ? 'active' : ''}${tab.mobileOnly ? ' mobile-only' : ''}"
       ${active ? 'aria-current="page"' : ''}>
      <span class="icon-wrap">${icon(tab.icon, active)}${tab.badge ? `<span class="tab-badge" id="${tab.badge}" hidden></span>` : ''}</span><span>${t(tab.labelKey)}</span>
    </a>`;
  }).join('');

  // Name and initial are filled in with textContent below so they can never inject HTML
  const accountHtml = session
    ? `
      <button class="icon-btn" id="account-btn" aria-haspopup="true" aria-expanded="false" aria-label="${t('nav.myProfile')}">
        <span class="avatar-mini" id="avatar-mini"></span>
      </button>
      <div class="account-menu" id="account-menu" role="menu">
        <div class="account-name" id="account-name"></div>
        <a href="/profile.html" role="menuitem">${icon('person')} ${t('nav.myProfile')}</a>
        <button id="logout-link" role="menuitem" class="danger">${icon('box-arrow-right')} ${t('nav.logout')}</button>
      </div>`
    : `<a class="icon-btn login-link" href="/login.html${nextQ}" style="text-decoration:none;">${icon('box-arrow-in-right')}<span>${t('nav.login')}</span></a>
       <a class="btn-pill" href="/register.html${nextQ}">${icon('person-plus')}<span>${t('nav.signup')}</span></a>`;

  const lang = currentLanguage();

  const old = document.getElementById('site-header');
  if (old) old.remove();

  const header = document.createElement('header');
  header.id = 'site-header';
  header.className = 'site-header';
  header.innerHTML = `
    <a class="skip-link" href="#main">${t('nav.skip')}</a>
    <a class="logo" href="/events.html" aria-label="Lets Connect">
      <span class="logo-mark">LC</span><span class="logo-text">Lets Connect</span>
    </a>
    <nav class="main-nav" aria-label="Main">${tabsHtml}</nav>
    <div class="header-actions">
      <button class="icon-btn" id="lang-btn" aria-label="${t('set.language')}: ${lang.native}">
        ${flag(lang.flag)}<span class="lang-code">${lang.code.toUpperCase()}</span>
      </button>
      <button class="icon-btn" id="settings-btn" aria-label="${t('set.title')}">${icon('sliders')}</button>
      ${accountHtml}
    </div>`;
  document.body.prepend(header);
  document.body.classList.add('has-nav');

  // Target for the "skip to main content" link
  const main = document.querySelector('.container');
  if (main && !main.id) main.id = 'main';

  // Settings panel and language picker (both live in settings.js)
  const settingsBtn = document.getElementById('settings-btn');
  settingsBtn.addEventListener('click', () => openSettingsPanel(settingsBtn));
  const langBtn = document.getElementById('lang-btn');
  langBtn.addEventListener('click', () => openSettingsPanel(langBtn, 'language'));

  // Account menu + logout
  if (session) {
    document.getElementById('avatar-mini').textContent = session.name.charAt(0).toUpperCase();
    document.getElementById('account-name').textContent =
      session.username ? `${session.name} (@${session.username})` : session.name;

    const btn = document.getElementById('account-btn');
    const menu = document.getElementById('account-menu');
    const setOpen = (open) => {
      menu.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open);
    };
    btn.addEventListener('click', (e) => { e.stopPropagation(); setOpen(!menu.classList.contains('open')); });
    document.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setOpen(false); btn.focus(); } });

    document.getElementById('logout-link').addEventListener('click', async () => {
      await api('/auth/logout', { method: 'POST' });
      window.location.href = '/login.html';
    });
  }

  // Bell badge: updates from followed organisers that this device has not seen yet
  if (session && session.role === 'attendee' && activeTab !== 'updates') {
    api('/social/feed').then(({ updates }) => {
      const seen = new Date(localStorage.getItem('lc_updates_seen') || 0);
      const unread = updates.filter((u) => new Date(u.created_at) > seen).length;
      const badge = document.getElementById('updates-badge');
      if (badge && unread > 0) {
        badge.textContent = unread > 9 ? '9+' : unread;
        badge.hidden = false;
        badge.closest('a').setAttribute('aria-label', t('nav.updates') + ': ' + unread);
      }
    }).catch(() => { /* the badge is a bonus */ });
  }

  return session; // null for visitors; pages already check `if (session)`
}