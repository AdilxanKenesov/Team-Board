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

console.log('\n' + passed + ' ta test o‘tdi.');
