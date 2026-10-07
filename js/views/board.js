/* Kanban taxta — admin (hamma vazifalar) va xodim (faqat o'ziniki) uchun umumiy. Filtrlar, sudrash, tez qo'shish, telefonda tablar. */
(function (root) {
  'use strict';
  var App = root.App, S = App.Store, L = App.Logic, U = App.UI, t = App.t, R = App.Router;
  var h = U.h;

  App.filters = App.filters || {};
  var TAB_KEY = 'tbpro.tab';
  var drag = null;

  function getFilter(scope) { return App.filters[scope] || (App.filters[scope] = { q: '', projectId: '', assigneeId: '', priority: '', tag: '', status: '', onlyOverdue: false }); }

  /* ---------------- filtr paneli ---------------- */
  function toolbar(scope, me, tasks, onChange) {
    var f = getFilter(scope);
    var q = h('input', { class: 'input', type: 'search', id: scope + '-q', placeholder: t('Vazifa, teg yoki xodim…'), value: f.q, 'aria-label': t('Qidirish') });
    q.addEventListener('input', function () { f.q = q.value; onChange(); });

    function select(id, label, opts, key) {
      var s = h('select', { class: 'input input--sm', id: id, 'aria-label': label }, opts.map(function (o) { return h('option', { value: o[0] }, o[1]); }));
      s.value = f[key] || '';
      s.addEventListener('change', function () { f[key] = s.value; onChange(); });
      return s;
    }
    var controls = [h('div', { class: 'toolbar__search' }, U.icon('search'), q)];
    controls.push(select(scope + '-project', t('Loyiha'), [['', t('Barcha loyihalar')]].concat(S.db.projects.filter(function (p) { return !p.archived; }).map(function (p) { return [p.id, p.name]; })), 'projectId'));
    if (me.role === 'admin') {
      controls.push(select(scope + '-assignee', t('Mas’ul'), [['', t('Barcha xodimlar')], ['__none__', t('Biriktirilmagan')]].concat(S.db.users.filter(function (u) { return u.active; }).map(function (u) { return [u.id, u.name]; })), 'assigneeId'));
    }
    controls.push(select(scope + '-priority', t('Muhimlik'), [['', t('Har qanday muhimlik')]].concat(L.PRIORITIES.map(function (p) { return [p, t(L.PRIORITY_LABELS[p])]; })), 'priority'));
    var tagsAll = L.allTags(tasks);
    if (tagsAll.length) controls.push(select(scope + '-tag', t('Teg'), [['', t('Barcha teglar')]].concat(tagsAll.map(function (g) { return [g, '#' + g]; })), 'tag'));
    controls.push(h('button', { type: 'button', class: 'chip', id: scope + '-late', 'aria-pressed': String(!!f.onlyOverdue), onClick: function () { f.onlyOverdue = !f.onlyOverdue; onChange(); } }, U.icon('alert'), t('Kechikkanlar')));
    if (scope === 'table') controls.splice(1, 0, select(scope + '-status', t('Holat'), [['', t('Barcha holatlar')]].concat(L.STATUSES.map(function (x) { return [x, t(L.STATUS_LABELS[x])]; })), 'status'));
    var active = f.q || f.projectId || f.assigneeId || f.priority || f.tag || f.status || f.onlyOverdue;
    if (active) controls.push(h('button', { type: 'button', class: 'btn btn--ghost btn--sm', id: scope + '-clear', onClick: function () {
      Object.assign(f, { q: '', projectId: '', assigneeId: '', priority: '', tag: '', status: '', onlyOverdue: false }); onChange(); U.$(scope + '-q') && U.$(scope + '-q').focus();
    } }, t('Tozalash')));
    return h('div', { class: 'toolbar', role: 'search' }, controls);
  }

  /* ---------------- karta ---------------- */
  function card(task, me, status, highlight) {
    var today = App.today();
    var project = task.projectId ? S.project(task.projectId) : null;
    var assignee = task.assigneeId ? S.user(task.assigneeId) : null;
    var pr = L.checklistProgress(task);
    var nComments = S.db.comments.filter(function (c) { return c.taskId === task.id; }).length;
    var late = L.isOverdue(task, today), soon = !late && L.isDueSoon(task, today, 1);

    var el = h('li', { class: 'kcard' + (late ? ' is-late' : '') + (highlight ? ' just-added' : ''), dataset: { id: task.id } });
    var open = h('button', { type: 'button', class: 'kcard__open', 'data-key': 'open-' + task.id, 'aria-label': task.title + (late ? ', ' + t('muddati o‘tgan') : ''), onClick: function () { App.openTask(task.id); } });
    el.appendChild(open);
    var top = h('div', { class: 'kcard__top' }, project ? U.projectChip(project) : h('span'), task.priority === 'yuqori' ? U.priorityMark('yuqori') : null);
    el.appendChild(top);
    el.appendChild(h('p', { class: 'kcard__title' }, task.title));
    if (task.tags.length) el.appendChild(h('div', { class: 'tags' }, task.tags.slice(0, 3).map(function (g) { return h('span', { class: 'tag' }, '#' + g); })));
    if (pr.all) el.appendChild(h('div', { class: 'kcard__progress', title: t('Checklist: {a}/{b}', { a: pr.done, b: pr.all }) }, h('div', { class: 'bar bar--ok' }, h('i', { style: { width: pr.percent + '%' } })), h('span', { class: 'num' }, pr.done + '/' + pr.all)));

    var meta = h('div', { class: 'kcard__meta' });
    if (me.role === 'admin') meta.appendChild(U.avatar(assignee, 'sm'));
    if (task.due) meta.appendChild(h('span', { class: 'kcard__due' + (late ? ' is-late' : soon ? ' is-soon' : ''), title: t('Muddat') + ': ' + L.fmtDate(task.due) }, U.icon('calendar'), U.dueLabel(task, today)));
    if (nComments) meta.appendChild(h('span', { class: 'kcard__count', title: t('Izohlar') }, U.icon('comment'), String(nComments)));

    var acts = h('div', { class: 'kcard__acts' });
    var targets = me.role === 'admin' ? L.STATUSES.filter(function (s) { return s !== status && Math.abs(L.STATUSES.indexOf(s) - L.STATUSES.indexOf(status)) === 1; })
      : (L.can(me, 'status', task) ? L.MOVES[status] : []);
    targets.forEach(function (to) {
      var fwd = L.STATUSES.indexOf(to) > L.STATUSES.indexOf(status);
      var label = fwd ? (to === 'doing' ? t('Boshlash') : t('Tugatish')) : '';
      acts.appendChild(h('button', { type: 'button', class: 'move' + (fwd ? ' move--fwd' : ' move--back'), 'data-key': 'mv-' + task.id + '-' + to,
        'aria-label': t('“{x}”: {s} ustuniga o‘tkazish', { x: task.title, s: t(L.STATUS_LABELS[to]) }), title: t(L.STATUS_LABELS[to]),
        onClick: function (e) { e.stopPropagation(); move(me, task, to); } }, fwd ? null : U.icon('back'), label || null, fwd ? U.icon('fwd') : null));
    });
    meta.appendChild(acts);
    el.appendChild(meta);

    // Sudrash: admin — istalgan ustunga, xodim — ish oqimi bo'yicha
    if (me.role === 'admin' || L.can(me, 'status', task)) {
      el.draggable = true;
      el.addEventListener('dragstart', function (e) {
        drag = { id: task.id, from: status };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', task.id);
        el.classList.add('is-dragging');
      });
      el.addEventListener('dragend', endDrag);
    }
    return el;
  }

  function move(me, task, to) {
    var r = S.moveTask(me, task.id, to);
    if (!r.ok) { U.toast(t(r.error), { kind: 'error' }); return; }
    App.flashTask = task.id;
    U.toast(t('“{x}” → {s}.', { x: task.title, s: t(L.STATUS_LABELS[to]) }), { undo: true });
    setTimeout(function () {
      var b = document.querySelector('.kcard[data-id="' + task.id + '"] .move') || document.querySelector('.kcard[data-id="' + task.id + '"] .kcard__open');
      if (b && b.offsetParent !== null) b.focus();
      else { var tab = document.querySelector('.tab[aria-selected="true"]'); if (tab && tab.offsetParent !== null) tab.focus(); }
    }, 0);
  }

  function endDrag() {
    drag = null;
    document.querySelectorAll('.is-dragging').forEach(function (n) { n.classList.remove('is-dragging'); });
    document.querySelectorAll('.kcol').forEach(function (c) { c.classList.remove('drop-ok', 'drop-no'); });
  }

  /* ---------------- taxta ---------------- */
  App.renderBoard = function (view, scope) {
    var me = App.me();
    var all = L.visibleTasks(me, S.db.tasks);
    var f = getFilter(scope);
    var shown = L.filterTasks(all, Object.assign({ today: App.today() }, f), S.db.users);
    var c = L.counts(all, App.today());

    var head = h('div', { class: 'page-head' },
      h('div', { class: 'page-head__stats' },
        h('div', { class: 'segbar', 'aria-hidden': 'true', style: { width: '200px' } }, L.STATUSES.map(function (s) { var i = h('i', { class: 's-' + s }); i.style.flexGrow = c[s] || 0; return i; })),
        h('b', { class: 'num' }, t('{p}% tugadi', { p: c.donePercent })),
        c.overdue ? h('span', { class: 'late-chip' }, t('{n} ta muddati o‘tgan', { n: c.overdue })) : null,
        shown.length !== all.length ? h('span', { class: 'muted', id: scope + '-result', 'aria-live': 'polite' }, t('{a} / {b} ta vazifa ko‘rsatilmoqda', { a: shown.length, b: all.length })) : null),
      me.role === 'admin' ? h('button', { type: 'button', class: 'btn btn--primary', id: 'add-task', onClick: function () { App.openTaskForm(); } }, U.icon('plus'), t('Yangi vazifa'), h('kbd', { class: 'btn-kbd' }, 'N')) : null);
    view.appendChild(head);
    view.appendChild(toolbar(scope, me, all, function () { App.refresh(); }));

    if (me.role === 'member' && !all.length) {
      view.appendChild(U.empty('sparkle', t('Sizga hali vazifa biriktirilmagan'), t('Administrator vazifa berganda shu yerda paydo bo‘ladi va sizga bildirishnoma keladi.')));
      return;
    }

    var saved = null;
    try { saved = localStorage.getItem(TAB_KEY); } catch (e) { saved = null; }
    // Saqlangan tab bo'lmasa — vazifasi bor birinchi ustun
    var tab = L.STATUSES.indexOf(saved) !== -1 ? saved : (L.STATUSES.filter(function (s) { return c[s] > 0; })[0] || 'new');
    var tabs = h('div', { class: 'tabs', role: 'tablist', 'aria-label': t('Ustunlar') }, L.STATUSES.map(function (s) {
      return h('button', { type: 'button', role: 'tab', class: 'tab', id: 'tab-' + s, 'aria-selected': String(s === tab), tabindex: s === tab ? '0' : '-1', 'aria-controls': 'kcol-' + s,
        onClick: function () { setTab(s); }, onKeydown: function (e) {
          var i = L.STATUSES.indexOf(s);
          if (e.key === 'ArrowRight') { e.preventDefault(); setTab(L.STATUSES[(i + 1) % 3], true); }
          if (e.key === 'ArrowLeft') { e.preventDefault(); setTab(L.STATUSES[(i + 2) % 3], true); }
        } }, h('span', { class: 'dot dot--' + s }), t(L.STATUS_LABELS[s]), h('span', { class: 'tab__n num' }, String(c[s])));
    }));
    view.appendChild(tabs);

    var flash = App.flashTask; App.flashTask = null;
    var board = h('div', { class: 'kboard', id: 'kboard', dataset: { tab: tab } });
    L.STATUSES.forEach(function (s) {
      var list = L.byStatus(shown, s);
      var col = h('section', { class: 'kcol kcol--' + s, id: 'kcol-' + s, 'aria-labelledby': 'kh-' + s, dataset: { status: s } });
      col.appendChild(h('header', { class: 'kcol__head' }, h('h2', { id: 'kh-' + s }, h('span', { class: 'dot dot--' + s }), t(L.STATUS_LABELS[s])),
        h('span', { class: 'kcol__count num', id: 'count-' + s }, String(c[s]))));
      var ul = h('ul', { class: 'kcol__list', 'data-scroll-key': 'col-' + s });
      if (!list.length) ul.appendChild(h('li', { class: 'kcol__empty' }, all.some(function (x) { return x.status === s; }) ? t('Filtrga mos vazifa yo‘q') : t('Bo‘sh')));
      list.forEach(function (task) { ul.appendChild(card(task, me, s, task.id === flash)); });
      col.appendChild(ul);
      if (s === 'new' && me.role === 'admin') col.appendChild(quickAdd(me));

      col.addEventListener('dragover', function (e) {
        if (!drag || drag.from === s) return;
        var allowed = me.role === 'admin' || L.canMove(drag.from, s);
        col.classList.toggle('drop-ok', allowed); col.classList.toggle('drop-no', !allowed);
        if (allowed) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
      });
      col.addEventListener('dragleave', function (e) { if (!col.contains(e.relatedTarget)) col.classList.remove('drop-ok', 'drop-no'); });
      col.addEventListener('drop', function (e) {
        e.preventDefault();
        var d = drag; endDrag();
        if (d && (me.role === 'admin' || L.canMove(d.from, s))) { var tk = S.task(d.id); if (tk) move(me, tk, s); }
      });
      board.appendChild(col);
    });
    view.appendChild(board);

    function setTab(s, focus) {
      board.dataset.tab = s;
      tabs.querySelectorAll('.tab').forEach(function (b) { var on = b.id === 'tab-' + s; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      try { localStorage.setItem(TAB_KEY, s); } catch (e) { /* bo'sh */ }
      if (focus) U.$('tab-' + s).focus();
    }
  };

  function quickAdd(me) {
    var inp = h('input', { class: 'input input--sm', id: 'quick-add', type: 'text', maxlength: '120', placeholder: t('+ Tez qo‘shish (Enter)'), 'aria-label': t('Yangi vazifa nomi') });
    var err = h('p', { class: 'field__error', id: 'quick-add-error', role: 'alert' });
    inp.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      var f = getFilter('admin');
      var r = S.createTask(me, { title: inp.value, projectId: f.projectId || null, assigneeId: f.assigneeId && f.assigneeId !== '__none__' ? f.assigneeId : null });
      if (!r.ok) { err.textContent = t((r.errors && (r.errors.title || r.errors.projectId)) || r.error); inp.setAttribute('aria-invalid', 'true'); return; }
      App.flashTask = r.task.id;
      U.toast(t('“{x}” yaratildi.', { x: r.task.title }), { undo: true });
      setTimeout(function () { var x = U.$('quick-add'); if (x) x.focus(); }, 0);
    });
    inp.addEventListener('input', function () { err.textContent = ''; inp.removeAttribute('aria-invalid'); });
    return h('div', { class: 'quick-add' }, inp, err);
  }

  // Boshqa sahifalar (jadval) uchun umumiy
  App.taskToolbar = toolbar;
  App.getTaskFilter = getFilter;

  R.add('/admin/board', { name: 'board', role: 'admin', title: 'Taxta', nav: 'board', render: function (view) { App.renderBoard(view, 'admin'); } });
  R.add('/me/board', { name: 'board', role: 'member', title: 'Mening taxtam', nav: 'myboard', render: function (view) { App.renderBoard(view, 'member'); } });
})(window);
