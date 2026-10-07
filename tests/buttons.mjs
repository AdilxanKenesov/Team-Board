// Tugmalar auditi: har bir sahifa, menyu, oyna va panelda har bir tugma/havola ishlaydimi?
// Tugma — o'zida yoki ota elementida "click" ishlovchisi bo'lishi (yoki forma submit tugmasi) kerak;
// havola — mavjud marshrutga olib borishi kerak. Ishga tushirish: python3 -m http.server 8020; node tests/buttons.mjs
import { spawn } from 'child_process';

const BASE = process.env.BASE || 'http://localhost:8020/index.html';
const port = 9800 + Math.floor(Math.random() * 150);
const chrome = spawn('google-chrome', ['--headless=new', '--no-sandbox', `--remote-debugging-port=${port}`, '--user-data-dir=/tmp/tbpro-btn-' + port, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 80; i++) {
  try { const p = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch (e) {}
  await sleep(150);
}
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pend = {}; const pageErrors = [];
ws.addEventListener('message', (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; }
  if (d.method === 'Runtime.exceptionThrown') pageErrors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable');
const js = async (expr) => (await send('Runtime.evaluate', { expression: `(async()=>{ ${expr} })()`, awaitPromise: true, returnByValue: true })).result.result?.value;
const W = 'await new Promise(r=>setTimeout(r,200));';

async function open(hash, user, w = 1440) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 600 });
  await send('Page.navigate', { url: BASE }); await sleep(500);
  await js(`localStorage.clear(); App.Store.init(localStorage); App.Store.loadDemo(); App.Auth.init(localStorage);
    ${user ? `App.Auth.login('${user}','${user === 'admin' ? 'admin123' : 'demo123'}',true);` : ''}`);
  await send('Page.navigate', { url: BASE + hash }); await sleep(800);
}

// Ko'rinadigan barcha boshqaruv elementlarini tekshirish
async function audit(scene) {
  const n = await js(`window.__els=[...document.querySelectorAll('button, a, [role=button], [role=menuitem], [role=tab]')].filter(e=>{const r=e.getBoundingClientRect(); return r.width>0 && r.height>0 && getComputedStyle(e).visibility!=='hidden';}); return window.__els.length;`);
  const bad = [];
  for (let i = 0; i < n; i++) {
    const info = await js(`const e=window.__els[${i}]; return {tag:e.tagName, href:e.getAttribute('href'), type:e.type, form:!!e.form, label:(e.getAttribute('aria-label')||e.textContent||e.title||'').trim().replace(/\\s+/g,' ').slice(0,40), id:e.id, disabled:!!e.disabled};`);
    if (info.disabled) continue;
    if (info.tag === 'A') {
      if (!info.href) { bad.push({ ...info, why: 'href yo‘q' }); continue; }
      if (info.href.startsWith('#')) {
        const ok = await js(`return !!App.Router.parse(${JSON.stringify(info.href)}).route;`);
        // marshrut bo'lmasa — hujjat darajasidagi click ishlovchisi uni ushlab qolishi kerak (masalan, skip-link)
        const handled = ok || await js(`const e=window.__els[${i}]; let hit=false; const f=(ev)=>{ hit=ev.defaultPrevented; }; window.addEventListener('click',f); const h0=location.hash; e.click(); window.removeEventListener('click',f); const same=location.hash===h0; return hit && same;`);
        if (!handled) bad.push({ ...info, why: 'marshrut yo‘q' });
      }
      continue;
    }
    if (info.type === 'submit' && info.form) continue;
    // o'zi va 3 ta ota elementdagi click/mousedown/pointerdown ishlovchilari
    let found = false;
    for (let up = 0; up < 4 && !found; up++) {
      const r = await send('Runtime.evaluate', { expression: `(()=>{let e=window.__els[${i}]; for(let k=0;k<${up};k++) e=e&&e.parentElement; return e;})()` });
      const oid = r.result.result.objectId; if (!oid) break;
      const l = await send('DOMDebugger.getEventListeners', { objectId: oid });
      found = (l.result.listeners || []).some((x) => ['click', 'mousedown', 'pointerdown'].includes(x.type));
    }
    if (!found) bad.push({ ...info, why: 'click ishlovchisi yo‘q' });
  }
  console.log((bad.length ? '✗ ' : '✓ ') + scene + ' — ' + n + ' ta element' + (bad.length ? ', ' + bad.length + ' ta muammo' : ''));
  bad.forEach((b) => console.log('    · ' + b.tag + (b.id ? '#' + b.id : '') + ' "' + b.label + '" — ' + b.why));
  return bad.length;
}

let problems = 0;
const scenes = [
  ['Xush kelibsiz', '#/welcome', null, 'localStorage.clear(); location.reload();'],
  ['Kirish', '#/login', null],
  ['Admin: boshqaruv paneli', '#/admin', 'admin'],
  ['Admin: foydalanuvchi menyusi', '#/admin', 'admin', `document.getElementById('user-menu').click(); ${W}`],
  ['Admin: qo‘ng‘iroqcha', '#/admin', 'admin', `document.getElementById('bell').click(); ${W}`],
  ['Admin: taxta', '#/admin/board', 'admin'],
  ['Admin: vazifa tafsiloti', '#/admin/board', 'admin', `App.openTask('t_2'); ${W}${W}`],
  ['Admin: yangi vazifa oynasi', '#/admin/board', 'admin', `App.openTaskForm(); ${W}${W}`],
  ['Admin: xodimlar', '#/admin/users', 'admin'],
  ['Admin: xodim qator menyusi', '#/admin/users', 'admin', `document.querySelector('[data-key^="um-u_jasur"]').click(); ${W}`],
  ['Admin: xodim profili', '#/admin/users', 'admin', `App.openUser('u_jasur'); ${W}${W}`],
  ['Admin: hisobotlar', '#/admin/reports', 'admin'],
  ['Admin: bildirishnomalar', '#/admin/notifications', 'admin'],
  ['Admin: sozlamalar', '#/settings', 'admin'],
  ['Admin: tezkor tugmalar', '#/admin', 'admin', `App.showShortcuts(); ${W}`],
  ['Xodim: mening kunim', '#/me', 'malika'],
  ['Xodim: taxta', '#/me/board', 'malika'],
  ['Xodim: vazifa tafsiloti', '#/me/board', 'malika', `App.openTask('t_2'); ${W}${W}`],
  ['Xodim: bildirishnomalar', '#/me/notifications', 'malika'],
  ['Xodim: sozlamalar', '#/settings', 'malika'],
  ['Telefon: admin', '#/admin', 'admin', `document.querySelector('.topbar__menu').click(); ${W}`, 390],
  ['Telefon: xodim taxta', '#/me/board', 'malika', null, 390],
];
for (const [name, hash, user, action, w] of scenes) {
  await open(hash, user, w);
  if (action) { await js(action); await sleep(400); }
  problems += await audit(name);
}
if (pageErrors.length) { console.log('✗ sahifa xatolari:', pageErrors.slice(0, 3)); problems++; }
console.log('\n' + (problems ? problems + ' ta muammo topildi.' : 'Barcha tugma va havolalar ishlaydi.'));
ws.close(); chrome.kill();
process.exit(problems ? 1 : 0);
