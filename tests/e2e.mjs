// Brauzer testlari (haqiqiy vaqt, Chrome DevTools protokoli orqali; qo'shimcha kutubxona yo'q).
// Ishga tushirish: loyiha papkasida  python3 -m http.server 8020  so'ng  node tests/e2e.mjs
import { spawn } from 'child_process';

const BASE = process.env.BASE || 'http://localhost:8020/index.html';
const port = 9400 + Math.floor(Math.random() * 400);
const chrome = spawn('google-chrome', ['--headless=new', '--no-sandbox', `--remote-debugging-port=${port}`, '--user-data-dir=/tmp/tbpro-e2e-' + port, 'about:blank'], { stdio: 'ignore' });
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
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

async function js(expr) {
  const r = await send('Runtime.evaluate', { expression: `(async()=>{ ${expr} })()`, awaitPromise: true, returnByValue: true });
  if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'xato');
  return r.result.result.value;
}
async function open(hash, user) {
  await send('Page.navigate', { url: BASE }); await sleep(500);
  await js(`localStorage.clear(); App.Store.init(localStorage); App.Store.loadDemo(); App.Auth.init(localStorage);
    ${user ? `App.Auth.login('${user}','${user === 'admin' ? 'admin123' : 'demo123'}',true);` : ''}`);
  await send('Page.navigate', { url: BASE + hash }); await sleep(700);
}
async function width(w) { await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 600 }); await sleep(250); }

let passed = 0, failed = 0;
async function test(name, fn) {
  try { const r = await fn(); if (r === true) { passed++; console.log('✓ ' + name); } else { failed++; console.log('✗ ' + name + (r !== false ? ' — ' + JSON.stringify(r) : '')); } }
  catch (e) { failed++; console.log('✗ ' + name + ' — ' + e.message.split('\n')[0]); }
}
const $ = (sel) => `document.querySelector(${JSON.stringify(sel)})`;
const W = 'await new Promise(r=>setTimeout(r,120));';

/* ================= kirish ================= */
await test('birinchi ochilish: Xush kelibsiz, demo yuklash', async () => {
  await send('Page.navigate', { url: BASE }); await sleep(400);
  await js('localStorage.clear(); location.hash=""; location.reload();'); await sleep(800);
  return js(`if(location.hash!=='#/welcome') return location.hash; ${$('#start-demo')}.click(); ${W}
    return location.hash==='#/login' && document.querySelectorAll('.demo-acc').length===4;`);
});
await test('login: noto‘g‘ri parol, keyin admin bilan kirish', async () => js(`
  ${$('#li-login')}.value='admin'; ${$('#li-pass')}.value='xato12'; ${$('#login-form')}.requestSubmit(); ${W}
  const err=${$('#login-error')}.textContent;
  ${$('.demo-acc[data-login="admin"]')}.click(); ${W}${W}
  return /noto‘g‘ri/.test(err) && location.hash==='#/admin' && document.querySelectorAll('.nav a').length===8;`));
await test('xodim admin sahifasiga o‘ta olmaydi', async () => {
  await open('#/admin/users', 'malika');
  return js(`return location.hash==='#/me' || location.hash==='#/me/board' ? true : location.hash;`);
});

/* ================= taxta ================= */
await test('taxta: Boshlash → Yangi −1, Bajarilmoqda +1; bekor qilish', async () => {
  await open('#/admin/board', 'admin');
  return js(`const n=s=>+document.getElementById('count-'+s).textContent; const a=n('new'),b=n('doing');
    ${$('#kcol-new .kcard .move--fwd')}.click(); ${W} const ok1=n('new')===a-1&&n('doing')===b+1;
    ${$('#toast-undo')}.click(); ${W} return ok1 && n('new')===a;`);
});
await test('vazifa yaratish → xodimga bildirishnoma', async () => js(`
  const before=App.Store.unreadCount('u_bekzod');
  App.openTaskForm(); ${W} ${$('#tf-submit')}.click(); ${W}
  const err=${$('#tf-title-error')}.textContent;
  ${$('#tf-title')}.value='E2E vazifa'; ${$('#tf-assignee')}.value='u_bekzod'; ${$('#tf-submit')}.click(); ${W}
  return /yozing/.test(err) && !document.getElementById('task-form') && App.Store.unreadCount('u_bekzod')===before+1;`));

/* ================= jadval ================= */
await test('jadval: saralash, tanlash, ommaviy holat, CSV tugmasi', async () => {
  await open('#/admin/tasks', 'admin');
  return js(`const rows=()=>document.querySelectorAll('.table--tasks tbody tr').length;
    const r0=rows(); ${$('#sort-due')}.click(); ${W}
    ${$('#sel-all')}.click(); ${W} const bar=!!document.querySelector('.bulkbar');
    const sel=${$('#bulk-status')}; sel.value='done'; sel.dispatchEvent(new Event('change')); ${W}
    const doneAll=[...document.querySelectorAll('.table--tasks tbody tr .pill')].every(p=>p.classList.contains('pill--done'));
    return r0===12 && bar && doneAll && !!document.getElementById('export-csv') && !!document.getElementById('page-next');`);
});

/* ================= kalendar ================= */
await test('kalendar: oy to‘ri, kechikkanlar, oy almashtirish', async () => {
  await open('#/admin/calendar', 'admin');
  return js(`const chips=document.querySelectorAll('.mcal .cal-chip').length; const t0=${$('.cal-nav__title')}.textContent;
    ${$('#cal-next')}.click(); ${W} const t1=${$('.cal-nav__title')}.textContent;
    return chips>5 && t0!==t1 && document.querySelectorAll('.cal-side .cal-chip.is-late').length>=1 ? true : {chips,t0,t1};`);
});
await test('kalendar: bo‘sh kunga bosish → shu sana bilan forma', async () => js(`
  ${$('#cal-today')}.click(); ${W}
  const b=[...document.querySelectorAll('.mcal__add')].pop(); const d=b.closest('.mcal__day').dataset.date; b.click(); ${W}
  const ok=!!document.getElementById('task-form') && document.getElementById('tf-due').value===d;
  document.querySelector('.modal .icon-btn').click(); return ok;`));

/* ================= loyihalar va xodimlar ================= */
await test('loyihalar: 3 karta, yangi loyiha, takror nom xatosi', async () => {
  await open('#/admin/projects', 'admin');
  return js(`const n0=document.querySelectorAll('.proj-card').length;
    ${$('#add-project')}.click(); ${W} ${$('#pf-name')}.value='Yoshlar forumi'; ${$('#pf-submit')}.click(); ${W}
    const dup=${$('#pf-name-error')}.textContent; ${$('#pf-name')}.value='Sport musobaqasi'; ${$('#pf-submit')}.click(); ${W}
    return n0===3 && /bor/.test(dup) && document.querySelectorAll('.proj-card').length===4;`);
});
await test('xodimlar: qo‘shish → yangi login bilan kirish mumkin', async () => {
  await open('#/admin/users', 'admin');
  return js(`${$('#add-user')}.click(); ${W}
    ${$('#uf-name')}.value='Test Xodim'; ${$('#uf-login')}.value='testx'; ${$('#uf-password')}.value='parol12'; ${$('#uf-submit')}.click(); ${W}
    const inTable=[...document.querySelectorAll('.user-cell')].some(b=>b.textContent.includes('Test Xodim'));
    App.Auth.logout(); const r=App.Auth.login('testx','parol12'); return inTable && r.ok;`);
});
await test('xodimlar: o‘zini faolsizlantira olmaydi (menyuda yo‘q)', async () => {
  await open('#/admin/users', 'admin');
  return js(`${$('[data-key="um-u_admin"]')}.click(); ${W}
    const items=[...document.querySelectorAll('.menu .menu__item')].map(b=>b.textContent); document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
    return !items.some(x=>/Faolsizlantirish/.test(x));`);
});

/* ================= telefon ================= */
await test('telefon 390px: yonga surish yo‘q, pastki menyu, tablar', async () => {
  await width(390); await open('#/me/board', 'malika');
  return js(`return document.documentElement.scrollWidth<=390 && getComputedStyle(${$('.bottom-nav')}).display!=='none' && getComputedStyle(${$('.tabs')}).display!=='none' ? true : document.documentElement.scrollWidth;`);
});
await width(1440);

await test('sahifa xatolari yo‘q', async () => pageErrors.length === 0 ? true : pageErrors.slice(0, 3));

console.log('\n' + passed + ' ta brauzer testi o‘tdi' + (failed ? ', ' + failed + ' ta XATO' : '') + '.');
ws.close(); chrome.kill();
process.exit(failed ? 1 : 0);
