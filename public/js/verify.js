// public/js/verify.js
// Logic for verify.html. Uses the shared api() helper from /js/api.js.

// ---------- Settings ----------
const LENGTH = 6;
const RESEND_SECONDS = 60; // matches the server-side cooldown in auth.controller.js

// ---------- Page data from the URL ----------
// Sign-up sends:  /verify.html?userId=12&email=a@b.com&next=/checkout.html
// The email link: /verify.html?userId=12&email=a@b.com&code=123456
const params = new URLSearchParams(window.location.search);
const userId = Number(params.get('userId'));
const email = params.get('email') || '';
const linkCode = (params.get('code') || '').replace(/\D/g, '');
const nextQuery = params.get('next') ? '?next=' + encodeURIComponent(params.get('next')) : '';

// ---------- Elements ----------
const card = document.getElementById('card');
const tiles = [...document.querySelectorAll('.tile')];
const statusEl = document.getElementById('status');
const bar = document.getElementById('bar');
const verifyBtn = document.getElementById('verifyBtn');
const pasteBtn = document.getElementById('pasteBtn');
const resendBtn = document.getElementById('resendBtn');
const emailText = document.getElementById('emailText');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let busy = false;

// Rotating background photos (uses your existing bg-rotator.js).
// Replace or add URLs here, or use your own files like '/images/crowd.jpg'.
startBackgroundRotator([
  'https://images.pexels.com/photos/20179680/pexels-photo-20179680.jpeg',
  'https://images.pexels.com/photos/30174882/pexels-photo-30174882.jpeg',
  'https://images.pexels.com/photos/4555454/pexels-photo-4555454.jpeg',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=870&auto=format&fit=crop',
]);

// ---------- State helper ----------
// States: idle, ready, verifying, error, success (styled in verify.css via data-state)
function setState(state, message) {
  card.dataset.state = state;
  if (message !== undefined) statusEl.textContent = message;
}

// ---------- Email autofill ----------
if (email) emailText.textContent = email;

if (!userId) {
  // Without a userId the server cannot tell whose code this is.
  setState('error', 'This link is incomplete. Go back and sign up again.');
  tiles.forEach((t) => (t.disabled = true));
  pasteBtn.disabled = true;
}

// ---------- Reading and writing tiles ----------
const getCode = () => tiles.map((t) => t.value).join('');

function pop(tile) {
  tile.classList.remove('pop');
  void tile.offsetWidth; // restart the animation
  tile.classList.add('pop');
}

function refresh() {
  tiles.forEach((t) => t.classList.toggle('filled', t.value !== ''));
  const count = getCode().length;
  bar.style.width = (count / LENGTH) * 100 + '%';
  verifyBtn.disabled = count < LENGTH || busy || !userId;
  if (card.dataset.state === 'error' || card.dataset.state === 'ready') {
    setState(
      count === LENGTH ? 'ready' : 'idle',
      count === LENGTH ? 'Code complete. Checking now…' : 'Enter the code from your email.'
    );
  }
}

function maybeSubmit() {
  if (getCode().length === LENGTH) setTimeout(submit, 450); // short pause so the last pop is seen
}

// Types digits into the tiles one at a time
async function typeIn(code, start = 0) {
  const digits = code.replace(/\D/g, '').slice(0, LENGTH - start);
  for (let i = 0; i < digits.length; i++) {
    const t = tiles[start + i];
    t.value = digits[i];
    pop(t);
    refresh();
    await sleep(110);
  }
  const next = tiles.find((t) => !t.value);
  (next || tiles[tiles.length - 1]).focus();
}

function clearTiles() {
  tiles.forEach((t) => (t.value = ''));
  refresh();
}

// ---------- Tile events ----------
tiles.forEach((tile, i) => {
  tile.addEventListener('focus', () => tile.select());

  tile.addEventListener('input', () => {
    const digits = tile.value.replace(/\D/g, '');
    if (!digits) { tile.value = ''; return refresh(); }

    // Covers normal typing and phone keyboards that autofill the whole code at once
    tile.value = digits[0];
    pop(tile);
    refresh();
    if (digits.length > 1) {
      typeIn(digits.slice(1), i + 1).then(maybeSubmit);
    } else {
      if (tiles[i + 1]) tiles[i + 1].focus();
      maybeSubmit();
    }
  });

  tile.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !tile.value && tiles[i - 1]) {
      tiles[i - 1].value = '';
      tiles[i - 1].focus();
      refresh();
    } else if (e.key === 'ArrowLeft' && tiles[i - 1]) {
      tiles[i - 1].focus();
    } else if (e.key === 'ArrowRight' && tiles[i + 1]) {
      tiles[i + 1].focus();
    } else if (e.key === 'Enter') {
      submit();
    }
  });

  tile.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text');
    clearTiles();
    typeIn(text).then(maybeSubmit);
  });
});

// ---------- Paste button (reads the clipboard after you copy the code from your email) ----------
pasteBtn.addEventListener('click', async () => {
  try {
    const digits = (await navigator.clipboard.readText()).replace(/\D/g, '');
    if (digits.length < LENGTH) return setState('error', 'No 6-digit code found on your clipboard.');
    clearTiles();
    setState('idle', '');
    await typeIn(digits);
    maybeSubmit();
  } catch {
    setState('error', 'Could not read the clipboard. Press Ctrl+V in the first tile instead.');
  }
});

// ---------- Submit ----------
verifyBtn.addEventListener('click', submit);

async function submit() {
  const code = getCode();
  if (busy || !userId || code.length < LENGTH) return;

  busy = true;
  verifyBtn.disabled = true;
  verifyBtn.textContent = 'Verifying…';
  setState('verifying', 'Checking your code…');

  try {
    const [data] = await Promise.all([
      api('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ userId, code }) }),
      sleep(700), // keeps the "verifying" animation visible even when the server is fast
    ]);

    const pending = data.status === 'pending_approval';
    setState('success', pending
      ? 'Verified. An admin must approve your account before you can log in.'
      : 'Account verified. Taking you to log in…');
    verifyBtn.textContent = 'Verified';
    await sleep(pending ? 3200 : 1800);
    window.location.href = '/login.html' + nextQuery;
  } catch (err) {
    setState('error', err.message);
    verifyBtn.textContent = 'Verify account';
    await sleep(900); // let the shake play before clearing
    busy = false;
    clearTiles();
    setState('error', err.message); // keep the message visible after clearing
    tiles[0].focus();
  }
}

// ---------- Resend with countdown ----------
let timer;
function startCountdown() {
  let left = RESEND_SECONDS;
  resendBtn.disabled = true;
  clearInterval(timer);
  const tick = () => {
    resendBtn.textContent = left > 0 ? `Resend in ${left}s` : 'Resend code';
    if (left-- <= 0) { clearInterval(timer); resendBtn.disabled = !userId; }
  };
  tick();
  timer = setInterval(tick, 1000);
}

resendBtn.addEventListener('click', async () => {
  resendBtn.disabled = true;
  setState('idle', 'Sending a new code…');
  try {
    await api('/auth/resend-otp', { method: 'POST', body: JSON.stringify({ userId }) });
    clearTiles();
    setState('idle', 'New code sent. Check your email.');
    tiles[0].focus();
    startCountdown();
  } catch (err) {
    setState('error', err.message);
    resendBtn.disabled = false; // the server may say "wait Ns": let them try again
  }
});

// ---------- Start ----------
if (userId) {
  startCountdown();
  if (linkCode.length === LENGTH) {
    // Opened from the email button: remove the code from the address bar, then type it in
    const clean = new URLSearchParams(params);
    clean.delete('code');
    history.replaceState(null, '', window.location.pathname + '?' + clean.toString());
    typeIn(linkCode).then(maybeSubmit);
  } else {
    tiles[0].focus();
  }
}