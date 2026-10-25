// public/js/posters.js
// Event "posters" (cards) shared by the events list and the organiser page,
// so an event always looks the same wherever you meet it.
// Needs translations.js and settings.js loaded first (t, loadSettings, currentRegion).

const categoryColors = {
  'Music': { bg: '#F1EEFE', text: '#4A4099' },
  'Safari': { bg: '#FDF0E6', text: '#8A4B22' },
  'Conference': { bg: '#E9F6F0', text: '#146C4C' },
  'Sports': { bg: '#FCEEF1', text: '#9C3B57' },
  'Comedy': { bg: '#FCF3E3', text: '#8A5A0C' },
};
function colorFor(cat) {
  return categoryColors[cat] || { bg: '#EAF1FB', text: '#1F3864' };
}

// Makes user-entered text safe to place inside innerHTML
function safe(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Poster state -> label key. 'open' has no ribbon.
const RIBBON_KEY = { closed: 'st.closed', cancelled: 'st.cancelled', sold_out: 'st.soldOut', coming_soon: 'st.comingSoon' };
const UNAVAILABLE = ['closed', 'cancelled', 'sold_out'];

// Short price for posters; other regions see an approximate local amount
function shortPrice(kes) {
  const amount = Number(kes);
  const region = currentRegion();
  const kesText = 'KES ' + amount.toLocaleString('en');
  if (region.currency === 'KES') return kesText;
  try {
    const v = amount * region.perKes;
    return '≈ ' + new Intl.NumberFormat(loadSettings().language, {
      style: 'currency', currency: region.currency, maximumFractionDigits: v >= 100 ? 0 : 2,
    }).format(v);
  } catch (err) {
    return kesText;
  }
}

function dateParts(ev) {
  const lang = loadSettings().language;
  const d = new Date(ev.event_date);
  return {
    dow: d.toLocaleDateString(lang, { weekday: 'short' }),
    day: d.getDate(),
    mon: d.toLocaleDateString(lang, { month: 'short' }),
    time: d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }),
  };
}

function dateBadge(p) {
  return `<span class="date-badge"><span class="dow">${p.dow}</span><span class="day">${p.day}</span><span class="mon">${p.mon}</span></span>`;
}

function tagsHtml(ev) {
  const tags = [];
  if (ev.family_friendly) tags.push(`<span class="badge badge-success">${safe(t('tag.family'))}</span>`);
  if (ev.age_min > 0) tags.push(`<span class="badge badge-warn">${safe(t('tag.age', { n: ev.age_min }))}</span>`);
  return tags.join('');
}

// The line that tells people what they can do, so nobody wastes a click
function stateLine(ev) {
  const s = ev.sales_status;
  if (s === 'cancelled') return `<p class="card-state state-cancelled">${safe(t('st.msgCancelled'))}</p>`;
  if (s === 'closed') return `<p class="card-state state-closed">${safe(t('st.msgClosed'))}</p>`;
  if (s === 'sold_out') return `<p class="card-state state-sold">${safe(t('st.msgSoldOut'))}</p>`;
  if (s === 'coming_soon') {
    if (!ev.first_start) return `<p class="card-state state-soon">${safe(t('st.comingSoon'))}</p>`;
    const when = new Date(ev.first_start).toLocaleDateString(loadSettings().language, { day: 'numeric', month: 'short' });
    return `<p class="card-state state-soon">${safe(t('st.msgSoon', { date: when }))}</p>`;
  }
  // open: price and how many are left
  const bits = [];
  if (ev.min_price != null) bits.push(`<span class="card-price">${safe(t('st.from', { price: shortPrice(ev.min_price) }))}</span>`);
  if (ev.tickets_left > 0 && ev.tickets_left <= 20) bits.push(`<span class="badge badge-warn">${safe(t('st.left', { n: ev.tickets_left }))}</span>`);
  return bits.length ? `<p class="card-line">${bits.join(' ')}</p>` : '';
}

// The heart: outline when not saved, solid when saved (switched by aria-pressed in the CSS)
var heartSvg = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path class="h-line" d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143q.09.083.176.171a3 3 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15"/><path class="h-fill" fill-rule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314"/></svg>';

// One poster card
function cardHtml(ev, i) {
  const col = colorFor(ev.category);
  const p = dateParts(ev);
  const status = ev.sales_status || 'open';
  const ribbon = RIBBON_KEY[status]
    ? `<span class="ribbon ribbon-${status}">${safe(t(RIBBON_KEY[status]))}</span>` : '';
  const thumbStyle = ev.cover_image_url
    ? `background-image:url('${safe(ev.cover_image_url)}'); background-size:cover; background-position:center; animation:none;`
    : '';
  const place = [ev.venue, ev.region].filter(Boolean).join(', ');
  const classes = ['event-card'];
  if (UNAVAILABLE.includes(status)) classes.push('is-unavailable');
  if (status === 'cancelled') classes.push('is-cancelled');
  const byline = ev.organiser_name
    ? `<p class="byline">${safe(t('ev.by', { name: ev.organiser_name }))}</p>` : '';

  return `
    <div class="card-wrap">
      <a class="${classes.join(' ')}" href="/event-details.html?id=${ev.event_id}" style="animation-delay:${(i || 0) * 0.06}s">
        <div class="event-thumb" style="${thumbStyle}">
          ${dateBadge(p)}
          ${ribbon}
          <span class="category-pill" style="background:${col.bg};color:${col.text};">${safe(ev.category || 'Event')}</span>
        </div>
        <div class="body">
          <p class="title">${safe(ev.title)}</p>
          ${byline}
          <p class="meta">${p.dow} &middot; ${p.time} &middot; ${safe(place)}</p>
          ${stateLine(ev)}
          <div class="tags">${tagsHtml(ev)}</div>
        </div>
      </a>
      <button type="button" class="heart-btn" data-save-event="${ev.event_id}" aria-pressed="false" hidden>${heartSvg}</button>
    </div>`;
}


// =====================================================
// Saving events (the heart). Works on every page that includes this file:
// any element with data-save-event="ID" becomes a save/unsave button.
// =====================================================
var savedState = { ready: false, enabled: false, role: null, ids: new Set() };

function savedToast(message, actionLabel, onAction) {
  let el = document.getElementById('saved-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'saved-toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = message;
  if (actionLabel) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'toast-action';
    b.textContent = actionLabel;
    b.addEventListener('click', () => { el.hidden = true; onAction(); });
    el.appendChild(b);
  }
  el.hidden = false;
  clearTimeout(savedToast._timer);
  savedToast._timer = setTimeout(() => { el.hidden = true; }, actionLabel ? 6000 : 3000);
}

// Show or hide each heart, and fill it in if that event is saved.
// Only text and attributes that actually change are touched, so this is safe to run often.
function applyHearts(root) {
  (root || document).querySelectorAll('[data-save-event]').forEach((btn) => {
    const saved = savedState.ids.has(Number(btn.dataset.saveEvent));
    const hidden = !savedState.enabled;
    if (btn.hidden !== hidden) btn.hidden = hidden;
    if (btn.getAttribute('aria-pressed') !== String(saved)) btn.setAttribute('aria-pressed', saved);
    const label = t(saved ? 'sv.unsave' : 'sv.save');
    if (btn.getAttribute('aria-label') !== label && !btn.querySelector('.save-label')) btn.setAttribute('aria-label', label);
    const text = btn.querySelector('.save-label');
    if (text) {
      const want = t(saved ? 'sv.saved' : 'sv.save');
      if (text.textContent !== want) text.textContent = want;
    }
  });
}

async function toggleSaved(eventId) {
  // Visitors are sent to sign up, and come straight back to this page afterwards
  if (!savedState.role) {
    window.location.href = '/register.html?next=' + encodeURIComponent(window.location.pathname + window.location.search);
    return;
  }
  const wasSaved = savedState.ids.has(eventId);
  // Update the heart straight away; undo it if the server says no
  if (wasSaved) savedState.ids.delete(eventId); else savedState.ids.add(eventId);
  applyHearts(document);
  try {
    await api('/saved/' + eventId, { method: wasSaved ? 'DELETE' : 'POST' });
    document.dispatchEvent(new CustomEvent('saved-changed', { detail: { eventId, saved: !wasSaved } }));
  } catch (err) {
    if (wasSaved) savedState.ids.add(eventId); else savedState.ids.delete(eventId);
    applyHearts(document);
    savedToast(err.message);
  }
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-save-event]');
  if (!btn) return;
  e.preventDefault();
  toggleSaved(Number(btn.dataset.saveEvent));
});

document.addEventListener('DOMContentLoaded', async () => {
  let session = null;
  try { session = await api('/auth/me'); } catch (err) { session = null; }
  savedState.role = session ? session.role : null;
  // visitors and attendees see hearts; organisers, admins and gate agents do not
  savedState.enabled = !savedState.role || savedState.role === 'attendee';
  if (savedState.role === 'attendee') {
    try {
      const { ids } = await api('/saved/ids');
      savedState.ids = new Set(ids.map(Number));
    } catch (err) { /* hearts simply start empty */ }
  }
  savedState.ready = true;
  applyHearts(document);

  // Hearts drawn later (search results, event details) are filled in as they appear
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(() => { queued = false; applyHearts(document); });
  }).observe(document.body, { childList: true, subtree: true });
});