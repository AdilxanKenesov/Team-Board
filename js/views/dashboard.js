/* Admin boshqaruv paneli: KPI kartalar, holatlar donuti, dinamika, xodimlar yuklamasi, loyihalar, diqqat talab qiladiganlar, faollik. */
(function (root) {
  'use strict';
  var App = root.App, S = App.Store, L = App.Logic, U = App.UI, t = App.t, R = App.Router, C = App.Charts;
  var h = U.h;
  var st = { days: 7, tables: {} };

  function statusSeries() {
    return L.STATUSES.map(function (s) { return { key: s, label: t(L.STATUS_LABELS[s]), cls: 'c-' + s }; });
  }

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

  // Kartaga "Jadval" almashtirgichi: grafik ↔ jadval
  function chartCard(key, title, tools, chart, table, cls) {
    var showTable = !!st.tables[key];
    var toggle = h('button', { type: 'button', class: 'btn btn--ghost btn--sm', id: 'tbl-' + key, 'aria-pressed': String(showTable),
      onClick: function () { st.tables[key] = !showTable; App.refresh(); } }, U.icon(showTable ? 'activity' : 'list'), showTable ? t('Grafik') : t('Jadval'));
    return h('section', { class: 'card dash-card' + (cls ? ' ' + cls : ''), 'aria-labelledby': 'dh-' + key },
      h('div', { class: 'card__head' }, h('h2', { class: 'card__title', id: 'dh-' + key }, title), h('div', { class: 'card__tools' }, tools, toggle)),
      h('div', { class: 'card__body' }, showTable ? table() : chart()));
  }

  function dayLabel(iso, n) {
    var d = L.parseDate(iso);
    return n <= 7 ? App.I18n.week()[(d.getDay() + 6) % 7] : String(d.getDate());
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
        { tone: c.overdue ? 'late' : null, href: '#/admin/tasks', onClick: function () { Object.assign(App.getTaskFilter('table'), { onlyOverdue: true }); } }),
      kpi('kpi-week', 'sparkle', t('Shu hafta tugatildi'), String(doneWeek),
        delta === 0 ? t('o‘tgan hafta bilan teng') : t('{d} o‘tgan haftaga nisbatan', { d: (delta > 0 ? '+' : '−') + Math.abs(delta) }), { tone: delta > 0 ? 'up' : null })));

    /* 1-qator: holatlar + dinamika */
    var series = statusSeries();
    var segs = series.map(function (s) { return { key: s.key, label: s.label, cls: s.cls, value: c[s.key] }; });
    var days = L.daily(tasks, today, st.days);
    var dynSeries = [{ key: 'created', label: t('Yaratildi'), cls: 'c-new' }, { key: 'done', label: t('Tugatildi'), cls: 'c-done' }];
    var compact = root.matchMedia && root.matchMedia('(max-width: 760px)').matches;
    var range = h('div', { class: 'seg-ctl seg-ctl--sm', role: 'group', 'aria-label': t('Davr') }, [7, 14, 30].map(function (n) {
      return h('button', { type: 'button', id: 'dyn-' + n, 'aria-pressed': String(st.days === n), onClick: function () { st.days = n; App.refresh(); } }, t('{n} kun', { n: n }));
    }));
    var sumCreated = days.reduce(function (a, d) { return a + d.created; }, 0), sumDone = days.reduce(function (a, d) { return a + d.done; }, 0);

    view.appendChild(h('div', { class: 'dash-grid dash-grid--a' },
      chartCard('status', t('Holatlar bo‘yicha'), null,
        function () { return C.donut(segs, { title: t('Holatlar bo‘yicha'), centerLabel: t('vazifa') }); },
        function () { return C.table(t('Holatlar bo‘yicha'), [t('Holat'), t('Soni'), '%'], segs.map(function (s) { return [s.label, s.value, (c.total ? Math.round(s.value / c.total * 100) : 0) + '%']; })); }),
      chartCard('dyn', t('Dinamika'), range,
        function () {
          return h('div', null,
            h('div', { class: 'dyn-head' }, C.legend([{ cls: 'c-new', label: t('Yaratildi'), value: sumCreated }, { cls: 'c-done', label: t('Tugatildi'), value: sumDone }])),
            C.columns(days.map(function (d) { return { label: dayLabel(d.date, st.days), title: U.longDate(d.date), values: d }; }), dynSeries,
              { title: t('Oxirgi {n} kun: yaratilgan va tugatilgan vazifalar', { n: st.days }), width: compact ? 360 : 600, height: compact ? 200 : 220 }));
        },
        function () { return C.table(t('Dinamika'), [t('Sana'), t('Yaratildi'), t('Tugatildi')], days.map(function (d) { return [U.longDate(d.date), d.created, d.done]; })); })));

    /* 2-qator: xodimlar yuklamasi + loyihalar */
    var per = L.perUser(tasks, users.filter(function (u) { return u.active !== false; }), today);
    var maxT = Math.max.apply(null, per.map(function (p) { return p.total; }).concat([1]));
    var perP = L.perProject(tasks, projects.filter(function (p) { return !p.archived; }), today);

    view.appendChild(h('div', { class: 'dash-grid dash-grid--b' },
      chartCard('load', t('Xodimlar yuklamasi'), C.legend(series.map(function (s) { return { cls: s.cls, label: s.label }; })),
        function () {
          return h('ul', { class: 'load' }, per.map(function (p) {
            var row = h('li', null, h('button', { type: 'button', class: 'load__row', 'data-key': 'load-' + p.user.id, onClick: function () { App.openUser(p.user.id); } },
              U.avatar(p.user, 'sm'),
              h('span', { class: 'load__name' }, p.user.name),
              h('span', { class: 'load__track' }, h('span', { class: 'segbar segbar--lg', style: { width: Math.max(p.total / maxT * 100, p.total ? 4 : 0) + '%' } },
                series.map(function (s) { return p[s.key] ? h('i', { class: 's-' + s.key, style: { flex: String(p[s.key]) } }) : null; }))),
              h('b', { class: 'load__total num' }, String(p.total)),
              p.overdue ? h('span', { class: 'load__late', title: t('Muddati o‘tgan') }, U.icon('alert'), String(p.overdue)) : h('span', { class: 'load__late load__late--none' })));
            C.bindTip(row.firstChild, p.user.name, series.map(function (s) { return { cls: s.cls, label: s.label, value: p[s.key] }; })
              .concat([{ label: t('Muddati o‘tgan'), value: p.overdue }]));
            return row;
          }));
        },
        function () { return C.table(t('Xodimlar yuklamasi'), [t('Xodim'), t('Yangi'), t('Jarayonda'), t('Tugagan'), t('Jami'), t('Muddati o‘tgan')], per.map(function (p) { return [p.user.name, p.new, p.doing, p.done, p.total, p.overdue]; })); }),
      h('section', { class: 'card dash-card', 'aria-labelledby': 'dh-proj' },
        h('div', { class: 'card__head' }, h('h2', { class: 'card__title', id: 'dh-proj' }, t('Loyihalar')), h('a', { class: 'link-btn', href: '#/admin/projects' }, t('Barchasi'))),
        h('div', { class: 'card__body' }, perP.length ? h('ul', { class: 'proj-progress' }, perP.map(function (p) {
          return h('li', null,
            h('div', { class: 'proj-progress__top' }, U.projectChip(p.project), h('span', { class: 'muted num' }, p.done + '/' + p.total), h('b', { class: 'num' }, p.percent + '%')),
            h('span', { class: 'bar bar--ok', role: 'img', 'aria-label': t('{x}: {p}% bajarilgan', { x: p.project.name, p: p.percent }) }, h('i', { style: { width: p.percent + '%' } })),
            p.overdue ? h('small', { class: 'proj-progress__late' }, U.icon('alert'), t('{n} ta muddati o‘tgan', { n: p.overdue })) : null);
        })) : h('p', { class: 'muted' }, t('Faol loyiha yo‘q.'))))));

    /* 3-qator: diqqat talab + faollik */
    var attention = L.sortTasks(tasks.filter(function (x) { return L.isOverdue(x, today) || L.isDueSoon(x, today, 2); }), 'due', 'asc').slice(0, 6);
    var acts = S.db.activity.slice(0, 8);
    view.appendChild(h('div', { class: 'dash-grid dash-grid--c' },
      h('section', { class: 'card', 'aria-labelledby': 'dh-att' },
        h('div', { class: 'card__head' }, h('h2', { class: 'card__title', id: 'dh-att' }, t('Diqqat talab qiladi')), h('span', { class: 'pill pill--member num' }, String(attention.length))),
        h('div', { class: 'card__body' }, attention.length ? h('ul', { class: 'trows' }, attention.map(function (x) { return App.taskRow(x, me); }))
          : h('p', { class: 'muted' }, t('Muddati o‘tgan yoki yaqin vazifa yo‘q.')))),
      h('section', { class: 'card', 'aria-labelledby': 'dh-act' },
        h('div', { class: 'card__head' }, h('h2', { class: 'card__title', id: 'dh-act' }, t('So‘nggi faollik')), h('a', { class: 'link-btn', href: '#/admin/activity' }, t('Barchasi'))),
        h('div', { class: 'card__body' }, acts.length ? h('ul', { class: 'timeline' }, acts.map(function (a) {
          var u = S.user(a.userId);
          return h('li', null, h('span', { class: 'timeline__dot', 'aria-hidden': 'true' }),
            h('span', { class: 'timeline__text' }, h('b', null, u ? u.name : '—'), ' ',
              a.taskId && S.task(a.taskId) ? h('button', { type: 'button', class: 'link-plain', onClick: function () { App.openTask(a.taskId); } }, App.activityText(a)) : App.activityText(a)),
            h('time', { title: U.fmtDateTime(a.at) }, U.ago(a.at)));
        })) : h('p', { class: 'muted' }, t('Hozircha faollik yo‘q.'))))));
  } });
})(window);
