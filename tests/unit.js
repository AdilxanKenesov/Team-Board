// Ishga tushirish: node tests/unit.js
const assert = require('assert');
const crypto = require('crypto');
const sha256 = require('../js/core/sha256.js');
const L = require('../js/core/logic.js');
const S = require('../js/core/store.js');
const A = require('../js/core/auth.js');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('✓ ' + name); }
  catch (e) { failed++; console.log('✗ ' + name + '\n   ' + e.message); }
}
function mem() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; }, _d: d };
}
const TODAY = L.todayStr();

/* ---------- sha256 ---------- */
test('sha256: Node crypto bilan mos (o‘zbekcha harflar bilan)', () => {
  ['', 'abc', 'O‘g‘iloy 123', 'x'.repeat(200)].forEach((s) => assert.strictEqual(sha256(s), crypto.createHash('sha256').update(s, 'utf8').digest('hex')));
});

/* ---------- logic: foydalanuvchi ---------- */
test('foydalanuvchi: login, ism, parol tekshiruvi', () => {
  const users = [{ id: 'a', login: 'aziza' }];
  const r = L.validateUser({ name: 'A', login: 'Az', password: '123' }, users, null, { requirePassword: true });
  assert.ok(r.errors.name && r.errors.login && r.errors.password);
  assert.match(L.validateUser({ name: 'Ali', login: 'AZIZA', password: 'abc123' }, users, null, { requirePassword: true }).errors.login, /band/);
  assert.ok(L.validateUser({ name: 'Ali Valiyev', login: 'ali.v', password: 'abc123' }, users, null, { requirePassword: true }).ok);
  assert.match(L.validatePassword('abcdef'), /raqam/);
  assert.match(L.validatePassword('123456'), /harf/);
  assert.strictEqual(L.validatePassword('parol1'), null);
});

test('oxirgi faol admin o‘chirilmaydi, o‘zini faolsizlantira olmaydi', () => {
  const admin = { id: 'a', role: 'admin', active: true }, m = { id: 'm', role: 'member', active: true };
  assert.match(L.canChangeUser(admin, admin, 'deactivate', [admin, m]), /O‘z hisobingiz/);
  const admin2 = { id: 'b', role: 'admin', active: true };
  assert.strictEqual(L.canChangeUser(admin, admin2, 'deactivate', [admin, admin2]), null);
  assert.match(L.canChangeUser(admin2, admin, 'demote', [admin, { id: 'b', role: 'admin', active: false }]), /kamida bitta/i);
  assert.match(L.canChangeUser(m, admin, 'deactivate', [admin, m]), /Faqat/);
});

/* ---------- logic: vazifa ---------- */
const ctxBase = () => ({ tasks: [{ id: 't1', title: 'Zal', projectId: 'p1' }], users: [{ id: 'u1', active: true }, { id: 'u2', active: false }], projects: [{ id: 'p1' }], today: TODAY });

test('vazifa: nom, loyiha ichida takror, xodim, muddat, teglar, checklist', () => {
  let r = L.validateTask({ title: '', due: '2020-01-01', assigneeId: 'u2', projectId: 'yoq' }, ctxBase());
  assert.ok(r.errors.title && r.errors.due && r.errors.assigneeId && r.errors.projectId);
  assert.match(L.validateTask({ title: ' zal ', projectId: 'p1' }, ctxBase()).errors.title, /shunday nomli/);
  assert.ok(L.validateTask({ title: 'Zal', projectId: null }, ctxBase()).ok);      // boshqa loyihada — mumkin
  r = L.validateTask({ title: 'Yangi', tags: '#Dizayn, dizayn, sayt', checklist: [{ text: ' a ' }, { text: '' }], due: TODAY }, ctxBase());
  assert.ok(r.ok);
  assert.deepStrictEqual(r.value.tags, ['dizayn', 'sayt']);
  assert.strictEqual(r.value.checklist.length, 1);
  assert.match(L.validateTask({ title: 'Ok', tags: 'a,b,c,d,e,f,g' }, ctxBase()).errors.tags, /6/);
  assert.match(L.validateTask({ title: 'x'.repeat(121) }, ctxBase()).errors.title, /120 ta belgidan oshmasin/);
});

test('tahrirda eski o‘tgan muddat va faolsiz xodim saqlanadi', () => {
  const orig = { id: 't9', title: 'Eski', due: '2020-01-01', assigneeId: 'u2', status: 'doing' };
  const r = L.validateTask(Object.assign({}, orig), Object.assign(ctxBase(), { original: orig, exceptId: 't9' }));
  assert.ok(r.ok, JSON.stringify(r.errors));
});

test('ruxsatlar: xodim faqat o‘z vazifasini ko‘radi va holatini o‘zgartiradi', () => {
  const admin = { id: 'a', role: 'admin', active: true }, m = { id: 'm', role: 'member', active: true };
  const mine = { assigneeId: 'm' }, other = { assigneeId: 'x' };
  assert.ok(L.can(admin, 'delete', other));
  assert.ok(L.can(m, 'status', mine) && L.can(m, 'comment', mine) && L.can(m, 'checklist', mine));
  assert.ok(!L.can(m, 'status', other) && !L.can(m, 'edit', mine) && !L.can(m, 'create') && !L.can(m, 'delete', mine));
  assert.ok(!L.can(Object.assign({}, m, { active: false }), 'status', mine));
  assert.deepStrictEqual(L.visibleTasks(m, [mine, other]), [mine]);
});

test('statistika: holatlar, muddatlar, xodimlar, kunlik', () => {
  const tasks = [
    { status: 'new', due: L.addDays(TODAY, -1), assigneeId: 'a' },
    { status: 'doing', due: L.addDays(TODAY, 1), assigneeId: 'a' },
    { status: 'done', due: L.addDays(TODAY, -3), assigneeId: 'b', completedAt: Date.now() }
  ];
  const c = L.counts(tasks, TODAY);
  assert.deepStrictEqual([c.new, c.doing, c.done, c.overdue, c.dueSoon, c.donePercent], [1, 1, 1, 1, 1, 33]);
  const pu = L.perUser(tasks, [{ id: 'a', name: 'A', role: 'member' }, { id: 'b', name: 'B', role: 'member' }], TODAY);
  assert.strictEqual(pu[0].user.id, 'a');
  assert.strictEqual(pu[1].percent, 100);
  const d = L.daily(tasks, TODAY, 7);
  assert.strictEqual(d.length, 7);
  assert.strictEqual(d[6].done, 1);
});

test('filtr va saralash', () => {
  const users = [{ id: 'u1', name: 'Malika' }];
  const tasks = [
    { id: '1', title: 'Ro‘yxat tuzish', tags: ['tashkiliy'], assigneeId: 'u1', priority: 'past', status: 'new', due: null, updatedAt: 1 },
    { id: '2', title: 'Afisha', tags: ['dizayn'], assigneeId: null, priority: 'yuqori', status: 'doing', due: '2030-01-01', updatedAt: 2 }
  ];
  assert.deepStrictEqual(L.filterTasks(tasks, { q: "ro'yxat" }, users).map((t) => t.id), ['1']);
  assert.deepStrictEqual(L.filterTasks(tasks, { q: 'malika' }, users).map((t) => t.id), ['1']);
  assert.deepStrictEqual(L.filterTasks(tasks, { assigneeId: '__none__' }).map((t) => t.id), ['2']);
  assert.deepStrictEqual(L.filterTasks(tasks, { tag: 'dizayn' }).map((t) => t.id), ['2']);
  assert.deepStrictEqual(L.sortTasks(tasks, 'priority', 'asc').map((t) => t.id), ['2', '1']);
  assert.deepStrictEqual(L.sortTasks(tasks, 'due', 'asc').map((t) => t.id), ['2', '1']);
});

test('CSV: ; ajratgich, qo‘shtirnoq, formula himoyasi, BOM', () => {
  const csv = L.toCSV([['a;b', 'say "hi"', '=SUM(1)'], ['x', '', 5]]);
  assert.ok(csv.startsWith('﻿'));
  assert.ok(csv.includes('"a;b";"say ""hi""";\'=SUM(1)'));
});

test('muddat eslatmalari kuniga bir marta', () => {
  const tasks = [{ id: 't', title: 'X', assigneeId: 'u', status: 'doing', due: L.addDays(TODAY, -1) },
                 { id: 's', title: 'Y', assigneeId: 'u', status: 'new', due: L.addDays(TODAY, 1) },
                 { id: 'd', title: 'Z', assigneeId: 'u', status: 'done', due: L.addDays(TODAY, -1) }];
  const first = L.dueReminders(tasks, [], TODAY);
  assert.deepStrictEqual(first.map((n) => n.type).sort(), ['due-soon', 'overdue']);
  assert.strictEqual(L.dueReminders(tasks, first, TODAY).length, 0);
});

/* ---------- store + auth ---------- */
function freshDemo() {
  const st = mem();
  S.init(st); A.init(st);
  S.loadDemo(Date.now());
  return st;
}

test('demo: 7 foydalanuvchi, 3 loyiha, 24 vazifa; sanitize’dan o‘tadi', () => {
  freshDemo();
  assert.strictEqual(S.db.users.length, 7);
  assert.strictEqual(S.db.projects.length, 3);
  assert.strictEqual(S.db.tasks.length, 24);
  const again = S.sanitize(JSON.parse(JSON.stringify(S.db)));
  assert.strictEqual(again.tasks.length, 24);
  assert.ok(S.db.tasks.some((t) => L.isOverdue(t, TODAY)));
});

test('auth: to‘g‘ri va noto‘g‘ri parol, faolsiz hisob, sessiya', () => {
  freshDemo();
  assert.match(A.login('admin', 'xato1').error, /noto‘g‘ri/);
  const ok = A.login(' ADMIN ', 'admin123', false);
  assert.ok(ok.ok && ok.user.role === 'admin');
  assert.strictEqual(A.currentUser().id, 'u_admin');
  A.logout();
  assert.strictEqual(A.currentUser(), null);
  S.db.users.find((u) => u.login === 'jasur').active = false;
  assert.match(A.login('jasur', 'demo123').error, /faolsizlantirilgan/);
});

test('auth: demo hisoblar — kodda ochiq parol yo‘q, bir bosishda kirish faqat demo rejimda', () => {
  const fs = require('fs');
  const code = ['js/core/store.js', 'js/core/auth.js', 'js/views/auth.js'].map((f) => fs.readFileSync(__dirname + '/../' + f, 'utf8')).join('\n');
  assert.ok(!/admin123|demo123/.test(code), 'brauzer kodida ochiq parol bor');
  freshDemo();
  assert.ok(A.login('admin', 'admin123').ok, 'xesh oldingi parolga mos');           // sun'iy sinov paroli xesh orqali tekshiriladi
  A.logout();
  const d = A.demoLogin('malika', false);
  assert.ok(d.ok && d.user.id === 'u_malika');
  A.logout();
  const mal = S.user('u_malika');
  assert.ok(S.changeOwnPassword(mal, 'demo123', 'yangi123').ok);
  assert.ok(!S.user('u_malika').demo);
  assert.ok(!A.demoLogin('malika').ok, 'paroli o‘zgargan hisobga parolsiz kirib bo‘lmaydi');
  S.db.demo = false;
  assert.ok(!A.demoLogin('jasur').ok, 'demo bo‘lmagan ma’lumotda parolsiz kirish yo‘q');
});

test('auth: 5 ta xato urinishdan keyin 30 soniya blok', () => {
  freshDemo();
  let now = 1e12; A.now = () => now;
  for (let i = 0; i < 4; i++) assert.ok(!A.login('admin', 'yoq123').lockMs);
  assert.ok(A.login('admin', 'yoq123').lockMs > 0);
  assert.match(A.login('admin', 'admin123').error, /ko‘p urinish/);       // to‘g‘ri parol ham blokda
  now += 31000;
  assert.ok(A.login('admin', 'admin123').ok);
  A.now = () => Date.now();
});

test('auth: sessiya muddati tugasa chiqariladi', () => {
  freshDemo();
  let now = 2e12; A.now = () => now;
  A.login('malika', 'demo123', false);
  assert.ok(A.currentUser());
  now += 13 * 3600000;
  assert.strictEqual(A.currentUser(), null);
  A.now = () => Date.now();
});

test('store: admin vazifa yaratadi → xodimga bildirishnoma; xodim ruxsatlari', () => {
  freshDemo();
  const admin = S.user('u_admin'), bek = S.user('u_bekzod');
  const before = S.unreadCount('u_bekzod');
  const r = S.createTask(admin, { title: 'Yangi sinov vazifa', assigneeId: 'u_bekzod', priority: 'yuqori', due: TODAY });
  assert.ok(r.ok);
  assert.strictEqual(S.unreadCount('u_bekzod'), before + 1);
  assert.strictEqual(S.createTask(bek, { title: 'Men yaratay' }).ok, false);
  assert.strictEqual(S.updateTask(bek, r.task.id, { title: 'O‘zgartiray' }).ok, false);
  const other = S.db.tasks.find((t) => t.assigneeId === 'u_jasur');
  assert.strictEqual(S.moveTask(bek, other.id, 'doing').ok, false);
  // xodim o'z vazifasini faqat ish oqimi bo'yicha o'tkazadi
  assert.strictEqual(S.moveTask(bek, r.task.id, 'done').ok, false);
  const mv = S.moveTask(bek, r.task.id, 'doing');
  assert.ok(mv.ok);
  assert.ok(S.notificationsFor('u_admin').some((n) => n.type === 'status' && n.taskId === r.task.id));
});

test('store: bekor qilish oldingi holatni qaytaradi', () => {
  freshDemo();
  const admin = S.user('u_admin');
  const n = S.db.tasks.length;
  S.deleteTask(admin, 't_1');
  assert.strictEqual(S.db.tasks.length, n - 1);
  assert.ok(S.undo());
  assert.strictEqual(S.db.tasks.length, n);
  assert.ok(S.task('t_1'));
});

test('store: izoh, checklist, ommaviy amal, loyiha, xodim', () => {
  freshDemo();
  const admin = S.user('u_admin'), mal = S.user('u_malika');
  assert.ok(S.addComment(mal, 't_2', 'Tayyor').ok);
  assert.strictEqual(S.addComment(mal, 't_11', 'Begona').ok, false);
  const it = S.task('t_2').checklist[2], wasDone = it.done;
  assert.ok(S.toggleCheck(mal, 't_2', it.id).ok);
  assert.strictEqual(S.task('t_2').checklist[2].done, !wasDone);
  assert.strictEqual(S.bulk(admin, ['t_7', 't_8'], { status: 'done' }).ok, true);
  assert.ok(S.task('t_7').completedAt);
  assert.match(S.saveProject(admin, null, { name: 'yoshlar forumi' }).errors.name, /bor/);
  const u = S.saveUser(admin, null, { name: 'Yangi Xodim', login: 'yangi', password: 'parol1', role: 'member' });
  assert.ok(u.ok);
  assert.ok(A.login('yangi', 'parol1').ok);
  assert.match(S.setUserActive(admin, 'u_admin', false).error, /O‘z hisobingiz/);
});

test('store: parolni o‘zgartirish va admin tomonidan tiklash', () => {
  freshDemo();
  const mal = S.user('u_malika'), admin = S.user('u_admin');
  assert.match(S.changeOwnPassword(mal, 'xato', 'yangi12').errors.current, /noto‘g‘ri/);
  assert.ok(S.changeOwnPassword(mal, 'demo123', 'yangi12').ok);
  assert.ok(A.login('malika', 'yangi12').ok);
  assert.ok(S.resetPassword(admin, 'u_malika', 'tikla12').ok);
  assert.ok(S.user('u_malika').mustChange);
  assert.ok(A.login('malika', 'tikla12').ok);
});

test('store: buzilgan saqlangan ma’lumot va import', () => {
  const st = mem();
  st.setItem(S.KEY, '{buzuq');
  assert.strictEqual(S.init(st), null);
  st.setItem(S.KEY, JSON.stringify({ users: 'yoq' }));
  assert.strictEqual(S.init(st), null);
  freshDemo();
  const admin = S.user('u_admin');
  const json = S.exportJSON();
  assert.match(S.importJSON(admin, '{yoq').error, /JSON/);
  assert.match(S.importJSON(admin, JSON.stringify({ users: [] })).error, /administrator/);
  assert.ok(S.importJSON(admin, json).ok);
});

test('store: sozlash (birinchi admin)', () => {
  const st = mem(); S.init(st); A.init(st);
  assert.strictEqual(S.setup({ name: 'A', login: 'x', password: '1' }).ok, false);
  const r = S.setup({ name: 'Bosh Admin', login: 'boss', password: 'parol1' });
  assert.ok(r.ok && r.user.role === 'admin');
  assert.ok(A.login('boss', 'parol1').ok);
});

test('statistika: muddat guruhlari, muhimlik, o‘rtacha bajarish vaqti', () => {
  const today = '2026-10-07', day = 86400000;
  const tk = [
    { status: 'new', due: '2026-10-05', priority: 'yuqori' }, { status: 'doing', due: '2026-10-07', priority: 'orta' },
    { status: 'new', due: '2026-10-12', priority: 'orta' }, { status: 'new', due: '2026-11-20', priority: 'past' },
    { status: 'doing', due: null, priority: 'yuqori' }, { status: 'done', due: '2026-10-01', priority: 'yuqori', createdAt: day, completedAt: 4 * day },
    { status: 'done', due: null, priority: 'past', createdAt: day, completedAt: 2 * day }];
  assert.deepStrictEqual(L.dueBuckets(tk, today), { overdue: 1, today: 1, week: 1, later: 1, none: 1 });
  assert.deepStrictEqual(L.openByPriority(tk), { yuqori: 2, orta: 2, past: 1 });
  assert.strictEqual(L.avgCompletionDays(tk), 2);
  assert.strictEqual(L.avgCompletionDays([{ status: 'new' }]), null);
});

test('i18n: koddagi har bir matnning ruscha tarjimasi bor, o‘rinlar ({x}) mos', () => {
  const fs = require('fs'), vm = require('vm');
  const RU = {};
  vm.runInNewContext(fs.readFileSync(__dirname + '/../js/core/i18n-ru.js', 'utf8'), { window: { App: { I18n: { add: (d) => Object.assign(RU, d) } } } });
  const keys = require('./i18n-keys.js')();
  const missing = keys.filter((k) => !RU[k]);
  assert.deepStrictEqual(missing, [], 'tarjimasi yo‘q: ' + missing.join(' | '));
  const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
  const bad = Object.keys(RU).filter((k) => ph(k) !== ph(RU[k]));
  assert.deepStrictEqual(bad, [], 'o‘rinlar mos emas: ' + bad.join(' | '));
  assert.ok(Object.keys(L.NOTIF_TPL).every((k) => RU[L.NOTIF_TPL[k]]), 'bildirishnoma shablonlari tarjima qilinmagan');
  const src = fs.readFileSync(__dirname + '/../js/core/i18n-ru.js', 'utf8');
  const all = [...src.matchAll(/^\s*'((?:[^'\\]|\\.)*)':/gm)].map((m) => m[1]);
  const dups = all.filter((k, i) => all.indexOf(k) !== i);
  assert.deepStrictEqual(dups, [], 'lug‘atda takroriy kalit: ' + dups.join(' | '));
});

console.log('\n' + passed + ' ta test o‘tdi' + (failed ? ', ' + failed + ' ta XATO' : '') + '.');
process.exit(failed ? 1 : 0);
