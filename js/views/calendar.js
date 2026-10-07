/* Kalendar: oy ko'rinishi (kompyuter), kunlar ro'yxati (telefon); admin bo'sh kunga bosib vazifa yaratadi va sudrab muddatni o'zgartiradi. */
(function (root) {
  'use strict';
  var App = root.App, S = App.Store, L = App.Logic, U = App.UI, I = App.I18n, t = App.t, R = App.Router;
  var h = U.h;
  var view0 = null;   // { y, m }
  var dragId = null;

  function chip(tk, me) {
    var p = tk.projectId ? S.project(tk.projectId) : null;
    var late = L.isOverdue(tk, App.today());
    var b = h('button', { type: 'button', class: 'cal-chip cal-chip--' + tk.status + (late ? ' is-late' : ''), 'data-key': 'cal-' + tk.id, title: tk.title,
      onClick: function (e) { e.stopPropagation(); App.openTask(tk.id); } }, h('span', { class: 'dot dot--' + tk.status }), h('span', { class: 'cal-chip__t' }, tk.title));
    if (p) b.style.setProperty('--pc', p.color);
    if (me.role === 'admin') {
      b.draggable = true;
      b.addEventListener('dragstart', function (e) { dragId = tk.id; e.dataTransfer.setData('text/plain', tk.id); e.dataTransfer.effectAllowed = 'move'; b.classList.add('is-dragging'); });
      b.addEventListener('dragend', function () { dragId = null; b.classList.remove('is-dragging'); document.querySelectorAll('.mcal__day.is-drop').forEach(function (d) { d.classList.remove('is-drop'); }); });
    }
    return b;
  }

  function render(view, scope) {
    var me = App.me(), today = App.today();
    var tasks = L.visibleTasks(me, S.db.tasks).filter(function (x) { return x.due; });
    var noDue = L.visibleTasks(me, S.db.tasks).filter(function (x) { return !x.due && x.status !== 'done'; });
    if (!view0) { var d0 = L.parseDate(today); view0 = { y: d0.getFullYear(), m: d0.getMonth() }; }
    var y = view0.y, m = view0.m;
    var byDay = {};
    tasks.forEach(function (x) { (byDay[x.due] = byDay[x.due] || []).push(x); });

    function shift(n) { var d = new Date(y, m + n, 1); view0 = { y: d.getFullYear(), m: d.getMonth() }; App.refresh(); }
    view.appendChild(h('div', { class: 'page-head' },
      h('div', { class: 'cal-nav' },
        h('button', { type: 'button', class: 'icon-btn icon-btn--lg', id: 'cal-prev', 'aria-label': t('Oldingi oy'), onClick: function () { shift(-1); } }, U.icon('left')),
        h('h2', { class: 'cal-nav__title', 'aria-live': 'polite' }, I.monthsNom()[m] + ' ' + y),
        h('button', { type: 'button', class: 'icon-btn icon-btn--lg', id: 'cal-next', 'aria-label': t('Keyingi oy'), onClick: function () { shift(1); } }, U.icon('right')),
        h('button', { type: 'button', class: 'btn btn--sm', id: 'cal-today', onClick: function () { view0 = null; App.refresh(); } }, t('Bugun'))),
      h('div', { class: 'cal-legend' }, L.STATUSES.map(function (s) { return h('span', null, h('span', { class: 'dot dot--' + s }), t(L.STATUS_LABELS[s])); }),
        me.role === 'admin' ? h('span', { class: 'muted' }, t('Bo‘sh kunni bosing — yangi vazifa; sudrab — muddatni o‘zgartiring')) : null)));

    var layout = h('div', { class: 'cal-layout' });
    // Oy to'ri
    var grid = h('div', { class: 'mcal', role: 'grid', 'aria-label': I.monthsNom()[m] + ' ' + y });
    grid.appendChild(h('div', { class: 'mcal__week', role: 'row' }, I.week().map(function (w) { return h('span', { role: 'columnheader' }, w); })));
    var first = new Date(y, m, 1), start = new Date(y, m, 1 - ((first.getDay() + 6) % 7));
    var cells = h('div', { class: 'mcal__grid' });
    for (var i = 0; i < 42; i++) {
      var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), iso = L.todayStr(d);
      var list = (byDay[iso] || []).sort(function (a, b) { return L.STATUSES.indexOf(a.status) - L.STATUSES.indexOf(b.status); });
      var cell = h('div', { class: 'mcal__day' + (d.getMonth() !== m ? ' is-other' : '') + (iso === today ? ' is-today' : '') + (iso < today ? ' is-past' : ''), role: 'gridcell', dataset: { date: iso } });
      var label = U.longDate(iso) + (list.length ? ', ' + t('{n} ta vazifa', { n: list.length }) : '');
      if (me.role === 'admin' && iso >= today) {
        cell.appendChild(h('button', { type: 'button', class: 'mcal__num mcal__add', 'aria-label': label + '. ' + t('Shu kunga vazifa qo‘shish'), title: t('Shu kunga vazifa qo‘shish'),
          onClick: (function (dd) { return function () { App.openTaskForm(null, { due: dd }); }; })(iso) }, String(d.getDate()), U.icon('plus')));
      } else cell.appendChild(h('span', { class: 'mcal__num', 'aria-label': label }, String(d.getDate())));
      var box = h('div', { class: 'mcal__items' });
      list.slice(0, 3).forEach(function (x) { box.appendChild(chip(x, me)); });
      if (list.length > 3) box.appendChild(h('button', { type: 'button', class: 'mcal__more', onClick: (function (dd, ls) { return function () { dayList(dd, ls, me); }; })(iso, list) }, t('yana {n} ta', { n: list.length - 3 })));
      cell.appendChild(box);
      if (me.role === 'admin') {
        cell.addEventListener('dragover', (function (dd, c) { return function (e) { if (!dragId) return; if (dd < today) return; e.preventDefault(); c.classList.add('is-drop'); }; })(iso, cell));
        cell.addEventListener('dragleave', (function (c) { return function (e) { if (!c.contains(e.relatedTarget)) c.classList.remove('is-drop'); }; })(cell));
        cell.addEventListener('drop', (function (dd) { return function (e) {
          e.preventDefault();
          var id = dragId; dragId = null;
          if (!id) return;
          var tk = S.task(id);
          if (!tk || tk.due === dd) return;
          var r = S.updateTask(me, id, { due: dd });
          if (!r.ok) U.toast(t((r.errors && r.errors.due) || r.error), { kind: 'error' });
          else U.toast(t('“{x}” muddati: {d}.', { x: tk.title, d: U.longDate(dd) }), { undo: true });
        }; })(iso));
      }
      cells.appendChild(cell);
    }
    grid.appendChild(cells);
    layout.appendChild(grid);

    // Telefon uchun: kunlar ro'yxati
    var agenda = h('div', { class: 'agenda' });
    var monthDays = Object.keys(byDay).filter(function (k) { var dd = L.parseDate(k); return dd.getFullYear() === y && dd.getMonth() === m; }).sort();
    if (!monthDays.length) agenda.appendChild(U.empty('calendar', t('Bu oyda muddatli vazifa yo‘q')));
    monthDays.forEach(function (k) {
      agenda.appendChild(h('section', { class: 'agenda__day' + (k === today ? ' is-today' : '') },
        h('h3', null, U.longDate(k), h('small', null, ' · ' + I.weekFull()[(L.parseDate(k).getDay() + 6) % 7])),
        h('div', { class: 'agenda__items' }, byDay[k].map(function (x) { return chip(x, me); }))));
    });
    layout.appendChild(agenda);

    // Yon panel: muddatsiz va kechikkanlar
    var late = L.visibleTasks(me, S.db.tasks).filter(function (x) { return L.isOverdue(x, today); });
    layout.appendChild(h('aside', { class: 'cal-side' },
      h('section', { class: 'card' }, h('div', { class: 'card__head' }, h('h3', { class: 'card__title' }, t('Kechikkanlar')), h('span', { class: 'pill pill--off num' }, String(late.length))),
        h('div', { class: 'card__body cal-side__list' }, late.length ? late.map(function (x) { return chip(x, me); }) : h('p', { class: 'muted' }, t('Kechikkan vazifa yo‘q.')))),
      h('section', { class: 'card' }, h('div', { class: 'card__head' }, h('h3', { class: 'card__title' }, t('Muddatsiz')), h('span', { class: 'pill pill--member num' }, String(noDue.length))),
        h('div', { class: 'card__body cal-side__list' }, noDue.length ? noDue.slice(0, 8).map(function (x) { return chip(x, me); }) : h('p', { class: 'muted' }, t('Hammasining muddati bor.')),
          me.role === 'admin' && noDue.length ? h('p', { class: 'muted small' }, t('Kalendarga sudrab muddat belgilang.')) : null))));
    view.appendChild(layout);
  }

  function dayList(iso, list, me) {
    U.modal({ title: U.longDate(iso), size: 'sm', body: h('div', { class: 'cal-side__list' }, list.map(function (x) { return chip(x, me); })) });
  }

  R.add('/admin/calendar', { name: 'calendar', role: 'admin', title: 'Kalendar', nav: 'calendar', render: function (v) { render(v, 'admin'); } });
  R.add('/me/calendar', { name: 'calendar', role: 'member', title: 'Kalendar', nav: 'mycalendar', render: function (v) { render(v, 'member'); } });
})(window);
