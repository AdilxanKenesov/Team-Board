/* Kirish sahifalari: Xush kelibsiz (demo / tizimni sozlash) va Login. */
(function (root) {
  'use strict';
  var App = root.App, S = App.Store, A = App.Auth, L = App.Logic, U = App.UI, t = App.t, R = App.Router;
  var h = U.h;

  function authLayout(content, aside) {
    return h('div', { class: 'auth' },
      h('section', { class: 'auth__brand', 'aria-hidden': aside ? null : 'true' },
        h('div', { class: 'auth__brand-inner' },
          h('div', { class: 'auth__logo', html: '<svg viewBox="0 0 24 24"><rect x="2" y="3" width="5.5" height="18" rx="1.5" class="m1"/><rect x="9.25" y="3" width="5.5" height="12" rx="1.5" class="m2"/><rect x="16.5" y="3" width="5.5" height="7" rx="1.5" class="m3"/></svg>' }),
          h('h2', { class: 'auth__headline' }, t('Jamoa ishini bir joyda boshqaring')),
          h('ul', { class: 'auth__points' },
            [['board', 'Kanban taxta, ro‘yxat va kalendar'], ['users', 'Admin vazifa beradi — xodim o‘z ishini ko‘radi'],
             ['bell', 'Izohlar, bildirishnomalar, muddat eslatmalari'], ['report', 'Analitika, PDF va CSV hisobotlar']].map(function (p) {
              return h('li', null, U.icon(p[0]), t(p[1]));
            })),
          aside || preview())),
      h('section', { class: 'auth__main' }, h('div', { class: 'auth__card' }, content)));
  }

  // Bezak: kichik Kanban ko'rinishi va "bajarilish" kartochkasi (ekran o'quvchidan yashirin)
  function preview() {
    function card(col) { return h('span', { class: 'auth-preview__card' }, h('s'), h('s'), h('u', null, h('em'), h('i', { style: { background: col } }))); }
    var cols = [['Yangi', 'var(--new)', ['#8b5cf6', '#f472b6']], ['Jarayonda', 'var(--doing)', ['#38bdf8', '#34d399']], ['Tugagan', 'var(--done)', ['#fbbf24']]];
    return h('div', { class: 'auth-preview', 'aria-hidden': 'true' },
      h('div', { class: 'auth-preview__win' }, h('div', { class: 'auth-preview__dots' }, h('i'), h('i'), h('i')),
        h('div', { class: 'auth-preview__cols' }, cols.map(function (c) {
          return h('div', { class: 'auth-preview__col' }, h('b', null, h('i', { style: { background: c[1] } }), t(c[0])), c[2].map(card));
        }))),
      h('div', { class: 'auth-preview__stat' }, U.icon('check'), h('span', null, h('b', null, '+8'), h('small', null, t('shu hafta tugatildi')))));
  }

  function langSwitch() {
    var cur = App.I18n.lang;
    return h('div', { class: 'lang-switch', role: 'group', 'aria-label': t('Til') },
      ['uz', 'ru'].map(function (l) {
        return h('button', { type: 'button', class: 'lang-switch__btn', 'aria-pressed': String(cur === l), onClick: function () {
          App.setLocalPref('lang', l); App.Router.onChange();
        } }, l === 'uz' ? 'O‘zbekcha' : 'Русский');
      }));
  }

  /* ---------------- Xush kelibsiz ---------------- */
  R.add('/welcome', { name: 'welcome', role: 'guest', title: 'Xush kelibsiz', render: function (app) {
    if (S.db) return R.go('#/login', true);
    var form = h('form', { class: 'form', id: 'setup-form', novalidate: true },
      U.field(t('Ismingiz'), h('input', { id: 'su-name', class: 'input', type: 'text', autocomplete: 'name', maxlength: '40' }), { id: 'su-name' }),
      U.field(t('Login'), h('input', { id: 'su-login', class: 'input', type: 'text', autocomplete: 'username', maxlength: '30', placeholder: 'admin' }), { id: 'su-login', hint: t('Lotin harflari, raqam, nuqta yoki chiziqcha') }),
      U.field(t('Parol'), passwordInput('su-pass', 'new-password'), { id: 'su-pass', hint: t('Kamida 6 ta belgi, harf va raqam') }),
      h('button', { type: 'submit', class: 'btn btn--primary btn--block' }, t('Administrator hisobini yaratish')));
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var r = S.setup({ name: U.$('su-name').value, login: U.$('su-login').value, password: U.$('su-pass').value });
      if (!r.ok) { U.showErrors(form, r.errors, { name: 'su-name', login: 'su-login', password: 'su-pass' }); return; }
      A.login(r.user.login, U.$('su-pass').value, true);
      U.toast(t('Tizim sozlandi. Xush kelibsiz!'));
      R.go('#/admin');
    });

    var content = h('div', null,
      langSwitch(),
      h('h1', { class: 'auth__title' }, t('Xush kelibsiz')),
      h('p', { class: 'auth__lead' }, t('Jamoa taxtasi — vazifalarni taqsimlash va kuzatish tizimi. Qanday boshlaymiz?')),
      h('div', { class: 'choice' },
        h('button', { type: 'button', class: 'choice__card', id: 'start-demo', onClick: function () {
          S.loadDemo(); App.Store.runReminders();
          U.toast(t('Demo tashkilot yuklandi.'));
          R.go('#/login');
        } }, U.icon('sparkle', 'choice__ico'), h('b', null, t('Demo bilan tanishish')),
          h('span', null, t('Tayyor jamoa: 7 kishi, 3 loyiha, 24 vazifa. Bir bosishda kirish.')))),
      h('div', { class: 'divider' }, h('span', null, t('yoki tizimni noldan sozlang'))),
      form);
    app.appendChild(authLayout(content));
  } });

  function passwordInput(id, auto) {
    var inp = h('input', { id: id, class: 'input', type: 'password', autocomplete: auto || 'current-password', maxlength: '64' });
    var eye = h('button', { type: 'button', class: 'icon-btn input-addon', 'aria-label': t('Parolni ko‘rsatish'), 'aria-pressed': 'false', onClick: function () {
      var show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      eye.setAttribute('aria-pressed', String(show));
      eye.setAttribute('aria-label', show ? t('Parolni yashirish') : t('Parolni ko‘rsatish'));
      U.clear(eye).appendChild(U.icon(show ? 'eyeOff' : 'eye'));
    } }, U.icon('eye'));
    var wrap = h('div', { class: 'input-wrap' }, inp, eye);
    wrap.id = id + '-wrap';
    return wrap;
  }
  App.passwordInput = passwordInput;

  /* ---------------- Login ---------------- */
  R.add('/login', { name: 'login', role: 'guest', title: 'Kirish', render: function (app) {
    var err = h('div', { class: 'alert alert--error', id: 'login-error', role: 'alert', hidden: true });
    var form = h('form', { class: 'form', id: 'login-form', novalidate: true },
      err,
      U.field(t('Login'), h('input', { id: 'li-login', class: 'input', type: 'text', autocomplete: 'username', maxlength: '30', autocapitalize: 'none', spellcheck: 'false' }), { id: 'li-login' }),
      U.field(t('Parol'), passwordInput('li-pass'), { id: 'li-pass' }),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', id: 'li-remember', checked: true }), h('span', null, t('Meni eslab qol (30 kun)'))),
      h('button', { type: 'submit', class: 'btn btn--primary btn--block', id: 'li-submit' }, t('Kirish')));

    var lockTimer = null;
    function showError(msg, lockMs) {
      err.hidden = false; err.textContent = msg;
      var btn = U.$('li-submit');
      if (lockMs) {
        btn.disabled = true;
        var until = Date.now() + lockMs;
        clearInterval(lockTimer);
        lockTimer = setInterval(function () {
          var left = Math.ceil((until - Date.now()) / 1000);
          if (!document.contains(btn)) return clearInterval(lockTimer);
          if (left <= 0) { clearInterval(lockTimer); btn.disabled = false; btn.textContent = t('Kirish'); err.hidden = true; return; }
          btn.textContent = t('Kuting: {n} s', { n: left });
        }, 250);
      }
    }
    function doLogin(login, pass) {
      var r = A.login(login, pass, U.$('li-remember').checked);
      if (!r.ok) {
        U.showErrors(form, {}, {});
        if (r.field) { U.showErrors(form, (function () { var o = {}; o[r.field] = r.error; return o; })(), { login: 'li-login', password: 'li-pass' }); err.hidden = true; }
        else { showError(t(r.error), r.lockMs); U.$('li-pass').value = ''; U.$('li-pass').focus(); }
        return;
      }
      U.toast(t('Xush kelibsiz, {name}!', { name: r.user.name.split(' ')[0] }));
      var next = App.afterLogin; App.afterLogin = null;
      R.go(next && next !== '#/login' ? next : A.homeFor(r.user));
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); doLogin(U.$('li-login').value, U.$('li-pass').value); });

    var demo = null;
    if (S.db && S.db.demo) {
      var accounts = S.db.users.filter(function (u) { return u.active && ['admin', 'malika', 'jasur', 'bekzod'].indexOf(u.login) !== -1; });
      demo = h('div', { class: 'demo-box' },
        h('p', { class: 'demo-box__title' }, U.icon('sparkle'), t('Demo hisoblar — bir bosishda kirish')),
        h('div', { class: 'demo-box__list' }, accounts.map(function (u) {
          return h('button', { type: 'button', class: 'demo-acc', dataset: { login: u.login }, onClick: function () {
            U.$('li-login').value = u.login; U.$('li-pass').value = u.role === 'admin' ? 'admin123' : 'demo123';
            doLogin(u.login, u.role === 'admin' ? 'admin123' : 'demo123');
          } }, U.avatar(u), h('span', null, h('b', null, u.name), h('small', null, t(L.ROLE_LABELS[u.role]) + ' · ' + u.login)));
        })),
        h('p', { class: 'demo-box__hint' }, t('Parollar: admin — admin123, xodimlar — demo123')));
    }

    var lock = A.lockRemaining();
    var content = h('div', null, langSwitch(),
      h('h1', { class: 'auth__title' }, t('Tizimga kirish')),
      h('p', { class: 'auth__lead' }, t('Login va parolingizni kiriting.')),
      form, demo);
    app.appendChild(authLayout(content));
    if (lock) showError(t('Juda ko‘p urinish. {n} soniyadan keyin qayta urinib ko‘ring.', { n: Math.ceil(lock / 1000) }), lock);
    setTimeout(function () { var f = U.$('li-login'); if (f) f.focus(); }, 0);
  } });
})(window);
