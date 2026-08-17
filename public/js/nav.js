// public/js/nav.js
// Injects a consistent bottom nav (with a Profile tab and Log out link)
// into any page that includes this script and has <div id="app-nav"></div>.
// Call renderNav('home' | 'tickets' | 'profile' | ...) after including this script.

const NAV_TABS = {
  attendee: [
    { key: 'home', label: 'Home', href: '/events.html' },
    { key: 'tickets', label: 'Tickets', href: '/my-tickets.html' },
    { key: 'profile', label: 'Profile', href: '/profile.html' },
  ],
  organiser: [
    { key: 'home', label: 'Dashboard', href: '/organiser-dashboard.html' },
    { key: 'profile', label: 'Profile', href: '/profile.html' },
  ],
  admin: [
    { key: 'home', label: 'Dashboard', href: '/admin-dashboard.html' },
    { key: 'profile', label: 'Profile', href: '/profile.html' },
  ],
  gate_agent: [
    { key: 'home', label: 'Scan', href: '/gate-scan.html' },
    { key: 'profile', label: 'Profile', href: '/profile.html' },
  ],
};

async function renderNav(activeTab) {
  const navEl = document.getElementById('app-nav');
  if (!navEl) return null;

  let session = null;
  try {
    session = await api('/auth/me');
  } catch (err) {
    // Not logged in. Leave nav empty; each page's own load() call will
    // already surface a "please log in" message from the API it calls.
    return null;
  }

  const items = NAV_TABS[session.role] || [];
  navEl.innerHTML = `
    <div class="bottom-nav">
      ${items.map(t => `<a href="${t.href}" class="${t.key === activeTab ? 'active' : ''}">${t.label}</a>`).join('')}
      <a href="#" id="logout-link">Log out</a>
    </div>
  `;

  document.getElementById('logout-link').addEventListener('click', async (e) => {
    e.preventDefault();
    await api('/auth/logout', { method: 'POST' });
    window.location.href = '/login.html';
  });

  return session;
}
