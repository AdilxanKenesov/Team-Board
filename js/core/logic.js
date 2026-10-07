/* Jamoa taxtasi Pro — biznes qoidalari (DOM'siz; brauzer va Node testlarida bir xil).
   Hech bir funksiya kirgan obyektni o'zgartirmaydi — har doim yangi qiymat qaytaradi. */
(function (root) {
  'use strict';

  var L = {};

  /* ---------------- konstantalar ---------------- */
  L.STATUSES = ['new', 'doing', 'done'];
  L.STATUS_LABELS = { new: 'Yangi', doing: 'Bajarilmoqda', done: 'Tugagan' };
  L.PRIORITIES = ['yuqori', 'orta', 'past'];
  L.PRIORITY_LABELS = { yuqori: 'Yuqori', orta: 'O‘rta', past: 'Past' };
  L.PRIORITY_WEIGHT = { yuqori: 0, orta: 1, past: 2 };
  L.ROLES = ['admin', 'member'];
  L.ROLE_LABELS = { admin: 'Administrator', member: 'Xodim' };
  // Xodim uchun ish oqimi; admin istalgan holatga o'tkaza oladi
  L.MOVES = { new: ['doing'], doing: ['new', 'done'], done: ['doing'] };
  L.LIMITS = { title: [2, 120], description: 2000, comment: [1, 1000], tag: [1, 24], tags: 6, checklist: 30, checkItem: [1, 120],
    name: [2, 40], login: [3, 30], password: 6, project: [2, 40], position: 40 };
  L.COLORS = ['#1e3a8a', '#0f766e', '#b45309', '#7c3aed', '#be123c', '#0369a1', '#4d7c0f', '#c2410c', '#475569', '#a21caf'];

  /* ---------------- yordamchilar ---------------- */
  function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function cleanMultiline(s) { return String(s == null ? '' : s).replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim(); }
  function norm(s) { return clean(s).toLocaleLowerCase('uz').replace(/[‘’ʻʼ`´']/g, '\''); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function todayStr(date) { var d = date || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseDate(s) { var p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function addDays(s, n) { var d = parseDate(s); return todayStr(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)); }
  function isValidDate(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var p = s.split('-').map(Number), d = new Date(p[0], p[1] - 1, p[2]);
    return d.getFullYear() === p[0] && d.getMonth() === p[1] - 1 && d.getDate() === p[2];
  }
  function daysBetween(a, b) { return Math.round((parseDate(b) - parseDate(a)) / 86400000); }
  function fmtDate(s) { if (!s) return ''; var p = s.split('-'); return p[2] + '.' + p[1] + '.' + p[0]; }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function initials(name) {
    return clean(name).split(' ').filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toLocaleUpperCase('uz') || '?';
  }
  function uid(prefix) { return (prefix || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  L.clean = clean; L.norm = norm; L.todayStr = todayStr; L.parseDate = parseDate; L.addDays = addDays;
  L.isValidDate = isValidDate; L.daysBetween = daysBetween; L.fmtDate = fmtDate; L.byId = byId;
  L.initials = initials; L.uid = uid; L.cleanMultiline = cleanMultiline;

  /* ---------------- foydalanuvchilar ---------------- */
  L.validateUser = function (input, users, exceptId, opts) {
    var o = opts || {}, e = {}, v = {};
    var name = clean(input.name);
    if (!name) e.name = 'Ismni yozing.';
    else if (name.length < L.LIMITS.name[0] || name.length > L.LIMITS.name[1]) e.name = 'Ism 2–40 ta belgi bo‘lsin.';
    v.name = name;

    var login = clean(input.login).toLowerCase();
    if (!login) e.login = 'Loginni yozing.';
    else if (!/^[a-z0-9._-]{3,30}$/.test(login)) e.login = 'Login 3–30 belgi: lotin harflari, raqam, nuqta, chiziqcha.';
    else if (users.some(function (u) { return u.id !== exceptId && u.login === login; })) e.login = 'Bu login band.';
    v.login = login;

    if (o.requirePassword || input.password) {
      var pe = L.validatePassword(input.password);
      if (pe) e.password = pe;
    }
    v.role = L.ROLES.indexOf(input.role) !== -1 ? input.role : 'member';
    v.position = clean(input.position).slice(0, L.LIMITS.position);
    return { ok: !Object.keys(e).length, errors: e, value: v };
  };

  L.validatePassword = function (p) {
    p = String(p == null ? '' : p);
    if (p.length < L.LIMITS.password) return 'Parol kamida 6 ta belgi bo‘lsin.';
    if (!/[A-Za-zА-Яа-яЁёЎўҚқҒғҲҳ‘’ʻʼ']/.test(p) || !/\d/.test(p)) return 'Parolda harf va raqam bo‘lsin.';
    return null;
  };

  // Admin o'zini o'chira/faolsizlantira/oddiy xodimga aylantira olmaydi; oxirgi faol admin saqlanadi
  L.canChangeUser = function (actor, target, change, users) {
    if (!actor || actor.role !== 'admin') return 'Faqat administrator.';
    if (target.id === actor.id && (change === 'deactivate' || change === 'demote' || change === 'delete')) return 'O‘z hisobingizga bu amalni qo‘llab bo‘lmaydi.';
    if (target.role === 'admin' && (change === 'deactivate' || change === 'demote' || change === 'delete')) {
      var admins = users.filter(function (u) { return u.role === 'admin' && u.active; });
      if (admins.length <= 1) return 'Kamida bitta faol administrator qolishi kerak.';
    }
    return null;
  };

  /* ---------------- loyihalar ---------------- */
  L.validateProject = function (input, projects, exceptId) {
    var e = {}, name = clean(input.name);
    if (!name) e.name = 'Loyiha nomini yozing.';
    else if (name.length < L.LIMITS.project[0] || name.length > L.LIMITS.project[1]) e.name = 'Nom 2–40 ta belgi bo‘lsin.';
    else if (projects.some(function (p) { return p.id !== exceptId && norm(p.name) === norm(name); })) e.name = 'Bunday loyiha bor.';
    var color = L.COLORS.indexOf(input.color) !== -1 ? input.color : L.COLORS[0];
    return { ok: !Object.keys(e).length, errors: e, value: { name: name, color: color, description: cleanMultiline(input.description).slice(0, 300) } };
  };

  /* ---------------- vazifalar ---------------- */
  L.parseTags = function (raw) {
    var list = Array.isArray(raw) ? raw : String(raw == null ? '' : raw).split(/[,#\n]/);
    var seen = {}, out = [];
    list.forEach(function (t) {
      var v = clean(t).replace(/^#/, '').toLocaleLowerCase('uz');
      if (v && v.length <= L.LIMITS.tag[1] && !seen[v]) { seen[v] = true; out.push(v); }
    });
    return out;
  };

  // ctx: { tasks, users, projects, today, exceptId, original }
  L.validateTask = function (input, ctx) {
    var e = {}, v = {};
    var title = clean(input.title);
    if (!title) e.title = 'Vazifa nomini yozing.';
    else if (title.length < L.LIMITS.title[0]) e.title = 'Nom kamida 2 ta belgidan iborat bo‘lsin.';
    else if (title.length > L.LIMITS.title[1]) e.title = 'Nom 120 ta belgidan oshmasin (hozir ' + title.length + ' ta).';
    v.title = title;

    v.projectId = input.projectId || null;
    if (v.projectId && !byId(ctx.projects || [], v.projectId)) e.projectId = 'Loyiha topilmadi.';
    if (!e.title && title) {
      var dup = (ctx.tasks || []).filter(function (t) {
        return t.id !== ctx.exceptId && t.projectId === v.projectId && norm(t.title) === norm(title);
      })[0];
      if (dup) e.title = 'Bu loyihada shunday nomli vazifa bor.';
    }

    var desc = cleanMultiline(input.description);
    if (desc.length > L.LIMITS.description) e.description = 'Tavsif 2000 ta belgidan oshmasin.';
    v.description = desc;

    v.assigneeId = input.assigneeId || null;
    if (v.assigneeId) {
      var u = byId(ctx.users || [], v.assigneeId);
      if (!u) e.assigneeId = 'Xodim topilmadi.';
      else if (!u.active && !(ctx.original && ctx.original.assigneeId === u.id)) e.assigneeId = 'Bu xodim faol emas.';
    }

    v.priority = L.PRIORITIES.indexOf(input.priority) !== -1 ? input.priority : 'orta';
    v.status = L.STATUSES.indexOf(input.status) !== -1 ? input.status : (ctx.original ? ctx.original.status : 'new');

    var due = clean(input.due);
    if (!due) v.due = null;
    else if (!isValidDate(due)) e.due = 'Muddat noto‘g‘ri sana.';
    else {
      var unchanged = ctx.original && ctx.original.due === due;
      if (!unchanged && due < (ctx.today || todayStr())) e.due = 'Muddat bugundan oldin bo‘lmasin.';
      v.due = due;
    }

    var tags = L.parseTags(input.tags);
    if (tags.length > L.LIMITS.tags) e.tags = 'Ko‘pi bilan 6 ta teg.';
    v.tags = tags.slice(0, L.LIMITS.tags);

    var items = Array.isArray(input.checklist) ? input.checklist : [];
    var cl = [];
    items.forEach(function (it) {
      var text = clean(it && it.text);
      if (text) cl.push({ id: it.id || uid('c'), text: text.slice(0, L.LIMITS.checkItem[1]), done: !!(it && it.done) });
    });
    if (cl.length > L.LIMITS.checklist) e.checklist = 'Ko‘pi bilan 30 ta band.';
    v.checklist = cl.slice(0, L.LIMITS.checklist);

    return { ok: !Object.keys(e).length, errors: e, value: v };
  };

  L.canMove = function (from, to) { return !!L.MOVES[from] && L.MOVES[from].indexOf(to) !== -1; };

  /* ---------------- ruxsatlar ---------------- */
  // action: view | edit | delete | status | checklist | comment | assign | create
  L.can = function (user, action, task) {
    if (!user || !user.active) return false;
    if (user.role === 'admin') return true;
    if (action === 'create' || action === 'edit' || action === 'delete' || action === 'assign') return false;
    return !!task && task.assigneeId === user.id;
  };

  L.visibleTasks = function (user, tasks) {
    if (!user) return [];
    if (user.role === 'admin') return tasks.slice();
    return tasks.filter(function (t) { return t.assigneeId === user.id; });
  };

  /* ---------------- holat va muddatlar ---------------- */
  L.isOverdue = function (task, today) { return !!task.due && task.status !== 'done' && task.due < (today || todayStr()); };
  L.isDueSoon = function (task, today, days) {
    if (!task.due || task.status === 'done') return false;
    var d = daysBetween(today || todayStr(), task.due);
    return d >= 0 && d <= (days == null ? 1 : days);
  };
  L.checklistProgress = function (task) {
    var all = (task.checklist || []).length, done = (task.checklist || []).filter(function (c) { return c.done; }).length;
    return { done: done, all: all, percent: all ? Math.round(done / all * 100) : 0 };
  };

  /* ---------------- statistika ---------------- */
  L.counts = function (tasks, today) {
    var c = { new: 0, doing: 0, done: 0, total: tasks.length, overdue: 0, dueSoon: 0 };
    tasks.forEach(function (t) {
      c[t.status]++;
      if (L.isOverdue(t, today)) c.overdue++;
      else if (L.isDueSoon(t, today, 2)) c.dueSoon++;
    });
    c.donePercent = c.total ? Math.round(c.done / c.total * 100) : 0;
    return c;
  };

  L.perUser = function (tasks, users, today) {
    return users.filter(function (u) { return u.role === 'member' || tasks.some(function (t) { return t.assigneeId === u.id; }); })
      .map(function (u) {
        var mine = tasks.filter(function (t) { return t.assigneeId === u.id; });
        var c = L.counts(mine, today);
        return { user: u, total: c.total, done: c.done, doing: c.doing, new: c.new, overdue: c.overdue, percent: c.donePercent };
      }).sort(function (a, b) { return b.total - a.total || a.user.name.localeCompare(b.user.name, 'uz'); });
  };

  L.perProject = function (tasks, projects, today) {
    return projects.map(function (p) {
      var mine = tasks.filter(function (t) { return t.projectId === p.id; });
      var c = L.counts(mine, today);
      return { project: p, total: c.total, done: c.done, overdue: c.overdue, percent: c.donePercent };
    });
  };

  // Oxirgi N kunda har kuni nechta vazifa tugatilgan va yaratilgan
  L.daily = function (tasks, today, days) {
    var n = days || 7, out = [];
    for (var i = n - 1; i >= 0; i--) {
      var d = addDays(today || todayStr(), -i);
      out.push({
        date: d,
        done: tasks.filter(function (t) { return t.completedAt && todayStr(new Date(t.completedAt)) === d; }).length,
        created: tasks.filter(function (t) { return t.createdAt && todayStr(new Date(t.createdAt)) === d; }).length
      });
    }
    return out;
  };

  /* ---------------- filtr va saralash ---------------- */
  // f: { q, projectId, assigneeId ('__none__' — biriktirilmagan), priority, tag, status, onlyOverdue }
  L.filterTasks = function (tasks, f, users) {
    f = f || {};
    var q = norm(f.q);
    return tasks.filter(function (t) {
      if (q) {
        var who = t.assigneeId && users ? (byId(users, t.assigneeId) || {}).name || '' : '';
        var hay = norm(t.title + ' ' + (t.description || '') + ' ' + (t.tags || []).join(' ') + ' ' + who);
        if (hay.indexOf(q) === -1) return false;
      }
      if (f.projectId && t.projectId !== f.projectId) return false;
      if (f.assigneeId === '__none__' && t.assigneeId) return false;
      if (f.assigneeId && f.assigneeId !== '__none__' && t.assigneeId !== f.assigneeId) return false;
      if (f.priority && t.priority !== f.priority) return false;
      if (f.tag && (t.tags || []).indexOf(f.tag) === -1) return false;
      if (f.status && t.status !== f.status) return false;
      if (f.onlyOverdue && !L.isOverdue(t, f.today)) return false;
      return true;
    });
  };

  L.sortTasks = function (tasks, key, dir, users, projects) {
    var m = dir === 'desc' ? -1 : 1;
    var statusOrder = { new: 0, doing: 1, done: 2 };
    function val(t) {
      switch (key) {
        case 'title': return norm(t.title);
        case 'status': return statusOrder[t.status];
        case 'priority': return L.PRIORITY_WEIGHT[t.priority];
        case 'due': return t.due || '9999-99-99';
        case 'assignee': return t.assigneeId ? norm((byId(users || [], t.assigneeId) || {}).name || '') : '￿';
        case 'project': return t.projectId ? norm((byId(projects || [], t.projectId) || {}).name || '') : '￿';
        default: return -(t.updatedAt || 0);
      }
    }
    return tasks.slice().sort(function (a, b) {
      var x = val(a), y = val(b);
      if (x < y) return -1 * m;
      if (x > y) return 1 * m;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
  };

  L.byStatus = function (tasks, status) {
    return tasks.filter(function (t) { return t.status === status; })
      .sort(function (a, b) { return L.PRIORITY_WEIGHT[a.priority] - L.PRIORITY_WEIGHT[b.priority] || (b.updatedAt || 0) - (a.updatedAt || 0); });
  };

  L.allTags = function (tasks) {
    var seen = {};
    tasks.forEach(function (t) { (t.tags || []).forEach(function (g) { seen[g] = (seen[g] || 0) + 1; }); });
    return Object.keys(seen).sort(function (a, b) { return seen[b] - seen[a] || a.localeCompare(b, 'uz'); });
  };

  /* ---------------- bildirishnomalar ---------------- */
  // Muddat eslatmalari: har vazifa uchun kuniga bitta (due-soon yoki overdue), takrorlanmaydi
  L.dueReminders = function (tasks, notifications, today, now) {
    var out = [];
    tasks.forEach(function (t) {
      if (!t.assigneeId || t.status === 'done' || !t.due) return;
      var type = L.isOverdue(t, today) ? 'overdue' : (L.isDueSoon(t, today, 1) ? 'due-soon' : null);
      if (!type) return;
      var key = type + ':' + t.id + ':' + today;
      var exists = notifications.some(function (n) { return n.key === key; });
      if (exists) return;
      out.push({
        id: uid('n'), key: key, userId: t.assigneeId, type: type, taskId: t.id, read: false, at: now || Date.now(),
        text: type === 'overdue' ? '“' + t.title + '” muddati o‘tdi (' + fmtDate(t.due) + ').' : '“' + t.title + '” muddati yaqin: ' + fmtDate(t.due) + '.'
      });
    });
    return out;
  };

  /* ---------------- eksport ---------------- */
  L.toCSV = function (rows) {
    function cell(v) {
      var s = v == null ? '' : String(v);
      if (/^[=+\-@]/.test(s)) s = '\'' + s;            // Excel formula in'ektsiyasidan himoya
      return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }
    return '﻿' + rows.map(function (r) { return r.map(cell).join(';'); }).join('\r\n');
  };

  L.tasksToRows = function (tasks, users, projects) {
    var head = ['Vazifa', 'Holat', 'Loyiha', 'Mas’ul', 'Muhimlik', 'Muddat', 'Teglar', 'Checklist', 'Yaratilgan', 'Tugatilgan'];
    return [head].concat(tasks.map(function (t) {
      var p = L.checklistProgress(t);
      return [t.title, L.STATUS_LABELS[t.status], t.projectId ? (byId(projects, t.projectId) || {}).name : '',
        t.assigneeId ? (byId(users, t.assigneeId) || {}).name : '', L.PRIORITY_LABELS[t.priority], fmtDate(t.due),
        (t.tags || []).join(', '), p.all ? p.done + '/' + p.all : '',
        t.createdAt ? fmtDate(todayStr(new Date(t.createdAt))) : '', t.completedAt ? fmtDate(todayStr(new Date(t.completedAt))) : ''];
    }));
  };

  L.reportText = function (tasks, users, projects, today) {
    var c = L.counts(tasks, today);
    var lines = ['Jamoa taxtasi — hisobot (' + fmtDate(today) + ')', '',
      'Jami: ' + c.total + ' · Yangi: ' + c.new + ' · Bajarilmoqda: ' + c.doing + ' · Tugagan: ' + c.done + ' (' + c.donePercent + '%)'];
    L.STATUSES.forEach(function (s) {
      var list = L.byStatus(tasks, s);
      lines.push('', L.STATUS_LABELS[s] + ' (' + list.length + '):');
      if (!list.length) lines.push('  —');
      list.forEach(function (t) {
        var meta = [];
        if (t.assigneeId) meta.push((byId(users, t.assigneeId) || {}).name);
        if (t.projectId) meta.push((byId(projects, t.projectId) || {}).name);
        if (t.due) meta.push('muddat ' + fmtDate(t.due));
        lines.push('  • ' + t.title + (meta.length ? ' — ' + meta.join(', ') : ''));
      });
    });
    var late = tasks.filter(function (t) { return L.isOverdue(t, today); });
    lines.push('', late.length ? 'Muddati o‘tgan (' + late.length + '): ' + late.map(function (t) { return t.title; }).join('; ') : 'Muddati o‘tgan vazifa yo‘q.');
    return lines.join('\n');
  };

  var App = root.App = root.App || {};
  App.Logic = L;
  if (typeof module !== 'undefined' && module.exports) module.exports = L;
})(typeof window !== 'undefined' ? window : globalThis);
