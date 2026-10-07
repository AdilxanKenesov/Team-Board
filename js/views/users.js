/* Xodimlar (admin): jadval, qo'shish/tahrir, parolni tiklash, faolsizlantirish, profil paneli. */
(function (root) {
  'use strict';
  var App = root.App, S = App.Store, L = App.Logic, U = App.UI, t = App.t, R = App.Router;
  var h = U.h;
  var q = '';

  function genPassword() {
    var a = 'abcdefghjkmnpqrstuvwxyz', d = '23456789', s = '';
    for (var i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)];
    return s + d[Math.floor(Math.random() * d.length)] + d[Math.floor(Math.random() * d.length)];
  }

  function passwordWithGen(id) {
    var wrap = App.passwordInput(id, 'new-password');
    var inp = wrap.querySelector('input');
    var gen = h('button', { type: 'button', class: 'btn btn--sm', onClick: function () {
      inp.value = genPassword(); inp.type = 'text';
      inp.focus(); inp.select();
    } }, U.icon('key'), t('Yaratish'));
    return h('div', { class: 'pw-gen' }, wrap, gen);
  }

  App.openUserForm = function (user) {
    var me = App.me();
    var role = user ? user.role : 'member';
    var name = h('input', { id: 'uf-name', class: 'input', type: 'text', maxlength: '40', value: user ? user.name : '', autocomplete: 'off' });
    var login = h('input', { id: 'uf-login', class: 'input', type: 'text', maxlength: '30', value: user ? user.login : '', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false' });
    var pos = h('input', { id: 'uf-position', class: 'input', type: 'text', maxlength: '40', value: user ? user.position : '', placeholder: t('Masalan: Dizayner') });
    var roleCtl = h('div', { class: 'seg-ctl', role: 'radiogroup', 'aria-label': t('Rol'), id: 'uf-role' }, L.ROLES.map(function (r) {
      return h('button', { type: 'button', role: 'radio', 'aria-pressed': String(r === role), 'aria-checked': String(r === role), dataset: { v: r }, onClick: function () {
        role = r; roleCtl.querySelectorAll('button').forEach(function (b) { var on = b.dataset.v === r; b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-checked', String(on)); });
      } }, U.icon(r === 'admin' ? 'key' : 'user'), t(L.ROLE_LABELS[r]));
    }));
    var pw = user ? null : passwordWithGen('uf-password');
    var must = user ? null : h('label', { class: 'check' }, h('input', { type: 'checkbox', id: 'uf-must', checked: true }), h('span', null, t('Birinchi kirishda parolni almashtirsin')));
    var form = h('form', { class: 'form', id: 'user-form', novalidate: true },
      h('div', { class: 'form__row' }, U.field(t('Ism familiya'), name, { id: 'uf-name' }), U.field(t('Lavozim'), pos, { id: 'uf-position', optional: true })),
      U.field(t('Login'), login, { id: 'uf-login', hint: t('Lotin harflari, raqam, nuqta yoki chiziqcha') }),
      pw ? U.field(t('Boshlang‘ich parol'), pw, { id: 'uf-password', hint: t('Kamida 6 ta belgi, harf va raqam. Xodimga alohida yetkazing.') }) : null,
      must,
      h('div', { class: 'field' }, h('span', { class: 'field__label' }, t('Rol')), roleCtl, h('p', { class: 'field__error', id: 'uf-role-error', role: 'alert' })));
    function submit() {
      var input = { name: name.value, login: login.value, position: pos.value, role: role };
      if (!user) { input.password = U.$('uf-password').value; input.mustChange = U.$('uf-must').checked; }
      var r = S.saveUser(me, user ? user.id : null, input);
      if (!r.ok) { U.showErrors(form, r.errors || {}, { name: 'uf-name', login: 'uf-login', password: 'uf-password', role: 'uf-role' }); if (r.error) U.toast(t(r.error), { kind: 'error' }); return; }
      m.close();
      U.toast(user ? t('{x} ma’lumotlari saqlandi.', { x: r.user.name }) : t('{x} qo‘shildi. Login: {l}', { x: r.user.name, l: r.user.login }), { undo: !!user });
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); submit(); });
    var m = U.modal({ title: user ? t('Xodimni tahrirlash') : t('Xodim qo‘shish'), body: form, initialFocus: '#uf-name',
      actions: [{ label: t('Bekor qilish'), onClick: function (e, api) { api.close(); } }, { label: user ? t('Saqlash') : t('Qo‘shish'), kind: 'primary', id: 'uf-submit', onClick: submit }] });
  };

  function resetPassword(user) {
    var me = App.me();
    var pw = passwordWithGen('rp-password');
    var form = h('form', { class: 'form', novalidate: true }, h('p', { class: 'muted' }, t('{x} uchun yangi parol. Keyingi kirishda u parolni o‘zgartirishi so‘raladi.', { x: user.name })),
      U.field(t('Yangi parol'), pw, { id: 'rp-password' }));
    function submit() {
      var r = S.resetPassword(me, user.id, U.$('rp-password').value);
      if (!r.ok) { U.showErrors(form, r.errors || {}, { password: 'rp-password' }); return; }
      m.close();
      U.toast(t('{x} paroli yangilandi.', { x: user.name }));
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); submit(); });
    var m = U.modal({ title: t('Parolni tiklash'), size: 'sm', body: form, initialFocus: '#rp-password',
      actions: [{ label: t('Bekor qilish'), onClick: function (e, api) { api.close(); } }, { label: t('Saqlash'), kind: 'primary', id: 'rp-submit', onClick: submit }] });
  }

  function toggleActive(user) {
    var me = App.me();
    if (user.active) {
      U.confirm({ title: t('Hisobni faolsizlantirish'), text: t('{x} tizimga kira olmaydi. Vazifalari saqlanadi, keyin qayta faollashtirish mumkin.', { x: user.name }), okLabel: t('Faolsizlantirish'), danger: true }).then(function (yes) {
        if (!yes) return;
        var r = S.setUserActive(me, user.id, false);
        U.toast(r.ok ? t('{x} faolsizlantirildi.', { x: user.name }) : t(r.error), r.ok ? { undo: true } : { kind: 'error' });
      });
    } else {
      var r = S.setUserActive(me, user.id, true);
      U.toast(r.ok ? t('{x} qayta faollashtirildi.', { x: user.name }) : t(r.error), r.ok ? { undo: true } : { kind: 'error' });
    }
  }

  App.openUser = function (id) {
    var u = S.user(id); if (!u) return;
    var today = App.today();
    var tasks = S.db.tasks.filter(function (x) { return x.assigneeId === id; });
    var c = L.counts(tasks, today);
    var d = U.drawer({ title: t('Xodim'), body: h('div', { class: 'profile' },
      h('div', { class: 'profile__head' }, U.avatar(u, 'xl'), h('div', null, h('h3', null, u.name), h('p', { class: 'muted' }, (u.position || t(L.ROLE_LABELS[u.role])) + ' · @' + u.login),
        h('div', { class: 'profile__pills' }, h('span', { class: 'pill pill--' + u.role }, t(L.ROLE_LABELS[u.role])), u.active ? null : h('span', { class: 'pill pill--off' }, t('Faol emas'))))),
      h('div', { class: 'stat-row' },
        [['Jami', c.total], ['Bajarilmoqda', c.doing], ['Tugagan', c.done], ['Kechikkan', c.overdue]].map(function (x) {
          return h('div', { class: 'stat-mini' }, h('b', { class: 'num' }, String(x[1])), h('span', null, t(x[0])));
        })),
      h('div', { class: 'bar bar--ok', title: c.donePercent + '%' }, h('i', { style: { width: c.donePercent + '%' } })),
      h('h4', { class: 'profile__sub' }, t('Vazifalari')),
      tasks.length ? h('ul', { class: 'task-list' }, L.sortTasks(tasks, 'status', 'asc').map(function (x) {
        return h('li', null, h('button', { type: 'button', class: 'task-row', onClick: function () { d.close(); App.openTask(x.id); } },
          h('span', { class: 'dot dot--' + x.status }), h('span', { class: 'task-row__t' }, x.title),
          x.due ? h('span', { class: 'task-row__d' + (L.isOverdue(x, today) ? ' is-late' : '') }, U.dueLabel(x, today)) : null));
      })) : h('p', { class: 'muted' }, t('Biriktirilgan vazifa yo‘q.')),
      h('p', { class: 'muted small' }, u.lastLoginAt ? t('Oxirgi kirish: {x}', { x: U.ago(u.lastLoginAt) }) : t('Hali tizimga kirmagan')))
    });
  };

  R.add('/admin/users', { name: 'users', role: 'admin', title: 'Xodimlar', nav: 'users', render: function (view) {
    var me = App.me(), today = App.today();
    var users = S.db.users.slice().sort(function (a, b) { return (b.active - a.active) || (a.role === 'admin' ? -1 : 0) - (b.role === 'admin' ? -1 : 0) || a.name.localeCompare(b.name, 'uz'); });
    var nq = L.norm(q);
    var shown = users.filter(function (u) { return !nq || L.norm(u.name + ' ' + u.login + ' ' + u.position).indexOf(nq) !== -1; });
    var search = h('input', { class: 'input', type: 'search', id: 'users-q', value: q, placeholder: t('Ism, login yoki lavozim…'), 'aria-label': t('Xodimlarni qidirish') });
    search.addEventListener('input', function () { q = search.value; App.refresh(); });

    view.appendChild(h('div', { class: 'page-head' },
      h('div', { class: 'page-head__stats' }, h('b', { class: 'num' }, t('{n} ta xodim', { n: users.filter(function (u) { return u.active; }).length })),
        users.some(function (u) { return !u.active; }) ? h('span', { class: 'muted' }, t('{n} ta faol emas', { n: users.filter(function (u) { return !u.active; }).length })) : null),
      h('button', { type: 'button', class: 'btn btn--primary', id: 'add-user', onClick: function () { App.openUserForm(); } }, U.icon('plus'), t('Xodim qo‘shish'))));
    view.appendChild(h('div', { class: 'toolbar' }, h('div', { class: 'toolbar__search' }, U.icon('search'), search)));

    var tbody = h('tbody');
    shown.forEach(function (u) {
      var tasks = S.db.tasks.filter(function (x) { return x.assigneeId === u.id; });
      var c = L.counts(tasks, today);
      tbody.appendChild(h('tr', { class: u.active ? null : 'is-inactive' },
        h('td', null, h('button', { type: 'button', class: 'user-cell', 'data-key': 'u-' + u.id, onClick: function () { App.openUser(u.id); } }, U.avatar(u),
          h('span', null, h('b', null, u.name + (u.id === me.id ? ' (' + t('siz') + ')' : '')), h('small', null, '@' + u.login)))),
        h('td', null, h('span', { class: 'pill pill--' + u.role }, t(L.ROLE_LABELS[u.role]))),
        h('td', { class: 'muted' }, u.position || '—'),
        h('td', { class: 'num' }, tasks.length ? h('span', null, String(c.total - c.done), h('small', { class: 'muted' }, ' / ' + c.total)) : h('span', { class: 'muted' }, '—')),
        h('td', null, tasks.length ? h('span', { class: 'mini-progress' }, h('span', { class: 'bar bar--ok' }, h('i', { style: { width: c.donePercent + '%' } })), c.donePercent + '%') : h('span', { class: 'muted' }, '—'),
          c.overdue ? h('span', { class: 'late-chip small' }, ' · ' + t('{n} kechikkan', { n: c.overdue })) : null),
        h('td', { class: 'muted nowrap' }, u.lastLoginAt ? U.ago(u.lastLoginAt) : t('kirmagan')),
        h('td', null, u.active ? h('span', { class: 'status-dot is-on' }, t('Faol')) : h('span', { class: 'status-dot' }, t('Faol emas'))),
        h('td', { class: 'td-actions' }, h('button', { type: 'button', class: 'icon-btn', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'data-key': 'um-' + u.id, 'aria-label': t('{x}: amallar', { x: u.name }), onClick: function (e) {
          U.menu(e.currentTarget, [
            { label: t('Profil'), icon: 'user', onClick: function () { App.openUser(u.id); } },
            { label: t('Tahrirlash'), icon: 'edit', onClick: function () { App.openUserForm(u); } },
            { label: t('Parolni tiklash'), icon: 'key', onClick: function () { resetPassword(u); } },
            { separator: true },
            u.id === me.id ? { header: h('p', { class: 'menu__empty' }, t('O‘z hisobingizni faolsizlantirib bo‘lmaydi.')) }
              : { label: u.active ? t('Faolsizlantirish') : t('Faollashtirish'), icon: u.active ? 'lock' : 'check', danger: u.active, onClick: function () { toggleActive(u); } }
          ]);
        } }, U.icon('more')))));
    });
    view.appendChild(h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
      h('caption', { class: 'sr-only' }, t('Xodimlar')),
      h('thead', null, h('tr', null, [t('Xodim'), t('Rol'), t('Lavozim'), t('Ochiq vazifalar'), t('Bajarilish'), t('Oxirgi kirish'), t('Holat'), ''].map(function (x) { return h('th', { scope: 'col' }, x); }))),
      tbody)));
    if (!shown.length) view.appendChild(U.empty('search', t('Xodim topilmadi')));
  } });
})(window);
