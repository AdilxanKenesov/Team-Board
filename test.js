// Ishga tushirish: node test.js
const assert = require('assert');
const T = require('./logic.js');

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('✓ ' + name); }
function mem() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); } };
}

test('1: vazifa qo‘shiladi va “Yangi” ustuniga tushadi', () => {
  const r = T.addTask([], '  Hisobot   tayyorlash ', 1000, 'a');
  assert.ok(r.ok);
  assert.strictEqual(r.task.title, 'Hisobot tayyorlash');
  assert.strictEqual(r.task.status, 'new');
  assert.strictEqual(T.counts(r.tasks).new, 1);
});

test('Bilet sinovi: Yangi → Bajarilmoqda: Yangi −1, Bajarilmoqda +1', () => {
  let tasks = T.addTask([], 'Birinchi', 1, 'a').tasks;
  tasks = T.addTask(tasks, 'Ikkinchi', 2, 'b').tasks;
  const before = T.counts(tasks);
  const after = T.counts(T.moveTask(tasks, 'a', 'doing', 3).tasks);
  assert.strictEqual(after.new, before.new - 1);
  assert.strictEqual(after.doing, before.doing + 1);
  assert.strictEqual(after.total, before.total);
});

test('3: barcha ruxsat etilgan o‘tishlar ishlaydi', () => {
  let tasks = T.addTask([], 'Vazifa', 1, 'a').tasks;
  for (const to of ['doing', 'done', 'doing', 'new']) {
    const r = T.moveTask(tasks, 'a', to, 2);
    assert.ok(r.ok, to); tasks = r.tasks;
  }
});

test('Noto‘g‘ri o‘tishlar rad etiladi (takroriy bosish, sakrab o‘tish)', () => {
  let tasks = T.addTask([], 'Vazifa', 1, 'a').tasks;
  assert.strictEqual(T.moveTask(tasks, 'a', 'done').ok, false);   // Yangi → Tugagan to‘g‘ridan-to‘g‘ri emas
  tasks = T.moveTask(tasks, 'a', 'doing').tasks;
  const again = T.moveTask(tasks, 'a', 'doing');                  // ikkinchi bosish
  assert.strictEqual(again.ok, false);
  assert.strictEqual(T.counts(tasks).doing, 1);
  assert.strictEqual(T.moveTask(tasks, 'yoq', 'done').ok, false);
  assert.strictEqual(T.moveTask(tasks, 'a', 'xato').ok, false);
});

test('Nom tekshiruvi: bo‘sh, probel, qisqa, uzun, takror', () => {
  const tasks = T.addTask([], 'Hisobot', 1, 'a').tasks;
  assert.match(T.validateTitle('', tasks).error, /yozing/);
  assert.match(T.validateTitle('    ', tasks).error, /yozing/);
  assert.match(T.validateTitle('a', tasks).error, /kamida/);
  assert.match(T.validateTitle('x'.repeat(81), tasks).error, /oshmasin/);
  assert.match(T.validateTitle('  HISOBOT ', tasks).error, /allaqachon/);
  assert.ok(T.validateTitle('x'.repeat(80), tasks).ok);
  assert.ok(T.validateTitle('O‘g‘il bolalar to‘garagi', tasks).ok);
});

test('Ustun sonlari va foiz', () => {
  const s = T.sampleTasks(1e6);
  assert.deepStrictEqual(T.counts(s), { new: 2, doing: 1, done: 1, total: 4, donePercent: 25 });
  assert.strictEqual(T.counts([]).donePercent, 0);
});

test('4: saqlash va qayta yuklash', () => {
  const st = mem();
  let tasks = T.addTask([], 'Saqlanadigan', 1, 'a').tasks;
  tasks = T.moveTask(tasks, 'a', 'doing', 2).tasks;
  T.save(st, tasks);
  const back = T.load(st);
  assert.strictEqual(back.length, 1);
  assert.strictEqual(back[0].status, 'doing');
});

test('Buzilgan saqlangan ma’lumot saytni buzmaydi', () => {
  const st = mem();
  assert.strictEqual(T.load(st), null);
  st.setItem(T.STORAGE_KEY, '{buzuq');
  assert.strictEqual(T.load(st), null);
  st.setItem(T.STORAGE_KEY, '"matn"');
  assert.strictEqual(T.load(st), null);
  st.setItem(T.STORAGE_KEY, JSON.stringify([
    { id: 'a', title: 'Yaxshi', status: 'new', createdAt: 1, updatedAt: 1 },
    { id: 'a', title: 'Takror id', status: 'new' },
    { id: 'b', title: 'yaxshi', status: 'done' },
    { id: 'c', title: 'Holat xato', status: 'archived' },
    { id: 'd', title: '', status: 'new' },
    null, 5
  ]));
  const back = T.load(st);
  assert.strictEqual(back.length, 1);
  assert.strictEqual(back[0].title, 'Yaxshi');
});

test('Ustun ichida oxirgi o‘zgargan vazifa tepada', () => {
  let tasks = T.addTask([], 'Eski', 1, 'a').tasks;
  tasks = T.addTask(tasks, 'Yangi', 5, 'b').tasks;
  assert.deepStrictEqual(T.byStatus(tasks, 'new').map((t) => t.id), ['b', 'a']);
});

/* ===================== v2 ===================== */
const TODAY = '2026-10-07';

test('v2: mas’ul, muhimlik, muddat bilan qo‘shish', () => {
  const r = T.addTask([], 'Zal', 1, 'a', { assignee: '  Dilnoza ', priority: 'yuqori', due: '2026-10-09', today: TODAY });
  assert.ok(r.ok);
  assert.deepStrictEqual([r.task.assignee, r.task.priority, r.task.due], ['Dilnoza', 'yuqori', '2026-10-09']);
  const d = T.addTask([], 'Zal', 1, 'b');
  assert.deepStrictEqual([d.task.assignee, d.task.priority, d.task.due], [null, 'orta', null]);
  assert.strictEqual(T.addTask([], 'Zal', 1, 'c', { priority: 'juda' }).task.priority, 'orta');
});

test('v2: mas’ul va muddat tekshiruvi', () => {
  const add = (x) => T.addTask([], 'Zal', 1, 'a', Object.assign({ today: TODAY }, x));
  assert.match(add({ assignee: 'A' }).errors.assignee, /2–30/);
  assert.match(add({ assignee: 'x'.repeat(31) }).errors.assignee, /2–30/);
  assert.match(add({ due: '2026-02-30' }).errors.due, /noto‘g‘ri/);
  assert.match(add({ due: '07.10.2026' }).errors.due, /noto‘g‘ri/);
  assert.match(add({ due: '2026-10-06' }).errors.due, /oldin/);
  assert.ok(add({ due: TODAY }).ok);
  const both = T.addTask([], '', 1, 'a', { assignee: 'A', today: TODAY });
  assert.ok(both.errors.title && both.errors.assignee);
});

test('v2: tahrirlash — nom, takror (o‘zidan tashqari), o‘zgarishsiz saqlash', () => {
  let tasks = T.addTask([], 'Birinchi', 1, 'a').tasks;
  tasks = T.addTask(tasks, 'Ikkinchi', 2, 'b').tasks;
  assert.ok(T.editTask(tasks, 'a', { title: 'birinchi' }, 3).ok);            // o‘zi bilan to‘qnashmaydi
  assert.match(T.editTask(tasks, 'a', { title: 'IKKINCHI' }).error, /allaqachon/);
  assert.match(T.editTask(tasks, 'a', { title: ' ' }).error, /yozing/);
  const r = T.editTask(tasks, 'a', { title: 'Yangilangan', assignee: 'Jasur', priority: 'past' }, 9);
  assert.ok(r.ok && r.changed);
  assert.deepStrictEqual([r.task.title, r.task.assignee, r.task.priority, r.task.updatedAt], ['Yangilangan', 'Jasur', 'past', 9]);
  assert.strictEqual(r.task.status, 'new');
  assert.strictEqual(T.editTask(tasks, 'a', { title: 'Birinchi' }).changed, false);
  assert.strictEqual(T.editTask(tasks, 'yoq', { title: 'X y' }).ok, false);
});

test('v2: tahrirda eski o‘tgan muddat saqlanadi, yangi o‘tgan muddat rad', () => {
  const tasks = [{ id: 'a', title: 'Eski', status: 'doing', createdAt: 1, updatedAt: 1, sample: false, assignee: null, priority: 'orta', due: '2026-10-01' }];
  assert.ok(T.editTask(tasks, 'a', { title: 'Eski vazifa', due: '2026-10-01', today: TODAY }).ok);
  assert.match(T.editTask(tasks, 'a', { due: '2026-10-02', today: TODAY }).error, /oldin/);
  assert.strictEqual(T.editTask(tasks, 'a', { due: '', today: TODAY }).task.due, null);
});

test('v2: o‘chirish va bekor qilish (oldingi holatga qaytish)', () => {
  const tasks = T.addTask(T.addTask([], 'Bir', 1, 'a').tasks, 'Ikki', 2, 'b').tasks;
  const r = T.removeTask(tasks, 'a');
  assert.ok(r.ok);
  assert.deepStrictEqual(r.tasks.map((t) => t.id), ['b']);
  assert.strictEqual(tasks.length, 2);   // asl massiv o‘zgarmadi — undo uchun saqlab qo‘yiladi
  assert.strictEqual(T.removeTask(tasks, 'yoq').ok, false);
});

test('v2: tarix — eng yangisi tepada, 50 tadan oshmaydi', () => {
  let h = [];
  for (let i = 0; i < 55; i++) h = T.logEvent(h, { at: i, type: 'add', title: 'v' + i });
  assert.strictEqual(h.length, 50);
  assert.strictEqual(h[0].title, 'v54');
});

test('v2: muddati o‘tganini aniqlash', () => {
  const t = (status, due) => ({ status, due });
  assert.strictEqual(T.isOverdue(t('doing', '2026-10-06'), TODAY), true);
  assert.strictEqual(T.isOverdue(t('doing', TODAY), TODAY), false);
  assert.strictEqual(T.isOverdue(t('done', '2026-10-01'), TODAY), false);
  assert.strictEqual(T.isOverdue(t('new', null), TODAY), false);
});

test('v2: filtr — qidiruv (apostrof farqsiz), mas’ul, muhimlik', () => {
  const s = T.sampleTasks(new Date(2026, 9, 7, 10).getTime());
  assert.deepStrictEqual(T.filterTasks(s, { q: 'RO\'YXAT' }).map((t) => t.id), ['namuna3']);
  assert.deepStrictEqual(T.filterTasks(s, { q: 'roʻyxat' }).map((t) => t.id), ['namuna3']);
  assert.strictEqual(T.filterTasks(s, { q: 'malika' }).length, 1);
  assert.strictEqual(T.filterTasks(s, { assignee: 'Dilnoza' }).length, 1);
  assert.strictEqual(T.filterTasks(s, { assignee: '__none__' }).length, 1);
  assert.strictEqual(T.filterTasks(s, { priority: 'yuqori' }).length, 2);
  assert.strictEqual(T.filterTasks(s, { q: 'yoq narsa' }).length, 0);
  assert.strictEqual(T.filterTasks(s, {}).length, 4);
  assert.deepStrictEqual(T.assignees(s), ['Dilnoza', 'Jasur', 'Malika']);
});

test('v2: hisobot matni', () => {
  const s = T.sampleTasks(new Date(2026, 9, 7, 10).getTime());
  const r = T.buildReport(s, TODAY);
  assert.match(r, /hisobot \(07\.10\.2026\)/);
  assert.match(r, /Jami: 4 · Yangi: 2 · Bajarilmoqda: 1 · Tugagan: 1 \(25%\)/);
  assert.match(r, /Muddati o‘tgan \(1\): Ishtirokchilar ro‘yxatini tuzish/);
  assert.match(T.buildReport([], TODAY), /Muddati o‘tgan vazifa yo‘q/);
});

test('v2: sana yordamchilari', () => {
  assert.strictEqual(T.addDays('2026-12-31', 1), '2027-01-01');
  assert.strictEqual(T.addDays('2026-03-01', -1), '2026-02-28');
  assert.strictEqual(T.isValidDate('2028-02-29'), true);
  assert.strictEqual(T.isValidDate('2026-13-01'), false);
});

test('v2: saqlash, v1 dan ko‘chirish, buzilgan ma’lumot', () => {
  const st = mem();
  assert.strictEqual(T.loadState(st), null);
  // v1 formatdagi ma'lumot avtomatik ko'chadi
  st.setItem(T.STORAGE_KEY, JSON.stringify([{ id: 'a', title: 'Eski vazifa', status: 'doing', createdAt: 1, updatedAt: 1 }]));
  let s = T.loadState(st);
  assert.deepStrictEqual([s.tasks[0].priority, s.tasks[0].assignee, s.tasks[0].due, s.history.length], ['orta', null, null, 0]);
  // v2 saqlash va yuklash
  T.saveState(st, { tasks: s.tasks, history: T.logEvent([], { at: 5, type: 'move', title: 'Eski vazifa', from: 'new', to: 'doing' }) });
  s = T.loadState(st);
  assert.strictEqual(s.history[0].to, 'doing');
  // yaroqsiz maydonlar tozalanadi
  st.setItem(T.STATE_KEY, JSON.stringify({
    tasks: [{ id: 'a', title: 'Vazifa', status: 'new', priority: 'zo‘r', due: '2026-02-30', assignee: 'X' }],
    history: [{ at: 1, type: 'hack', title: 'x' }, { at: 2, type: 'add', title: 'ok' }, null]
  }));
  s = T.loadState(st);
  assert.deepStrictEqual([s.tasks[0].priority, s.tasks[0].due, s.tasks[0].assignee], ['orta', null, null]);
  assert.deepStrictEqual(s.history.map((e) => e.title), ['ok']);
  // butunlay buzilgan
  st.setItem(T.STATE_KEY, '{buzuq');
  assert.strictEqual(T.loadState(st), null);
  st.setItem(T.STATE_KEY, JSON.stringify({ tasks: 'yo‘q' }));
  assert.strictEqual(T.loadState(st), null);
});

console.log('\n' + passed + ' ta test o‘tdi.');
