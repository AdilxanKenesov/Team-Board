/* Ma'lumotlar ombori: sxema, saqlash, demo tashkilot, o'zgarish amallari (faollik + bildirishnomalar + bekor qilish).
   Brauzerda localStorage, Node testlarida xotiradagi storage bilan ishlaydi. */
(function (root) {
  'use strict';

  var App = root.App = root.App || {};
  var L = App.Logic || (typeof require !== 'undefined' ? require('./logic.js') : null);
  var sha256 = App.sha256 || (typeof require !== 'undefined' ? require('./sha256.js') : null);

  var KEY = 'tbpro.db.v1';
  var HASH_ROUNDS = 500;
  var ACTIVITY_MAX = 300, NOTIF_MAX = 300;

  var S = { KEY: KEY, db: null, storage: null, listeners: [], undoStack: null };

  /* ---------------- parollar ---------------- */
  S.hashPassword = function (password, salt) {
    var h = salt + ':' + String(password);
    for (var i = 0; i < HASH_ROUNDS; i++) h = sha256(salt + ':' + h);
    return h;
  };
  S.newSalt = function () { return L.uid('s') + Math.random().toString(36).slice(2); };

  /* ---------------- sxema ---------------- */
  function emptyDb() {
    return { version: 1, createdAt: Date.now(), demo: false, users: [], projects: [], tasks: [], comments: [], notifications: [], activity: [], settings: {} };
  }
  S.emptyDb = emptyDb;

  function arr(x) { return Array.isArray(x) ? x : []; }
  function str(x) { return typeof x === 'string' ? x : ''; }
  function num(x, d) { return typeof x === 'number' && isFinite(x) ? x : d; }

  // Saqlangan ma'lumotni tekshiradi: yaroqsiz yozuvlar tashlanadi, sayt yiqilmaydi
  S.sanitize = function (raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.users)) return null;
    var db = emptyDb();
    db.createdAt = num(raw.createdAt, Date.now());
    db.demo = raw.demo === true;
    var ids = {};
    arr(raw.users).forEach(function (u) {
      if (!u || typeof u !== 'object' || !str(u.id) || ids[u.id] || !str(u.login) || !str(u.passHash) || !str(u.salt)) return;
      ids[u.id] = true;
      db.users.push({ id: u.id, name: L.clean(u.name) || u.login, login: u.login.toLowerCase(), passHash: u.passHash, salt: u.salt,
        role: L.ROLES.indexOf(u.role) !== -1 ? u.role : 'member', position: str(u.position), color: L.COLORS.indexOf(u.color) !== -1 ? u.color : L.COLORS[0],
        active: u.active !== false, createdAt: num(u.createdAt, 0), lastLoginAt: num(u.lastLoginAt, 0), mustChange: u.mustChange === true });
    });
    var pids = {};
    arr(raw.projects).forEach(function (p) {
      if (!p || !str(p.id) || pids[p.id] || !L.clean(p.name)) return;
      pids[p.id] = true;
      db.projects.push({ id: p.id, name: L.clean(p.name), color: L.COLORS.indexOf(p.color) !== -1 ? p.color : L.COLORS[0],
        description: str(p.description), archived: p.archived === true, createdAt: num(p.createdAt, 0) });
    });
    var tids = {};
    arr(raw.tasks).forEach(function (t) {
      if (!t || !str(t.id) || tids[t.id] || L.STATUSES.indexOf(t.status) === -1) return;
      var title = L.clean(t.title);
      if (title.length < 2) return;
      tids[t.id] = true;
      db.tasks.push({ id: t.id, title: title, description: str(t.description), status: t.status,
        projectId: pids[t.projectId] ? t.projectId : null, assigneeId: ids[t.assigneeId] ? t.assigneeId : null,
        createdBy: ids[t.createdBy] ? t.createdBy : null, priority: L.PRIORITIES.indexOf(t.priority) !== -1 ? t.priority : 'orta',
        due: L.isValidDate(t.due) ? t.due : null, tags: L.parseTags(arr(t.tags)),
        checklist: arr(t.checklist).filter(function (c) { return c && L.clean(c.text); }).map(function (c) { return { id: str(c.id) || L.uid('c'), text: L.clean(c.text), done: c.done === true }; }),
        createdAt: num(t.createdAt, 0), updatedAt: num(t.updatedAt, 0), completedAt: t.status === 'done' ? num(t.completedAt, num(t.updatedAt, 0)) : null,
        sample: t.sample === true });
    });
    arr(raw.comments).forEach(function (c) {
      if (c && str(c.id) && tids[c.taskId] && ids[c.userId] && L.clean(c.text)) db.comments.push({ id: c.id, taskId: c.taskId, userId: c.userId, text: str(c.text), at: num(c.at, 0) });
    });
    arr(raw.notifications).forEach(function (n) {
      if (n && str(n.id) && ids[n.userId] && str(n.text)) db.notifications.push({ id: n.id, key: str(n.key), userId: n.userId, type: str(n.type), taskId: tids[n.taskId] ? n.taskId : null, text: n.text, at: num(n.at, 0), read: n.read === true });
    });
    arr(raw.activity).forEach(function (a) {
      if (a && str(a.type) && num(a.at, null) !== null) db.activity.push({ id: str(a.id) || L.uid('a'), at: a.at, userId: ids[a.userId] ? a.userId : null, type: a.type, taskId: tids[a.taskId] ? a.taskId : null, title: str(a.title), detail: a.detail && typeof a.detail === 'object' ? a.detail : {} });
    });
    if (raw.settings && typeof raw.settings === 'object') {
      Object.keys(raw.settings).forEach(function (uidKey) {
        if (!ids[uidKey]) return;
        var s = raw.settings[uidKey] || {};
        db.settings[uidKey] = { theme: ['system', 'light', 'dark'].indexOf(s.theme) !== -1 ? s.theme : 'system', lang: s.lang === 'ru' ? 'ru' : 'uz' };
      });
    }
    return db;
  };

  /* ---------------- saqlash ---------------- */
  S.init = function (storage) {
    S.storage = storage || null;
    S.db = null;
    if (!storage) return null;
    try {
      var raw = storage.getItem(KEY);
      if (raw) S.db = S.sanitize(JSON.parse(raw));
    } catch (e) { S.db = null; }
    return S.db;
  };
  S.save = function () {
    if (!S.storage || !S.db) return false;
    try { S.storage.setItem(KEY, JSON.stringify(S.db)); return true; } catch (e) { return false; }
  };
  S.subscribe = function (fn) { S.listeners.push(fn); return function () { S.listeners = S.listeners.filter(function (f) { return f !== fn; }); }; };
  function emit(change) { S.listeners.forEach(function (fn) { try { fn(change || {}); } catch (e) { if (typeof console !== 'undefined') console.error(e); } }); }
  S.emit = emit;

  // Har o'zgartiruvchi amal: oldingi holat (bekor qilish uchun) → o'zgarish → saqlash → xabar
  function mutate(label, fn, opts) {
    var before = JSON.stringify(S.db);
    var result = fn(S.db);
    if (result && result.ok === false) return result;
    S.db.activity = S.db.activity.slice(0, ACTIVITY_MAX);
    S.db.notifications = S.db.notifications.slice(0, NOTIF_MAX);
    if (!opts || opts.undoable !== false) S.undoStack = { label: label, json: before };
    S.save();
    emit({ label: label, result: result });
    return result || { ok: true };
  }
  S.canUndo = function () { return !!S.undoStack; };
  S.undo = function () {
    if (!S.undoStack) return false;
    S.db = S.sanitize(JSON.parse(S.undoStack.json));
    S.undoStack = null;
    S.save();
    emit({ label: 'undo' });
    return true;
  };
  S.dropUndo = function () { S.undoStack = null; };

  /* ---------------- yordamchilar ---------------- */
  function log(db, actor, type, task, detail, title) {
    db.activity.unshift({ id: L.uid('a'), at: Date.now(), userId: actor ? actor.id : null, type: type, taskId: task ? task.id : null,
      title: title || (task ? task.title : ''), detail: detail || {} });
  }
  function notify(db, userId, type, task, text, actor) {
    if (!userId || (actor && userId === actor.id)) return;
    var u = L.byId(db.users, userId);
    if (!u || !u.active) return;
    db.notifications.unshift({ id: L.uid('n'), key: '', userId: userId, type: type, taskId: task ? task.id : null, text: text, at: Date.now(), read: false });
  }
  function admins(db) { return db.users.filter(function (u) { return u.role === 'admin' && u.active; }); }
  S.user = function (id) { return S.db ? L.byId(S.db.users, id) : null; };
  S.task = function (id) { return S.db ? L.byId(S.db.tasks, id) : null; };
  S.project = function (id) { return S.db ? L.byId(S.db.projects, id) : null; };
  S.settingsFor = function (userId) { return (S.db && S.db.settings[userId]) || { theme: 'system', lang: 'uz' }; };

  function ctx(original, exceptId) {
    return { tasks: S.db.tasks, users: S.db.users, projects: S.db.projects, today: L.todayStr(), original: original || null, exceptId: exceptId || null };
  }

  /* ---------------- tizimni sozlash ---------------- */
  S.setup = function (input) {
    var db = emptyDb();
    var v = L.validateUser(input, [], null, { requirePassword: true });
    if (!v.ok) return { ok: false, errors: v.errors };
    var salt = S.newSalt();
    db.users.push({ id: L.uid('u'), name: v.value.name, login: v.value.login, passHash: S.hashPassword(input.password, salt), salt: salt,
      role: 'admin', position: v.value.position || 'Administrator', color: L.COLORS[0], active: true, createdAt: Date.now(), lastLoginAt: 0 });
    log(db, db.users[0], 'setup', null, {}, 'Tizim sozlandi');
    S.db = db; S.undoStack = null; S.save(); emit({ label: 'setup' });
    return { ok: true, user: db.users[0] };
  };

  /* ---------------- vazifalar ---------------- */
  S.createTask = function (actor, input) {
    if (!L.can(actor, 'create')) return { ok: false, error: 'Ruxsat yo‘q.' };
    var v = L.validateTask(input, ctx());
    if (!v.ok) return { ok: false, errors: v.errors };
    return mutate('create', function (db) {
      var now = Date.now();
      var t = Object.assign({ id: L.uid('t'), createdBy: actor.id, createdAt: now, updatedAt: now, completedAt: null, sample: false }, v.value);
      if (t.status === 'done') t.completedAt = now;
      db.tasks.push(t);
      log(db, actor, 'create', t);
      if (t.assigneeId) notify(db, t.assigneeId, 'assigned', t, actor.name + ' sizga “' + t.title + '” vazifasini biriktirdi.', actor);
      return { ok: true, task: t };
    });
  };

  S.updateTask = function (actor, id, input) {
    var orig = S.task(id);
    if (!orig) return { ok: false, error: 'Vazifa topilmadi.' };
    if (!L.can(actor, 'edit', orig)) return { ok: false, error: 'Ruxsat yo‘q.' };
    var merged = Object.assign({}, orig, input);
    var v = L.validateTask(merged, ctx(orig, id));
    if (!v.ok) return { ok: false, errors: v.errors };
    var changed = ['title', 'description', 'projectId', 'assigneeId', 'priority', 'status', 'due'].filter(function (k) { return v.value[k] !== orig[k]; })
      .concat(JSON.stringify(v.value.tags) !== JSON.stringify(orig.tags) ? ['tags'] : [])
      .concat(JSON.stringify(v.value.checklist) !== JSON.stringify(orig.checklist) ? ['checklist'] : []);
    if (!changed.length) return { ok: true, task: orig, changed: false };
    return mutate('update', function (db) {
      var t = L.byId(db.tasks, id);
      var prevAssignee = t.assigneeId, prevStatus = t.status;
      Object.assign(t, v.value, { updatedAt: Date.now() });
      if (t.status === 'done' && prevStatus !== 'done') t.completedAt = Date.now();
      if (t.status !== 'done') t.completedAt = null;
      log(db, actor, 'update', t, { fields: changed });
      if (t.assigneeId && t.assigneeId !== prevAssignee) notify(db, t.assigneeId, 'assigned', t, actor.name + ' sizga “' + t.title + '” vazifasini biriktirdi.', actor);
      return { ok: true, task: t, changed: true };
    });
  };

  S.moveTask = function (actor, id, to) {
    var t0 = S.task(id);
    if (!t0) return { ok: false, error: 'Vazifa topilmadi.' };
    if (!L.can(actor, 'status', t0)) return { ok: false, error: 'Ruxsat yo‘q.' };
    if (L.STATUSES.indexOf(to) === -1 || t0.status === to) return { ok: false, error: 'Bu o‘tish mumkin emas.' };
    if (actor.role !== 'admin' && !L.canMove(t0.status, to)) return { ok: false, error: 'Bu o‘tish mumkin emas.' };
    return mutate('move', function (db) {
      var t = L.byId(db.tasks, id), from = t.status;
      t.status = to; t.updatedAt = Date.now();
      t.completedAt = to === 'done' ? Date.now() : null;
      log(db, actor, 'move', t, { from: from, to: to });
      var text = actor.name + ': “' + t.title + '” → ' + L.STATUS_LABELS[to] + '.';
      if (actor.role !== 'admin') admins(db).forEach(function (a) { notify(db, a.id, 'status', t, text, actor); });
      else if (t.assigneeId) notify(db, t.assigneeId, 'status', t, text, actor);
      return { ok: true, task: t, from: from };
    });
  };

  S.deleteTask = function (actor, id) {
    var t0 = S.task(id);
    if (!t0) return { ok: false, error: 'Vazifa topilmadi.' };
    if (!L.can(actor, 'delete', t0)) return { ok: false, error: 'Ruxsat yo‘q.' };
    return mutate('delete', function (db) {
      db.tasks = db.tasks.filter(function (t) { return t.id !== id; });
      db.comments = db.comments.filter(function (c) { return c.taskId !== id; });
      db.notifications.forEach(function (n) { if (n.taskId === id) n.taskId = null; });
      db.activity.forEach(function (a) { if (a.taskId === id) a.taskId = null; });
      log(db, actor, 'delete', null, {}, t0.title);
      return { ok: true, task: t0 };
    });
  };

  S.bulk = function (actor, ids, change) {
    if (!actor || actor.role !== 'admin') return { ok: false, error: 'Ruxsat yo‘q.' };
    if (!ids.length) return { ok: false, error: 'Hech narsa tanlanmagan.' };
    if (change.assigneeId) {
      var u = S.user(change.assigneeId);
      if (!u || !u.active) return { ok: false, error: 'Xodim topilmadi yoki faol emas.' };
    }
    return mutate('bulk', function (db) {
      var n = 0;
      if (change.delete) {
        var before = db.tasks.length;
        db.tasks = db.tasks.filter(function (t) { return ids.indexOf(t.id) === -1; });
        db.comments = db.comments.filter(function (c) { return ids.indexOf(c.taskId) === -1; });
        n = before - db.tasks.length;
        log(db, actor, 'bulk-delete', null, { count: n }, n + ' ta vazifa');
        return { ok: true, count: n };
      }
      db.tasks.forEach(function (t) {
        if (ids.indexOf(t.id) === -1) return;
        if (change.status && t.status !== change.status) {
          t.status = change.status; t.completedAt = change.status === 'done' ? Date.now() : null; n++;
        }
        if (change.assigneeId !== undefined && t.assigneeId !== change.assigneeId) {
          t.assigneeId = change.assigneeId || null; n++;
          if (t.assigneeId) notify(db, t.assigneeId, 'assigned', t, actor.name + ' sizga “' + t.title + '” vazifasini biriktirdi.', actor);
        }
        if (change.priority && t.priority !== change.priority) { t.priority = change.priority; n++; }
        t.updatedAt = Date.now();
      });
      log(db, actor, 'bulk', null, { count: ids.length, change: Object.keys(change) }, ids.length + ' ta vazifa');
      return { ok: true, count: ids.length };
    });
  };

  S.toggleCheck = function (actor, taskId, itemId) {
    var t0 = S.task(taskId);
    if (!t0 || !L.can(actor, 'checklist', t0)) return { ok: false, error: 'Ruxsat yo‘q.' };
    return mutate('check', function (db) {
      var t = L.byId(db.tasks, taskId);
      var it = L.byId(t.checklist, itemId);
      if (!it) return { ok: false, error: 'Band topilmadi.' };
      it.done = !it.done; t.updatedAt = Date.now();
      log(db, actor, it.done ? 'check' : 'uncheck', t, { item: it.text });
      return { ok: true, task: t, item: it };
    }, { undoable: true });
  };

  S.addComment = function (actor, taskId, text) {
    var t0 = S.task(taskId);
    if (!t0 || !L.can(actor, 'comment', t0)) return { ok: false, error: 'Ruxsat yo‘q.' };
    var body = L.cleanMultiline(text);
    if (!body) return { ok: false, error: 'Izoh yozing.' };
    if (body.length > L.LIMITS.comment[1]) return { ok: false, error: 'Izoh 1000 ta belgidan oshmasin.' };
    return mutate('comment', function (db) {
      var t = L.byId(db.tasks, taskId);
      var c = { id: L.uid('m'), taskId: taskId, userId: actor.id, text: body, at: Date.now() };
      db.comments.push(c);
      log(db, actor, 'comment', t);
      var targets = {};
      if (t.assigneeId) targets[t.assigneeId] = true;
      if (t.createdBy) targets[t.createdBy] = true;
      db.comments.filter(function (x) { return x.taskId === taskId; }).forEach(function (x) { targets[x.userId] = true; });
      Object.keys(targets).forEach(function (uid) { notify(db, uid, 'comment', t, actor.name + ' “' + t.title + '” vazifasiga izoh yozdi.', actor); });
      return { ok: true, comment: c };
    });
  };

  S.deleteComment = function (actor, commentId) {
    var c = S.db.comments.filter(function (x) { return x.id === commentId; })[0];
    if (!c) return { ok: false, error: 'Izoh topilmadi.' };
    if (!(actor.role === 'admin' || actor.id === c.userId)) return { ok: false, error: 'Ruxsat yo‘q.' };
    return mutate('uncomment', function (db) {
      db.comments = db.comments.filter(function (x) { return x.id !== commentId; });
      return { ok: true };
    });
  };

  /* ---------------- loyihalar ---------------- */
  S.saveProject = function (actor, id, input) {
    if (!actor || actor.role !== 'admin') return { ok: false, error: 'Ruxsat yo‘q.' };
    var v = L.validateProject(input, S.db.projects, id);
    if (!v.ok) return { ok: false, errors: v.errors };
    return mutate(id ? 'project-update' : 'project-create', function (db) {
      var p = id ? L.byId(db.projects, id) : null;
      if (p) Object.assign(p, v.value);
      else { p = Object.assign({ id: L.uid('p'), archived: false, createdAt: Date.now() }, v.value); db.projects.push(p); }
      log(db, actor, id ? 'project-update' : 'project-create', null, {}, p.name);
      return { ok: true, project: p };
    });
  };
  S.archiveProject = function (actor, id, archived) {
    if (!actor || actor.role !== 'admin') return { ok: false, error: 'Ruxsat yo‘q.' };
    return mutate('project-archive', function (db) {
      var p = L.byId(db.projects, id);
      if (!p) return { ok: false, error: 'Loyiha topilmadi.' };
      p.archived = !!archived;
      log(db, actor, archived ? 'project-archive' : 'project-restore', null, {}, p.name);
      return { ok: true, project: p };
    });
  };

  /* ---------------- xodimlar ---------------- */
  S.saveUser = function (actor, id, input) {
    if (!actor || actor.role !== 'admin') return { ok: false, error: 'Ruxsat yo‘q.' };
    var target = id ? S.user(id) : null;
    var v = L.validateUser(input, S.db.users, id, { requirePassword: !id });
    if (!v.ok) return { ok: false, errors: v.errors };
    if (target && target.role === 'admin' && v.value.role !== 'admin') {
      var why = L.canChangeUser(actor, target, 'demote', S.db.users);
      if (why) return { ok: false, errors: { role: why } };
    }
    return mutate(id ? 'user-update' : 'user-create', function (db) {
      var u = id ? L.byId(db.users, id) : null;
      if (u) Object.assign(u, { name: v.value.name, login: v.value.login, role: v.value.role, position: v.value.position });
      else {
        var salt = S.newSalt();
        u = { id: L.uid('u'), name: v.value.name, login: v.value.login, passHash: S.hashPassword(input.password, salt), salt: salt,
          role: v.value.role, position: v.value.position, color: L.COLORS[db.users.length % L.COLORS.length], active: true,
          createdAt: Date.now(), lastLoginAt: 0, mustChange: !!input.mustChange };
        db.users.push(u);
      }
      log(db, actor, id ? 'user-update' : 'user-create', null, {}, u.name);
      return { ok: true, user: u };
    });
  };
  S.setUserActive = function (actor, id, active) {
    var target = S.user(id);
    if (!target) return { ok: false, error: 'Xodim topilmadi.' };
    var why = active ? (actor && actor.role === 'admin' ? null : 'Faqat administrator.') : L.canChangeUser(actor, target, 'deactivate', S.db.users);
    if (why) return { ok: false, error: why };
    return mutate('user-active', function (db) {
      var u = L.byId(db.users, id);
      u.active = !!active;
      log(db, actor, active ? 'user-activate' : 'user-deactivate', null, {}, u.name);
      return { ok: true, user: u };
    });
  };
  S.resetPassword = function (actor, id, password) {
    if (!actor || actor.role !== 'admin') return { ok: false, error: 'Ruxsat yo‘q.' };
    var err = L.validatePassword(password);
    if (err) return { ok: false, errors: { password: err } };
    return mutate('user-password', function (db) {
      var u = L.byId(db.users, id);
      if (!u) return { ok: false, error: 'Xodim topilmadi.' };
      u.salt = S.newSalt(); u.passHash = S.hashPassword(password, u.salt); u.mustChange = true;
      log(db, actor, 'user-password', null, {}, u.name);
      return { ok: true };
    }, { undoable: false });
  };
  S.changeOwnPassword = function (actor, current, next) {
    var u = S.user(actor.id);
    if (!u || S.hashPassword(current, u.salt) !== u.passHash) return { ok: false, errors: { current: 'Joriy parol noto‘g‘ri.' } };
    var err = L.validatePassword(next);
    if (err) return { ok: false, errors: { next: err } };
    if (current === next) return { ok: false, errors: { next: 'Yangi parol eskisidan farq qilsin.' } };
    return mutate('own-password', function (db) {
      var x = L.byId(db.users, actor.id);
      x.salt = S.newSalt(); x.passHash = S.hashPassword(next, x.salt); x.mustChange = false;
      return { ok: true };
    }, { undoable: false });
  };
  S.updateProfile = function (actor, input) {
    var name = L.clean(input.name);
    if (name.length < 2 || name.length > 40) return { ok: false, errors: { name: 'Ism 2–40 ta belgi bo‘lsin.' } };
    return mutate('profile', function (db) {
      var u = L.byId(db.users, actor.id);
      u.name = name; u.position = L.clean(input.position).slice(0, 40);
      if (L.COLORS.indexOf(input.color) !== -1) u.color = input.color;
      return { ok: true, user: u };
    }, { undoable: false });
  };
  S.saveSettings = function (actor, patch) {
    return mutate('settings', function (db) {
      var s = Object.assign({ theme: 'system', lang: 'uz' }, db.settings[actor.id] || {});
      if (['system', 'light', 'dark'].indexOf(patch.theme) !== -1) s.theme = patch.theme;
      if (patch.lang === 'uz' || patch.lang === 'ru') s.lang = patch.lang;
      db.settings[actor.id] = s;
      return { ok: true, settings: s };
    }, { undoable: false });
  };

  /* ---------------- bildirishnomalar ---------------- */
  S.notificationsFor = function (userId) { return S.db ? S.db.notifications.filter(function (n) { return n.userId === userId; }) : []; };
  S.unreadCount = function (userId) { return S.notificationsFor(userId).filter(function (n) { return !n.read; }).length; };
  S.markRead = function (actor, id) {
    return mutate('notif-read', function (db) {
      db.notifications.forEach(function (n) { if (n.userId === actor.id && (!id || n.id === id)) n.read = true; });
      return { ok: true };
    }, { undoable: false });
  };
  // Ilova ochilganda: muddati yaqin/o'tgan vazifalar uchun eslatmalar (kuniga bir marta)
  S.runReminders = function () {
    if (!S.db) return 0;
    var fresh = L.dueReminders(S.db.tasks, S.db.notifications, L.todayStr());
    if (!fresh.length) return 0;
    S.db.notifications = fresh.concat(S.db.notifications).slice(0, NOTIF_MAX);
    S.save();
    return fresh.length;
  };

  /* ---------------- ma'lumotlar ---------------- */
  S.clearSamples = function (actor) {
    if (!actor || actor.role !== 'admin') return { ok: false, error: 'Ruxsat yo‘q.' };
    return mutate('clear-samples', function (db) {
      var ids = db.tasks.filter(function (t) { return t.sample; }).map(function (t) { return t.id; });
      db.tasks = db.tasks.filter(function (t) { return !t.sample; });
      db.comments = db.comments.filter(function (c) { return ids.indexOf(c.taskId) === -1; });
      log(db, actor, 'clear-samples', null, { count: ids.length }, ids.length + ' ta namuna vazifa');
      return { ok: true, count: ids.length };
    });
  };
  S.exportJSON = function () { return JSON.stringify(S.db, null, 2); };
  S.importJSON = function (actor, text) {
    if (!actor || actor.role !== 'admin') return { ok: false, error: 'Ruxsat yo‘q.' };
    var parsed;
    try { parsed = JSON.parse(text); } catch (e) { return { ok: false, error: 'Fayl JSON formatida emas.' }; }
    var db = S.sanitize(parsed);
    if (!db || !db.users.some(function (u) { return u.role === 'admin' && u.active; })) return { ok: false, error: 'Faylda faol administrator yo‘q yoki tuzilma noto‘g‘ri.' };
    return mutate('import', function () { S.db = db; return { ok: true, counts: { users: db.users.length, tasks: db.tasks.length } }; });
  };
  S.wipe = function () {
    S.db = null; S.undoStack = null;
    if (S.storage) try { S.storage.removeItem(KEY); } catch (e) { /* bo'sh */ }
    emit({ label: 'wipe' });
  };

  /* ---------------- demo tashkilot ---------------- */
  S.seedDemo = function (now) {
    var t = now || Date.now();
    var today = L.todayStr(new Date(t));
    var min = 60000, hour = 3600000, day = 86400000;
    var db = emptyDb();
    db.demo = true;
    db.createdAt = t - 14 * day;

    var people = [
      ['admin', 'Aziza Karimova', 'Loyiha rahbari', 'admin', 'admin123'],
      ['dilnoza', 'Dilnoza Rahimova', 'Dizayner', 'member', 'demo123'],
      ['jasur', 'Jasur Toshmatov', 'Kontent muallifi', 'member', 'demo123'],
      ['malika', 'Malika Yusupova', 'Tadbir koordinatori', 'member', 'demo123'],
      ['sardor', 'Sardor Aliyev', 'Moliya mutaxassisi', 'member', 'demo123'],
      ['bekzod', 'Bekzod Nazarov', 'Texnik mutaxassis', 'member', 'demo123'],
      ['madina', 'Madina Qodirova', 'SMM mutaxassisi', 'member', 'demo123']
    ];
    var U = {};
    people.forEach(function (p, i) {
      var salt = 'demo-salt-' + p[0];
      var u = { id: 'u_' + p[0], name: p[1], login: p[0], passHash: S.hashPassword(p[4], salt), salt: salt, role: p[3], position: p[2],
        color: L.COLORS[i % L.COLORS.length], active: true, createdAt: t - 14 * day, lastLoginAt: t - (i + 1) * 3 * hour };
      U[p[0]] = u; db.users.push(u);
    });

    var P = {};
    [['forum', 'Yoshlar forumi', '#1e3a8a', 'Viloyat yoshlar forumini tashkil etish: joy, dastur, ishtirokchilar.'],
     ['sayt', 'Veb-sayt yangilash', '#0f766e', 'Markaz veb-saytining yangi versiyasi va kontent.'],
     ['oqitish', 'Ichki o‘qitish', '#b45309', 'Xodimlar uchun oylik seminarlar.']].forEach(function (p) {
      P[p[0]] = { id: 'p_' + p[0], name: p[1], color: p[2], description: p[3], archived: false, createdAt: t - 13 * day };
      db.projects.push(P[p[0]]);
    });

    // [nom, holat, loyiha, mas'ul, muhimlik, muddat (kun), teglar, checklist, yangilangan (soat oldin), tugatilgan (kun oldin)]
    var rows = [
      ['Forum uchun zal band qilish', 'done', 'forum', 'malika', 'yuqori', -5, ['tashkiliy'], ['Variantlarni solishtirish', 'Shartnoma imzolash'], 120, 4],
      ['Forum dasturini tuzish', 'doing', 'forum', 'malika', 'yuqori', 2, ['dastur'], ['Ma’ruzachilar ro‘yxati', 'Vaqt jadvali', 'Tanaffuslar'], 3, null],
      ['Ishtirokchilar ro‘yxatini tuzish', 'doing', 'forum', 'malika', 'yuqori', -1, ['ro‘yxat'], ['Ariza shakli', 'Saralash'], 6, null],
      ['Afisha dizayni', 'doing', 'forum', 'dilnoza', 'orta', 3, ['dizayn'], ['Eskiz', 'Ranglar', 'Chop etishga tayyorlash'], 2, null],
      ['Homiylarga xat yuborish', 'done', 'forum', 'sardor', 'orta', -3, ['homiylar'], [], 30, 3],
      ['Forum byudjeti', 'done', 'forum', 'sardor', 'yuqori', -2, ['moliya'], ['Xarajatlar', 'Tasdiqlash'], 50, 2],
      ['Ovoz va proyektorni sinash', 'new', 'forum', 'bekzod', 'yuqori', 1, ['texnika'], ['Mikrofonlar', 'Proyektor', 'Zaxira kabel'], 8, null],
      ['Ijtimoiy tarmoqlarda e’lon', 'new', 'forum', 'madina', 'orta', 4, ['smm'], [], 5, null],
      ['Ma’ruzachilarni taklif qilish', 'done', 'forum', 'jasur', 'orta', -4, ['dastur'], [], 90, 5],
      ['Mehmonlar uchun nishonlar', 'new', 'forum', null, 'past', 6, ['tashkiliy'], [], 26, null],
      ['Bosh sahifa maketi', 'doing', 'sayt', 'dilnoza', 'yuqori', 5, ['dizayn', 'sayt'], ['Desktop', 'Mobil'], 4, null],
      ['“Biz haqimizda” matni', 'done', 'sayt', 'jasur', 'orta', -1, ['kontent'], [], 20, 1],
      ['Yangiliklar bo‘limi uchun 5 ta maqola', 'doing', 'sayt', 'jasur', 'orta', 7, ['kontent'], ['1-maqola', '2-maqola', '3-maqola', '4-maqola', '5-maqola'], 1, null],
      ['Hosting tarifini tanlash', 'done', 'sayt', 'bekzod', 'past', -6, ['texnika'], [], 140, 6],
      ['Sayt tezligini tekshirish', 'new', 'sayt', 'bekzod', 'orta', 9, ['texnika', 'sayt'], [], 30, null],
      ['Fotogalereya uchun suratlar', 'new', 'sayt', 'madina', 'past', 10, ['kontent'], [], 40, null],
      ['Aloqa shaklini sinash', 'new', 'sayt', null, 'orta', 8, ['sayt'], [], 12, null],
      ['Yanvar seminari mavzusi', 'done', 'oqitish', 'jasur', 'past', -7, ['seminar'], [], 160, 7],
      ['Excel bo‘yicha seminar', 'doing', 'oqitish', 'sardor', 'orta', 6, ['seminar'], ['Taqdimot', 'Amaliy topshiriq'], 10, null],
      ['Seminar uchun xona', 'done', 'oqitish', 'malika', 'past', -2, ['tashkiliy'], [], 45, 2],
      ['Xodimlar so‘rovnomasi', 'new', 'oqitish', 'madina', 'orta', 5, ['so‘rovnoma'], [], 15, null],
      ['Seminar natijalari hisoboti', 'new', 'oqitish', 'sardor', 'past', 12, ['hisobot'], [], 48, null],
      ['Jamoa uchrashuvi vaqtini belgilash', 'done', null, 'malika', 'past', null, [], [], 70, 0],
      ['Ofis uchun printer kartriji', 'new', null, null, 'past', null, ['xarid'], [], 100, null]
    ];
    rows.forEach(function (r, i) {
      var updated = t - r[8] * hour;
      var created = Math.min(updated, t - (8 + (i % 6)) * day) ;
      var task = { id: 't_' + (i + 1), title: r[0], description: '', status: r[1], projectId: r[2] ? 'p_' + r[2] : null,
        assigneeId: r[3] ? 'u_' + r[3] : null, createdBy: 'u_admin', priority: r[4], due: r[5] === null ? null : L.addDays(today, r[5]),
        tags: r[6], checklist: r[7].map(function (txt, k) { return { id: 'c_' + i + '_' + k, text: txt, done: r[1] === 'done' || (r[1] === 'doing' && k < Math.ceil(r[7].length / 2)) }; }),
        createdAt: created, updatedAt: updated, completedAt: r[9] === null ? null : t - r[9] * day - (i % 5) * hour, sample: true };
      if (task.completedAt && task.completedAt > t) task.completedAt = t - min;
      db.tasks.push(task);
      db.activity.push({ id: 'a_c' + i, at: created, userId: 'u_admin', type: 'create', taskId: task.id, title: task.title, detail: {} });
      if (r[1] !== 'new') db.activity.push({ id: 'a_m' + i, at: Math.min(updated, task.completedAt || updated) - hour, userId: task.assigneeId || 'u_admin', type: 'move', taskId: task.id, title: task.title, detail: { from: 'new', to: 'doing' } });
      if (r[1] === 'done') db.activity.push({ id: 'a_d' + i, at: task.completedAt, userId: task.assigneeId || 'u_admin', type: 'move', taskId: task.id, title: task.title, detail: { from: 'doing', to: 'done' } });
    });
    db.tasks[1].description = 'Forum ikki kun davom etadi. Birinchi kun — panel muhokamalar, ikkinchi kun — amaliy mashg‘ulotlar.\nDasturni chop etishdan oldin rahbarga ko‘rsatish kerak.';
    db.tasks[2].description = 'Ro‘yxatdan o‘tganlar: 140 ta ariza. Saralash mezonlari — yosh (18–30) va hudud.';
    db.tasks[10].description = 'Yangi brendbukka mos: lojuvard va oltin ranglar.';

    [['t_2', 'u_admin', 'Dasturda tanaffuslarni 20 daqiqadan qilaylik.', 26],
     ['t_2', 'u_malika', 'Kelishildi, jadvalni yangiladim.', 20],
     ['t_3', 'u_admin', 'Muddat o‘tib ketdi — bugun yakunlay olasizmi?', 5],
     ['t_3', 'u_malika', 'Ha, kechgacha tugataman. 12 ta ariza qoldi.', 4],
     ['t_4', 'u_dilnoza', 'Ikki variant tayyor, tanlab bering.', 3],
     ['t_11', 'u_admin', 'Mobil versiyaga alohida e’tibor bering.', 30],
     ['t_13', 'u_jasur', '3 tasi tayyor, qolganlari ertaga.', 1]].forEach(function (c, i) {
      db.comments.push({ id: 'm_' + i, taskId: c[0], userId: c[1], text: c[2], at: t - c[3] * hour });
      db.activity.push({ id: 'a_k' + i, at: t - c[3] * hour, userId: c[1], type: 'comment', taskId: c[0], title: L.byId(db.tasks, c[0]).title, detail: {} });
    });
    db.activity.sort(function (a, b) { return b.at - a.at; });

    [['u_malika', 'assigned', 't_2', 'Aziza Karimova sizga “Forum dasturini tuzish” vazifasini biriktirdi.', 50, true],
     ['u_malika', 'comment', 't_3', 'Aziza Karimova “Ishtirokchilar ro‘yxatini tuzish” vazifasiga izoh yozdi.', 5, false],
     ['u_bekzod', 'assigned', 't_7', 'Aziza Karimova sizga “Ovoz va proyektorni sinash” vazifasini biriktirdi.', 8, false],
     ['u_madina', 'assigned', 't_8', 'Aziza Karimova sizga “Ijtimoiy tarmoqlarda e’lon” vazifasini biriktirdi.', 5, false],
     ['u_dilnoza', 'comment', 't_11', 'Aziza Karimova “Bosh sahifa maketi” vazifasiga izoh yozdi.', 30, true],
     ['u_admin', 'status', 't_12', 'Jasur Toshmatov: ““Biz haqimizda” matni” → Tugagan.', 20, false],
     ['u_admin', 'comment', 't_4', 'Dilnoza Rahimova “Afisha dizayni” vazifasiga izoh yozdi.', 3, false],
     ['u_admin', 'comment', 't_13', 'Jasur Toshmatov “Yangiliklar bo‘limi uchun 5 ta maqola” vazifasiga izoh yozdi.', 1, false]].forEach(function (n, i) {
      db.notifications.push({ id: 'n_' + i, key: '', userId: n[0], type: n[1], taskId: n[2], text: n[3], at: t - n[4] * hour, read: n[5] });
    });
    db.notifications.sort(function (a, b) { return b.at - a.at; });
    return db;
  };

  S.loadDemo = function (now) {
    S.db = S.seedDemo(now);
    S.undoStack = null;
    S.save();
    emit({ label: 'demo' });
    return S.db;
  };

  App.Store = S;
  if (typeof module !== 'undefined' && module.exports) module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
