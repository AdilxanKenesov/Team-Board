(function () {
  'use strict';

  var T = window.Taxta;
  var UNDO_MS = 6000;

  var storage = null;
  try { storage = window.localStorage; } catch (e) { storage = null; }

  // Birinchi ochilish yoki butunlay buzilgan ma'lumot — namuna taxta
  var state = (storage && T.loadState(storage)) || { tasks: T.sampleTasks(), history: [] };
  var storageOk = storage ? T.saveState(storage, state) : false;
  if (!storageOk) $('storage-warning').hidden = false;

  var filter = { q: '', assignee: '', priority: '' };
  var editingId = null;
  var dragId = null, dragFrom = null;
  var TAB_KEY = 'taxta010.tab';
  var undoSnapshot = null, undoTimer = null;

  // Har ustundagi o'tkazish tugmalari: [qayerga, matn, turi]
  var ACTIONS = {
    new: [['doing', 'Boshlash →', 'fwd']],
    doing: [['new', '← Qaytarish', 'back'], ['done', 'Tugatish →', 'fwd']],
    done: [['doing', '← Qayta ochish', 'back']]
  };

  var ICON_EDIT = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M13.6 3.2a1.8 1.8 0 0 1 2.5 0l.7.7a1.8 1.8 0 0 1 0 2.5L7.4 15.8 3.5 16.5l.7-3.9z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  var ICON_DEL = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6h12M8 6V4h4v2M6 6l.8 10h6.4L14 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function $(id) { return document.getElementById(id); }
  function today() { return T.todayStr(); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmtTime(ts) {
    var d = new Date(ts);
    return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
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
    editingId = null;
    persist();
    render();
    showToast('Oxirgi amal bekor qilindi.');
    $('title').focus();
  });

  /* ---------------- chizish ---------------- */

  function taskCard(task, status) {
    var li = el('li', 'task');
    li.dataset.id = task.id;
    var late = T.isOverdue(task, today());
    if (late) li.classList.add('is-late');

    var top = el('div', 'task__top');
    top.appendChild(el('p', 'task__title', task.title));
    var tools = el('div', 'task__tools');
    var edit = el('button', 'icon-btn');
    edit.type = 'button';
    edit.innerHTML = ICON_EDIT;
    edit.setAttribute('aria-label', '“' + task.title + '” vazifasini tahrirlash');
    edit.title = 'Tahrirlash';
    edit.addEventListener('click', function () { startEdit(task.id); });
    var del = el('button', 'icon-btn icon-btn--danger');
    del.type = 'button';
    del.innerHTML = ICON_DEL;
    del.setAttribute('aria-label', '“' + task.title + '” vazifasini o‘chirish');
    del.title = 'O‘chirish';
    del.addEventListener('click', function () { onRemove(task.id); });
    tools.appendChild(edit);
    tools.appendChild(del);
    top.appendChild(tools);

    var meta = el('div', 'task__meta');
    if (task.assignee) {
      var who = el('span', 'who');
      var av = el('span', 'avatar', initials(task.assignee));
      av.setAttribute('aria-hidden', 'true');
      who.appendChild(av);
      who.appendChild(el('span', null, task.assignee));
      meta.appendChild(who);
    }
    var pr = el('span', 'prio prio--' + task.priority, T.PRIORITY_LABELS[task.priority]);
    pr.title = 'Muhimlik';
    meta.appendChild(pr);
    if (task.due) meta.appendChild(el('span', 'due', (late ? 'Muddati o‘tgan: ' : 'Muddat: ') + T.fmtDue(task.due)));
    if (task.sample) meta.appendChild(el('span', 'badge', 'Namuna'));

    var when = el('p', 'task__when',
      (status === 'new' ? 'Qo‘shildi: ' : status === 'doing' ? 'Boshlandi: ' : 'Tugadi: ') + fmtTime(task.updatedAt));

    var actions = el('div', 'task__actions');
    ACTIONS[status].forEach(function (a) {
      var b = el('button', 'move move--' + a[2], a[1]);
      b.type = 'button';
      b.dataset.to = a[0];
      b.setAttribute('aria-label', '“' + task.title + '”: ' + T.LABELS[a[0]] + ' ustuniga o‘tkazish');
      b.addEventListener('click', function () { onMove(task.id, a[0]); });
      actions.appendChild(b);
    });

    li.appendChild(top);
    li.appendChild(meta);
    li.appendChild(when);
    li.appendChild(actions);

    // Sichqoncha bilan sudrab o'tkazish (tugmalar baribir asosiy yo'l)
    li.draggable = true;
    li.addEventListener('dragstart', function (e) {
      dragId = task.id;
      dragFrom = status;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', task.id);
      li.classList.add('is-dragging');
      document.body.classList.add('dragging-on');
    });
    li.addEventListener('dragend', endDrag);
    return li;
  }

  function editCard(task) {
    var li = el('li', 'task task--edit');
    li.dataset.id = task.id;
    var f = el('form', 'edit');
    f.noValidate = true;
    var uid = 'e-' + task.id;
    f.innerHTML =
      '<label class="field-label" for="' + uid + '-t">Nom</label>' +
      '<input id="' + uid + '-t" type="text" maxlength="120" autocomplete="off">' +
      '<p class="error" data-err="title" role="alert"></p>' +
      '<div class="edit__grid">' +
        '<div class="field"><label class="field-label" for="' + uid + '-a">Mas’ul</label>' +
          '<input id="' + uid + '-a" type="text" list="assignee-list" maxlength="40" autocomplete="off">' +
          '<p class="error" data-err="assignee" role="alert"></p></div>' +
        '<div class="field"><label class="field-label" for="' + uid + '-p">Muhimlik</label>' +
          '<select id="' + uid + '-p"><option value="yuqori">Yuqori</option><option value="orta">O‘rta</option><option value="past">Past</option></select></div>' +
        '<div class="field"><label class="field-label" for="' + uid + '-d">Muddat</label>' +
          '<input id="' + uid + '-d" type="date">' +
          '<p class="error" data-err="due" role="alert"></p></div>' +
      '</div>' +
      '<div class="edit__actions"><button type="submit" class="btn btn--primary btn--sm">Saqlash</button>' +
      '<button type="button" class="btn btn--ghost btn--sm" data-cancel>Bekor qilish</button>' +
      '<span class="hint">Enter — saqlash, Esc — bekor</span></div>';
    li.appendChild(f);

    var tIn = f.querySelector('#' + uid + '-t'), aIn = f.querySelector('#' + uid + '-a');
    var pIn = f.querySelector('#' + uid + '-p'), dIn = f.querySelector('#' + uid + '-d');
    tIn.value = task.title;
    aIn.value = task.assignee || '';
    pIn.value = task.priority;
    dIn.value = task.due || '';

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var r = T.editTask(state.tasks, task.id, {
        title: tIn.value, assignee: aIn.value, priority: pIn.value, due: dIn.value, today: today()
      });
      f.querySelectorAll('[data-err]').forEach(function (p) { p.textContent = ''; });
      [tIn, aIn, dIn].forEach(function (i) { i.removeAttribute('aria-invalid'); });
      if (!r.ok) {
        var map = { title: tIn, assignee: aIn, due: dIn };
        Object.keys(r.errors).forEach(function (k) {
          f.querySelector('[data-err="' + k + '"]').textContent = r.errors[k];
          map[k].setAttribute('aria-invalid', 'true');
        });
        map[Object.keys(r.errors)[0]].focus();
        return;
      }
      editingId = null;
      if (r.changed) commit(r.tasks, { type: 'edit', title: r.task.title }, '“' + r.task.title + '” saqlandi.');
      render();
      focusTask(task.id, '.icon-btn');
    });
    f.querySelector('[data-cancel]').addEventListener('click', cancelEdit);
    f.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); } });
    return li;
  }

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
      var card = task.id === editingId ? editCard(task) : taskCard(task, status);
      if (task.id === highlightId) card.classList.add('just-moved');
      list.appendChild(card);
    });
  }

  function renderStats() {
    var c = T.counts(state.tasks);  // sonlar har doim umumiy (filtrdan qat'i nazar)
    T.STATUSES.forEach(function (s) {
      $('count-' + s).textContent = c[s];
      $('seg-' + s).style.flexGrow = c.total ? c[s] : 0;
    });
    var late = state.tasks.filter(function (t) { return T.isOverdue(t, today()); }).length;
    $('progress-text').textContent = c.total
      ? 'Jami ' + c.total + ' · Yangi ' + c.new + ' · Bajarilmoqda ' + c.doing + ' · Tugagan ' + c.done + ' (' + c.donePercent + '%)' +
        (late ? ' · Muddati o‘tgan ' + late : '')
      : 'Hali vazifa yo‘q';
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
    $('f-clear').hidden = !active;
    $('f-result').textContent = active ? visible.length + ' / ' + state.tasks.length + ' ta vazifa ko‘rsatilmoqda' : '';
  }

  function renderTabs() {
    var c = T.counts(state.tasks);
    T.STATUSES.forEach(function (s) { $('tc-' + s).textContent = c[s]; });
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
    var items = state.history.slice(0, 20);
    if (!items.length) {
      ol.appendChild(el('li', 'empty', 'Hali o‘zgarish yo‘q. Vazifa qo‘shsangiz yoki ko‘chirsangiz, shu yerda ko‘rinadi.'));
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
    renderTabs();
    renderHistory();
  }

  function focusTask(id, selector) {
    var t = document.querySelector('.task[data-id="' + id + '"] ' + (selector || '.move'));
    if (t && t.offsetParent !== null) { t.focus(); return; }
    // Telefonda vazifa boshqa tabga o'tgan bo'lsa — fokus joriy tabda qoladi
    var tab = document.querySelector('.tab[aria-selected="true"]');
    if (tab && tab.offsetParent !== null) tab.focus(); else $('title').focus();
  }

  /* ---------------- amallar ---------------- */

  function clearFieldErrors() {
    ['title', 'assignee', 'due'].forEach(function (k) {
      $(k + '-error').textContent = '';
      $(k).removeAttribute('aria-invalid');
    });
  }

  $('add-form').addEventListener('submit', function (e) {
    e.preventDefault();
    clearFieldErrors();
    var r = T.addTask(state.tasks, $('title').value, null, null, {
      assignee: $('assignee').value, priority: $('priority').value, due: $('due').value, today: today()
    });
    if (!r.ok) {
      Object.keys(r.errors).forEach(function (k) {
        $(k + '-error').textContent = r.errors[k];
        $(k).setAttribute('aria-invalid', 'true');
      });
      if (r.errors.assignee || r.errors.due) $('more').open = true;
      $(Object.keys(r.errors)[0]).focus();
      return;
    }
    commit(r.tasks, { type: 'add', title: r.task.title, to: 'new' }, '“' + r.task.title + '” Yangi ustuniga qo‘shildi.');
    $('title').value = '';
    $('due').value = '';
    render(r.task.id);
    $('title').focus();
  });
  ['title', 'assignee', 'due'].forEach(function (k) {
    $(k).addEventListener('input', function () { $(k + '-error').textContent = ''; $(k).removeAttribute('aria-invalid'); });
  });

  function onMove(id, to) {
    var r = T.moveTask(state.tasks, id, to);
    if (!r.ok) return false;   // eski tugmani tez qayta bosish yoki ruxsat etilmagan o'tish — e'tiborsiz
    commit(r.tasks, { type: 'move', title: r.task.title, from: r.from, to: to }, '“' + r.task.title + '” → ' + T.LABELS[to] + '.');
    render(id);
    focusTask(id);
    return true;
  }

  function onRemove(id) {
    var list = document.querySelector('.task[data-id="' + id + '"]');
    var next = list && (list.nextElementSibling || list.previousElementSibling);
    var nextId = next && next.dataset.id;
    var r = T.removeTask(state.tasks, id);
    if (!r.ok) return;
    if (editingId === id) editingId = null;
    commit(r.tasks, { type: 'remove', title: r.task.title, from: r.task.status }, '“' + r.task.title + '” o‘chirildi.');
    render();
    if (nextId) focusTask(nextId); else $('toast-undo').focus();
  }

  function startEdit(id) {
    editingId = id;
    render();
    var input = document.querySelector('.task[data-id="' + id + '"] input[type="text"]');
    if (input) { input.focus(); input.select(); }
  }
  function cancelEdit() {
    var id = editingId;
    editingId = null;
    render();
    focusTask(id, '.icon-btn');
  }

  /* ---------------- filtr ---------------- */

  $('f-q').addEventListener('input', function () { filter.q = this.value; render(); });
  $('f-who').addEventListener('change', function () { filter.assignee = this.value; render(); });
  $('f-pr').addEventListener('change', function () { filter.priority = this.value; render(); });
  $('f-clear').addEventListener('click', function () {
    filter = { q: '', assignee: '', priority: '' };
    $('f-q').value = ''; $('f-who').value = ''; $('f-pr').value = '';
    render();
    $('f-q').focus();
  });

  /* ---------------- sudrab o'tkazish ---------------- */

  function endDrag() {
    dragId = dragFrom = null;
    document.body.classList.remove('dragging-on');
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
    try { storage && storage.setItem(TAB_KEY, s); } catch (e) { /* majburiy emas */ }
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

  /* ---------------- hisobot ---------------- */

  var reportReturn = null;
  function openReport() {
    // Yopilganda fokus har doim ochgan tugmaga qaytadi (Safari tugmani bosganda fokus bermaydi)
    reportReturn = $('report-open');
    $('report-text').value = T.buildReport(state.tasks, today());
    $('report-msg').textContent = '';
    $('report').hidden = false;
    $('report-copy').focus();
  }
  function closeReport() {
    $('report').hidden = true;
    if (reportReturn) reportReturn.focus();
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

  /* ---------------- taxtani tozalash ---------------- */

  var resetBtn = $('reset'), confirmBox = $('reset-confirm');
  resetBtn.addEventListener('click', function () { confirmBox.hidden = false; $('reset-no').focus(); });
  $('reset-no').addEventListener('click', function () { confirmBox.hidden = true; resetBtn.focus(); });
  $('reset-yes').addEventListener('click', function () {
    var n = state.tasks.length;
    commit([], { type: 'clear', title: n + ' ta vazifa' }, 'Taxta tozalandi (' + n + ' ta vazifa).');
    confirmBox.hidden = true;
    editingId = null;
    render();
    $('title').focus();
  });

  // Boshqa oynada o'zgarsa, shu oyna ham yangilanadi
  window.addEventListener('storage', function (e) {
    if (e.key === T.STATE_KEY && storage) {
      state = T.loadState(storage) || { tasks: [], history: [] };
      render();
    }
  });

  $('due').min = today();
  render();

  // Sinov va keyingi bosqichlar uchun
  window.TaxtaApp = { onMove: onMove, render: render, getState: function () { return state; } };
})();
