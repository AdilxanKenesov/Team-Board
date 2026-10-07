/* Admin boshqaruv paneli: salomlashuv, 4 ta KPI, statistika (holatlar, dinamika, xodimlar reytingi,
   muddatlar va muhimlik) va diqqat talab qiladigan vazifalar. Grafiklar — js/core/charts.js (SVG, kutubxonasiz). */
(function (root) {
  'use strict';
  var App = root.App, S = App.Store, L = App.Logic, U = App.UI, t = App.t, R = App.Router, C = App.Charts;
  var h = U.h;
  var st = { days: 7, tables: {} };      // dinamika davri va "jadval ko'rinishi" holati

  // Grafik kartasi: sarlavha, asboblar, "Jadval" almashtirgichi (grafik ↔ jadval — accessibility)
  function chartCard(key, title, sub, tools, chart, table, cls) {
    var showTable = !!st.tables[key];
    var toggle = table ? h('button', { type: 'button', class: 'btn btn--ghost btn--sm', id: 'tbl-' + key, 'aria-pressed': String(showTable),
      onClick: function () { st.tables[key] = !showTable; App.refresh(); } }, U.icon(showTable ? 'activity' : 'list'), showTable ? t('Grafik') : t('Jadval')) : null;
    return h('section', { class: 'card dash-card' + (cls ? ' ' + cls : ''), 'aria-labelledby': 'dh-' + key },
      h('div', { class: 'card__head' },
        h('div', null, h('h2', { class: 'card__title', id: 'dh-' + key }, title), sub ? h('p', { class: 'card__sub' }, sub) : null),
        h('div', { class: 'card__tools' }, tools, toggle)),
      h('div', { class: 'card__body' }, showTable && table ? table() : chart()));
  }

  // Gorizontal ustunlar: [{ key, label, value, icon, tone }] — bitta rang (kattalik), xavfli qator alohida ohangda + ikonka
  function hbars(items, title) {
    var max = Math.max.apply(null, items.map(function (x) { return x.value; }).concat([1]));
    return h('ul', { class: 'hbars', 'aria-label': title }, items.map(function (x) {
      var row = h('li', { class: 'hbar' + (x.tone ? ' hbar--' + x.tone : ''), tabindex: '0', 'aria-label': x.label + ': ' + x.value, 'data-key': 'hb-' + x.key },
        h('span', { class: 'hbar__label' }, x.icon ? U.icon(x.icon) : null, x.label),
        h('span', { class: 'hbar__track' }, h('i', { style: { width: (x.value ? Math.max(x.value / max * 100, 3) : 0) + '%' } })),
        h('b', { class: 'hbar__val num' }, String(x.value)));
      C.bindTip(row, title, [{ label: x.label, value: x.value }]);
      return row;
    }));
  }

  function dayLabel(iso, n) {
    var d = L.parseDate(iso);
    return n <= 7 ? App.I18n.week()[(d.getDay() + 6) % 7] : String(d.getDate());
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

    /* ================= Statistika ================= */
    view.appendChild(h('h2', { class: 'dash-section' }, U.icon('activity'), t('Statistika')));
    var compact = root.matchMedia && root.matchMedia('(max-width: 760px)').matches;

    // 1) Holatlar donuti
    var segs = L.STATUSES.map(function (s) { return { key: s, label: t(L.STATUS_LABELS[s]), cls: 'c-' + s, value: c[s] }; });
    var statusCard = chartCard('status', t('Holatlar bo‘yicha'), t('Barcha {n} ta vazifa', { n: c.total }), null,
      function () {
        var open = tasks.filter(function (x) { return x.status !== 'done'; });
        var noOne = open.filter(function (x) { return !x.assigneeId; }).length;
        var cl = tasks.reduce(function (a, x) { var p = L.checklistProgress(x); a.d += p.done; a.n += p.all; return a; }, { d: 0, n: 0 });
        return h('div', { class: 'status-box' },
          C.donut(segs, { title: t('Holatlar bo‘yicha'), centerLabel: t('vazifa') }),
          h('div', { class: 'dyn-facts' },
            h('div', null, h('span', null, t('Biriktirilmagan')), h('b', { class: 'num' }, String(noOne))),
            h('div', null, h('span', null, t('Yuqori muhim (ochiq)')), h('b', { class: 'num' }, String(open.filter(function (x) { return x.priority === 'yuqori'; }).length))),
            h('div', null, h('span', null, t('Checklist bajarilishi')), h('b', { class: 'num' }, cl.n ? Math.round(cl.d / cl.n * 100) + '%' : '—'))));
      },
      function () { return C.table(t('Holatlar bo‘yicha'), [t('Holat'), t('Soni'), '%'], segs.map(function (x) { return [x.label, x.value, (c.total ? Math.round(x.value / c.total * 100) : 0) + '%']; })); });

    // 2) Dinamika: yaratildi va tugatildi (bitta o'q, ikki seriya, legenda + jadval)
    var days = L.daily(tasks, today, st.days);
    var sumC = days.reduce(function (a, d) { return a + d.created; }, 0), sumD = days.reduce(function (a, d) { return a + d.done; }, 0);
    var best = days.reduce(function (a, d) { return d.done > a.done ? d : a; }, { done: 0 });
    var avg = L.avgCompletionDays(tasks);
    var range = h('div', { class: 'seg-ctl seg-ctl--sm', role: 'group', 'aria-label': t('Davr') }, [7, 14, 30].map(function (n) {
      return h('button', { type: 'button', id: 'dyn-' + n, 'aria-pressed': String(st.days === n), onClick: function () { st.days = n; App.refresh(); } }, t('{n} kun', { n: n }));
    }));
    var dynCard = chartCard('dyn', t('Dinamika'), t('Yaratilgan va tugatilgan vazifalar'), range,
      function () {
        return h('div', { class: 'dyn' },
          C.legend([{ cls: 'c-new', label: t('Yaratildi'), value: sumC }, { cls: 'c-done', label: t('Tugatildi'), value: sumD }]),
          C.columns(days.map(function (d) { return { label: dayLabel(d.date, st.days), title: U.longDate(d.date), values: d }; }),
            [{ key: 'created', label: t('Yaratildi'), cls: 'c-new' }, { key: 'done', label: t('Tugatildi'), cls: 'c-done' }],
            { title: t('Oxirgi {n} kun: yaratilgan va tugatilgan vazifalar', { n: st.days }), width: compact ? 360 : 600, height: compact ? 200 : 210 }),
          h('div', { class: 'dyn-facts' },
            h('div', null, h('span', null, t('O‘rtacha bajarish vaqti')), h('b', { class: 'num' }, avg == null ? '—' : t('{n} kun', { n: avg }))),
            h('div', null, h('span', null, t('Eng samarali kun')), h('b', null, best.done ? U.shortDate(best.date) + ' · ' + best.done : '—')),
            h('div', null, h('span', null, t('Tugatildi / yaratildi')), h('b', { class: 'num' }, sumC ? Math.round(sumD / sumC * 100) + '%' : '—'))));
      },
      function () { return C.table(t('Dinamika'), [t('Sana'), t('Yaratildi'), t('Tugatildi')], days.map(function (d) { return [U.longDate(d.date), d.created, d.done]; })); });
    view.appendChild(h('div', { class: 'dash-grid dash-grid--a' }, statusCard, dynCard));

    // 3) Xodimlar reytingi
    var weekAgo = now - 7 * day;
    var per = L.perUser(tasks, users.filter(function (u) { return u.active !== false && u.role === 'member'; }), today).map(function (p) {
      p.week = tasks.filter(function (x) { return x.assigneeId === p.user.id && x.completedAt && x.completedAt > weekAgo; }).length;
      return p;
    }).sort(function (a, b) { return b.done - a.done || b.percent - a.percent || a.user.name.localeCompare(b.user.name); });
    var rankCard = chartCard('rank', t('Xodimlar reytingi'), t('Tugatilgan vazifalar soni bo‘yicha'),
      C.legend(L.STATUSES.map(function (s) { return { cls: 'c-' + s, label: t(L.STATUS_LABELS[s]) }; })),
      function () {
        if (!per.length) return h('p', { class: 'muted' }, t('Hali xodim yo‘q.'));
        return h('ol', { class: 'rank' }, per.map(function (p, i) {
          var row = h('li', null, h('button', { type: 'button', class: 'rank__row', 'data-key': 'rank-' + p.user.id, onClick: function () { App.openUser(p.user.id); },
              'aria-label': t('{i}-o‘rin: {x}, {d} ta tugatilgan, {p}%', { i: i + 1, x: p.user.name, d: p.done, p: p.percent }) },
            h('span', { class: 'rank__pos' + (i < 3 && p.done ? ' rank__pos--' + (i + 1) : '') }, String(i + 1)),
            U.avatar(p.user),
            h('span', { class: 'rank__who' }, h('b', null, p.user.name), h('small', null, p.user.position || t('Xodim'))),
            h('span', { class: 'rank__bar' },
              h('span', { class: 'segbar' }, L.STATUSES.map(function (s) { return p[s] ? h('i', { class: 's-' + s, style: { flex: String(p[s]) } }) : null; })),
              h('small', { class: 'num' }, t('{a} / {b} tugagan', { a: p.done, b: p.total }))),
            h('b', { class: 'rank__pct num' }, p.percent + '%'),
            h('span', { class: 'rank__tags' },
              p.week ? h('span', { class: 'rank__tag rank__tag--up' }, U.icon('sparkle'), t('+{n} bu hafta', { n: p.week })) : null,
              p.overdue ? h('span', { class: 'rank__tag rank__tag--late' }, U.icon('alert'), t('{n} kechikkan', { n: p.overdue })) : null)));
          C.bindTip(row.firstChild, p.user.name, L.STATUSES.map(function (s) { return { cls: 'c-' + s, label: t(L.STATUS_LABELS[s]), value: p[s] }; })
            .concat([{ label: t('Muddati o‘tgan'), value: p.overdue }]));
          return row;
        }));
      },
      function () { return C.table(t('Xodimlar reytingi'), ['#', t('Xodim'), t('Tugagan'), t('Jami'), '%', t('Muddati o‘tgan')], per.map(function (p, i) { return [i + 1, p.user.name, p.done, p.total, p.percent + '%', p.overdue]; })); });

    // 4) Muddatlar va muhimlik (ochiq vazifalar)
    var b = L.dueBuckets(tasks, today), pr = L.openByPriority(tasks);
    var dueItems = [
      { key: 'overdue', label: t('Muddati o‘tgan'), value: b.overdue, icon: 'alert', tone: 'late' },
      { key: 'today', label: t('Bugun'), value: b.today, icon: 'clock' },
      { key: 'week', label: t('7 kun ichida'), value: b.week, icon: 'calendar' },
      { key: 'later', label: t('Keyinroq'), value: b.later, icon: 'calendar' },
      { key: 'none', label: t('Muddatsiz'), value: b.none, icon: 'close' }];
    var prItems = L.PRIORITIES.map(function (k) { return { key: 'p-' + k, label: t(L.PRIORITY_LABELS[k]), value: pr[k], icon: 'flag', tone: k === 'yuqori' ? 'high' : null }; });
    var dueCard = chartCard('due', t('Muddatlar va muhimlik'), t('Faqat ochiq vazifalar ({n})', { n: c.new + c.doing }), null,
      function () {
        return h('div', { class: 'due-split' },
          h('div', null, h('h3', { class: 'mini-title' }, t('Muddat bo‘yicha')), hbars(dueItems, t('Muddat bo‘yicha'))),
          h('div', null, h('h3', { class: 'mini-title' }, t('Muhimlik bo‘yicha')), hbars(prItems, t('Muhimlik bo‘yicha'))));
      },
      function () { return C.table(t('Muddatlar va muhimlik'), [t('Guruh'), t('Soni')], dueItems.concat(prItems).map(function (x) { return [x.label, x.value]; })); });
    view.appendChild(h('div', { class: 'dash-grid dash-grid--b' }, rankCard, dueCard));

    /* Diqqat talab qiladigan vazifalar */
    var attention = L.sortTasks(tasks.filter(function (x) { return L.isOverdue(x, today) || L.isDueSoon(x, today, 2); }), 'due', 'asc');
    view.appendChild(h('section', { class: 'card', 'aria-labelledby': 'dh-att' },
      h('div', { class: 'card__head' }, h('h2', { class: 'card__title', id: 'dh-att' }, t('Diqqat talab qiladi')),
        h('a', { class: 'link-btn', href: '#/admin/board' }, t('Taxtaga o‘tish'))),
      h('div', { class: 'card__body' }, attention.length ? h('ul', { class: 'trows' }, attention.map(function (x) { return App.taskRow(x, me); }))
        : h('p', { class: 'muted' }, t('Muddati o‘tgan yoki yaqin vazifa yo‘q.')))));
  } });
})(window);
