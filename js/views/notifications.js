/* Bildirishnomalar sahifasi (admin va xodim): kunlar bo'yicha guruhlar, o'qilmaganlar filtri. */
(function (root) {
  'use strict';
  var App = root.App, S = App.Store, L = App.Logic, U = App.UI, t = App.t, R = App.Router;
  var h = U.h;
  var onlyUnread = false;
  var ICON = { assigned: 'user', comment: 'comment', status: 'fwd', 'due-soon': 'clock', overdue: 'alert' };

  App.notifItem = function (n, me, compact) {
    return h('li', null, h('button', { type: 'button', class: 'nrow' + (n.read ? '' : ' is-unread') + (compact ? ' nrow--compact' : ''), 'data-key': 'n-' + n.id, onClick: function () {
      if (!n.read) S.markRead(me, n.id);
      if (n.taskId && S.task(n.taskId)) App.openTask(n.taskId);
    } }, h('span', { class: 'nrow__ico nrow__ico--' + n.type }, U.icon(ICON[n.type] || 'bell')),
      h('span', { class: 'nrow__body' }, h('span', { class: 'nrow__text' }, n.text), h('time', { title: U.fmtDateTime(n.at) }, U.ago(n.at))),
      n.read ? null : h('span', { class: 'nrow__dot', 'aria-label': t('o‘qilmagan') })));
  };

  function render(view) {
    var me = App.me();
    var all = S.notificationsFor(me.id);
    var unread = all.filter(function (n) { return !n.read; }).length;
    var list = onlyUnread ? all.filter(function (n) { return !n.read; }) : all;

    view.appendChild(h('div', { class: 'page-head' },
      h('div', { class: 'seg-ctl', role: 'tablist', 'aria-label': t('Bildirishnomalar') },
        h('button', { type: 'button', role: 'tab', id: 'nt-all', 'aria-selected': String(!onlyUnread), onClick: function () { onlyUnread = false; App.refresh(); } }, t('Barchasi'), ' ', h('span', { class: 'muted num' }, String(all.length))),
        h('button', { type: 'button', role: 'tab', id: 'nt-unread', 'aria-selected': String(onlyUnread), onClick: function () { onlyUnread = true; App.refresh(); } }, t('O‘qilmagan'), ' ', h('span', { class: 'muted num' }, String(unread)))),
      unread ? h('button', { type: 'button', class: 'btn', id: 'mark-all', onClick: function () { S.markRead(me); U.toast(t('Barcha bildirishnomalar o‘qildi.')); } }, U.icon('check'), t('Hammasini o‘qildi')) : null));

    if (!list.length) {
      view.appendChild(h('div', { class: 'card' }, U.empty('bell', onlyUnread ? t('O‘qilmagan bildirishnoma yo‘q') : t('Hozircha bildirishnoma yo‘q'),
        t('Vazifa biriktirilganda, izoh yozilganda yoki muddat yaqinlashganda shu yerda xabar paydo bo‘ladi.'))));
      return;
    }
    var today = App.today(), groups = {}, order = [];
    list.forEach(function (n) {
      var d = L.todayStr(new Date(n.at));
      var key = d === today ? t('Bugun') : d === L.addDays(today, -1) ? t('Kecha') : U.longDate(d);
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(n);
    });
    var box = h('div', { class: 'card notif-page' });
    order.forEach(function (k) {
      box.appendChild(h('section', { class: 'notif-group' }, h('h2', { class: 'notif-group__title' }, k), h('ul', { class: 'nrows' }, groups[k].map(function (n) { return App.notifItem(n, me); }))));
    });
    view.appendChild(box);
  }

  R.add('/me/notifications', { name: 'notifications', role: 'member', title: 'Bildirishnomalar', nav: 'notifications', render: render });
  R.add('/admin/notifications', { name: 'notifications', role: 'admin', title: 'Bildirishnomalar', nav: null, render: render });
})(window);
