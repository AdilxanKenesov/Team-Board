(function () {
  'use strict';

  var T = window.Taxta;
  var UNDO_MS = 6000;
  var HISTORY_SHOWN = 10;
  var TAB_KEY = 'taxta010.tab';

  var storage = null;
  try { storage = window.localStorage; } catch (e) { storage = null; }

  // Birinchi ochilish yoki butunlay buzilgan ma'lumot — namuna taxta
  var state = (storage && T.loadState(storage)) || { tasks: T.sampleTasks(), history: [] };
  var storageOk = storage ? T.saveState(storage, state) : false;
  if (!storageOk) $('storage-warning').hidden = false;

  var filter = { q: '', assignee: '', priority: '' };
  var dragId = null, dragFrom = null;
  var undoSnapshot = null, undoTimer = null;
  var drawerMode = 'add', drawerTaskId = null, drawerReturn = null;

  // Har ustundagi o'tkazish tugmalari: [qayerga, matn, turi]
  var ACTIONS = {
    new: [['doing', 'Boshlash', 'fwd']],
    doing: [['new', '', 'back'], ['done', 'Tugatish', 'fwd']],
    done: [['doing', 'Qayta ochish', 'back']]
  };

  var ICON = {
    edit: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M13.6 3.2a1.8 1.8 0 0 1 2.5 0l.7.7a1.8 1.8 0 0 1 0 2.5L7.4 15.8 3.5 16.5l.7-3.9z"/></svg>',
    del: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6h12M8 6V4h4v2M6 6l.8 10h6.4L14 6"/></svg>',
    cal: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4.5" width="14" height="12" rx="2"/><path d="M3 8.5h14M7 3v3M13 3v3"/></svg>',
    flag: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 17V3.5M5 4h9l-2 3.5 2 3.5H5"/></svg>',
    fwd: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 6l4 4-4 4"/></svg>',
    back: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16 10H5M9 6l-4 4 4 4"/></svg>'
  };

  function $(id) { return document.getElementById(id); }
  function today() { return T.todayStr(); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmtTime(ts) {
    var d = new Date(ts);
    return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  // Kartada qisqa sana: joriy yilda "12.10", aks holda "12.10.2027"
  function shortDue(due) {
    var p = due.split('-');
    return p[2] + '.' + p[1] + (Number(p[0]) === new Date().getFullYear() ? '' : '.' + p[0]);
  }
  function initials(name) {
    return name.split(' ').filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toLocaleUpperCase('uz');
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;   // textContent: kiritilgan matn HTML bo'lib ishlamaydi
    return n;
  }
  function clone(s) { return JSON.parse(JSON.stringify(s)); }
  function persist() { if (storage) T.saveState(storage, state); }

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Yopilish animatsiyasi: haqiqiy element darhol yopiladi (fokus va holat kutmaydi),
  // uning nusxasi esa 0.2 soniyada chiqib ketadi va o'chiriladi.
  function animateOut(node, ghostClass) {
    if (reducedMotion) return;
    var g = node.cloneNode(true);
    var from = node.querySelectorAll('input, select, textarea');
    var to = g.querySelectorAll('input, select, textarea');
    for (var i = 0; i < from.length; i++) to[i].value = from[i].value;   // nusxada kiritilgan qiymatlar qolsin
    g.removeAttribute('id');
    g.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
    g.hidden = false;
    g.classList.add(ghostClass);
    g.setAttribute('aria-hidden', 'true');
    g.inert = true;
    document.body.appendChild(g);
    setTimeout(function () { g.remove(); }, 260);
  }

  /* ---------------- o'zgarish + bekor qilish ---------------- */

  // Har o'zgartiruvchi amal shu orqali: oldingi holat saqlanadi, tarixga yoziladi
  function commit(nextTasks, event, message) {
    undoSnapshot = clone(state);
    state = { tasks: nextTasks, history: T.logEvent(state.history, event) };
    persist();
    showToast(message);
  }

  function showToast(message) {
    $('toast-text').textContent = message;
    $('toast').hidden = false;
    $('toast-undo').hidden = !undoSnapshot;
    clearTimeout(undoTimer);
    undoTimer = setTimeout(hideToast, UNDO_MS);
  }
  function hideToast() {
    $('toast').hidden = true;
    undoSnapshot = null;
  }
  $('toast-undo').addEventListener('click', function () {
    if (!undoSnapshot) return;
    state = undoSnapshot;
    undoSnapshot = null;
    persist();
    render();
    showToast('Oxirgi amal bekor qilindi.');
    $('add-open').focus();
  });

  /* ---------------- karta ---------------- */

  function iconButton(cls, icon, label, onClick) {
    var b = el('button', cls);
    b.type = 'button';
    b.innerHTML = icon;
    b.setAttribute('aria-label', label);
    b.title = label;
    b.addEventListener('click', onClick);
    return b;
  }

  function taskCard(task, status) {
    var li = el('li', 'task');
    li.dataset.id = task.id;
    li.title = (status === 'new' ? 'Qo‘shildi: ' : status === 'doing' ? 'Boshlandi: ' : 'Tugadi: ') + fmtTime(task.updatedAt);
    var late = T.isOverdue(task, today());
    if (late) li.classList.add('is-late');

    var top = el('div', 'task__top');
    top.appendChild(el('p', 'task__title', task.title));
    var tools = el('div', 'task__tools');
    tools.appendChild(iconButton('icon-btn', ICON.edit, '“' + task.title + '” vazifasini tahrirlash', function () { openDrawer('edit', task.id); }));
    tools.appendChild(iconButton('icon-btn icon-btn--danger', ICON.del, '“' + task.title + '” vazifasini o‘chirish', function () { onRemove(task.id); }));
    top.appendChild(tools);

    var bottom = el('div', 'task__bottom');
    if (task.assignee) {
      var av = el('span', 'avatar', initials(task.assignee));
      av.title = 'Mas’ul: ' + task.assignee;
      av.setAttribute('role', 'img');
      av.setAttribute('aria-label', 'Mas’ul: ' + task.assignee);
      bottom.appendChild(av);
    }
    if (task.due) {
      var due = el('span', 'due');
      due.innerHTML = ICON.cal;
      due.appendChild(el('span', 'sr-only', late ? 'Muddati o‘tgan: ' : 'Muddat: '));
      due.appendChild(document.createTextNode(shortDue(task.due)));
      due.title = (late ? 'Muddati o‘tgan: ' : 'Muddat: ') + T.fmtDue(task.due);
      bottom.appendChild(due);
    }
    if (task.priority === 'yuqori') {
      var fl = el('span', 'flag');
      fl.innerHTML = ICON.flag;
      fl.title = 'Yuqori muhimlik';
      fl.setAttribute('role', 'img');
      fl.setAttribute('aria-label', 'Yuqori muhimlik');
      bottom.appendChild(fl);
    }

    var actions = el('div', 'task__actions');
    ACTIONS[status].forEach(function (a) {
      var b = el('button', 'move move--' + a[2]);
      b.type = 'button';
      b.dataset.to = a[0];
      if (a[2] === 'back') b.innerHTML = ICON.back;
      if (a[1]) b.appendChild(document.createTextNode(a[1]));
      if (a[2] === 'fwd') b.insertAdjacentHTML('beforeend', ICON.fwd);
      b.setAttribute('aria-label', '“' + task.title + '”: ' + T.LABELS[a[0]] + ' ustuniga o‘tkazish');
      if (!a[1]) b.title = T.LABELS[a[0]] + ' ustuniga qaytarish';
      b.addEventListener('click', function () { onMove(task.id, a[0]); });
      actions.appendChild(b);
    });
    bottom.appendChild(actions);

    li.appendChild(top);
    li.appendChild(bottom);

    // Sichqoncha bilan sudrab o'tkazish (tugmalar baribir asosiy yo'l)
    li.draggable = true;
    li.addEventListener('dragstart', function (e) {
      dragId = task.id;
      dragFrom = status;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', task.id);
      li.classList.add('is-dragging');
    });
    li.addEventListener('dragend', endDrag);
    return li;
  }

  /* ---------------- chizish ---------------- */

  var highlightClass = 'just-moved';

  function renderColumn(status, visible, highlightId) {
    var list = $('list-' + status);
    var items = T.byStatus(visible, status);
    list.innerHTML = '';
    if (!items.length) {
      var hasAny = state.tasks.some(function (t) { return t.status === status; });
      list.appendChild(el('li', 'empty', hasAny ? 'Filtrga mos vazifa yo‘q.' : 'Hozircha vazifa yo‘q.'));
      return;
    }
    items.forEach(function (task) {
      var card = taskCard(task, status);
      if (task.id === highlightId) card.classList.add(highlightClass);
      list.appendChild(card);
    });
  }

  function renderStats() {
    var c = T.counts(state.tasks);  // sonlar har doim umumiy (filtrdan qat'i nazar)
    T.STATUSES.forEach(function (s) {
      $('count-' + s).textContent = c[s];
      $('tc-' + s).textContent = c[s];
      $('seg-' + s).style.flexGrow = c.total ? c[s] : 0;
    });
    $('progress-text').textContent = c.total ? c.donePercent + '% tugadi' : 'Hali vazifa yo‘q';
    var late = state.tasks.filter(function (t) { return T.isOverdue(t, today()); }).length;
    $('late-chip').hidden = !late;
    $('late-chip').textContent = late + ' ta muddati o‘tgan';
    $('sample-note').hidden = !state.tasks.some(function (t) { return t.sample; });
  }

  function renderAssignees() {
    var names = T.assignees(state.tasks);
    var dl = $('assignee-list');
    dl.innerHTML = '';
    names.forEach(function (n) { var o = el('option'); o.value = n; dl.appendChild(o); });

    var sel = $('f-who');
    var cur = sel.value;
    sel.innerHTML = '';
    [['', 'Hammasi'], ['__none__', 'Mas’ulsiz']].concat(names.map(function (n) { return [n, n]; }))
      .forEach(function (p) { var o = el('option', null, p[1]); o.value = p[0]; sel.appendChild(o); });
    sel.value = names.indexOf(cur) !== -1 || cur === '__none__' ? cur : '';
    filter.assignee = sel.value;
  }

  function renderFilterInfo(visible) {
    var active = !!(filter.q || filter.assignee || filter.priority);
    var inPop = (filter.assignee ? 1 : 0) + (filter.priority ? 1 : 0);
    $('f-clear').hidden = !active;
    $('filter-count').hidden = !inPop;
    $('filter-count').textContent = inPop;
    $('f-result').textContent = active ? visible.length + ' / ' + state.tasks.length + ' ta vazifa ko‘rsatilmoqda' : '';
  }

  function historyText(e) {
    var t = '“' + e.title + '”';
    if (e.type === 'add') return t + ' qo‘shildi';
    if (e.type === 'move') return t + ': ' + T.LABELS[e.from] + ' → ' + T.LABELS[e.to];
    if (e.type === 'edit') return t + ' tahrirlandi';
    if (e.type === 'remove') return t + ' o‘chirildi';
    return 'Taxta tozalandi (' + e.title + ')';
  }

  function renderHistory() {
    var ol = $('history-list');
    ol.innerHTML = '';
    var items = state.history.slice(0, HISTORY_SHOWN);
    if (!items.length) {
      ol.appendChild(el('li', 'empty', 'Hali o‘zgarish yo‘q.'));
      return;
    }
    items.forEach(function (e) {
      var li = el('li', 'history__item history__item--' + e.type);
      var time = el('time', 'history__time', fmtTime(e.at));
      time.dateTime = new Date(e.at).toISOString();
      li.appendChild(time);
      li.appendChild(el('span', null, historyText(e)));
      ol.appendChild(li);
    });
  }

  function render(highlightId) {
    renderAssignees();
    var visible = T.filterTasks(state.tasks, filter);
    T.STATUSES.forEach(function (s) { renderColumn(s, visible, highlightId); });
    renderStats();
    renderFilterInfo(visible);
    renderHistory();
  }

  function focusTask(id, selector) {
    var t = document.querySelector('.task[data-id="' + id + '"] ' + (selector || '.move'));
    if (t && t.offsetParent !== null) { t.focus(); return; }
    // Telefonda vazifa boshqa tabga o'tgan bo'lsa — fokus joriy tabda qoladi
    var tab = document.querySelector('.tab[aria-selected="true"]');
    if (tab && tab.offsetParent !== null) tab.focus(); else $('add-open').focus();
  }

  /* ---------------- kalendar (muddat tanlash) ---------------- */

  // Brauzerning o'z kalendari bezatib bo'lmaydi va ba'zi tizimlarda chetga yopishadi —
  // shuning uchun o'zimizning kichik kalendar. Qiymat yashirin #due maydonida (YYYY-MM-DD).
  var MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
  var WEEK = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
  var WEEK_FULL = ['dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba', 'yakshanba'];
  var dueMin = null;          // yangi vazifada — bugun; tahrirda — cheklov yo'q
  var calView = null;         // ko'rsatilayotgan oy: { y, m }

  function parseDate(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function humanDate(s) {
    var d = parseDate(s);
    return d.getDate() + '-' + MONTHS[d.getMonth()] + (d.getFullYear() === new Date().getFullYear() ? '' : ' ' + d.getFullYear());
  }

  function setDue(value) {
    $('due').value = value || '';
    var btn = $('due-btn');
    $('due-btn-text').textContent = value ? humanDate(value) : 'Sana tanlang';
    btn.classList.toggle('is-empty', !value);
    $('due-clear').hidden = !value;
    $('due-error').textContent = '';
    btn.removeAttribute('aria-invalid');
  }

  function renderCalendar(focusDate) {
    var pop = $('due-pop');
    var y = calView.y, m = calView.m;
    var selected = $('due').value, now = today();
    pop.innerHTML = '';

    var head = el('div', 'cal__head');
    head.appendChild(el('span', 'cal__title', cap(MONTHS[m]) + ' ' + y));
    var nav = el('div', 'cal__nav');
    nav.appendChild(iconButton('icon-btn', ICON.back, 'Oldingi oy', function () { shiftMonth(-1); }));
    nav.appendChild(iconButton('icon-btn', ICON.fwd, 'Keyingi oy', function () { shiftMonth(1); }));
    head.appendChild(nav);
    pop.appendChild(head);

    var week = el('div', 'cal__week');
    week.setAttribute('aria-hidden', 'true');
    WEEK.forEach(function (w) { week.appendChild(el('span', null, w)); });
    pop.appendChild(week);

    var grid = el('div', 'cal__grid');
    var first = new Date(y, m, 1);
    var start = new Date(y, m, 1 - ((first.getDay() + 6) % 7));   // dushanbadan boshlanadi
    var tabbable = null;
    for (var i = 0; i < 42; i++) {
      var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      var iso = T.todayStr(d);
      var b = el('button', 'cal__day', String(d.getDate()));
      b.type = 'button';
      b.dataset.date = iso;
      b.tabIndex = -1;
      b.setAttribute('aria-label', d.getDate() + '-' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() + ', ' + WEEK_FULL[(d.getDay() + 6) % 7]);
      if (d.getMonth() !== m) b.classList.add('is-other');
      if (iso === now) { b.classList.add('is-today'); b.setAttribute('aria-current', 'date'); }
      if (iso === selected) b.setAttribute('aria-pressed', 'true');
      if (dueMin && iso < dueMin) b.disabled = true;
      b.addEventListener('click', onPickDay);
      b.addEventListener('keydown', onDayKey);
      grid.appendChild(b);
      if (!b.disabled && (iso === focusDate || (!tabbable && d.getMonth() === m))) tabbable = b;
      if (iso === focusDate && !b.disabled) tabbable = b;
    }
    pop.appendChild(grid);
    if (tabbable) tabbable.tabIndex = 0;

    var quick = el('div', 'cal__quick');
    [['Bugun', 0], ['Ertaga', 1], ['1 haftadan', 7]].forEach(function (q) {
      var iso = T.addDays(now, q[1]);
      var c = el('button', 'chip', q[0]);
      c.type = 'button';
      c.disabled = !!(dueMin && iso < dueMin);
      c.addEventListener('click', function () { pickDate(iso); });
      quick.appendChild(c);
    });
    var clr = el('button', 'chip chip--ghost', 'Tozalash');
    clr.type = 'button';
    clr.addEventListener('click', function () { pickDate(''); });
    quick.appendChild(clr);
    pop.appendChild(quick);
    return tabbable;
  }

  function openCalendar() {
    var base = $('due').value || dueMin || today();
    var d = parseDate(base);
    calView = { y: d.getFullYear(), m: d.getMonth() };
    $('due-pop').hidden = false;
    $('due-btn').setAttribute('aria-expanded', 'true');
    var t = renderCalendar($('due').value || today());
    if (t) t.focus();
  }
  function closeCalendar(returnFocus) {
    $('due-pop').hidden = true;
    $('due-btn').setAttribute('aria-expanded', 'false');
    if (returnFocus) $('due-btn').focus();
  }
  function shiftMonth(n) {
    var d = new Date(calView.y, calView.m + n, 1);
    calView = { y: d.getFullYear(), m: d.getMonth() };
    renderCalendar(null);
    $('due-pop').querySelector('.cal__nav .icon-btn:' + (n < 0 ? 'first-child' : 'last-child')).focus();
  }
  function pickDate(iso) {
    setDue(iso);
    closeCalendar(true);
  }
  function onPickDay(e) { pickDate(e.currentTarget.dataset.date); }
  function onDayKey(e) {
    var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    var cur = e.currentTarget.dataset.date;
    var target = null;
    if (step) target = T.addDays(cur, step);
    if (e.key === 'PageUp' || e.key === 'PageDown') {
      var d = parseDate(cur);
      target = T.todayStr(new Date(d.getFullYear(), d.getMonth() + (e.key === 'PageUp' ? -1 : 1), d.getDate()));
    }
    if (!target) return;
    e.preventDefault();
    var td = parseDate(target);
    if (td.getFullYear() !== calView.y || td.getMonth() !== calView.m) calView = { y: td.getFullYear(), m: td.getMonth() };
    var t = renderCalendar(target);
    var exact = $('due-pop').querySelector('.cal__day[data-date="' + target + '"]:not(:disabled)');
    (exact || t).tabIndex = 0;
    (exact || t).focus();
  }

  $('due-btn').addEventListener('click', function () {
    if ($('due-pop').hidden) openCalendar(); else closeCalendar(true);
  });
  $('due-clear').addEventListener('click', function () { setDue(''); $('due-btn').focus(); });
  $('due-pop').addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeCalendar(true); }   // panelni emas, faqat kalendarni yopadi
  });
  // Tashqariga bosilsa yopiladi. composedPath — bosish paytidagi yo'l: oy almashganda kalendar qayta
  // chiziladi va bosilgan tugma DOM'dan chiqadi, shunda ham u kalendar ichida deb hisoblanadi.
  document.addEventListener('click', function (e) {
    if ($('due-pop').hidden) return;
    var inside = e.composedPath().some(function (n) { return n.classList && n.classList.contains('date-field'); });
    if (!inside) closeCalendar(false);
  });

  /* ---------------- panel: qo'shish va tahrirlash ---------------- */

  var FIELDS = ['title', 'assignee', 'due'];
  // Xato bo'lsa fokus va qizil chegara qaysi elementga tushadi (muddat — kalendar tugmasiga)
  var FIELD_UI = { title: 'title', assignee: 'assignee', due: 'due-btn' };

  function clearFieldErrors() {
    FIELDS.forEach(function (k) {
      $(k + '-error').textContent = '';
      $(FIELD_UI[k]).removeAttribute('aria-invalid');
    });
  }

  function openDrawer(mode, id) {
    var task = id ? state.tasks.filter(function (t) { return t.id === id; })[0] : null;
    drawerMode = task ? 'edit' : 'add';
    drawerTaskId = task ? task.id : null;
    drawerReturn = task ? null : $('add-open');
    clearFieldErrors();
    $('drawer-title').textContent = task ? 'Vazifani tahrirlash' : 'Yangi vazifa';
    $('drawer-submit').textContent = task ? 'Saqlash' : 'Qo‘shish';
    $('title').value = task ? task.title : '';
    $('assignee').value = task ? task.assignee || '' : '';
    $('priority').value = task ? task.priority : 'orta';
    dueMin = task ? null : today();      // tahrirda eski muddat saqlanishi mumkin
    setDue(task ? task.due : '');
    closeCalendar(false);
    $('drawer').hidden = false;
    $('title').focus();
    if (task) $('title').select();
  }

  function closeDrawer() {
    if ($('drawer').hidden) return;
    closeCalendar(false);
    animateOut($('drawer'), 'drawer--ghost');
    $('drawer').hidden = true;
    var id = drawerTaskId;
    drawerTaskId = null;
    if (id && document.querySelector('.task[data-id="' + id + '"]')) focusTask(id, '.icon-btn');
    else (drawerReturn || $('add-open')).focus();
  }

  $('add-open').addEventListener('click', function () { openDrawer('add'); });
  document.querySelectorAll('#drawer [data-close]').forEach(function (b) { b.addEventListener('click', closeDrawer); });
  $('drawer').addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); return; }
    if (e.key === 'Tab') {   // fokus panel ichida aylanadi
      var f = Array.prototype.slice.call($('drawer').querySelectorAll('.drawer__panel button, .drawer__panel input, .drawer__panel select'))
        .filter(function (n) { return n.type !== 'hidden' && n.offsetParent !== null && n.tabIndex !== -1; });
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });

  function showErrors(errors) {
    Object.keys(errors).forEach(function (k) {
      $(k + '-error').textContent = errors[k];
      $(FIELD_UI[k]).setAttribute('aria-invalid', 'true');
    });
    $(FIELD_UI[Object.keys(errors)[0]]).focus();
  }

  $('add-form').addEventListener('submit', function (e) {
    e.preventDefault();
    clearFieldErrors();
    var values = { title: $('title').value, assignee: $('assignee').value, priority: $('priority').value, due: $('due').value, today: today() };

    if (drawerMode === 'edit' && drawerTaskId) {
      var er = T.editTask(state.tasks, drawerTaskId, values);
      if (!er.ok) { showErrors(er.errors); return; }
      if (er.changed) commit(er.tasks, { type: 'edit', title: er.task.title }, '“' + er.task.title + '” saqlandi.');
      render(er.task.id);
      closeDrawer();
      return;
    }

    var r = T.addTask(state.tasks, values.title, null, null, values);
    if (!r.ok) { showErrors(r.errors); return; }
    commit(r.tasks, { type: 'add', title: r.task.title, to: 'new' }, '“' + r.task.title + '” Yangi ustuniga qo‘shildi.');
    highlightClass = 'just-added';
    render(r.task.id);
    highlightClass = 'just-moved';
    closeDrawer();
  });
  ['title', 'assignee'].forEach(function (k) {
    $(k).addEventListener('input', function () { $(k + '-error').textContent = ''; $(k).removeAttribute('aria-invalid'); });
  });

  /* ---------------- amallar ---------------- */

  function onMove(id, to) {
    var r = T.moveTask(state.tasks, id, to);
    if (!r.ok) return false;   // eski tugmani tez qayta bosish yoki ruxsat etilmagan o'tish — e'tiborsiz
    commit(r.tasks, { type: 'move', title: r.task.title, from: r.from, to: to }, '“' + r.task.title + '” → ' + T.LABELS[to] + '.');
    render(id);
    focusTask(id);
    return true;
  }

  function onRemove(id) {
    var card = document.querySelector('.task[data-id="' + id + '"]');
    var next = card && (card.nextElementSibling || card.previousElementSibling);
    var nextId = next && next.dataset.id;
    var r = T.removeTask(state.tasks, id);
    if (!r.ok) return;
    commit(r.tasks, { type: 'remove', title: r.task.title, from: r.task.status }, '“' + r.task.title + '” o‘chirildi.');
    render();
    if (nextId) focusTask(nextId); else $('toast-undo').focus();
  }

  /* ---------------- qidiruv va filtr ---------------- */

  function setPop(open) {
    $('filter-pop').hidden = !open;
    $('filter-btn').setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  $('filter-btn').addEventListener('click', function () {
    var open = $('filter-pop').hidden;
    setPop(open);
    if (open) $('f-who').focus();
  });
  $('filter-pop').addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { setPop(false); $('filter-btn').focus(); }
  });
  document.addEventListener('click', function (e) {
    if (!$('filter-pop').hidden && !e.target.closest('.filter-wrap')) setPop(false);
  });

  $('f-q').addEventListener('input', function () { filter.q = this.value; render(); });
  $('f-who').addEventListener('change', function () { filter.assignee = this.value; render(); });
  $('f-pr').addEventListener('change', function () { filter.priority = this.value; render(); });
  $('f-clear').addEventListener('click', function () {
    filter = { q: '', assignee: '', priority: '' };
    $('f-q').value = ''; $('f-who').value = ''; $('f-pr').value = '';
    setPop(false);
    render();
    $('f-q').focus();
  });

  /* ---------------- sudrab o'tkazish ---------------- */

  function endDrag() {
    dragId = dragFrom = null;
    document.querySelectorAll('.is-dragging').forEach(function (n) { n.classList.remove('is-dragging'); });
    document.querySelectorAll('.col').forEach(function (c) { c.classList.remove('drop-ok', 'drop-no'); });
  }

  document.querySelectorAll('.col').forEach(function (col) {
    var to = col.dataset.status;
    col.addEventListener('dragover', function (e) {
      if (!dragId || dragFrom === to) return;
      var allowed = T.canMove(dragFrom, to);
      col.classList.toggle('drop-ok', allowed);
      col.classList.toggle('drop-no', !allowed);
      if (allowed) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
    });
    col.addEventListener('dragleave', function (e) {
      if (!col.contains(e.relatedTarget)) col.classList.remove('drop-ok', 'drop-no');
    });
    col.addEventListener('drop', function (e) {
      e.preventDefault();
      var id = dragId, from = dragFrom;
      endDrag();
      if (id && T.canMove(from, to)) onMove(id, to);
    });
  });

  /* ---------------- telefon: tablar ---------------- */

  function setTab(s, focus) {
    $('columns').dataset.tab = s;
    T.STATUSES.forEach(function (x) {
      var b = $('tab-' + x);
      b.setAttribute('aria-selected', x === s ? 'true' : 'false');
      b.tabIndex = x === s ? 0 : -1;
    });
    try { if (storage) storage.setItem(TAB_KEY, s); } catch (e) { /* majburiy emas */ }
    if (focus) $('tab-' + s).focus();
  }
  document.querySelectorAll('.tab').forEach(function (b) {
    b.addEventListener('click', function () { setTab(b.dataset.tab); });
    b.addEventListener('keydown', function (e) {
      var i = T.STATUSES.indexOf(b.dataset.tab);
      if (e.key === 'ArrowRight') { e.preventDefault(); setTab(T.STATUSES[(i + 1) % 3], true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setTab(T.STATUSES[(i + 2) % 3], true); }
    });
  });
  var savedTab = null;
  try { savedTab = storage && storage.getItem(TAB_KEY); } catch (e) { savedTab = null; }
  setTab(T.STATUSES.indexOf(savedTab) !== -1 ? savedTab : 'new');

  /* ---------------- menyu: joriy bo'lim ---------------- */

  document.querySelectorAll('.nav a').forEach(function (a) {
    a.addEventListener('click', function () {
      document.querySelectorAll('.nav a').forEach(function (x) { x.removeAttribute('aria-current'); });
      a.setAttribute('aria-current', 'true');
    });
  });

  /* ---------------- hisobot ---------------- */

  function openReport() {
    $('report-text').value = T.buildReport(state.tasks, today());
    $('report-msg').textContent = '';
    $('report').hidden = false;
    $('report-copy').focus();
  }
  function closeReport() {
    if ($('report').hidden) return;
    animateOut($('report'), 'modal--ghost');
    $('report').hidden = true;
    $('report-open').focus();   // fokus har doim ochgan tugmaga qaytadi
  }
  $('report-open').addEventListener('click', openReport);
  $('report-close').addEventListener('click', closeReport);
  $('report').addEventListener('click', function (e) { if (e.target === $('report')) closeReport(); });
  $('report').addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); closeReport(); }
    if (e.key === 'Tab') {   // fokus oyna ichida aylanadi
      var f = [$('report-close'), $('report-text'), $('report-copy')];
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  $('report-copy').addEventListener('click', function () {
    var ta = $('report-text');
    function fallback() {
      ta.focus();
      ta.select();
      $('report-msg').textContent = 'Matn belgilandi — Ctrl+C bilan nusxalang.';
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ta.value)
        .then(function () { $('report-msg').textContent = 'Nusxalandi.'; })
        .catch(fallback);
    } else {
      fallback();
    }
  });

  /* ---------------- tozalash ---------------- */

  var resetBtn = $('reset'), confirmBox = $('reset-confirm');
  resetBtn.addEventListener('click', function () { confirmBox.hidden = false; $('reset-no').focus(); });
  $('reset-no').addEventListener('click', function () { confirmBox.hidden = true; resetBtn.focus(); });
  $('reset-yes').addEventListener('click', function () {
    var n = state.tasks.length;
    commit([], { type: 'clear', title: n + ' ta vazifa' }, 'Taxta tozalandi (' + n + ' ta vazifa).');
    confirmBox.hidden = true;
    render();
    $('add-open').focus();
  });

  // Faqat namuna vazifalarni o'chirish (o'zingiz qo'shganlari qoladi)
  $('sample-clear').addEventListener('click', function () {
    var rest = state.tasks.filter(function (t) { return !t.sample; });
    var n = state.tasks.length - rest.length;
    commit(rest, { type: 'clear', title: n + ' ta namuna vazifa' }, n + ' ta namuna vazifa o‘chirildi.');
    render();
    $('add-open').focus();
  });

  /* ---------------- tezkor tugmalar ---------------- */

  // N — yangi vazifa, / — qidirish. Matn yozilayotganda yoki oyna ochiq bo'lsa ishlamaydi.
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName))) return;
    if (!$('drawer').hidden || !$('report').hidden) return;
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openDrawer('add'); }
    else if (e.key === '/') { e.preventDefault(); $('f-q').focus(); }
  });

  // Boshqa oynada o'zgarsa, shu oyna ham yangilanadi
  window.addEventListener('storage', function (e) {
    if (e.key === T.STATE_KEY && storage) {
      state = T.loadState(storage) || { tasks: [], history: [] };
      render();
    }
  });

  render();

  // Sinov uchun
  window.TaxtaApp = { onMove: onMove, render: render, getState: function () { return state; } };
})();
