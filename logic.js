/*
 * Vazifalar taxtasi — mantiq (Bilet 010).
 * DOM'ga bog'liq emas: brauzerda ham, Node testlarida ham ishlaydi.
 */
(function (root) {
  'use strict';

  var STORAGE_KEY = 'taxta010.tasks';
  var STATUSES = ['new', 'doing', 'done'];
  var LABELS = { new: 'Yangi', doing: 'Bajarilmoqda', done: 'Tugagan' };
  // Ruxsat etilgan o'tishlar: qayerdan → qayerga
  var MOVES = { new: ['doing'], doing: ['new', 'done'], done: ['doing'] };
  var MIN = 2, MAX = 80;

  function cleanTitle(raw) {
    return String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
  }

  function validateTitle(raw, tasks) {
    var title = cleanTitle(raw);
    if (!title) return { ok: false, error: 'Vazifa nomini yozing.' };
    if (title.length < MIN) return { ok: false, error: 'Nom kamida ' + MIN + ' ta belgidan iborat bo‘lsin.' };
    if (title.length > MAX) return { ok: false, error: 'Nom ' + MAX + ' ta belgidan oshmasin (hozir ' + title.length + ' ta).' };
    var key = title.toLocaleLowerCase('uz');
    var dup = (tasks || []).filter(function (t) { return t.title.toLocaleLowerCase('uz') === key; })[0];
    if (dup) return { ok: false, error: 'Bunday vazifa allaqachon bor: “' + LABELS[dup.status] + '” ustunida.' };
    return { ok: true, value: title };
  }

  function addTask(tasks, raw, now, id) {
    var v = validateTitle(raw, tasks);
    if (!v.ok) return { ok: false, error: v.error, tasks: tasks };
    var t = now || Date.now();
    var task = { id: id || ('t' + t.toString(36) + Math.random().toString(36).slice(2, 6)), title: v.value, status: 'new', createdAt: t, updatedAt: t, sample: false };
    return { ok: true, task: task, tasks: tasks.concat([task]) };
  }

  function canMove(from, to) {
    return !!MOVES[from] && MOVES[from].indexOf(to) !== -1;
  }

  function moveTask(tasks, id, to, now) {
    var task = tasks.filter(function (t) { return t.id === id; })[0];
    if (!task) return { ok: false, error: 'Vazifa topilmadi.', tasks: tasks };
    if (!canMove(task.status, to)) return { ok: false, error: 'Bu o‘tish mumkin emas.', tasks: tasks };
    var t = now || Date.now();
    var moved = Object.assign({}, task, { status: to, updatedAt: t });
    return {
      ok: true,
      task: moved,
      tasks: tasks.map(function (x) { return x.id === id ? moved : x; })
    };
  }

  function counts(tasks) {
    var c = { new: 0, doing: 0, done: 0, total: tasks.length };
    tasks.forEach(function (t) { c[t.status]++; });
    c.donePercent = c.total ? Math.round((c.done / c.total) * 100) : 0;
    return c;
  }

  function byStatus(tasks, status) {
    // Oxirgi o'zgargan vazifa ustunning tepasida
    return tasks
      .filter(function (t) { return t.status === status; })
      .sort(function (a, b) { return b.updatedAt - a.updatedAt; });
  }

  function sampleTasks(now) {
    var t = now || Date.now();
    var rows = [
      ['Tadbir uchun zal band qilish', 'new', 4],
      ['Afisha matnini yozish', 'new', 3],
      ['Ishtirokchilar ro‘yxatini tuzish', 'doing', 2],
      ['Jamoa uchrashuvi vaqtini belgilash', 'done', 1]
    ];
    return rows.map(function (r, i) {
      var ts = t - r[2] * 60000;
      return { id: 'namuna' + (i + 1), title: r[0], status: r[1], createdAt: ts, updatedAt: ts, sample: true };
    });
  }

  // Saqlangan ma'lumotni tekshiradi; yaroqsiz yozuvlar tashlab yuboriladi
  function sanitize(data) {
    if (!Array.isArray(data)) return null;
    var seenIds = {}, seenTitles = {}, out = [];
    data.forEach(function (t) {
      if (!t || typeof t !== 'object') return;
      if (typeof t.id !== 'string' || !t.id || seenIds[t.id]) return;
      if (STATUSES.indexOf(t.status) === -1) return;
      var title = cleanTitle(t.title);
      if (title.length < MIN || title.length > MAX) return;
      var key = title.toLocaleLowerCase('uz');
      if (seenTitles[key]) return;
      var created = Number(t.createdAt), updated = Number(t.updatedAt);
      seenIds[t.id] = seenTitles[key] = true;
      out.push({
        id: t.id, title: title, status: t.status,
        createdAt: isFinite(created) ? created : 0,
        updatedAt: isFinite(updated) ? updated : (isFinite(created) ? created : 0),
        sample: t.sample === true
      });
    });
    return out;
  }

  function load(storage) {
    try {
      var raw = storage.getItem(STORAGE_KEY);
      if (raw === null) return null;          // birinchi ochilish
      return sanitize(JSON.parse(raw));       // null = buzilgan
    } catch (e) {
      return null;
    }
  }

  function save(storage, tasks) {
    try { storage.setItem(STORAGE_KEY, JSON.stringify(tasks)); return true; }
    catch (e) { return false; }
  }

  var api = {
    STORAGE_KEY: STORAGE_KEY, STATUSES: STATUSES, LABELS: LABELS, MIN: MIN, MAX: MAX,
    cleanTitle: cleanTitle, validateTitle: validateTitle, addTask: addTask,
    canMove: canMove, moveTask: moveTask, counts: counts, byStatus: byStatus,
    sampleTasks: sampleTasks, sanitize: sanitize, load: load, save: save
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Taxta = api;
})(this);
