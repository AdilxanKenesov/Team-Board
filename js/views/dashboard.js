/* Admin boshqaruv paneli: salomlashuv, 4 ta KPI karta va diqqat talab qiladigan vazifalar. */
(function (root) {
  'use strict';
  var App = root.App, S = App.Store, L = App.Logic, U = App.UI, t = App.t, R = App.Router;
  var h = U.h;
  function kpi(id, icon, label, value, sub, opts) {
    var o = opts || {};
    var body = [h('span', { class: 'kpi__ico' }, U.icon(icon)),
      h('span', { class: 'kpi__label' }, label),
      h('b', { class: 'kpi__val num', id: id }, value),
      sub ? h('span', { class: 'kpi__sub' }, sub) : null,
      o.bar != null ? h('span', { class: 'bar bar--ok kpi__bar', 'aria-hidden': 'true' }, h('i', { style: { width: o.bar + '%' } })) : null];
    return o.href
      ? h('a', { class: 'kpi card' + (o.tone ? ' kpi--' + o.tone : ''), href: o.href, 'data-key': 'kpi-' + id, onClick: o.onClick }, body)
      : h('div', { class: 'kpi card' + (o.tone ? ' kpi--' + o.tone : '') }, body);
  }

  R.add('/admin', { name: 'dashboard', role: 'admin', title: 'Boshqaruv paneli', nav: 'dashboard', render: function (view) {
    var me = App.me(), today = App.today();
    var tasks = S.db.tasks, users = S.db.users, projects = S.db.projects;
    var c = L.counts(tasks, today);
    var day = 86400000, now = Date.now();
    var doneWeek = tasks.filter(function (x) { return x.completedAt && x.completedAt > now - 7 * day; }).length;
    var donePrev = tasks.filter(function (x) { return x.completedAt && x.completedAt <= now - 7 * day && x.completedAt > now - 14 * day; }).length;
    var delta = doneWeek - donePrev;

    App.setTitle(t('Boshqaruv paneli'), U.longDate(today) + ', ' + App.I18n.weekFull()[(new Date().getDay() + 6) % 7]);

    var hr = new Date().getHours();
    var greet = hr < 5 ? 'Xayrli tun' : hr < 12 ? 'Xayrli tong' : hr < 18 ? 'Xayrli kun' : 'Xayrli kech';
    view.appendChild(h('section', { class: 'dash-hero' },
      h('div', { class: 'dash-hero__text' },
        h('p', { class: 'dash-hero__date' }, U.longDate(today) + ' · ' + App.I18n.weekFull()[(new Date().getDay() + 6) % 7]),
        h('h2', { class: 'dash-hero__title' }, t(greet) + ', ' + me.name.split(' ')[0] + '!'),
        h('p', { class: 'dash-hero__sub' }, c.overdue ? t('{n} ta vazifa muddati o‘tgan — e’tibor bering.', { n: c.overdue }) : t('Muddati o‘tgan vazifa yo‘q.'),
          ' ', t('Jamoada {a} ta ochiq vazifa, bajarilish {p}%.', { a: c.new + c.doing, p: c.donePercent }))),
      h('div', { class: 'dash-hero__actions' },
        h('a', { class: 'btn', href: '#/admin/reports', id: 'dash-report' }, U.icon('report'), t('Hisobot')),
        h('button', { type: 'button', class: 'btn btn--primary', id: 'dash-add', onClick: function () { App.openTaskForm(null); } }, U.icon('plus'), t('Yangi vazifa')))));

    if (!tasks.length) {
      view.appendChild(h('div', { class: 'card' }, U.empty('sparkle', t('Hali vazifa yo‘q'), t('Birinchi vazifani yarating — statistika va grafiklar shu yerda paydo bo‘ladi.'),
        h('button', { type: 'button', class: 'btn btn--primary', onClick: function () { App.openTaskForm(null); } }, U.icon('plus'), t('Vazifa yaratish')))));
      return;
    }

    /* KPI */
    view.appendChild(h('div', { class: 'kpis' },
      kpi('kpi-open', 'board', t('Ochiq vazifalar'), String(c.new + c.doing), t('{a} yangi · {b} jarayonda', { a: c.new, b: c.doing }), { href: '#/admin/board' }),
      kpi('kpi-done', 'check', t('Bajarilish'), c.donePercent + '%', t('{a} / {b} vazifa tugagan', { a: c.done, b: c.total }), { bar: c.donePercent }),
      kpi('kpi-late', 'alert', t('Muddati o‘tgan'), String(c.overdue), c.dueSoon ? t('yana {n} tasi 2 kun ichida', { n: c.dueSoon }) : t('yaqin muddatlar yo‘q'),
        { tone: c.overdue ? 'late' : null, href: '#/admin/board', onClick: function () { Object.assign(App.getTaskFilter('admin'), { onlyOverdue: true }); } }),
      kpi('kpi-week', 'sparkle', t('Shu hafta tugatildi'), String(doneWeek),
        delta === 0 ? t('o‘tgan hafta bilan teng') : t('{d} o‘tgan haftaga nisbatan', { d: (delta > 0 ? '+' : '−') + Math.abs(delta) }), { tone: delta > 0 ? 'up' : null })));

    /* Diqqat talab qiladigan vazifalar */
    var attention = L.sortTasks(tasks.filter(function (x) { return L.isOverdue(x, today) || L.isDueSoon(x, today, 2); }), 'due', 'asc');
    view.appendChild(h('section', { class: 'card', 'aria-labelledby': 'dh-att' },
      h('div', { class: 'card__head' }, h('h2', { class: 'card__title', id: 'dh-att' }, t('Diqqat talab qiladi')),
        h('a', { class: 'link-btn', href: '#/admin/board' }, t('Taxtaga o‘tish'))),
      h('div', { class: 'card__body' }, attention.length ? h('ul', { class: 'trows' }, attention.map(function (x) { return App.taskRow(x, me); }))
        : h('p', { class: 'muted' }, t('Muddati o‘tgan yoki yaqin vazifa yo‘q.')))));
  } });
})(window);
