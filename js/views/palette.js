/* Buyruqlar paneli (Ctrl+K): sahifalarga o'tish, amallar, vazifa/xodim/loyiha qidirish; klaviatura bilan boshqariladi. */
(function (root) {
  'use strict';
  var App = root.App, S = App.Store, L = App.Logic, U = App.UI, t = App.t, R = App.Router;
  var h = U.h;
  var open = null;

  function build(me) {
    var nav = (App.NAV[me.role] || []).map(function (n) { return { group: 'nav', icon: n[3], label: t(n[2]), hint: t('Sahifa'), run: function () { R.go(n[1]); } }; })
      .concat([{ group: 'nav', icon: 'settings', label: t('Sozlamalar'), hint: t('Sahifa'), run: function () { R.go('#/settings'); } }]);
    if (me.role === 'admin') nav.push({ group: 'nav', icon: 'bell', label: t('Bildirishnomalar'), hint: t('Sahifa'), run: function () { R.go('#/admin/notifications'); } });
    var acts = [];
    if (me.role === 'admin') {
      acts.push({ group: 'act', icon: 'plus', label: t('Yangi vazifa'), hint: 'N', run: function () { App.openTaskForm(null); } });
      acts.push({ group: 'act', icon: 'folder', label: t('Yangi loyiha'), run: function () { R.go('#/admin/projects'); setTimeout(function () { App.openProjectForm(null); }, 50); } });
      acts.push({ group: 'act', icon: 'user', label: t('Xodim qo‘shish'), run: function () { R.go('#/admin/users'); setTimeout(function () { App.openUserForm(null); }, 50); } });
      acts.push({ group: 'act', icon: 'report', label: t('Hisobotni PDF qilish'), run: function () { R.go('#/admin/reports'); setTimeout(function () { var b = U.$('rp-pdf'); if (b) b.click(); }, 120); } });
    }
    acts.push({ group: 'act', icon: 'moon', label: t('Mavzuni almashtirish'), run: function () { var b = U.$('theme-toggle'); if (b) b.click(); } });
    acts.push({ group: 'act', icon: 'keyboard', label: t('Klaviatura yorliqlari'), hint: '?', run: function () { if (App.showShortcuts) App.showShortcuts(); } });
    acts.push({ group: 'act', icon: 'logout', label: t('Chiqish'), run: function () { App.logout(); } });

    var tasks = L.visibleTasks(me, S.db.tasks).map(function (x) {
      var u = x.assigneeId ? S.user(x.assigneeId) : null;
      return { group: 'task', dot: x.status, label: x.title, sub: [t(L.STATUS_LABELS[x.status]), u ? u.name : null, (x.tags || []).map(function (g) { return '#' + g; }).join(' ')].filter(Boolean).join(' · '),
        search: x.title + ' ' + (x.tags || []).join(' ') + ' ' + (u ? u.name : ''), updated: x.updatedAt, run: function () { App.openTask(x.id); } };
    }).sort(function (a, b) { return b.updated - a.updated; });
    var people = me.role === 'admin' ? S.db.users.map(function (u) { return { group: 'user', user: u, label: u.name, sub: '@' + u.login + (u.position ? ' · ' + u.position : ''), search: u.name + ' ' + u.login + ' ' + (u.position || ''), run: function () { App.openUser(u.id); } }; }) : [];
    var projs = me.role === 'admin' ? S.db.projects.map(function (p) { return { group: 'proj', color: p.color, label: p.name, sub: p.archived ? t('arxiv') : t('Loyiha'), search: p.name, run: function () { Object.assign(App.getTaskFilter('admin'), { projectId: p.id }); R.go('#/admin/board'); } }; }) : [];
    return { nav: nav, act: acts, task: tasks, user: people, proj: projs };
  }

  var TITLES = { nav: 'Sahifalar', act: 'Amallar', task: 'Vazifalar', user: 'Xodimlar', proj: 'Loyihalar' };

  App.openPalette = function () {
    var me = App.me();
    if (!me || open) return;
    var all = build(me), items = [], active = 0;
    var input = h('input', { id: 'pal-q', class: 'pal__input', type: 'text', autocomplete: 'off', spellcheck: 'false', placeholder: t('Vazifa, xodim, sahifa yoki amalni yozing…'),
      role: 'combobox', 'aria-expanded': 'true', 'aria-controls': 'pal-list', 'aria-autocomplete': 'list' });
    var list = h('div', { id: 'pal-list', class: 'pal__list', role: 'listbox', 'aria-label': t('Natijalar') });
    var body = h('div', { class: 'pal' }, h('div', { class: 'pal__bar' }, U.icon('search'), input, h('kbd', null, 'Esc')), list,
      h('div', { class: 'pal__foot' }, h('span', null, h('kbd', null, '↑'), h('kbd', null, '↓'), t('tanlash')), h('span', null, h('kbd', null, 'Enter'), t('ochish')), h('span', null, h('kbd', null, 'Esc'), t('yopish'))));

    function match(x, q) { return !q || L.norm((x.search || x.label) + ' ' + (x.sub || '')).indexOf(q) !== -1; }
    function draw() {
      var q = L.norm(input.value);
      U.clear(list); items = [];
      var order = q ? ['task', 'user', 'proj', 'nav', 'act'] : ['nav', 'act', 'task'];
      order.forEach(function (g) {
        var found = all[g].filter(function (x) { return match(x, q); }).slice(0, q ? 8 : g === 'task' ? 5 : 12);
        if (!found.length) return;
        list.appendChild(h('div', { class: 'pal__group', role: 'presentation' }, t(g === 'task' && !q ? 'So‘nggi vazifalar' : TITLES[g])));
        found.forEach(function (x) {
          var i = items.length;
          var lead = x.user ? U.avatar(x.user, 'sm') : x.dot ? h('span', { class: 'pal__dot dot dot--' + x.dot }) : x.color ? h('span', { class: 'pal__swatch', style: { background: x.color } }) : h('span', { class: 'pal__ico' }, U.icon(x.icon || 'fwd'));
          var row = h('div', { class: 'pal__item', role: 'option', id: 'pal-o-' + i, 'data-key': 'pal-' + i, 'aria-selected': 'false',
            onMousemove: function () { if (active !== i) setActive(i); }, onClick: function () { run(i); } },
            lead, h('span', { class: 'pal__text' }, h('b', null, x.label), x.sub ? h('small', null, x.sub) : null), x.hint ? h('kbd', null, x.hint) : null);
          items.push({ el: row, x: x });
          list.appendChild(row);
        });
      });
      if (!items.length) list.appendChild(h('div', { class: 'pal__empty' }, U.icon('search'), h('b', null, t('Hech narsa topilmadi')), h('span', null, t('Boshqa so‘z bilan urinib ko‘ring.'))));
      setActive(0);
    }
    function setActive(i) {
      if (!items.length) { input.removeAttribute('aria-activedescendant'); return; }
      active = (i + items.length) % items.length;
      items.forEach(function (it, k) { it.el.setAttribute('aria-selected', String(k === active)); });
      input.setAttribute('aria-activedescendant', items[active].el.id);
      var el = items[active].el, top = el.offsetTop, bottom = top + el.offsetHeight;
      if (top < list.scrollTop + 28) list.scrollTop = Math.max(0, top - 28);
      else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight + 6;
    }
    function run(i) {
      var it = items[i]; if (!it) return;
      m.close();
      setTimeout(function () { it.x.run(); }, 0);
    }
    input.addEventListener('input', draw);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); run(active); }
    });
    var m = U.modal({ title: t('Buyruqlar paneli'), size: 'palette', body: body, initialFocus: '#pal-q', onClose: function () { open = null; } });
    m.el.classList.add('modal--palette');
    open = m;
    draw();
  };
})(window);
