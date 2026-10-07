/* Xodim: "Mening kunim" — bugungi ish, kechikkanlar, jarayondagilar, progress; birinchi kirishda parolni almashtirish. */
(function (root) {
  'use strict';
  var App = root.App, S = App.Store, L = App.Logic, U = App.UI, t = App.t, R = App.Router;
  var h = U.h;

  function greeting(name) {
    var hr = new Date().getHours();
    var g = hr < 5 ? 'Xayrli tun' : hr < 12 ? 'Xayrli tong' : hr < 18 ? 'Xayrli kun' : 'Xayrli kech';
    return t(g) + ', ' + name.split(' ')[0] + '!';
  }

  function ring(percent, label) {
    var r = 34, c = 2 * Math.PI * r, off = c * (1 - percent / 100);
    var svg = '<svg viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="' + r + '" class="ring__bg"/>' +
      '<circle cx="42" cy="42" r="' + r + '" class="ring__fg" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg>';
    return h('div', { class: 'ring', role: 'img', 'aria-label': label }, h('span', { class: 'ring__svg', html: svg }), h('b', { class: 'ring__val num' }, percent + '%'));
  }

  // Bitta vazifa qatori: holat, nom, loyiha, muddat, tezkor tugma
  App.taskRow = function (tk, me) {
    var today = App.today();
    var p = tk.projectId ? S.project(tk.projectId) : null;
    var late = L.isOverdue(tk, today), soon = !late && L.isDueSoon(tk, today, 1);
    var nComments = S.db.comments.filter(function (c) { return c.taskId === tk.id; }).length;
    var quick = null;
    if (L.can(me, 'status', tk) && tk.status !== 'done') {
      var to = tk.status === 'new' ? 'doing' : 'done';
      quick = h('button', { type: 'button', class: 'move move--fwd', 'data-key': 'q-' + tk.id, 'aria-label': t('“{x}”: {s} ustuniga o‘tkazish', { x: tk.title, s: t(L.STATUS_LABELS[to]) }), onClick: function (e) {
        e.stopPropagation();
        var r = S.moveTask(me, tk.id, to);
        if (r.ok) U.toast(t('“{x}” → {s}.', { x: tk.title, s: t(L.STATUS_LABELS[to]) }), { undo: true });
      } }, to === 'doing' ? t('Boshlash') : t('Tugatish'), U.icon('fwd'));
    }
    var pr = L.checklistProgress(tk);
    return h('li', { class: 'trow' + (late ? ' is-late' : '') },
      h('button', { type: 'button', class: 'trow__main', 'data-key': 'tr-' + tk.id, onClick: function () { App.openTask(tk.id); } },
        h('span', { class: 'dot dot--' + tk.status, 'aria-hidden': 'true' }),
        h('span', { class: 'trow__body' }, h('span', { class: 'trow__title' }, tk.title),
          h('span', { class: 'trow__meta' }, p ? U.projectChip(p) : null,
            pr.all ? h('span', { class: 'trow__m' }, U.icon('checklist'), pr.done + '/' + pr.all) : null,
            nComments ? h('span', { class: 'trow__m' }, U.icon('comment'), String(nComments)) : null,
            tk.priority === 'yuqori' ? U.priorityMark('yuqori', true) : null)),
        tk.due ? h('span', { class: 'trow__due' + (late ? ' is-late' : soon ? ' is-soon' : '') }, U.dueLabel(tk, today)) : null),
      quick);
  };

  function section(id, title, tasks, me, emptyText, tone) {
    return h('section', { class: 'card day-sec' + (tone ? ' day-sec--' + tone : ''), 'aria-labelledby': id },
      h('div', { class: 'card__head' }, h('h2', { class: 'card__title', id: id }, title), h('span', { class: 'pill pill--member num' }, String(tasks.length))),
      h('div', { class: 'card__body' }, tasks.length ? h('ul', { class: 'trows' }, tasks.map(function (x) { return App.taskRow(x, me); }))
        : h('p', { class: 'muted' }, emptyText)));
  }

  R.add('/me', { name: 'me-home', role: 'member', title: 'Mening kunim', nav: 'home', render: function (view) {
    var me = App.me(), today = App.today();
    var mine = L.visibleTasks(me, S.db.tasks);
    var c = L.counts(mine, today);
    var late = mine.filter(function (x) { return L.isOverdue(x, today); });
    var soon = mine.filter(function (x) { return !L.isOverdue(x, today) && L.isDueSoon(x, today, 1); });
    var doing = mine.filter(function (x) { return x.status === 'doing' && late.indexOf(x) === -1 && soon.indexOf(x) === -1; });
    var next = L.sortTasks(mine.filter(function (x) { return x.status === 'new' && late.indexOf(x) === -1 && soon.indexOf(x) === -1; }), 'due', 'asc');
    var weekAgo = Date.now() - 7 * 86400000;
    var doneWeek = mine.filter(function (x) { return x.status === 'done' && x.completedAt && x.completedAt > weekAgo; }).sort(function (a, b) { return b.completedAt - a.completedAt; });

    var summary = late.length ? t('{n} ta vazifa kechikmoqda — avval shulardan boshlang.', { n: late.length })
      : soon.length ? t('Bugun va ertaga {n} ta vazifa muddati.', { n: soon.length })
      : c.total - c.done ? t('Kechikkan vazifa yo‘q. Ajoyib!') : t('Barcha vazifalar bajarilgan. Ajoyib ish!');

    view.appendChild(h('section', { class: 'hero' },
      h('div', { class: 'hero__text' },
        h('p', { class: 'hero__date' }, U.longDate(today) + ', ' + App.I18n.weekFull()[(new Date().getDay() + 6) % 7]),
        h('h2', { class: 'hero__title' }, greeting(me.name)),
        h('p', { class: 'hero__sub' }, summary),
        h('div', { class: 'hero__chips' },
          h('span', { class: 'hero-chip' }, h('b', { class: 'num' }, String(c.total - c.done)), t('ochiq vazifa')),
          h('span', { class: 'hero-chip' }, h('b', { class: 'num' }, String(c.doing)), t('jarayonda')),
          h('span', { class: 'hero-chip' }, h('b', { class: 'num' }, String(doneWeek.length)), t('bu hafta tugatildi')))),
      ring(c.donePercent, t('Bajarilish: {p}%', { p: c.donePercent }))));

    if (!mine.length) {
      view.appendChild(h('div', { class: 'card' }, U.empty('sparkle', t('Sizga hali vazifa biriktirilmagan'), t('Administrator vazifa berganda shu yerda paydo bo‘ladi va sizga bildirishnoma keladi.'))));
      return;
    }

    var notifs = S.notificationsFor(me.id).slice(0, 5);
    var grid = h('div', { class: 'day-grid' },
      h('div', { class: 'day-col' },
        late.length ? section('sec-late', t('Kechikkan'), late, me, '', 'late') : null,
        section('sec-soon', t('Bugun va ertaga'), soon, me, t('Bugun va ertaga muddati tugaydigan vazifa yo‘q.')),
        section('sec-doing', t('Jarayonda'), doing, me, t('Jarayondagi boshqa vazifa yo‘q.')),
        section('sec-next', t('Keyingi'), next, me, t('Navbatda vazifa yo‘q.'))),
      h('div', { class: 'day-col' },
        h('section', { class: 'card', 'aria-labelledby': 'sec-notif' },
          h('div', { class: 'card__head' }, h('h2', { class: 'card__title', id: 'sec-notif' }, t('So‘nggi bildirishnomalar')), h('a', { href: '#/me/notifications', class: 'link-btn' }, t('Barchasi'))),
          h('div', { class: 'card__body' }, notifs.length ? h('ul', { class: 'mini-notifs' }, notifs.map(function (n) { return App.notifItem(n, me, true); })) : h('p', { class: 'muted' }, t('Hozircha bildirishnoma yo‘q.')))),
        section('sec-done', t('Shu hafta tugatildi'), doneWeek, me, t('Bu hafta hali tugatilgan vazifa yo‘q.'), 'done')));
    view.appendChild(grid);
  } });

  /* ---------------- birinchi kirishda parolni almashtirish ---------------- */
  var asked = {};
  App.requirePasswordChange = function () {
    var me = App.me();
    if (!me || !me.mustChange || asked[me.id] || U.layerOpen()) return;
    asked[me.id] = true;
    var cur = App.passwordInput('pc-current', 'current-password'), nw = App.passwordInput('pc-next', 'new-password');
    var form = h('form', { class: 'form', novalidate: true },
      h('div', { class: 'alert alert--info' }, t('Administrator siz uchun vaqtinchalik parol o‘rnatgan. Xavfsizlik uchun o‘zingizning parolingizni o‘rnating.')),
      U.field(t('Joriy (vaqtinchalik) parol'), cur, { id: 'pc-current' }),
      U.field(t('Yangi parol'), nw, { id: 'pc-next', hint: t('Kamida 6 ta belgi, harf va raqam') }));
    function submit() {
      var r = S.changeOwnPassword(me, U.$('pc-current').value, U.$('pc-next').value);
      if (!r.ok) { U.showErrors(form, r.errors || {}, { current: 'pc-current', next: 'pc-next' }); return; }
      m.close(); U.toast(t('Parol o‘zgartirildi.'));
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); submit(); });
    var m = U.modal({ title: t('Parolni almashtiring'), size: 'sm', body: form, initialFocus: '#pc-current',
      actions: [{ label: t('Keyinroq'), onClick: function (e, api) { api.close(); } }, { label: t('Saqlash'), kind: 'primary', id: 'pc-submit', onClick: submit }] });
  };
})(window);
