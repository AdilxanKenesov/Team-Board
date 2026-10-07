/* Faollik jurnali (admin): kim, qachon, nima qildi — xodim, tur va matn bo'yicha filtr, kunlar bo'yicha guruhlar. */
(function (root) {
  'use strict';
  var App = root.App, S = App.Store, L = App.Logic, U = App.UI, t = App.t, R = App.Router;
  var h = U.h;
  var f = { q: '', userId: '', kind: '' }, limit = 60;
  var KINDS = [['', 'Barcha amallar'], ['task', 'Vazifalar'], ['move', 'Holat o‘zgarishi'], ['comment', 'Izohlar'], ['check', 'Checklist'], ['project', 'Loyihalar'], ['user', 'Xodimlar']];
  var ICON = { create: 'plus', update: 'edit', move: 'fwd', delete: 'trash', comment: 'comment', check: 'checklist', uncheck: 'checklist', bulk: 'list', 'bulk-delete': 'trash' };

  function kindOf(type) {
    if (type === 'move') return 'move';
    if (type === 'comment') return 'comment';
    if (type === 'check' || type === 'uncheck') return 'check';
    if (type.indexOf('project') === 0) return 'project';
    if (type.indexOf('user') === 0) return 'user';
    return 'task';
  }

  R.add('/admin/activity', { name: 'activity', role: 'admin', title: 'Faollik jurnali', nav: 'activity', render: function (view) {
    var today = App.today();
    var all = S.db.activity;
    var q = L.norm(f.q);
    var list = all.filter(function (a) {
      if (f.userId && a.userId !== f.userId) return false;
      if (f.kind && (f.kind === 'task' ? ['create', 'update', 'delete', 'bulk', 'bulk-delete', 'clear-samples'].indexOf(a.type) === -1 : kindOf(a.type) !== f.kind)) return false;
      if (q) { var u = S.user(a.userId); if (L.norm((a.title || '') + ' ' + (u ? u.name : '') + ' ' + App.activityText(a)).indexOf(q) === -1) return false; }
      return true;
    });

    var search = h('input', { id: 'act-q', class: 'input input--sm', type: 'search', placeholder: t('Qidirish…'), value: f.q, 'aria-label': t('Faollikdan qidirish'),
      onInput: function () { f.q = search.value; limit = 60; App.refresh(); } });
    var who = h('select', { id: 'act-user', class: 'input input--sm', 'aria-label': t('Xodim'), onChange: function () { f.userId = who.value; limit = 60; App.refresh(); } },
      [h('option', { value: '' }, t('Barcha xodimlar'))].concat(S.db.users.map(function (u) { return h('option', { value: u.id, selected: u.id === f.userId }, u.name); })));
    var kind = h('select', { id: 'act-kind', class: 'input input--sm', 'aria-label': t('Amal turi'), onChange: function () { f.kind = kind.value; limit = 60; App.refresh(); } },
      KINDS.map(function (k) { return h('option', { value: k[0], selected: k[0] === f.kind }, t(k[1])); }));
    var dirty = f.q || f.userId || f.kind;
    view.appendChild(h('div', { class: 'toolbar' },
      h('div', { class: 'toolbar__search' }, U.icon('search'), search), who, kind,
      dirty ? h('button', { type: 'button', class: 'btn btn--ghost btn--sm', id: 'act-clear', onClick: function () { f = { q: '', userId: '', kind: '' }; App.refresh(); } }, U.icon('close'), t('Tozalash')) : null,
      h('span', { class: 'muted num act-count' }, t('{n} ta yozuv', { n: list.length }))));

    if (!list.length) {
      view.appendChild(h('div', { class: 'card' }, U.empty('activity', dirty ? t('Filtr bo‘yicha yozuv topilmadi') : t('Hozircha faollik yo‘q'), dirty ? t('Filtrlarni o‘zgartiring yoki tozalang.') : t('Vazifa yaratilganda, holat o‘zgarganda yoki izoh yozilganda shu yerda ko‘rinadi.'))));
      return;
    }
    var groups = [], idx = {};
    list.slice(0, limit).forEach(function (a) {
      var d = L.todayStr(new Date(a.at));
      var key = d === today ? t('Bugun') : d === L.addDays(today, -1) ? t('Kecha') : U.longDate(d);
      if (!(key in idx)) { idx[key] = groups.length; groups.push({ key: key, items: [] }); }
      groups[idx[key]].items.push(a);
    });
    var box = h('div', { class: 'card act-page' });
    groups.forEach(function (g) {
      box.appendChild(h('section', { class: 'act-group' }, h('h2', { class: 'act-group__title' }, g.key, h('span', { class: 'muted num' }, ' · ' + g.items.length)),
        h('ul', { class: 'act-list' }, g.items.map(function (a) {
          var u = S.user(a.userId), alive = a.taskId && S.task(a.taskId);
          return h('li', { class: 'act-row' },
            u ? U.avatar(u, 'sm') : h('span', { class: 'avatar avatar--sm' }, '?'),
            h('span', { class: 'act-row__ico act-row__ico--' + kindOf(a.type), 'aria-hidden': 'true' }, U.icon(ICON[a.type] || (kindOf(a.type) === 'project' ? 'folder' : kindOf(a.type) === 'user' ? 'user' : 'activity'))),
            h('span', { class: 'act-row__text' }, h('b', null, u ? u.name : '—'), ' ',
              alive ? h('button', { type: 'button', class: 'link-plain', 'data-key': 'act-' + a.id, onClick: function () { App.openTask(a.taskId); } }, App.activityText(a)) : App.activityText(a)),
            h('time', { class: 'act-row__time', title: U.fmtDateTime(a.at) }, U.fmtTime(a.at)));
        }))));
    });
    if (list.length > limit) box.appendChild(h('div', { class: 'act-more' }, h('button', { type: 'button', class: 'btn', id: 'act-more', onClick: function () { limit += 60; App.refresh(); } }, t('Yana ko‘rsatish ({n})', { n: list.length - limit }))));
    view.appendChild(box);
  } });
})(window);
