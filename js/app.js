/* Ilovani ishga tushirish: ombor, kirish, mavzu, qobiq (menyu, yuqori panel, pastki navigatsiya), marshrutlar. */
(function (root) {
  'use strict';
  var App = root.App, S = App.Store, A = App.Auth, L = App.Logic, U = App.UI, I = App.I18n, t = App.t, R = App.Router;
  var h = U.h;

  var storage = null;
  try { storage = root.localStorage; storage.setItem('tbpro.ping', '1'); storage.removeItem('tbpro.ping'); } catch (e) { storage = null; }
  App.storageOk = !!storage;

  App.me = function () { return A.currentUser(); };
  App.today = function () { return L.todayStr(); };
  App.state = { route: null, shellRole: null };

  /* ---------------- mavzu va til ---------------- */
  App.applyPrefs = function (user) {
    var s = user ? S.settingsFor(user.id) : { theme: localPref('theme') || 'system', lang: localPref('lang') || 'uz' };
    var html = document.documentElement;
    if (s.theme === 'light' || s.theme === 'dark') html.setAttribute('data-theme', s.theme); else html.removeAttribute('data-theme');
    I.setLang(s.lang);
  };
  function localPref(k) { try { return storage && storage.getItem('tbpro.pref.' + k); } catch (e) { return null; } }
  App.setLocalPref = function (k, v) { try { if (storage) storage.setItem('tbpro.pref.' + k, v); } catch (e) { /* bo'sh */ } };

  /* ---------------- menyu tuzilmasi ---------------- */
  var NAV = {
    admin: [
      ['dashboard', '#/admin', 'Boshqaruv paneli', 'dashboard', 'Panel'],
      ['board', '#/admin/board', 'Taxta', 'board', 'Taxta'],
      ['users', '#/admin/users', 'Xodimlar', 'users', 'Xodimlar'],
      ['reports', '#/admin/reports', 'Hisobotlar', 'report', 'Hisobot']
    ],
    member: [
      ['home', '#/me', 'Mening kunim', 'home', 'Bugun'],
      ['myboard', '#/me/board', 'Mening taxtam', 'board', 'Taxta'],
      ['notifications', '#/me/notifications', 'Bildirishnomalar', 'bell', 'Xabarlar']
    ]
  };
  App.NAV = NAV;

  var NOT_FOUND = { name: 'notfound', role: 'user', title: 'Sahifa topilmadi', nav: null, render: function (view) {
    var me = App.me();
    view.appendChild(U.empty('alert', t('Sahifa topilmadi'), t('Manzil noto‘g‘ri yoki sahifa olib tashlangan.'),
      h('a', { class: 'btn btn--primary', href: A.homeFor(me) }, t('Bosh sahifaga qaytish'))));
  } };

  /* ---------------- qobiq ---------------- */
  function brand(user) {
    return h('a', { class: 'brand', href: user ? A.homeFor(user) : '#/login', 'aria-label': t('Jamoa taxtasi — bosh sahifa') },
      h('span', { class: 'brand__mark', html: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="3" width="5.5" height="18" rx="1.5" class="m1"/><rect x="9.25" y="3" width="5.5" height="12" rx="1.5" class="m2"/><rect x="16.5" y="3" width="5.5" height="7" rx="1.5" class="m3"/></svg>' }),
      h('span', { class: 'brand__text' }, h('b', null, 'Jamoa taxtasi'), h('small', null, 'Pro')));
  }

  function buildShell(user) {
    var app = U.$('app');
    U.clear(app);
    app.className = 'app app--' + user.role;
    var items = NAV[user.role];

    var nav = h('nav', { class: 'nav', 'aria-label': t('Asosiy menyu') }, h('ul', null, items.map(function (it) {
      return h('li', null, h('a', { href: it[1], dataset: { nav: it[0] } }, U.icon(it[3]), h('span', { class: 'nav__label' }, t(it[2])),
        it[0] === 'notifications' ? h('span', { class: 'nav__badge', id: 'nav-badge', hidden: true }) : null));
    })));
    var meCard = h('div', { class: 'side__me' },
      U.avatar(user),
      h('div', { class: 'side__who' }, h('b', null, user.name), h('small', null, user.position || t(L.ROLE_LABELS[user.role]))));
    var side = h('aside', { class: 'side', id: 'side' }, brand(user), nav,
      h('div', { class: 'side__foot' },
        h('a', { class: 'side__link', href: '#/settings', dataset: { nav: 'settings' } }, U.icon('settings'), h('span', null, t('Sozlamalar'))),
        meCard));

    var bell = h('button', { type: 'button', class: 'icon-btn icon-btn--lg bell', id: 'bell', 'aria-label': t('Bildirishnomalar'), 'aria-haspopup': 'menu', 'aria-expanded': 'false', onClick: function (e) { openBell(e.currentTarget); } },
      U.icon('bell'), h('span', { class: 'bell__badge', id: 'bell-badge', hidden: true }));
    var theme = h('button', { type: 'button', class: 'icon-btn icon-btn--lg', id: 'theme-toggle', 'aria-label': t('Mavzuni almashtirish'), onClick: toggleTheme }, U.icon('moon'));
    var userBtn = h('button', { type: 'button', class: 'user-btn', id: 'user-menu', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-label': t('Hisob menyusi'), onClick: function (e) { openUserMenu(e.currentTarget); } },
      U.avatar(user), h('span', { class: 'user-btn__name' }, user.name.split(' ')[0]), U.icon('down'));
    var topbar = h('header', { class: 'topbar' },
      h('button', { type: 'button', class: 'icon-btn icon-btn--lg topbar__menu', 'aria-label': t('Menyu'), onClick: function () { document.body.classList.toggle('side-open'); } }, U.icon('menu')),
      h('div', { class: 'topbar__title' }, h('h1', { id: 'page-title' }, ''), h('p', { id: 'page-sub', class: 'topbar__sub' }, '')),
      h('div', { class: 'topbar__tools' }, theme, bell, userBtn));

    var main = h('div', { class: 'main' }, topbar, h('main', { id: 'view', class: 'view', tabindex: '-1' }));
    var bottom = h('nav', { class: 'bottom-nav', 'aria-label': t('Pastki menyu') }, items.slice(0, 4).map(function (it) {
      return h('a', { href: it[1], dataset: { nav: it[0] }, 'aria-label': t(it[2]) }, U.icon(it[3]), h('span', null, t(it[4] || it[2])));
    }).concat([h('a', { href: '#/settings', dataset: { nav: 'settings' }, 'aria-label': t('Sozlamalar') }, U.icon('settings'), h('span', null, t('Sozlash')))]));
    var scrim = h('div', { class: 'side-scrim', onClick: function () { document.body.classList.remove('side-open'); } });

    app.appendChild(side); app.appendChild(scrim); app.appendChild(main); app.appendChild(bottom);
    App.state.shellRole = user.role; App.state.shellUser = user.id; App.state.shellLang = I.lang;
    updateBadges();
    updateThemeIcon();
  }

  function updateBadges() {
    var me = App.me();
    if (!me) return;
    var n = S.unreadCount(me.id);
    ['bell-badge', 'nav-badge'].forEach(function (id) {
      var b = U.$(id);
      if (b) { b.hidden = !n; b.textContent = n > 9 ? '9+' : String(n); }
    });
    var bell = U.$('bell');
    if (bell) bell.setAttribute('aria-label', n ? t('Bildirishnomalar: {n} ta o‘qilmagan', { n: n }) : t('Bildirishnomalar'));
  }
  App.updateBadges = updateBadges;

  function currentTheme() {
    var a = document.documentElement.getAttribute('data-theme');
    if (a) return a;
    return root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function updateThemeIcon() {
    var b = U.$('theme-toggle');
    if (!b) return;
    U.clear(b).appendChild(U.icon(currentTheme() === 'dark' ? 'sun' : 'moon'));
    b.setAttribute('aria-label', currentTheme() === 'dark' ? t('Yorug‘ mavzuga o‘tish') : t('Qorong‘i mavzuga o‘tish'));
  }
  function toggleTheme() {
    var me = App.me(); if (!me) return;
    S.saveSettings(me, { theme: currentTheme() === 'dark' ? 'light' : 'dark' });
    App.applyPrefs(me);
    updateThemeIcon();
  }

  function openUserMenu(anchor) {
    var me = App.me();
    U.menu(anchor, [
      { header: h('div', { class: 'menu__head' }, U.avatar(me, 'lg'), h('div', null, h('b', null, me.name), h('small', null, '@' + me.login + ' · ' + t(L.ROLE_LABELS[me.role])))) },
      { separator: true },
      { label: t('Profil va sozlamalar'), icon: 'settings', onClick: function () { R.go('#/settings'); } },
      { label: t('Tezkor tugmalar'), icon: 'keyboard', hint: '?', onClick: function () { App.showShortcuts(); } },
      { separator: true },
      { label: t('Chiqish'), icon: 'logout', danger: true, onClick: App.logout }
    ]);
  }

  function openBell(anchor) {
    var me = App.me();
    var list = S.notificationsFor(me.id).slice(0, 8);
    var items = [{ header: h('div', { class: 'menu__head menu__head--row' }, h('b', null, t('Bildirishnomalar')),
      S.unreadCount(me.id) ? h('button', { type: 'button', class: 'link-btn', onClick: function () { S.markRead(me); U.closeMenus(true); } }, t('Hammasini o‘qildi')) : null) }];
    if (!list.length) items.push({ header: h('p', { class: 'menu__empty' }, t('Hozircha bildirishnoma yo‘q.')) });
    list.forEach(function (n) {
      items.push({ header: h('button', { type: 'button', class: 'notif-item' + (n.read ? '' : ' is-unread'), role: 'menuitem', onClick: function () {
        S.markRead(me, n.id); U.closeMenus(false);
        if (n.taskId && App.openTask) App.openTask(n.taskId);
      } }, h('span', { class: 'notif-item__dot', 'aria-hidden': 'true' }), h('span', { class: 'notif-item__text' }, h('span', null, n.text), h('small', null, U.ago(n.at)))) });
    });
    items.push({ separator: true });
    items.push({ label: t('Barcha bildirishnomalar'), icon: 'bell', onClick: function () { R.go(me.role === 'admin' ? '#/admin/notifications' : '#/me/notifications'); } });
    var m = U.menu(anchor, items);
    m.classList.add('menu--wide');
    var first = m.querySelector('.notif-item, .menu__item');
    if (first) first.focus();
  }

  App.logout = function () {
    A.logout();
    U.toast(t('Tizimdan chiqdingiz.'));
    R.go('#/login');
  };

  /* ---------------- marshrut ---------------- */
  App.onRoute = function (r) {
    U.closeMenus(false);
    document.body.classList.remove('side-open');
    if (!S.db) { if (r.path !== '/welcome') return R.go('#/welcome', true); return renderGuest(r); }
    var me = App.me();
    if (r.path === '/') return R.go(me ? A.homeFor(me) : '#/login', true);
    if (!r.route) {
      if (!me) return R.go('#/login', true);
      r = { route: { def: NOT_FOUND }, path: r.path, params: {}, query: {} };
    }
    var def = r.route.def;
    if (def.role === 'guest') {
      if (me && r.path === '/login') return R.go(A.homeFor(me), true);
      return renderGuest(r);
    }
    if (!me) { App.afterLogin = '#' + r.path; return R.go('#/login', true); }
    if (def.role === 'admin' && me.role !== 'admin') { U.toast(t('Bu sahifa faqat administrator uchun.'), { kind: 'error' }); return R.go(A.homeFor(me), true); }
    if (def.role === 'member' && me.role !== 'member') return R.go(A.homeFor(me), true);
    App.applyPrefs(me);
    if (App.state.shellRole !== me.role || App.state.shellUser !== me.id || App.state.shellLang !== I.lang || !U.$('view')) buildShell(me);
    App.state.route = r;
    renderView(true);
    if (r.query.task && App.openTask) App.openTask(r.query.task);
    if (me.mustChange && App.requirePasswordChange) setTimeout(App.requirePasswordChange, 50);
  };

  function setActiveNav(key) {
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      if (a.dataset.nav === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  App.setTitle = function (title, sub) {
    var h1 = U.$('page-title'), p = U.$('page-sub');
    if (h1) h1.textContent = title;
    if (p) { p.textContent = sub || ''; p.hidden = !sub; }
    document.title = title + ' · Jamoa taxtasi';
  };

  // Ko'rinishni qayta chizish; fokus va scroll saqlanadi
  function renderView(fresh) {
    var r = App.state.route; if (!r) return;
    var view = U.$('view'); if (!view) return;
    var def = r.route.def;
    var active = document.activeElement, focusKey = null;
    if (!fresh && active && view.contains(active)) focusKey = active.id || (active.dataset && active.dataset.key);
    var scroll = fresh ? 0 : root.scrollY;
    var inner = {};
    view.querySelectorAll('[data-scroll-key]').forEach(function (n) { inner[n.dataset.scrollKey] = n.scrollTop; });
    U.clear(view);
    view.className = 'view view--' + def.name;
    setActiveNav(def.nav);
    App.setTitle(t(def.title));
    def.render(view, r.params, r.query, { fresh: fresh });
    view.querySelectorAll('[data-scroll-key]').forEach(function (n) { if (inner[n.dataset.scrollKey]) n.scrollTop = inner[n.dataset.scrollKey]; });
    if (fresh) { root.scrollTo(0, 0); if (!U.layerOpen()) view.focus({ preventScroll: true }); }
    else {
      root.scrollTo(0, scroll);
      if (focusKey) {
        var f = document.getElementById(focusKey) || view.querySelector('[data-key="' + focusKey + '"]');
        if (f) f.focus({ preventScroll: true });
      }
    }
    updateBadges();
  }
  App.refresh = function () { renderView(false); };
  // Profil (ism, rang) o'zgarganda menyu va yuqori panel ham yangilanadi
  App.rebuildShell = function () { var me = App.me(); if (me) { App.applyPrefs(me); buildShell(me); renderView(false); } };

  function renderGuest(r) {
    var app = U.$('app');
    U.clear(app);
    app.className = 'app app--guest';
    App.state.shellRole = null; App.state.route = r;
    App.applyPrefs(null);
    var def = r.route ? r.route.def : null;
    if (!def) return;
    document.title = t(def.title) + ' · Jamoa taxtasi';
    def.render(app, r.params, r.query, { fresh: true });
  }

  /* ---------------- o'zgarishlarga javob ---------------- */
  S.subscribe(function (change) {
    if (change.label === 'wipe') { R.go('#/welcome', true); return; }
    var me = App.me();
    if (!me) { if (App.state.route && App.state.route.route && App.state.route.route.def.role !== 'guest') R.go('#/login', true); return; }
    App.applyPrefs(me);   // mavzu/til sozlamasi o'zgargan bo'lishi mumkin
    if (App.state.shellLang !== I.lang || App.state.shellRole !== me.role || App.state.shellUser !== me.id) { buildShell(me); renderView(true); return; }
    renderView(false);
  });
  // Boshqa oynada o'zgarsa
  root.addEventListener('storage', function (e) {
    if (e.key === S.KEY) { S.init(storage); R.onChange(); }
  });

  /* ---------------- tezkor tugmalar ---------------- */
  App.showShortcuts = function () {
    var rows = [['N', t('Yangi vazifa (administrator)')], ['G, B', t('Taxtaga o‘tish')],
      ['G, D', t('Bosh sahifaga o‘tish')], ['Esc', t('Oynani yopish')], ['?', t('Shu ro‘yxat')]];
    U.modal({ title: t('Tezkor tugmalar'), size: 'sm', body: h('dl', { class: 'kbd-list' }, rows.map(function (r) { return h('div', null, h('dt', null, h('kbd', null, r[0])), h('dd', null, r[1])); })) });
  };
  var gPending = 0;
  document.addEventListener('keydown', function (e) {
    var me = App.me();
    if (!me || e.defaultPrevented) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var tg = e.target;
    if (tg && (tg.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(tg.tagName))) return;
    if (U.layerOpen() || document.querySelector('.menu')) return;
    if (gPending && Date.now() - gPending < 1200) {
      gPending = 0;
      if (e.key === 'b' || e.key === 'B') { e.preventDefault(); R.go(me.role === 'admin' ? '#/admin/board' : '#/me/board'); }
      if (e.key === 'd' || e.key === 'D') { e.preventDefault(); R.go(A.homeFor(me)); }
      return;
    }
    if (e.key === 'g' || e.key === 'G') { gPending = Date.now(); return; }
    if ((e.key === 'n' || e.key === 'N') && me.role === 'admin' && App.openTaskForm) { e.preventDefault(); App.openTaskForm(); }
    if (e.key === '?') { e.preventDefault(); App.showShortcuts(); }
  });

  // "Asosiy qismga o'tish" havolasi: #view hash-router manzili emas — fokusni ko'chiramiz
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a.skip');
    if (!a) return;
    e.preventDefault();
    var v = U.$('view') || document.querySelector('.auth__main');
    if (v) { if (!v.hasAttribute('tabindex')) v.setAttribute('tabindex', '-1'); v.focus(); }
  });

  /* ---------------- ishga tushirish ---------------- */
  App.boot = function () {
    S.init(storage);
    A.init(storage);
    if (S.db) S.runReminders();
    App.applyPrefs(A.currentUser());
    R.start();
  };
})(window);
