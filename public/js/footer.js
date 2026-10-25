// public/js/footer.js
// Site footer: about, share, explore and legal links. Loads itself on every page
// that includes this file. Needs translations.js + settings.js (t) loaded first.

function renderFooter() {
  if (document.getElementById('site-footer')) return;

  const footer = document.createElement('footer');
  footer.id = 'site-footer';
  footer.className = 'site-footer';
  footer.innerHTML = `
    <div class="footer-grid">
      <div class="footer-brand">
        <a class="logo" href="/events.html" aria-label="Lets Connect">
          <span class="logo-mark">LC</span><span>Lets Connect</span>
        </a>
        <p>${t('ft.about')}</p>
        <div class="footer-share">
          <button type="button" class="btn btn-outline" id="share-site">${t('ft.share')}</button>
          <a class="btn btn-outline" id="share-wa" target="_blank" rel="noopener">WhatsApp</a>
        </div>
      </div>

      <nav aria-labelledby="ft-explore">
        <h2 id="ft-explore">${t('ft.explore')}</h2>
        <ul>
          <li><a href="/events.html">${t('ft.events')}</a></li>
          <li><a href="/register.html">${t('ft.host')}</a></li>
        </ul>
      </nav>

      <nav aria-labelledby="ft-legal">
        <h2 id="ft-legal">${t('ft.legal')}</h2>
        <ul>
          <li><a href="/terms.html">${t('ft.terms')}</a></li>
          <li><a href="/privacy.html">${t('ft.privacy')}</a></li>
          <li><a href="/copyright.html">${t('ft.copyright')}</a></li>
          <li><a href="/data-handling.html">${t('ft.data')}</a></li>
        </ul>
      </nav>
    </div>
    <p class="footer-copy">&copy; ${new Date().getFullYear()} Lets Connect. ${t('ft.rights')}</p>`;
  document.body.appendChild(footer);

  // Sharing the platform itself (the event pages have their own share buttons)
  const siteUrl = window.location.origin + '/events.html';
  const text = 'Find and book events on Lets Connect';
  document.getElementById('share-wa').href = 'https://wa.me/?text=' + encodeURIComponent(text + ' ' + siteUrl);
  document.getElementById('share-site').addEventListener('click', async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Lets Connect', text, url: siteUrl }); } catch (err) { /* cancelled */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(siteUrl);
      footerToast(t('ft.copied'));
    } catch (err) {
      window.prompt('Copy this link:', siteUrl);
    }
  });
}

let _footerToastTimer;
function footerToast(message) {
  let el = document.getElementById('footer-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'footer-toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.hidden = false;
  clearTimeout(_footerToastTimer);
  _footerToastTimer = setTimeout(() => { el.hidden = true; }, 2500);
}

document.addEventListener('DOMContentLoaded', renderFooter);