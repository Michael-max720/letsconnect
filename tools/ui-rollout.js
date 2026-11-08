// tools/ui-rollout.js
// Brings every page up to the same standard, for every kind of user:
//   - loads translations.js + settings.js (dark mode, text size, language, region) on every page
//   - adds the footer wherever the header is shown
//   - makes pixel font sizes scale with the text-size setting (px -> rem)
//   - adds the header to the organiser form pages
//   - escapes user-written text before it is put into a page (stops script injection)
//   - removes duplicated or unused leftovers
//
//   node tools/ui-rollout.js            shows what WOULD change (changes nothing)
//   node tools/ui-rollout.js --write    makes the changes (originals saved in tools/ui-rollout-backup)
//
// Safe to run again: pages that are already right are left alone.

const fs = require('fs');
const path = require('path');

const WRITE = process.argv.includes('--write');
const PUBLIC = path.join(__dirname, '..', 'public');
const BACKUP = path.join(__dirname, 'ui-rollout-backup');

const FORM_PAGES = ['organiser-create-event.html', 'organiser-create-ticket.html']; // get the header too
const NO_ESCAPE_LINES = [/const text =/, /const waText =/, /onclick=/];             // never touched by the escaping rule

const tag = (file) => `<script src="/js/${file}"></script>`;
const SCRIPT_TAG = /<script src="\/js\/([\w.-]+)"><\/script>/g;

// Rule 1: every page loads translations.js and then settings.js, straight after the stylesheet
function fixHead(html, notes) {
  const hasT = html.includes('/js/translations.js');
  const hasS = html.includes('/js/settings.js');
  if (hasT && hasS) return html;
  const link = html.match(/<link[^>]*href="\/css\/style\.css"[^>]*>/);
  if (!link) return html;
  if (!hasT && !hasS) {
    notes.push('added translations.js + settings.js');
    return html.replace(link[0], link[0] + '\n' + tag('translations.js') + '\n' + tag('settings.js'));
  }
  if (!hasT) {
    notes.push('added translations.js');
    return html.replace(tag('settings.js'), tag('translations.js') + '\n' + tag('settings.js'));
  }
  notes.push('added settings.js');
  return html.replace(tag('translations.js'), tag('translations.js') + '\n' + tag('settings.js'));
}

// Rule 2: the same script is never loaded twice (a second copy would redeclare its constants and fail)
function dedupeScripts(html, notes) {
  const seen = new Set();
  let removed = 0;
  const out = html.replace(SCRIPT_TAG, (m, file) => {
    if (seen.has(file)) { removed++; return ''; }
    seen.add(file);
    return m;
  });
  if (removed) notes.push(`removed ${removed} duplicate script tag${removed > 1 ? 's' : ''}`);
  return out;
}

// Rule 3: the footer goes wherever the header does
function addFooter(html, notes) {
  if (!html.includes('/js/nav.js') || html.includes('/js/footer.js')) return html;
  notes.push('added footer');
  return html.replace(tag('nav.js'), tag('nav.js') + '\n' + tag('footer.js'));
}

// Rule 4: the organiser form pages get the header as well
function addHeaderToForms(html, file, notes) {
  if (!FORM_PAGES.includes(file) || html.includes("renderNav(")) return html;
  let out = html;
  if (!out.includes('/js/nav.js')) {
    if (!out.includes(tag('api.js'))) return html;
    out = out.replace(tag('api.js'), tag('api.js') + '\n' + tag('nav.js') + '\n' + tag('footer.js'));
  }
  const last = out.lastIndexOf('</script>');
  if (last === -1) return html;
  notes.push('added header and footer');
  return out.slice(0, last) + "\nrenderNav('home');\n" + out.slice(last);
}

// Rule 5: pixel font sizes become rem, so the text-size setting reaches them
function pxToRem(html, notes) {
  let count = 0;
  const out = html.replace(/font-size:\s*(\d+(?:\.\d+)?)px/g, (m, n) => {
    count++;
    return 'font-size:' + String(+(Number(n) / 16).toFixed(4)) + 'rem';
  });
  if (count) notes.push(`${count} font size${count > 1 ? 's' : ''} now scale with text size`);
  return out;
}

// Rule 6: leftover password-eye / background code that no longer belongs on the page
function removeJunk(html, notes) {
  if (html.includes('bg-rotator.js')) return html;
  const block = /<script>\s*const EYE_OPEN[\s\S]*?<\/script>\s*/;
  if (!block.test(html)) return html;
  const without = html.replace(block, '');
  if (!/togglePassword\(/.test(without)) {
    notes.push('removed unused leftover code');
    return without;
  }
  // this page really uses the password eye, so keep that part and drop only the background call,
  // because the background script is not loaded on this page and the call would show an error
  const call = /startBackgroundRotator\(\[[\s\S]*?\]\);\s*/;
  if (call.test(html)) {
    notes.push('removed a background call to a script this page does not load');
    return html.replace(call, '');
  }
  return html;
}

// Rule 7: user-written text is escaped before it goes into a page
function escapeUserText(html, file, notes) {
  if (!html.includes('/js/api.js')) return html;               // esc() comes from api.js
  const field = /\$\{((?:[A-Za-z_]\w*)(?:\.[A-Za-z_]\w*)*\.(?:title|name|email|venue|agent_name|event_title|category_name))\}/g;
  let count = 0;
  const out = html.split('\n').map((line) => {
    if (NO_ESCAPE_LINES.some((re) => re.test(line))) return line;
    return line.replace(field, (m, expr) => { count++; return '${esc(' + expr + ')}'; });
  }).join('\n');
  if (count) notes.push(`${count} user-written text${count > 1 ? 's' : ''} now escaped`);
  return out;
}

// Rule 8: fixes for specific pages
function pageFixes(html, file, notes) {
  let out = html;

  if (file === 'admin-dashboard.html') {
    // the "Needs attention" box was in the page twice, so the second one stayed on "Loading..." forever
    const twice = /(<div id="pending-list">Loading\.\.\.<\/div>\s*)<div id="pending-list">Loading\.\.\.<\/div>/;
    if (twice.test(out)) { out = out.replace(twice, '$1'); notes.push('removed a duplicated box that stayed on "Loading..."'); }
    // the assignment code was pasted in twice
    const dup = /(renderNav\('home'\);)\s*async function loadPendingAssignments\(\)[\s\S]*?\n}\s*async function decideAssignment[\s\S]*?\n}\s*(<\/script>)/;
    if (dup.test(out)) { out = out.replace(dup, '$1\n$2'); notes.push('removed duplicated code'); }
    if (!out.includes('/reviews.html')) {
      out = out.replace('<div class="container">', '<div class="container">\n  <div style="display:flex; gap:8px; margin-bottom:16px;">\n    <a href="/reviews.html" class="btn btn-outline" style="flex:1;">Platform reviews</a>\n  </div>');
      notes.push('added a link to reviews (admins can remove abusive ones)');
    }
  }

  if (file === 'organiser-dashboard.html' && !out.includes('organiser-reviews.html')) {
    const upd = out.match(/[ \t]*<a href="\/organiser-updates\.html"[^>]*>Updates<\/a>/);
    if (upd) {
      out = out.replace(upd[0], upd[0] + '\n  <a href="/organiser-reviews.html" class="btn btn-outline" style="flex:1;">Reviews</a>');
      notes.push('added a Reviews button');
    }
  }

  if (file === 'ticket-view.html' && /background:white;(?! color:)/.test(out)) {
    // the QR card stays white (a QR code needs it) so its text must stay dark in dark mode
    out = out.replace(/background:white;(?! color:)/, 'background:white; color:#1C1C1A;');
    notes.push('QR card text stays readable in dark mode');
  }
  return out;
}

// A change is only written if every script on the page still parses
function scriptsParse(html) {
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    try { new Function(m[1]); } catch (err) { return err.message; }
  }
  return null;
}

const files = fs.readdirSync(PUBLIC).filter((f) => f.endsWith('.html')).sort();
let changedCount = 0;
console.log(WRITE ? 'Applying changes...\n' : 'Dry run: nothing will be changed. Add --write to apply.\n');

for (const file of files) {
  const full = path.join(PUBLIC, file);
  const before = fs.readFileSync(full, 'utf8');
  const notes = [];
  let html = before;
  html = dedupeScripts(html, notes);
  html = fixHead(html, notes);
  html = addFooter(html, notes);
  html = addHeaderToForms(html, file, notes);
  html = removeJunk(html, notes);
  html = pxToRem(html, notes);
  html = escapeUserText(html, file, notes);
  html = pageFixes(html, file, notes);

  if (html === before) { console.log(`  ok        ${file}`); continue; }

  const problem = scriptsParse(html);
  if (problem) {
    console.log(`  SKIPPED   ${file}  (a script would stop working: ${problem}; left untouched)`);
    continue;
  }
  changedCount++;
  console.log(`  ${WRITE ? 'updated ' : 'would update'}  ${file}\n              - ${notes.join('\n              - ')}`);
  if (WRITE) {
    fs.mkdirSync(BACKUP, { recursive: true });
    fs.writeFileSync(path.join(BACKUP, file), before);
    fs.writeFileSync(full, html);
  }
}
console.log(`\n${changedCount} page${changedCount === 1 ? '' : 's'} ${WRITE ? 'updated' : 'would change'}.${WRITE && changedCount ? ' Originals are in tools/ui-rollout-backup.' : ''}`);