// public/js/reviews.js
// One reviews component for everything that can be reviewed.
//   renderReviews(element, { type: 'event' | 'organiser' | 'platform', id: 5 })
// Shows the average, the star breakdown, the written reviews, and (if allowed) a form.
// Needs api.js loaded first.

var _rvCount = 0;

function rvSafe(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Stars are drawn as characters: solid for earned, hollow for not. Shape carries the meaning, not just colour.
function rvStars(n) {
  const full = Math.max(0, Math.min(5, Math.round(n)));
  return `<span class="stars" role="img" aria-label="${full} out of 5 stars">${'★'.repeat(full)}${'☆'.repeat(5 - full)}</span>`;
}

const RV_WHY = {
  need_ticket_event: 'Only people who bought a ticket for this event can review it.',
  need_ticket_organiser: 'Only people who attended one of this organiser\'s events can review them.',
  not_yet: 'You can leave a review after the event has taken place.',
  cancelled: 'This event was cancelled, so it cannot be reviewed.',
};

function rvSummaryHtml(summary, canWrite) {
  if (!summary.count) {
    return `<div class="rv-summary"><p style="margin:0; color:var(--sub);">No reviews yet.${canWrite ? ' Be the first to write one.' : ''}</p></div>`;
  }
  const bars = [5, 4, 3, 2, 1].map((n) => {
    const c = summary.breakdown[n] || 0;
    const pct = Math.round((c / summary.count) * 100);
    return `<div class="rv-bar"><span>${n}★</span><div class="rv-track"><div class="rv-fill" style="width:${pct}%"></div></div><span>${c}</span></div>`;
  }).join('');
  return `
    <div class="rv-summary">
      <div class="rv-score">
        <div class="num">${summary.average.toFixed(1)}</div>
        ${rvStars(summary.average)}
        <div class="count">${summary.count === 1 ? '1 review' : summary.count + ' reviews'}</div>
      </div>
      <div class="rv-bars">${bars}</div>
    </div>`;
}

function rvItemHtml(r, isAdmin, verifiedLabel) {
  const when = new Date(r.created_at).toLocaleDateString(loadSettings().language, { day: 'numeric', month: 'short', year: 'numeric' });
  return `
    <div class="card rv-item">
      <div class="rv-head">
        <span class="rv-name">${rvSafe(r.reviewer)}</span>
        ${r.verified ? `<span class="badge badge-success">${verifiedLabel}</span>` : ''}
        ${r.is_mine ? '<span class="badge badge-info">Your review</span>' : ''}
        <span class="rv-date">${when}</span>
      </div>
      ${rvStars(r.rating)}
      ${r.comment ? `<p class="rv-text">${rvSafe(r.comment)}</p>` : ''}
      ${isAdmin ? `<button type="button" class="link-btn rv-remove" data-review="${r.review_id}" style="color:var(--danger-text);">Remove this review</button>` : ''}
    </div>`;
}

function rvFormHtml(uid, mine) {
  const stars = [1, 2, 3, 4, 5].map((n) => `
    <label><input type="radio" name="rv-rating-${uid}" value="${n}" ${mine && mine.rating === n ? 'checked' : ''}>
      <span aria-hidden="true">☆</span><span class="sr-only">${n} ${n === 1 ? 'star' : 'stars'}</span></label>`).join('');
  return `
    <form class="rv-form" id="rv-form-${uid}" novalidate>
      <fieldset class="star-input">
        <legend>Your rating</legend>
        <div class="stars-pick">${stars}</div>
      </fieldset>
      <div class="field">
        <label for="rv-comment-${uid}">Your review <span style="font-weight:400;">(optional)</span></label>
        <textarea id="rv-comment-${uid}" rows="3" maxlength="1000">${rvSafe(mine ? mine.comment : '')}</textarea>
      </div>
      <div class="rv-actions">
        <button type="submit" class="btn btn-primary">${mine ? 'Update review' : 'Post review'}</button>
        ${mine ? '<button type="button" class="btn btn-outline rv-delete">Delete my review</button>' : ''}
      </div>
    </form>`;
}

async function renderReviews(root, { type, id }) {
  if (!root) return;
  const uid = ++_rvCount;
  const q = '/reviews?type=' + encodeURIComponent(type) + (id ? '&id=' + encodeURIComponent(id) : '');
  let data;
  try {
    data = await api(q);
  } catch (err) {
    root.innerHTML = '<p style="color:var(--sub);">Reviews could not be loaded right now.</p>';
    return;
  }

  const verifiedLabel = type === 'platform' ? '' : 'Attended';
  const isAdmin = data.viewerRole === 'admin';
  const canWrite = data.state === 'ok';
  const nextQ = '?next=' + encodeURIComponent(window.location.pathname + window.location.search);

  let writeArea = '';
  if (data.state === 'login') {
    writeArea = `<div class="alert alert-info">Log in as an attendee to leave a review.
      <div class="share-row" style="margin:10px 0 0;">
        <a class="btn btn-primary" href="/login.html${nextQ}">Log in</a>
        <a class="btn btn-outline" href="/register.html${nextQ}">Sign up</a>
      </div></div>`;
  } else if (canWrite) {
    writeArea = rvFormHtml(uid, data.myReview);
  } else if (data.state !== 'attendees_only') {
    const why = data.state === 'need_ticket' ? RV_WHY['need_ticket_' + type] : RV_WHY[data.state];
    if (why) writeArea = `<div class="alert alert-info">${why}</div>`;
  }

  root.innerHTML = `
    <h2>Reviews</h2>
    ${rvSummaryHtml(data.summary, canWrite && !data.myReview)}
    <div class="alert" id="rv-msg-${uid}" style="display:none;" role="status"></div>
    ${writeArea}
    <div class="rv-list">${data.reviews.map((r) => rvItemHtml(r, isAdmin, verifiedLabel)).join('')}</div>`;

  const msg = root.querySelector('#rv-msg-' + uid);
  const say = (text, ok) => {
    msg.textContent = text;
    msg.className = 'alert ' + (ok ? 'alert-success' : 'alert-error');
    msg.style.display = 'block';
  };

  // ----- the form -----
  const form = root.querySelector('#rv-form-' + uid);
  if (form) {
    const labels = [...form.querySelectorAll('.stars-pick label')];
    const paint = (upTo) => labels.forEach((l, i) => {
      const on = i < upTo;
      l.classList.toggle('on', on);
      l.querySelector('[aria-hidden]').textContent = on ? '★' : '☆';
    });
    const chosen = () => {
      const r = form.querySelector('input[type="radio"]:checked');
      return r ? Number(r.value) : 0;
    };
    paint(chosen());
    labels.forEach((l, i) => {
      l.addEventListener('mouseenter', () => paint(i + 1));
      l.addEventListener('mouseleave', () => paint(chosen()));
      l.querySelector('input').addEventListener('change', () => paint(chosen()));
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rating = chosen();
      if (!rating) { say('Please choose a star rating first.', false); return; }
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        const res = await api('/reviews', {
          method: 'PUT',
          body: JSON.stringify({ type, id, rating, comment: form.querySelector('textarea').value }),
        });
        await renderReviews(root, { type, id });
        const again = root.querySelector('#rv-msg-' + (uid + 1));
        if (again) { again.textContent = res.message; again.className = 'alert alert-success'; again.style.display = 'block'; }
      } catch (err) {
        say(err.message, false);
        btn.disabled = false;
      }
    });

    const del = form.querySelector('.rv-delete');
    if (del) {
      del.addEventListener('click', async () => {
        const mineItem = data.reviews.find((r) => r.is_mine);
        if (!mineItem || !window.confirm('Delete your review? This cannot be undone.')) return;
        try {
          await api('/reviews/' + mineItem.review_id, { method: 'DELETE' });
          renderReviews(root, { type, id });
        } catch (err) {
          say(err.message, false);
        }
      });
    }
  }

  // ----- moderation: administrators can remove any review -----
  root.querySelectorAll('.rv-remove').forEach((b) => {
    b.addEventListener('click', async () => {
      if (!window.confirm('Remove this review for everyone?')) return;
      try {
        await api('/reviews/' + b.dataset.review, { method: 'DELETE' });
        renderReviews(root, { type, id });
      } catch (err) {
        say(err.message, false);
      }
    });
  });
}