/*
 * Jamoa taxtasi — mantiq (Bilet 010).
 * DOM'ga bog'liq emas: brauzerda ham, Node testlarida ham ishlaydi.
 */
(function (root) {
  'use strict';

  var STORAGE_KEY = 'taxta010.tasks';   // v1 format (faqat massiv)
  var STATE_KEY = 'taxta010.v2';        // v2: { tasks, history }
  var STATUSES = ['new', 'doing', 'done'];
  var LABELS = { new: 'Yangi', doing: 'Bajarilmoqda', done: 'Tugagan' };
  var PRIORITIES = ['yuqori', 'orta', 'past'];
  var PRIORITY_LABELS = { yuqori: 'Yuqori', orta: 'O‘rta', past: 'Past' };
  // Ruxsat etilgan o'tishlar: qayerdan → qayerga
  var MOVES = { new: ['doing'], doing: ['new', 'done'], done: ['doing'] };
  var MIN = 2, MAX = 80, A_MIN = 2, A_MAX = 30, HISTORY_MAX = 50;

  /* ---------- yordamchilar ---------- */

  function cleanTitle(raw) {
    return String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
  }

  // Qidiruv va takrorni solishtirish uchun: katta-kichik harf va o'zbekcha apostrof farqsiz
  function norm(s) {
    return cleanTitle(s).toLocaleLowerCase('uz').replace(/[‘’ʻʼ`´']/g, '\'');
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function todayStr(date) {
    var d = date || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function addDays(dateStr, days) {
    var p = dateStr.split('-').map(Number);
    var d = new Date(p[0], p[1] - 1, p[2] + days);
    return todayStr(d);
  }

  function isValidDate(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var p = s.split('-').map(Number);
    var d = new Date(p[0], p[1] - 1, p[2]);
    return d.getFullYear() === p[0] && d.getMonth() === p[1] - 1 && d.getDate() === p[2];
  }

  /* ---------- tekshiruvlar ---------- */

  function validateTitle(raw, tasks, exceptId) {
    var title = cleanTitle(raw);
    if (!title) return { ok: false, error: 'Vazifa nomini yozing.' };
    if (title.length < MIN) return { ok: false, error: 'Nom kamida ' + MIN + ' ta belgidan iborat bo‘lsin.' };
    if (title.length > MAX) return { ok: false, error: 'Nom ' + MAX + ' ta belgidan oshmasin (hozir ' + title.length + ' ta).' };
    var key = norm(title);
    var dup = (tasks || []).filter(function (t) { return t.id !== exceptId && norm(t.title) === key; })[0];
    if (dup) return { ok: false, error: 'Bunday vazifa allaqachon bor: “' + LABELS[dup.status] + '” ustunida.' };
    return { ok: true, value: title };
  }

  function validateAssignee(raw) {
    var v = cleanTitle(raw);
    if (!v) return { ok: true, value: null };
    if (v.length < A_MIN || v.length > A_MAX) return { ok: false, error: 'Mas’ul ismi ' + A_MIN + '–' + A_MAX + ' ta belgi bo‘lsin.' };
    return { ok: true, value: v };
  }

  function validatePriority(raw) {
    return PRIORITIES.indexOf(raw) !== -1 ? raw : 'orta';
  }

  // allowPast: tahrirda eski (o'zgarmagan) muddat qabul qilinadi
  function validateDue(raw, today, allowPast) {
    var v = raw == null ? '' : String(raw).trim();
    if (!v) return { ok: true, value: null };
    if (!isValidDate(v)) return { ok: false, error: 'Muddat noto‘g‘ri sana.' };
    if (!allowPast && v < (today || todayStr())) return { ok: false, error: 'Muddat bugundan oldin bo‘lmasin.' };
    return { ok: true, value: v };
  }

  /* ---------- amallar (asl massiv o'zgartirilmaydi) ---------- */

  // extra: { assignee, priority, due, today } — ixtiyoriy
  function addTask(tasks, raw, now, id, extra) {
    var x = extra || {};
    var errors = {};
    var t = validateTitle(raw, tasks);
    var a = validateAssignee(x.assignee);
    var d = validateDue(x.due, x.today);
    if (!t.ok) errors.title = t.error;
    if (!a.ok) errors.assignee = a.error;
    if (!d.ok) errors.due = d.error;
    if (!t.ok || !a.ok || !d.ok) {
      return { ok: false, error: t.error || a.error || d.error, errors: errors, tasks: tasks };
    }
    var ts = now || Date.now();
    var task = {
      id: id || ('t' + ts.toString(36) + Math.random().toString(36).slice(2, 6)),
      title: t.value, status: 'new', createdAt: ts, updatedAt: ts, sample: false,
      assignee: a.value, priority: validatePriority(x.priority), due: d.value
    };
    return { ok: true, task: task, tasks: tasks.concat([task]) };
  }

  function canMove(from, to) {
    return !!MOVES[from] && MOVES[from].indexOf(to) !== -1;
  }

  function findTask(tasks, id) {
    return tasks.filter(function (t) { return t.id === id; })[0];
  }

  function moveTask(tasks, id, to, now) {
    var task = findTask(tasks, id);
    if (!task) return { ok: false, error: 'Vazifa topilmadi.', tasks: tasks };
    if (!canMove(task.status, to)) return { ok: false, error: 'Bu ustunga o‘tkazib bo‘lmaydi.', tasks: tasks };
    var moved = Object.assign({}, task, { status: to, updatedAt: now || Date.now() });
    return { ok: true, task: moved, from: task.status, tasks: tasks.map(function (x) { return x.id === id ? moved : x; }) };
  }

  // patch: { title?, assignee?, priority?, due?, today? }
  function editTask(tasks, id, patch, now) {
    var task = findTask(tasks, id);
    if (!task) return { ok: false, error: 'Vazifa topilmadi.', errors: {}, tasks: tasks };
    var p = patch || {};
    var errors = {};
    var next = Object.assign({}, task);

    if ('title' in p) {
      var t = validateTitle(p.title, tasks, id);
      if (t.ok) next.title = t.value; else errors.title = t.error;
    }
    if ('assignee' in p) {
      var a = validateAssignee(p.assignee);
      if (a.ok) next.assignee = a.value; else errors.assignee = a.error;
    }
    if ('priority' in p) next.priority = validatePriority(p.priority);
    if ('due' in p) {
      var unchanged = (p.due || null) === task.due;
      var d = validateDue(p.due, p.today, unchanged);
      if (d.ok) next.due = d.value; else errors.due = d.error;
    }

    var keys = Object.keys(errors);
    if (keys.length) return { ok: false, error: errors[keys[0]], errors: errors, tasks: tasks };

    var changed = ['title', 'assignee', 'priority', 'due'].some(function (k) { return next[k] !== task[k]; });
    if (!changed) return { ok: true, changed: false, task: task, tasks: tasks };
    next.updatedAt = now || Date.now();
    return { ok: true, changed: true, task: next, tasks: tasks.map(function (x) { return x.id === id ? next : x; }) };
  }

  function removeTask(tasks, id) {
    var task = findTask(tasks, id);
    if (!task) return { ok: false, error: 'Vazifa topilmadi.', tasks: tasks };
    return { ok: true, task: task, tasks: tasks.filter(function (x) { return x.id !== id; }) };
  }

  /* ---------- tarix ---------- */

  function logEvent(history, ev) {
    return [Object.assign({ at: Date.now() }, ev)].concat(history || []).slice(0, HISTORY_MAX);
  }

  /* ---------- ko'rinish uchun hisoblar ---------- */

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

  function isOverdue(task, today) {
    return !!task.due && task.status !== 'done' && task.due < (today || todayStr());
  }

  // f: { q, assignee, priority } — bo'sh qiymatlar filtr qilmaydi
  function filterTasks(tasks, f) {
    var q = norm(f && f.q);
    var who = f && f.assignee;
    var pr = f && f.priority;
    return tasks.filter(function (t) {
      if (q && norm(t.title).indexOf(q) === -1 && norm(t.assignee || '').indexOf(q) === -1) return false;
      if (who === '__none__' && t.assignee) return false;
      if (who && who !== '__none__' && t.assignee !== who) return false;
      if (pr && t.priority !== pr) return false;
      return true;
    });
  }

  function assignees(tasks) {
    var seen = {};
    tasks.forEach(function (t) { if (t.assignee) seen[t.assignee] = true; });
    return Object.keys(seen).sort(function (a, b) { return a.localeCompare(b, 'uz'); });
  }

  function fmtDue(due) {
    if (!due) return '';
    var p = due.split('-');
    return p[2] + '.' + p[1] + '.' + p[0];
  }

  // Yig'ilish uchun matnli hisobot
  function buildReport(tasks, today) {
    var day = today || todayStr();
    var c = counts(tasks);
    var lines = ['Jamoa taxtasi — hisobot (' + fmtDue(day) + ')', ''];
    lines.push('Jami: ' + c.total + ' · Yangi: ' + c.new + ' · Bajarilmoqda: ' + c.doing + ' · Tugagan: ' + c.done + ' (' + c.donePercent + '%)');
    STATUSES.forEach(function (s) {
      var list = byStatus(tasks, s);
      lines.push('', LABELS[s] + ' (' + list.length + '):');
      if (!list.length) lines.push('  —');
      list.forEach(function (t) {
        var meta = [];
        if (t.assignee) meta.push(t.assignee);
        if (t.priority !== 'orta') meta.push(PRIORITY_LABELS[t.priority].toLowerCase() + ' muhimlik');
        if (t.due) meta.push('muddat ' + fmtDue(t.due));
        lines.push('  • ' + t.title + (meta.length ? ' — ' + meta.join(', ') : ''));
      });
    });
    var late = tasks.filter(function (t) { return isOverdue(t, day); });
    lines.push('', late.length
      ? 'Muddati o‘tgan (' + late.length + '): ' + late.map(function (t) { return t.title; }).join('; ')
      : 'Muddati o‘tgan vazifa yo‘q.');
    return lines.join('\n');
  }

  /* ---------- namuna ma'lumot ---------- */

  // Namuna: jamoa yoshlar markazida tadbir tayyorlayapti (barcha ism va ishlar to'qima).
  // [nom, holat, necha daqiqa oldin o'zgargan, mas'ul, muhimlik, muddat (bugundan necha kun)]
  var SAMPLE_ROWS = [
    ['Tadbir uchun zal band qilish', 'new', 200, 'Dilnoza', 'yuqori', 2],
    ['Afisha matnini yozish', 'new', 190, 'Jasur', 'orta', 5],
    ['Ijtimoiy tarmoq uchun post tayyorlash', 'new', 10, 'Madina', 'past', 6],
    ['Mehmonlar ro‘yxatini tasdiqlash', 'new', 170, null, 'orta', null],
    ['Ishtirokchilar ro‘yxatini tuzish', 'doing', 60, 'Malika', 'yuqori', -1],
    ['Taqdimot slaydlarini tayyorlash', 'doing', 120, 'Sardor', 'orta', 3],
    ['Ovoz tizimini sinab ko‘rish', 'doing', 20, 'Bekzod', 'yuqori', 1],
    ['Jamoa uchrashuvi vaqtini belgilash', 'done', 240, null, 'past', null],
    ['Homiylarga xat yuborish', 'done', 40, 'Dilnoza', 'orta', -3],
    ['Byudjet rejasini tasdiqlash', 'done', 90, 'Sardor', 'yuqori', -2]
  ];

  function sampleTasks(now) {
    var t = now || Date.now();
    var day = todayStr(new Date(t));
    return SAMPLE_ROWS.map(function (r, i) {
      var ts = t - r[2] * 60000;
      return {
        id: 'namuna' + (i + 1), title: r[0], status: r[1], createdAt: ts, updatedAt: ts, sample: true,
        assignee: r[3], priority: r[4], due: r[5] === null ? null : addDays(day, r[5])
      };
    });
  }

  // Namuna tarix — vazifalardagi vaqtlar bilan mos; eng yangisi birinchi
  function sampleHistory(now) {
    var t = now || Date.now();
    var ev = [
      [180, 'add', 'Byudjet rejasini tasdiqlash', null, 'new'],
      [150, 'move', 'Byudjet rejasini tasdiqlash', 'new', 'doing'],
      [140, 'add', 'Homiylarga xat yuborish', null, 'new'],
      [120, 'move', 'Taqdimot slaydlarini tayyorlash', 'new', 'doing'],
      [90, 'move', 'Byudjet rejasini tasdiqlash', 'doing', 'done'],
      [60, 'move', 'Ishtirokchilar ro‘yxatini tuzish', 'new', 'doing'],
      [40, 'move', 'Homiylarga xat yuborish', 'doing', 'done'],
      [20, 'move', 'Ovoz tizimini sinab ko‘rish', 'new', 'doing'],
      [10, 'add', 'Ijtimoiy tarmoq uchun post tayyorlash', null, 'new']
    ];
    return ev.map(function (e) {
      var x = { at: t - e[0] * 60000, type: e[1], title: e[2], to: e[4] };
      if (e[3]) x.from = e[3];
      return x;
    }).reverse();
  }

  /* ---------- saqlash ---------- */

  // Saqlangan vazifalarni tekshiradi; yaroqsizlari tashlanadi. Massiv bo'lmasa — null.
  function sanitize(data) {
    if (!Array.isArray(data)) return null;
    var seenIds = {}, seenTitles = {}, out = [];
    data.forEach(function (t) {
      if (!t || typeof t !== 'object') return;
      if (typeof t.id !== 'string' || !t.id || seenIds[t.id]) return;
      if (STATUSES.indexOf(t.status) === -1) return;
      var title = cleanTitle(t.title);
      if (title.length < MIN || title.length > MAX) return;
      var key = norm(title);
      if (seenTitles[key]) return;
      var created = Number(t.createdAt), updated = Number(t.updatedAt);
      var a = validateAssignee(t.assignee);
      seenIds[t.id] = seenTitles[key] = true;
      out.push({
        id: t.id, title: title, status: t.status,
        createdAt: isFinite(created) ? created : 0,
        updatedAt: isFinite(updated) ? updated : (isFinite(created) ? created : 0),
        sample: t.sample === true,
        assignee: a.ok ? a.value : null,
        priority: validatePriority(t.priority),
        due: isValidDate(t.due) ? t.due : null
      });
    });
    return out;
  }

  function sanitizeHistory(data) {
    if (!Array.isArray(data)) return [];
    var types = ['add', 'move', 'edit', 'remove', 'clear'];
    return data.filter(function (e) {
      return e && typeof e === 'object' && types.indexOf(e.type) !== -1 &&
        isFinite(Number(e.at)) && typeof e.title === 'string' &&
        (e.from === undefined || STATUSES.indexOf(e.from) !== -1) &&
        (e.to === undefined || STATUSES.indexOf(e.to) !== -1);
    }).slice(0, HISTORY_MAX);
  }

  // v1 (faqat vazifalar massivi) — eski testlar va eski ma'lumot uchun
  function load(storage) {
    try {
      var raw = storage.getItem(STORAGE_KEY);
      if (raw === null) return null;
      return sanitize(JSON.parse(raw));
    } catch (e) {
      return null;
    }
  }

  function save(storage, tasks) {
    try { storage.setItem(STORAGE_KEY, JSON.stringify(tasks)); return true; }
    catch (e) { return false; }
  }

  // v2: { tasks, history }. Hech narsa yo'q yoki butunlay buzilgan — null.
  function loadState(storage) {
    try {
      var raw = storage.getItem(STATE_KEY);
      if (raw !== null) {
        var obj = JSON.parse(raw);
        var tasks = obj && sanitize(obj.tasks);
        if (!tasks) return null;
        return { tasks: tasks, history: sanitizeHistory(obj.history) };
      }
      var v1 = load(storage);                     // eski formatdan ko'chirish
      return v1 ? { tasks: v1, history: [] } : null;
    } catch (e) {
      return null;
    }
  }

  function saveState(storage, state) {
    try { storage.setItem(STATE_KEY, JSON.stringify(state)); return true; }
    catch (e) { return false; }
  }

  var api = {
    STORAGE_KEY: STORAGE_KEY, STATE_KEY: STATE_KEY, STATUSES: STATUSES, LABELS: LABELS,
    PRIORITIES: PRIORITIES, PRIORITY_LABELS: PRIORITY_LABELS, MIN: MIN, MAX: MAX,
    cleanTitle: cleanTitle, norm: norm, todayStr: todayStr, addDays: addDays, isValidDate: isValidDate,
    validateTitle: validateTitle, validateAssignee: validateAssignee, validatePriority: validatePriority, validateDue: validateDue,
    addTask: addTask, canMove: canMove, moveTask: moveTask, editTask: editTask, removeTask: removeTask,
    logEvent: logEvent, counts: counts, byStatus: byStatus, isOverdue: isOverdue,
    filterTasks: filterTasks, assignees: assignees, fmtDue: fmtDue, buildReport: buildReport,
    sampleTasks: sampleTasks, sampleHistory: sampleHistory, sanitize: sanitize, sanitizeHistory: sanitizeHistory,
    load: load, save: save, loadState: loadState, saveState: saveState
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Taxta = api;
})(this);
