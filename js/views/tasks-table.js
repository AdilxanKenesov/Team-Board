/* Vazifalar jadvali (admin): saralash, tanlash va ommaviy amallar, sahifalash, CSV eksport. */
(function (root) {
  'use strict';
  var App = root.App, S = App.Store, L = App.Logic, U = App.UI, t = App.t, R = App.Router;
  var h = U.h;
  var PAGE = 12;
  var st = { sort: 'updated', dir: 'asc', page: 1, selected: {} };

  R.add('/admin/tasks', { name: 'tasks', role: 'admin', title: 'Vazifalar', nav: 'tasks', render: function (view) {
    var me = App.me(), today = App.today();
    var f = App.getTaskFilter('table');
    var all = S.db.tasks;
    var shown = L.sortTasks(L.filterTasks(all, Object.assign({ today: today }, f), S.db.users), st.sort, st.dir, S.db.users, S.db.projects);
    // Tanlovdan o'chirilgan/yashirin vazifalarni olib tashlash
    Object.keys(st.selected).forEach(function (id) { if (!S.task(id)) delete st.selected[id]; });
    var pages = Math.max(1, Math.ceil(shown.length / PAGE));
    if (st.page > pages) st.page = pages;
    var pageItems = shown.slice((st.page - 1) * PAGE, st.page * PAGE);
    var selIds = Object.keys(st.selected);

    view.appendChild(h('div', { class: 'page-head' },
      h('div', { class: 'page-head__stats' }, h('b', { class: 'num' }, t('{n} ta vazifa', { n: shown.length })),
        shown.length !== all.length ? h('span', { class: 'muted', id: 'table-result', 'aria-live': 'polite' }, t('jami {n} tadan', { n: all.length })) : null),
      h('div', { class: 'page-head__actions' },
        h('button', { type: 'button', class: 'btn', id: 'export-csv', onClick: function () {
          U.download('vazifalar-' + today + '.csv', L.toCSV(L.tasksToRows(shown, S.db.users, S.db.projects)), 'text/csv;charset=utf-8');
          U.toast(t('{n} ta vazifa CSV faylga yuklandi.', { n: shown.length }));
        } }, U.icon('download'), t('CSV')),
        h('button', { type: 'button', class: 'btn btn--primary', id: 'add-task', onClick: function () { App.openTaskForm(); } }, U.icon('plus'), t('Yangi vazifa')))));
    view.appendChild(App.taskToolbar('table', me, all, function () { st.page = 1; App.refresh(); }));

    // Ommaviy amallar paneli
    if (selIds.length) {
      var who = h('select', { class: 'input input--sm', id: 'bulk-assignee', 'aria-label': t('Mas’ul biriktirish') }, h('option', { value: '' }, t('Mas’ul…')),
        S.db.users.filter(function (u) { return u.active; }).map(function (u) { return h('option', { value: u.id }, u.name); }));
      var stSel = h('select', { class: 'input input--sm', id: 'bulk-status', 'aria-label': t('Holatni o‘zgartirish') }, h('option', { value: '' }, t('Holat…')),
        L.STATUSES.map(function (s) { return h('option', { value: s }, t(L.STATUS_LABELS[s])); }));
      var prSel = h('select', { class: 'input input--sm', id: 'bulk-priority', 'aria-label': t('Muhimlikni o‘zgartirish') }, h('option', { value: '' }, t('Muhimlik…')),
        L.PRIORITIES.map(function (p) { return h('option', { value: p }, t(L.PRIORITY_LABELS[p])); }));
      function apply(change, label) {
        var r = S.bulk(me, Object.keys(st.selected), change);
        if (!r.ok) { U.toast(t(r.error), { kind: 'error' }); return; }
        U.toast(t('{n} ta vazifa: {x}.', { n: Object.keys(st.selected).length, x: label }), { undo: true });
      }
      who.addEventListener('change', function () { if (who.value) apply({ assigneeId: who.value }, t('mas’ul biriktirildi')); });
      stSel.addEventListener('change', function () { if (stSel.value) apply({ status: stSel.value }, t(L.STATUS_LABELS[stSel.value])); });
      prSel.addEventListener('change', function () { if (prSel.value) apply({ priority: prSel.value }, t('muhimlik o‘zgardi')); });
      view.appendChild(h('div', { class: 'bulkbar', role: 'region', 'aria-label': t('Ommaviy amallar') },
        h('b', { class: 'num' }, t('{n} ta tanlandi', { n: selIds.length })), who, stSel, prSel,
        h('button', { type: 'button', class: 'btn btn--sm btn--danger', id: 'bulk-delete', onClick: function () {
          var n = Object.keys(st.selected).length;
          U.confirm({ title: t('Tanlangan vazifalarni o‘chirish'), text: t('{n} ta vazifa va ularning izohlari o‘chiriladi.', { n: n }), okLabel: t('O‘chirish'), danger: true }).then(function (yes) {
            if (!yes) return;
            var r = S.bulk(me, Object.keys(st.selected), { delete: true });
            st.selected = {};
            if (r.ok) U.toast(t('{n} ta vazifa o‘chirildi.', { n: r.count }), { undo: true });
          });
        } }, U.icon('trash'), t('O‘chirish')),
        h('button', { type: 'button', class: 'btn btn--sm btn--ghost', id: 'bulk-clear', onClick: function () { st.selected = {}; App.refresh(); } }, t('Tanlovni bekor qilish'))));
    }

    if (!shown.length) {
      view.appendChild(h('div', { class: 'card' }, U.empty('search', t('Vazifa topilmadi'), t('Filtrlarni o‘zgartiring yoki yangi vazifa yarating.'))));
      return;
    }

    function th(key, label) {
      var on = st.sort === key;
      return h('th', { scope: 'col', 'aria-sort': on ? (st.dir === 'asc' ? 'ascending' : 'descending') : null },
        h('button', { type: 'button', class: 'th-sort', id: 'sort-' + key, 'aria-sort': on ? st.dir : null, onClick: function () {
          if (st.sort === key) st.dir = st.dir === 'asc' ? 'desc' : 'asc'; else { st.sort = key; st.dir = 'asc'; }
          App.refresh();
        } }, label, U.icon(on && st.dir === 'desc' ? 'down' : on ? 'down' : 'down', on && st.dir === 'asc' ? 'flip' : '')));
    }
    var allOnPage = pageItems.every(function (x) { return st.selected[x.id]; });
    var headCheck = h('input', { type: 'checkbox', id: 'sel-all', 'aria-label': t('Sahifadagi barcha vazifalarni tanlash'), checked: allOnPage && pageItems.length > 0, onChange: function (e) {
      pageItems.forEach(function (x) { if (e.target.checked) st.selected[x.id] = true; else delete st.selected[x.id]; });
      App.refresh();
    } });
    if (!allOnPage && pageItems.some(function (x) { return st.selected[x.id]; })) headCheck.indeterminate = true;

    var tbody = h('tbody');
    pageItems.forEach(function (tk) {
      var p = tk.projectId ? S.project(tk.projectId) : null, u = tk.assigneeId ? S.user(tk.assigneeId) : null, pr = L.checklistProgress(tk);
      var late = L.isOverdue(tk, today);
      tbody.appendChild(h('tr', { class: st.selected[tk.id] ? 'is-selected' : null },
        h('td', { class: 'td-check' }, h('input', { type: 'checkbox', 'data-key': 'sel-' + tk.id, checked: !!st.selected[tk.id], 'aria-label': t('Tanlash: {x}', { x: tk.title }), onChange: function (e) {
          if (e.target.checked) st.selected[tk.id] = true; else delete st.selected[tk.id]; App.refresh();
        } })),
        h('td', { class: 'td-title' }, h('button', { type: 'button', class: 'cell-title', 'data-key': 'open-' + tk.id, onClick: function () { App.openTask(tk.id); } }, tk.title),
          h('div', { class: 'td-sub' }, p ? U.projectChip(p) : null, tk.tags.slice(0, 2).map(function (g) { return h('span', { class: 'tag' }, '#' + g); }))),
        h('td', null, U.statusPill(tk.status)),
        h('td', null, u ? h('span', { class: 'cell-user' }, U.avatar(u, 'sm'), u.name) : h('span', { class: 'muted' }, t('Biriktirilmagan'))),
        h('td', null, U.priorityMark(tk.priority, true)),
        h('td', { class: 'num' + (late ? ' is-late' : '') }, tk.due ? U.dueLabel(tk, today) : h('span', { class: 'muted' }, '—')),
        h('td', { class: 'num' }, pr.all ? h('span', { class: 'mini-progress' }, h('span', { class: 'bar bar--ok' }, h('i', { style: { width: pr.percent + '%' } })), pr.done + '/' + pr.all) : h('span', { class: 'muted' }, '—')),
        h('td', { class: 'muted nowrap' }, U.ago(tk.updatedAt))));
    });

    view.appendChild(h('div', { class: 'table-wrap' }, h('table', { class: 'table table--tasks' },
      h('caption', { class: 'sr-only' }, t('Vazifalar ro‘yxati')),
      h('thead', null, h('tr', null, h('th', { scope: 'col', class: 'td-check' }, headCheck), th('title', t('Vazifa')), th('status', t('Holat')), th('assignee', t('Mas’ul')),
        th('priority', t('Muhimlik')), th('due', t('Muddat')), h('th', { scope: 'col' }, t('Checklist')), th('updated', t('O‘zgargan')))),
      tbody)));

    if (pages > 1) {
      view.appendChild(h('nav', { class: 'pager', 'aria-label': t('Sahifalar') },
        h('button', { type: 'button', class: 'btn btn--sm', id: 'page-prev', disabled: st.page === 1, onClick: function () { st.page--; App.refresh(); } }, U.icon('left'), t('Oldingi')),
        h('span', { class: 'num muted' }, t('{a} / {b} sahifa', { a: st.page, b: pages })),
        h('button', { type: 'button', class: 'btn btn--sm', id: 'page-next', disabled: st.page === pages, onClick: function () { st.page++; App.refresh(); } }, t('Keyingi'), U.icon('right'))));
    }
  } });
})(window);
