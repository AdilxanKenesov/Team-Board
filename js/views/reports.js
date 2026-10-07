/* Hisobotlar (admin): davr, loyiha va xodim bo'yicha filtr; chiroyli hisobot varag'i; PDF (chop etish), CSV, matn nusxasi. */
(function (root) {
  'use strict';
  var App = root.App, S = App.Store, L = App.Logic, U = App.UI, t = App.t, R = App.Router, C = App.Charts;
  var h = U.h;
  var f = { period: '30', projectId: '', assigneeId: '' };
  var PERIODS = [['7', 'Oxirgi 7 kun'], ['30', 'Oxirgi 30 kun'], ['90', 'Oxirgi 90 kun'], ['all', 'Butun davr']];

  // Hisobotga kiradigan vazifalar: ochiq vazifalar + davr ichida tugatilganlar
  function pick(today) {
    var from = f.period === 'all' ? 0 : L.parseDate(L.addDays(today, -(+f.period - 1))).getTime();
    return S.db.tasks.filter(function (x) {
      if (f.projectId && x.projectId !== f.projectId) return false;
      if (f.assigneeId && (f.assigneeId === '__none__' ? x.assigneeId : x.assigneeId !== f.assigneeId)) return false;
      return x.status !== 'done' || (x.completedAt || 0) >= from;
    });
  }
  App.reportTasks = function () { return pick(App.today()); };

  // Hisobotni tanlangan formatda yuklab olish (joriy filtr bo'yicha)
  App.exportReport = function (fmt) {
    var today = App.today(), tasks = pick(today), users = S.db.users, projects = S.db.projects;
    if (fmt === 'txt') {
      U.download('hisobot-' + today + '.txt', L.reportText(tasks, users, projects, today));
      U.toast(t('Matn fayl yuklandi ({n} ta vazifa).', { n: tasks.length }));
    } else if (fmt === 'csv') {
      U.download('hisobot-' + today + '.csv', L.toCSV(L.tasksToRows(tasks, users, projects)), 'text/csv;charset=utf-8');
      U.toast(t('CSV fayl yuklandi ({n} ta vazifa).', { n: tasks.length }));
    } else {
      var old = document.title;
      document.title = 'Hisobot ' + today;                  // PDF fayl nomi
      root.print();
      setTimeout(function () { document.title = old; }, 500);
    }
  };

  function select(id, label, value, options, onChange) {
    var s = h('select', { id: id, class: 'input input--sm', 'aria-label': label, onChange: function () { onChange(s.value); } },
      options.map(function (o) { return h('option', { value: o[0], selected: o[0] === value }, o[1]); }));
    return s;
  }

  function periodText(today) {
    if (f.period === 'all') return t('Butun davr');
    return U.longDate(L.addDays(today, -(+f.period - 1))) + ' — ' + U.longDate(today);
  }

  function statusTable(list, users, projects, today) {
    if (!list.length) return h('p', { class: 'muted rep-none' }, '—');
    return h('table', { class: 'table table--compact rep-table' },
      h('thead', null, h('tr', null, [t('Vazifa'), t('Mas’ul'), t('Loyiha'), t('Muhimlik'), t('Muddat')].map(function (x) { return h('th', { scope: 'col' }, x); }))),
      h('tbody', null, list.map(function (x) {
        var u = x.assigneeId ? L.byId(users, x.assigneeId) : null, p = x.projectId ? L.byId(projects, x.projectId) : null;
        var late = L.isOverdue(x, today);
        return h('tr', { class: late ? 'is-late' : null },
          h('td', null, x.title), h('td', null, u ? u.name : '—'), h('td', null, p ? p.name : '—'),
          h('td', null, t(L.PRIORITY_LABELS[x.priority])),
          h('td', { class: 'nowrap' }, x.due ? L.fmtDate(x.due) : '—', late ? h('span', { class: 'rep-late' }, ' · ' + t('kechikkan')) : null));
      })));
  }

  R.add('/admin/reports', { name: 'reports', role: 'admin', title: 'Hisobotlar', nav: 'reports', render: function (view) {
    var me = App.me(), today = App.today();
    var users = S.db.users, projects = S.db.projects;
    var tasks = pick(today);
    var c = L.counts(tasks, today);
    var proj = f.projectId ? S.project(f.projectId) : null;
    var who = f.assigneeId && f.assigneeId !== '__none__' ? S.user(f.assigneeId) : null;

    var rerender = function (k) { return function (v) { f[k] = v; App.refresh(); }; };
    view.appendChild(h('div', { class: 'page-head report-tools' },
      h('div', { class: 'toolbar' },
        select('rp-period', t('Davr'), f.period, PERIODS.map(function (p) { return [p[0], t(p[1])]; }), rerender('period')),
        select('rp-project', t('Loyiha'), f.projectId, [['', t('Barcha loyihalar')]].concat(projects.map(function (p) { return [p.id, p.name + (p.archived ? ' (' + t('arxiv') + ')' : '')]; })), rerender('projectId')),
        select('rp-user', t('Xodim'), f.assigneeId, [['', t('Barcha xodimlar')], ['__none__', t('Biriktirilmagan')]].concat(users.map(function (u) { return [u.id, u.name]; })), rerender('assigneeId'))),
      h('div', { class: 'page-head__actions' },
        h('button', { type: 'button', class: 'btn btn--primary', id: 'rp-export', 'aria-haspopup': 'menu', 'aria-expanded': 'false', onClick: function (e) {
          U.menu(e.currentTarget, [
            { id: 'rp-txt', icon: 'list', label: t('Matn formatida'), sub: t('.txt — oddiy matn, istalgan joyga yuborish uchun'), onClick: function () { App.exportReport('txt'); } },
            { id: 'rp-csv', icon: 'download', label: t('CSV formatida'), sub: t('.csv — Excel yoki Google Sheets’da ochiladi'), onClick: function () { App.exportReport('csv'); } },
            { id: 'rp-pdf', icon: 'report', label: t('PDF formatida'), sub: t('Chiroyli A4 hisobot — “PDF sifatida saqlash”'), onClick: function () { App.exportReport('pdf'); } }
          ]);
        } }, U.icon('download'), t('Yuklab olish'), U.icon('down')))));

    var per = L.perUser(tasks, users, today).filter(function (p) { return p.total; });
    var perP = L.perProject(tasks, projects, today).filter(function (p) { return p.total; });
    var late = L.sortTasks(tasks.filter(function (x) { return L.isOverdue(x, today); }), 'due', 'asc');
    var segs = L.STATUSES.map(function (s) { return { key: s, label: t(L.STATUS_LABELS[s]), cls: 'c-' + s, value: c[s] }; });

    var sheet = h('article', { class: 'report card', id: 'report', 'aria-label': t('Hisobot') },
      h('header', { class: 'report__head' },
        h('div', { class: 'report__brand' }, h('span', { class: 'report__mark', 'aria-hidden': 'true' }), h('div', null, h('b', null, 'Jamoa taxtasi'), h('small', null, t('Vazifalar bo‘yicha hisobot')))),
        h('dl', { class: 'report__meta' },
          h('div', null, h('dt', null, t('Sana')), h('dd', null, U.longDate(today))),
          h('div', null, h('dt', null, t('Davr')), h('dd', null, periodText(today))),
          h('div', null, h('dt', null, t('Loyiha')), h('dd', null, proj ? proj.name : t('Barchasi'))),
          h('div', null, h('dt', null, t('Xodim')), h('dd', null, who ? who.name : f.assigneeId === '__none__' ? t('Biriktirilmagan') : t('Barchasi'))),
          h('div', null, h('dt', null, t('Tayyorladi')), h('dd', null, me.name)))),
      h('p', { class: 'report__note muted' }, t('Hisobotga barcha ochiq vazifalar va tanlangan davrda tugatilgan vazifalar kiradi.')),
      h('section', { class: 'report__sum' },
        [[t('Jami'), c.total, ''], [t('Yangi'), c.new, 'c-new'], [t('Bajarilmoqda'), c.doing, 'c-doing'], [t('Tugagan'), c.done, 'c-done'], [t('Muddati o‘tgan'), c.overdue, 'late']].map(function (x) {
          return h('div', { class: 'rep-stat' + (x[2] === 'late' && x[1] ? ' rep-stat--late' : '') }, x[2] && x[2] !== 'late' ? h('i', { class: 'key ' + x[2], 'aria-hidden': 'true' }) : null,
            h('span', null, x[0]), h('b', { class: 'num' }, String(x[1])));
        })),
      tasks.length ? h('section', { class: 'report__row' },
        h('div', { class: 'report__block' }, h('h3', null, t('Holatlar')), C.donut(segs, { title: t('Holatlar'), centerLabel: t('vazifa') }),
          h('p', { class: 'report__pct' }, t('Bajarilish darajasi: {p}%', { p: c.donePercent }))),
        h('div', { class: 'report__block' }, h('h3', null, t('Xodimlar bo‘yicha')),
          per.length ? C.table(t('Xodimlar bo‘yicha'), [t('Xodim'), t('Jami'), t('Tugagan'), '%', t('Kechikkan')], per.map(function (p) { return [p.user.name, p.total, p.done, p.percent + '%', p.overdue]; })) : h('p', { class: 'muted' }, '—'),
          perP.length ? h('h3', null, t('Loyihalar bo‘yicha')) : null,
          perP.length ? C.table(t('Loyihalar bo‘yicha'), [t('Loyiha'), t('Jami'), t('Tugagan'), '%', t('Kechikkan')], perP.map(function (p) { return [p.project.name, p.total, p.done, p.percent + '%', p.overdue]; })) : null)) : null,
      late.length ? h('section', { class: 'report__late' }, h('h3', null, U.icon('alert'), t('Muddati o‘tgan vazifalar ({n})', { n: late.length })),
        h('ul', null, late.map(function (x) { var u = x.assigneeId ? S.user(x.assigneeId) : null; return h('li', null, h('b', null, x.title), ' — ', u ? u.name : t('biriktirilmagan'), ', ', U.dueLabel(x, today)); }))) : null,
      tasks.length ? L.STATUSES.map(function (s) {
        var list = L.sortTasks(L.byStatus(tasks, s), 'due', 'asc');
        return h('section', { class: 'report__status' }, h('h3', null, h('i', { class: 'key c-' + s, 'aria-hidden': 'true' }), t(L.STATUS_LABELS[s]), h('span', { class: 'muted num' }, ' (' + list.length + ')')),
          statusTable(list, users, projects, today));
      }) : U.empty('report', t('Tanlangan filtr bo‘yicha vazifa yo‘q'), t('Davr, loyiha yoki xodim filtrini o‘zgartiring.')),
      h('footer', { class: 'report__foot' }, h('span', null, 'Jamoa taxtasi Pro'), h('span', null, U.fmtDateTime(Date.now()))));
    view.appendChild(sheet);
  } });
})(window);
