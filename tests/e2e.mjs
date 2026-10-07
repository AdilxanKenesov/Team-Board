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

/* ================= xodim interfeysi ================= */
await test('admin vazifa beradi → xodim bildirishnoma va vazifani ko‘radi, boshlaydi', async () => {
  await open('#/admin/board', 'admin');
  await js(`App.Store.createTask(App.me(), { title: 'Xodim uchun sinov', assigneeId: 'u_bekzod', due: App.today() });`);
  await js(`App.Auth.logout(); App.Auth.login('bekzod','demo123',true); location.hash='#/me'; ${W}${W}`);
  return js(`const rows=[...document.querySelectorAll('.trow')]; const row=rows.find(r=>r.textContent.includes('Xodim uchun sinov'));
    const badge=+document.getElementById('bell-badge').textContent;
    if(!row) return 'qator yo‘q'; row.querySelector('.move--fwd').click(); ${W}
    const st=App.Store.db.tasks.find(t=>t.title==='Xodim uchun sinov').status;
    return badge>=1 && st==='doing' && App.Store.notificationsFor('u_admin').some(n=>n.type==='status') ? true : {badge,st};`);
});
await test('bildirishnomalar sahifasi: o‘qilmaganlar va hammasini o‘qildi', async () => js(`
  location.hash='#/me/notifications'; ${W}${W}
  const n0=document.querySelectorAll('.nrow.is-unread').length; ${$('#nt-unread')}.click(); ${W}
  const onlyU=document.querySelectorAll('.nrow').length===n0; ${$('#mark-all')}.click(); ${W}
  return n0>0 && onlyU && App.Store.unreadCount(App.me().id)===0 && document.getElementById('bell-badge').hidden;`));
await test('xodim boshqa xodim vazifasini ocholmaydi', async () => js(`
  App.openTask('t_11'); ${W} return !document.querySelector('.drawer') && /ruxsat/.test(document.getElementById('toast').textContent);`));
await test('parol tiklangandan keyin birinchi kirishda almashtirish so‘raladi', async () => {
  await open('#/admin', 'admin');
  await js(`App.Store.resetPassword(App.me(), 'u_jasur', 'vaqt123'); App.Auth.logout(); App.Auth.login('jasur','vaqt123',true); location.hash='#/me'; ${W}${W}${W}`);
  return js(`if(!document.getElementById('pc-current')) return 'oyna yo‘q';
    ${$('#pc-current')}.value='vaqt123'; ${$('#pc-next')}.value='yangi123'; ${$('#pc-submit')}.click(); ${W}
    App.Auth.logout(); return App.Auth.login('jasur','yangi123').ok && !App.Store.user('u_jasur').mustChange;`);
});

/* ================= analitika, hisobot, faollik, buyruqlar, sozlamalar ================= */
await test('dashboard: KPI, donut, dinamika 7→14 kun, jadval ko‘rinishi', async () => {
  await open('#/admin', 'admin');
  return js(`
    const c=App.Logic.counts(App.Store.db.tasks, App.today());
    const kpiOk=${$('#kpi-open')}.textContent===String(c.new+c.doing) && ${$('#kpi-done')}.textContent===c.donePercent+'%' && ${$('#kpi-late')}.textContent===String(c.overdue);
    const segs=document.querySelectorAll('.donut__seg').length;
    const h7=document.querySelectorAll('.cols__svg .hit').length;
    ${$('#dyn-14')}.click(); ${W}
    const h14=document.querySelectorAll('.cols__svg .hit').length;
    ${$('#tbl-status')}.click(); ${W}
    const rows=document.querySelectorAll('.chart-table tbody tr').length;
    return kpiOk && segs===3 && h7===7 && h14===14 && rows===3 ? true : {kpiOk,segs,h7,h14,rows};`);
});
await test('dashboard: tooltip va "Muddati o‘tgan" KPI jadvalni filtrlaydi', async () => js(`
  const hit=document.querySelector('.cols__svg .hit'); const r=hit.getBoundingClientRect();
  hit.dispatchEvent(new MouseEvent('mousemove',{clientX:r.left+5,clientY:r.top+20,bubbles:true}));
  const tip=document.querySelector('.chart-tip'); const tipOk=tip && !tip.hidden && /Yaratildi/.test(tip.textContent);
  hit.dispatchEvent(new MouseEvent('mouseleave'));
  ${$('a[data-key="kpi-kpi-late"]')}.click(); ${W}${W}
  const n=document.querySelectorAll('tbody tr').length;
  App.getTaskFilter('table').onlyOverdue=false;
  return tipOk && location.hash==='#/admin/tasks' && n===App.Store.db.tasks.filter(t=>App.Logic.isOverdue(t,App.today())).length ? true : {tipOk,n};`));
await test('hisobot: filtrlar, varaq, print.css, CSV', async () => {
  await open('#/admin/reports', 'admin');
  return js(`
    const all=App.reportTasks().length;
    const sel=${$('#rp-project')}; sel.value='p_sayt'; sel.dispatchEvent(new Event('change')); ${W}
    const sayt=App.reportTasks().length, inSheet=document.querySelectorAll('.rep-table tbody tr').length;
    const per=${$('#rp-period')}; per.value='7'; per.dispatchEvent(new Event('change')); ${W}
    const week=App.reportTasks().every(t=>t.projectId==='p_sayt' && (t.status!=='done' || t.completedAt>=Date.now()-8*864e5));
    const printCss=[...document.styleSheets].some(s=>s.media && s.media.mediaText==='print' && s.cssRules.length>5);
    let csv=null; const orig=App.UI.download; App.UI.download=(n,c)=>{csv={n,c}}; ${$('#rp-csv')}.click(); App.UI.download=orig;
    sel.value=''; sel.dispatchEvent(new Event('change')); per.value='30'; per.dispatchEvent(new Event('change'));
    return all===24 && sayt===7 && inSheet===7 && week && printCss && csv && /\\.csv$/.test(csv.n) && csv.c.split('\\r\\n').length===App.Store.db.tasks.filter(t=>t.projectId==='p_sayt' && (t.status!=='done'||t.completedAt>=Date.now()-8*864e5)).length+1 ? true : {all,sayt,inSheet,week,printCss,csv:csv&&csv.n};`);
});
await test('faollik jurnali: xodim va qidiruv filtri', async () => {
  await open('#/admin/activity', 'admin');
  return js(`
    const n0=document.querySelectorAll('.act-row').length;
    const u=${$('#act-user')}; u.value='u_jasur'; u.dispatchEvent(new Event('change')); ${W}
    const onlyJ=[...document.querySelectorAll('.act-row__text b')].every(b=>b.textContent==='Jasur Toshmatov');
    const q=${$('#act-q')}; q.value='maqola'; q.dispatchEvent(new Event('input')); ${W}
    const n2=document.querySelectorAll('.act-row').length;
    ${$('#act-clear')}.click(); ${W}
    return n0>10 && onlyJ && n2>0 && n2<n0 && document.querySelectorAll('.act-row').length===n0 ? true : {n0,onlyJ,n2};`);
});
await test('buyruqlar paneli: Ctrl+K, qidirish, Enter vazifani ochadi', async () => js(`
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true})); ${W}
  const q=${$('#pal-q')}; if(!q) return 'panel ochilmadi';
  q.value='byudjet'; q.dispatchEvent(new Event('input'));
  const first=document.querySelector('.pal__item[aria-selected="true"]').textContent;
  q.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); ${W}${W}
  const dr=document.querySelector('.drawer');
  return /Forum byudjeti/.test(first) && !document.getElementById('pal-q') && dr && /Forum byudjeti/.test(dr.textContent) ? true : {first,dr:!!dr};`));
await test('buyruqlar paneli: o‘qlar bilan tanlash, sahifaga o‘tish, bo‘sh natija', async () => {
  await open('#/admin', 'admin');
  return js(`
    App.openPalette(); ${W}
    const q=${$('#pal-q')}; q.value='zzzqqq'; q.dispatchEvent(new Event('input'));
    const empty=!!document.querySelector('.pal__empty');
    q.value='faollik'; q.dispatchEvent(new Event('input'));
    q.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); ${W}${W}
    return empty && location.hash==='#/admin/activity' ? true : {empty,h:location.hash};`);
});
await test('sozlamalar: profil, parol xatolari, mavzu va til', async () => {
  await open('#/settings', 'malika');
  return js(`
    ${$('#st-name')}.value='Malika Yusupova-Ali'; ${$('#profile-form')}.requestSubmit(); ${W}
    const nameOk=App.Store.user('u_malika').name==='Malika Yusupova-Ali' && /Malika Yusupova-Ali/.test(${$('.side__who b')}.textContent);
    ${$('#st-cur')}.value='demo123'; ${$('#st-new')}.value='yangi123'; ${$('#st-new2')}.value='boshqa123'; ${$('#password-form')}.requestSubmit(); ${W}
    const mism=${$('#st-new2')}.getAttribute('aria-invalid')==='true';
    ${$('#st-cur')}.value='xato'; ${$('#st-new2')}.value='yangi123'; ${$('#password-form')}.requestSubmit(); ${W}
    const wrongCur=${$('#st-cur')}.getAttribute('aria-invalid')==='true';
    ${$('#st-theme-dark')}.click(); ${W}
    const dark=document.documentElement.getAttribute('data-theme')==='dark' && App.Store.settingsFor('u_malika').theme==='dark';
    ${$('#st-lang-ru')}.click(); ${W}
    const ru=App.I18n.lang==='ru'; ${$('#st-lang-uz')}.click(); ${$('#st-theme-system')}.click(); ${W}
    return nameOk && mism && wrongCur && dark && ru && !document.documentElement.hasAttribute('data-theme') && !document.getElementById('st-export') ? true : {nameOk,mism,wrongCur,dark,ru};`);
});
await test('sozlamalar (admin): zaxira eksport/import, namunalarni o‘chirish + bekor qilish', async () => {
  await open('#/settings', 'admin');
  return js(`
    let file=null; const orig=App.UI.download; App.UI.download=(n,c)=>{file={n,c}}; ${$('#st-export')}.click(); App.UI.download=orig;
    const parsed=JSON.parse(file.c); const expOk=parsed.tasks.length===24 && /\\.json$/.test(file.n);
    ${$('#st-clear-samples')}.click(); ${W}
    document.querySelector('.modal .btn--danger').click(); ${W}${W}
    const cleared=App.Store.db.tasks.length===0;
    ${$('#toast-undo')}.click(); ${W}
    const back=App.Store.db.tasks.length===24;
    const bad=App.Store.importJSON(App.me(), '{bu json emas'); const noAdmin=App.Store.importJSON(App.me(), JSON.stringify({users:[],tasks:[]}));
    parsed.tasks=parsed.tasks.slice(0,5); const good=App.Store.importJSON(App.me(), JSON.stringify(parsed));
    return expOk && cleared && back && !bad.ok && !noAdmin.ok && good.ok && App.Store.db.tasks.length===5 ? true : {expOk,cleared,back,bad:bad.ok,good:good.ok};`);
});
await test('sozlamalar (admin): hammasini o‘chirish → Xush kelibsiz', async () => js(`
  ${$('#st-wipe')}.click(); ${W}
  document.querySelector('.modal .btn--danger').click(); ${W}${W}
  return location.hash==='#/welcome' && !localStorage.getItem('tbpro.db.v1') && !!document.getElementById('start-demo');`));

/* ================= telefon ================= */
await test('telefon 390px: yonga surish yo‘q, pastki menyu, tablar', async () => {
  await width(390); await open('#/me/board', 'malika');
  return js(`return document.documentElement.scrollWidth<=390 && getComputedStyle(${$('.bottom-nav')}).display!=='none' && getComputedStyle(${$('.tabs')}).display!=='none' ? true : document.documentElement.scrollWidth;`);
});
for (const [hash, user] of [['#/admin', 'admin'], ['#/admin/reports', 'admin'], ['#/admin/activity', 'admin'], ['#/settings', 'admin'], ['#/settings', 'malika']]) {
  await test('telefon 390px: ' + hash + ' (' + user + ') yonga surilmaydi', async () => {
    await open(hash, user);
    return js(`return document.documentElement.scrollWidth<=390 ? true : document.documentElement.scrollWidth;`);
  });
}
await width(1440);

await test('sahifa xatolari yo‘q', async () => pageErrors.length === 0 ? true : pageErrors.slice(0, 3));

console.log('\n' + passed + ' ta brauzer testi o‘tdi' + (failed ? ', ' + failed + ' ta XATO' : '') + '.');
ws.close(); chrome.kill();
process.exit(failed ? 1 : 0);
