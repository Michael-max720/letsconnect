// public/js/api.js
// One shared helper for calling the backend, used by every page.
// Centralizes fetch + error handling so each page doesn't repeat it.

async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // sends the session cookie automatically
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong.');
  }
  return data;
}

function showError(message, containerId = 'error-box') {
  const box = document.getElementById(containerId);
  if (!box) return alert(message);
  box.textContent = message;
  box.style.display = 'block';
}

function money(amount) {
  return 'KES ' + Number(amount).toLocaleString();
}
