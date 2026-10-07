/* Umumiy UI komponentlari: element yaratish, ikonkalar, toast + bekor qilish, modal, tasdiq, o'ng panel,
   kalendar (sana tanlash), ochiladigan menyu, fayl yuklab olish. Matn har doim textContent orqali (XSS yo'q). */
(function (root) {
  'use strict';
  var App = root.App = root.App || {};
  var L = App.Logic, I = App.I18n, t = App.t;
  var U = {};

  /* ---------------- element yaratish ---------------- */
  // h('button', { class: 'btn', onClick: fn, 'aria-label': 'x' }, 'Matn', child, [bolalar])
  U.h = function (tag, props) {
    var el = document.createElement(tag);
    var p = props || {};
    Object.keys(p).forEach(function (k) {
      var v = p[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;            // faqat ichki ikonkalar uchun
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'dataset') Object.keys(v).forEach(function (d) { el.dataset[d] = v[d]; });
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  };
  function append(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  U.clear = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };
  U.$ = function (id) { return document.getElementById(id); };

  /* ---------------- ikonkalar (chiziqli SVG) ---------------- */
  var P = {
    dashboard: '<rect x="3" y="3" width="6" height="8" rx="1.5"/><rect x="11" y="3" width="6" height="5" rx="1.5"/><rect x="3" y="13" width="6" height="4" rx="1.5"/><rect x="11" y="10" width="6" height="7" rx="1.5"/>',
    board: '<rect x="3" y="3" width="4" height="14" rx="1"/><rect x="8" y="3" width="4" height="9" rx="1"/><rect x="13" y="3" width="4" height="6" rx="1"/>',
    list: '<path d="M7 5h10M7 10h10M7 15h10"/><circle cx="3.5" cy="5" r=".8"/><circle cx="3.5" cy="10" r=".8"/><circle cx="3.5" cy="15" r=".8"/>',
    calendar: '<rect x="3" y="4.5" width="14" height="12" rx="2"/><path d="M3 8.5h14M7 3v3M13 3v3"/>',
    folder: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H8l1.5 2h6A1.5 1.5 0 0 1 17 8.5v6a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5z"/>',
    users: '<circle cx="8" cy="7" r="3"/><path d="M2.5 16.5c.6-2.8 2.8-4.5 5.5-4.5s4.9 1.7 5.5 4.5"/><path d="M13 4.2a3 3 0 0 1 0 5.6M15 12.4c1.3.6 2.2 1.9 2.5 4.1"/>',
    report: '<path d="M5 3h7l3 3v11H5z"/><path d="M8 10h5M8 13h5"/>',
    activity: '<path d="M2.5 10h3l2-5 4 10 2-5h4"/>',
    settings: '<circle cx="10" cy="10" r="2.5"/><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4"/>',
    home: '<path d="M3 9.5L10 3.5l7 6V16a1 1 0 0 1-1 1h-3.5v-4.5h-5V17H4a1 1 0 0 1-1-1z"/>',
    bell: '<path d="M5 13.5V9a5 5 0 0 1 10 0v4.5l1.5 1.5h-13z"/><path d="M8.5 17a1.5 1.5 0 0 0 3 0"/>',
    search: '<circle cx="9" cy="9" r="5.5"/><path d="M13 13l4 4"/>',
    plus: '<path d="M10 4v12M4 10h12"/>',
    close: '<path d="M5 5l10 10M15 5L5 15"/>',
    edit: '<path d="M13.6 3.2a1.8 1.8 0 0 1 2.5 0l.7.7a1.8 1.8 0 0 1 0 2.5L7.4 15.8 3.5 16.5l.7-3.9z"/>',
    trash: '<path d="M4 6h12M8 6V4h4v2M6 6l.8 10h6.4L14 6"/>',
    flag: '<path d="M5 17V3.5M5 4h9l-2 3.5 2 3.5H5"/>',
    fwd: '<path d="M4 10h11M11 6l4 4-4 4"/>',
    back: '<path d="M16 10H5M9 6l-4 4 4 4"/>',
    left: '<path d="M12 5l-5 5 5 5"/>',
    right: '<path d="M8 5l5 5-5 5"/>',
    down: '<path d="M5 8l5 5 5-5"/>',
    check: '<path d="M4 10.5l4 4 8-9"/>',
    filter: '<path d="M3 5h14M6 10h8M8.5 15h3"/>',
    logout: '<path d="M8 4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M12 6l4 4-4 4M16 10H8"/>',
    user: '<circle cx="10" cy="7" r="3.5"/><path d="M3.5 17c.8-3.2 3.3-5 6.5-5s5.7 1.8 6.5 5"/>',
    comment: '<path d="M4 4h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/>',
    tag: '<path d="M3 3h6l8 8-6 6-8-8z"/><circle cx="6.5" cy="6.5" r="1"/>',
    clock: '<circle cx="10" cy="10" r="7"/><path d="M10 6v4l3 2"/>',
    download: '<path d="M10 3v9M6 8l4 4 4-4M4 15h12"/>',
    upload: '<path d="M10 13V4M6 8l4-4 4 4M4 15h12"/>',
    copy: '<rect x="7" y="7" width="9" height="10" rx="1.5"/><path d="M4 13V4.5A1.5 1.5 0 0 1 5.5 3H12"/>',
    sun: '<circle cx="10" cy="10" r="3.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4"/>',
    moon: '<path d="M16 12.5A6.5 6.5 0 0 1 7.5 4a6.5 6.5 0 1 0 8.5 8.5z"/>',
    globe: '<circle cx="10" cy="10" r="7"/><path d="M3 10h14M10 3c2 2 3 4.5 3 7s-1 5-3 7c-2-2-3-4.5-3-7s1-5 3-7z"/>',
    menu: '<path d="M3 5h14M3 10h14M3 15h14"/>',
    more: '<circle cx="5" cy="10" r="1.2"/><circle cx="10" cy="10" r="1.2"/><circle cx="15" cy="10" r="1.2"/>',
    lock: '<rect x="4.5" y="9" width="11" height="8" rx="1.5"/><path d="M7 9V6.5a3 3 0 0 1 6 0V9"/>',
    eye: '<path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z"/><circle cx="10" cy="10" r="2.5"/>',
    eyeOff: '<path d="M3 3l14 14M8.5 5.2A8 8 0 0 1 10 4.5c5 0 8 5.5 8 5.5a14 14 0 0 1-2.4 3M5.2 6.6A14 14 0 0 0 2 10s3 5.5 8 5.5a7.6 7.6 0 0 0 3.2-.7"/>',
    sparkle: '<path d="M10 3l1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6z"/>',
    archive: '<rect x="3" y="4" width="14" height="4" rx="1"/><path d="M4.5 8v7.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V8M8 11h4"/>',
    key: '<circle cx="7" cy="12" r="3.5"/><path d="M9.5 9.5L16 3M13.5 5.5l2 2"/>',
    checklist: '<path d="M3 5l1.5 1.5L7 4M3 10.5L4.5 12 7 9.5M3 16l1.5 1.5L7 15M10 5.5h7M10 11h7M10 16.5h7"/>',
    alert: '<path d="M10 3l8 14H2z"/><path d="M10 8v4M10 14.5v.01"/>',
    keyboard: '<rect x="2.5" y="5" width="15" height="10" rx="1.5"/><path d="M5.5 8h1M8.5 8h1M11.5 8h1M14.5 8h.01M6 12h8"/>'
  };
  U.icon = function (name, cls) {
    var s = document.createElement('span');
    s.className = 'ico' + (cls ? ' ' + cls : '');
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = '<svg viewBox="0 0 20 20">' + (P[name] || '') + '</svg>';
    return s;
  };
  U.ICONS = P;

  /* ---------------- formatlash ---------------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  U.fmtTime = function (ts) { var d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  U.fmtDateTime = function (ts) { var d = new Date(ts); return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() + ', ' + U.fmtTime(ts); };
  U.longDate = function (iso) {
    var d = L.parseDate(iso);
    return I.lang === 'ru' ? d.getDate() + ' ' + I.months()[d.getMonth()] + ' ' + d.getFullYear()
                           : d.getDate() + '-' + I.months()[d.getMonth()] + ' ' + d.getFullYear();
  };
  U.shortDate = function (iso) {
    var d = L.parseDate(iso), y = d.getFullYear() === new Date().getFullYear();
    return I.lang === 'ru' ? d.getDate() + ' ' + I.months()[d.getMonth()].slice(0, 3) + (y ? '' : ' ' + d.getFullYear())
                           : d.getDate() + '-' + I.months()[d.getMonth()].slice(0, 3) + (y ? '' : ' ' + d.getFullYear());
  };
  U.ago = function (ts) {
    var s = Math.round((Date.now() - ts) / 1000);
    if (s < 60) return t('hozirgina');
    var m = Math.round(s / 60); if (m < 60) return t('{n} daqiqa oldin', { n: m });
    var h = Math.round(m / 60); if (h < 24) return t('{n} soat oldin', { n: h });
    var d = Math.round(h / 24); if (d === 1) return t('kecha');
    if (d < 7) return t('{n} kun oldin', { n: d });
    return U.fmtDateTime(ts).split(',')[0];
  };
  U.dueLabel = function (task, today) {
    if (!task.due) return '';
    var n = L.daysBetween(today, task.due);
    if (task.status !== 'done') {
      if (n < 0) return t('{n} kun kechikdi', { n: -n });
      if (n === 0) return t('bugun');
      if (n === 1) return t('ertaga');
    }
    return U.shortDate(task.due);
  };

  /* ---------------- avatar va belgilar ---------------- */
  U.avatar = function (user, size) {
    var name = user ? user.name : t('Biriktirilmagan');
    var a = U.h('span', { class: 'avatar' + (size ? ' avatar--' + size : '') + (user ? '' : ' avatar--empty'), title: name, role: 'img', 'aria-label': name },
      user ? L.initials(user.name) : '?');
    if (user) a.style.setProperty('--av', user.color);
    return a;
  };
  U.statusPill = function (status) {
    return U.h('span', { class: 'pill pill--' + status }, U.h('span', { class: 'dot dot--' + status, 'aria-hidden': 'true' }), t(L.STATUS_LABELS[status]));
  };
  U.priorityMark = function (p, withText) {
    var el = U.h('span', { class: 'prio prio--' + p, title: t('Muhimlik') + ': ' + t(L.PRIORITY_LABELS[p]) });
    el.appendChild(U.icon('flag'));
    if (withText) el.appendChild(document.createTextNode(t(L.PRIORITY_LABELS[p])));
    else { el.setAttribute('role', 'img'); el.setAttribute('aria-label', t('Muhimlik') + ': ' + t(L.PRIORITY_LABELS[p])); }
    return el;
  };
  U.projectChip = function (project) {
    if (!project) return null;
    var c = U.h('span', { class: 'proj-chip', title: project.name }, U.h('span', { class: 'proj-chip__dot', 'aria-hidden': 'true' }), project.name);
    c.style.setProperty('--pc', project.color);
    return c;
  };
  U.empty = function (icon, title, text, action) {
    return U.h('div', { class: 'empty' }, U.icon(icon || 'sparkle', 'empty__ico'), U.h('p', { class: 'empty__title' }, title), text ? U.h('p', { class: 'empty__text' }, text) : null, action || null);
  };

  /* ---------------- animatsiya va fokus ---------------- */
  U.reducedMotion = function () { return root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches; };
  // Haqiqiy element darhol yopiladi (fokus va holat kutmaydi), nusxasi chiqib ketadi
  U.animateOut = function (node, ghostClass) {
    if (U.reducedMotion() || !node || !node.parentNode) return;
    var g = node.cloneNode(true);
    var from = node.querySelectorAll('input, select, textarea'), to = g.querySelectorAll('input, select, textarea');
    for (var i = 0; i < from.length; i++) to[i].value = from[i].value;
    g.removeAttribute('id');
    g.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
    g.classList.add(ghostClass || 'is-ghost');
    g.setAttribute('aria-hidden', 'true');
    g.inert = true;
    document.body.appendChild(g);
    setTimeout(function () { g.remove(); }, 260);
  };
  U.focusables = function (box) {
    return Array.prototype.slice.call(box.querySelectorAll('a[href], button, input, select, textarea, [tabindex="0"]'))
      .filter(function (n) { return !n.disabled && n.type !== 'hidden' && n.tabIndex !== -1 && n.offsetParent !== null; });
  };
  U.trapFocus = function (box, e) {
    var f = U.focusables(box);
    if (!f.length) return;
    var i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  };

  /* ---------------- toast (bekor qilish bilan) ---------------- */
  var toastTimer = null;
  U.toast = function (message, opts) {
    var o = opts || {};
    var host = U.$('toast');
    if (!host) { host = U.h('div', { id: 'toast', class: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(host); }
    U.clear(host);
    host.className = 'toast' + (o.kind ? ' toast--' + o.kind : '');
    host.appendChild(U.h('span', { class: 'toast__text' }, message));
    if (o.undo && App.Store.canUndo()) {
      host.appendChild(U.h('button', { type: 'button', class: 'toast__btn', id: 'toast-undo', onClick: function () {
        if (App.Store.undo()) U.toast(t('Oxirgi amal bekor qilindi.'));
      } }, t('Bekor qilish')));
    }
    host.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { host.hidden = true; if (o.undo) App.Store.dropUndo(); }, o.ms || 6000);
  };

  /* ---------------- modal / tasdiq ---------------- */
  var openLayers = [];
  U.layerOpen = function () { return openLayers.length > 0; };
  // opts: { title, body (Node), actions: [{label, kind, onClick, id}], size: 'sm'|'md'|'lg', role, onClose, initialFocus }
  U.modal = function (opts) {
    var returnTo = document.activeElement;
    var titleId = 'm-' + L.uid('t');
    var box = U.h('div', { class: 'modal__box modal__box--' + (opts.size || 'md'), role: opts.role || 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId });
    var head = U.h('div', { class: 'modal__head' },
      U.h('h2', { id: titleId, class: 'modal__title' }, opts.title),
      opts.role === 'alertdialog' ? null : U.h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('Yopish'), onClick: function () { api.close(); } }, U.icon('close')));
    box.appendChild(head);
    if (opts.body) box.appendChild(U.h('div', { class: 'modal__body' }, opts.body));
    if (opts.actions && opts.actions.length) {
      box.appendChild(U.h('div', { class: 'modal__actions' }, opts.actions.map(function (a) {
        return U.h('button', { type: a.submit ? 'submit' : 'button', id: a.id, class: 'btn' + (a.kind ? ' btn--' + a.kind : ''), form: a.form, onClick: a.onClick ? function (e) { a.onClick(e, api); } : null }, a.icon ? U.icon(a.icon) : null, a.label);
      })));
    }
    var wrap = U.h('div', { class: 'modal' }, box);
    wrap.addEventListener('mousedown', function (e) { if (e.target === wrap && opts.role !== 'alertdialog') api.close(); });
    wrap.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); api.close(); }
      if (e.key === 'Tab') U.trapFocus(box, e);
    });
    document.body.appendChild(wrap);
    openLayers.push(wrap);
    var api = {
      el: wrap, box: box,
      close: function (value) {
        if (!wrap.parentNode) return;
        U.animateOut(wrap, 'is-ghost');
        wrap.remove();
        openLayers = openLayers.filter(function (x) { return x !== wrap; });
        if (opts.onClose) opts.onClose(value);
        if (returnTo && document.contains(returnTo)) returnTo.focus();
      }
    };
    setTimeout(function () {
      var f = opts.initialFocus ? box.querySelector(opts.initialFocus) : U.focusables(box.querySelector('.modal__body') || box)[0];
      (f || U.focusables(box)[0] || box).focus();
    }, 0);
    return api;
  };

  // Promise<boolean>
  U.confirm = function (opts) {
    return new Promise(function (resolve) {
      var done = false;
      var body = U.h('div', { class: 'confirm' },
        U.h('div', { class: 'confirm__icon' + (opts.danger ? ' is-danger' : '') }, U.icon(opts.icon || (opts.danger ? 'trash' : 'alert'))),
        U.h('p', { class: 'confirm__text' }, opts.text || ''));
      var m = U.modal({
        title: opts.title, body: body, size: 'sm', role: 'alertdialog', initialFocus: '[data-safe]',
        actions: [
          { label: opts.cancelLabel || t('Bekor qilish'), onClick: function () { done = true; resolve(false); m.close(); } },
          { label: opts.okLabel || t('Tasdiqlash'), kind: opts.danger ? 'danger' : 'primary', onClick: function () { done = true; resolve(true); m.close(); } }
        ],
        onClose: function () { if (!done) resolve(false); }
      });
      m.box.querySelector('.modal__actions .btn').setAttribute('data-safe', '');
      m.box.querySelector('.modal__actions .btn').focus();
    });
  };

  /* ---------------- o'ng panel ---------------- */
  U.drawer = function (opts) {
    var returnTo = document.activeElement;
    var titleId = 'd-' + L.uid('t');
    var panel = U.h('aside', { class: 'drawer__panel' + (opts.wide ? ' drawer__panel--wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId });
    var head = U.h('div', { class: 'drawer__head' }, U.h('h2', { id: titleId, class: 'drawer__title' }, opts.title),
      U.h('div', { class: 'drawer__tools' }, opts.tools || null, U.h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('Yopish'), onClick: function () { api.close(); } }, U.icon('close'))));
    panel.appendChild(head);
    var body = U.h('div', { class: 'drawer__body' }, opts.body || null);
    panel.appendChild(body);
    var wrap = U.h('div', { class: 'drawer' }, U.h('div', { class: 'drawer__backdrop', onClick: function () { api.close(); } }), panel);
    wrap.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); api.close(); }
      if (e.key === 'Tab') U.trapFocus(panel, e);
    });
    document.body.appendChild(wrap);
    openLayers.push(wrap);
    var api = {
      el: wrap, body: body, head: head, titleEl: head.querySelector('.drawer__title'),
      close: function () {
        if (!wrap.parentNode) return;
        U.animateOut(wrap, 'is-ghost');
        wrap.remove();
        openLayers = openLayers.filter(function (x) { return x !== wrap; });
        if (opts.onClose) opts.onClose();
        if (returnTo && document.contains(returnTo)) returnTo.focus();
      }
    };
    setTimeout(function () { var f = U.focusables(body)[0] || U.focusables(panel)[0]; if (f) f.focus(); }, 0);
    return api;
  };

  /* ---------------- ochiladigan menyu ---------------- */
  // items: [{label, icon, onClick, danger, separator}]
  U.menu = function (anchor, items, opts) {
    U.closeMenus();
    var list = U.h('div', { class: 'menu', role: 'menu' });
    items.forEach(function (it) {
      if (it.separator) { list.appendChild(U.h('div', { class: 'menu__sep', role: 'separator' })); return; }
      if (it.header) { list.appendChild(it.header); return; }
      list.appendChild(U.h('button', { type: 'button', role: 'menuitem', class: 'menu__item' + (it.danger ? ' is-danger' : ''), onClick: function () { U.closeMenus(true); it.onClick(); } },
        it.icon ? U.icon(it.icon) : null, U.h('span', null, it.label), it.hint ? U.h('kbd', null, it.hint) : null));
    });
    document.body.appendChild(list);
    var r = anchor.getBoundingClientRect();
    var w = list.offsetWidth, x = (opts && opts.align === 'left') ? r.left : r.right - w;
    x = Math.max(8, Math.min(x, root.innerWidth - w - 8));
    var y = r.bottom + 6;
    if (y + list.offsetHeight > root.innerHeight - 8) y = Math.max(8, r.top - list.offsetHeight - 6);
    list.style.left = x + 'px'; list.style.top = y + 'px';
    anchor.setAttribute('aria-expanded', 'true');
    list._anchor = anchor;
    list.addEventListener('keydown', function (e) {
      var items = Array.prototype.slice.call(list.querySelectorAll('.menu__item'));
      var i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); U.closeMenus(true); }
    });
    var first = list.querySelector('.menu__item');
    if (first && !(opts && opts.noFocus)) first.focus();
    return list;
  };
  U.closeMenus = function (refocus) {
    document.querySelectorAll('.menu').forEach(function (m) {
      if (m._anchor) { m._anchor.setAttribute('aria-expanded', 'false'); if (refocus) m._anchor.focus(); }
      m.remove();
    });
  };
  document.addEventListener('mousedown', function (e) {
    if (!e.target.closest('.menu') && !e.target.closest('[aria-haspopup="menu"]')) U.closeMenus(false);
  });
  root.addEventListener('resize', function () { U.closeMenus(false); });

  /* ---------------- kalendar (sana tanlash maydoni) ---------------- */
  // U.dateField({ id, value, min, label, onChange }) → { el, get(), set(v), setMin(v), setError(msg), focus() }
  U.dateField = function (opts) {
    var value = opts.value || '', min = opts.min || null, view = null;
    var hidden = U.h('input', { type: 'hidden', id: opts.id });
    var text = U.h('span', { class: 'date-btn__text' });
    var btn = U.h('button', { type: 'button', class: 'date-btn input', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', id: opts.id + '-btn' }, U.icon('calendar'), text);
    var clr = U.h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('Muddatni olib tashlash'), hidden: true, onClick: function () { set(''); btn.focus(); } }, U.icon('close'));
    var pop = U.h('div', { class: 'cal', role: 'dialog', 'aria-label': t('Sanani tanlash'), hidden: true });
    var wrap = U.h('div', { class: 'date-field' }, U.h('div', { class: 'date-row' }, btn, clr), pop, hidden);

    function set(v, silent) {
      value = v || '';
      hidden.value = value;
      text.textContent = value ? U.longDate(value) : (opts.placeholder || t('Sana tanlang'));
      btn.classList.toggle('is-empty', !value);
      clr.hidden = !value;
      btn.removeAttribute('aria-invalid');
      if (!silent && opts.onChange) opts.onChange(value);
    }
    function close(refocus) { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (refocus) btn.focus(); }
    function render(focusDate) {
      U.clear(pop);
      var y = view.y, m = view.m, now = L.todayStr();
      pop.appendChild(U.h('div', { class: 'cal__head' },
        U.h('span', { class: 'cal__title' }, I.monthsNom()[m] + ' ' + y),
        U.h('div', { class: 'cal__nav' },
          U.h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('Oldingi oy'), onClick: function () { shift(-1); } }, U.icon('left')),
          U.h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('Keyingi oy'), onClick: function () { shift(1); } }, U.icon('right')))));
      pop.appendChild(U.h('div', { class: 'cal__week', 'aria-hidden': 'true' }, I.week().map(function (w) { return U.h('span', null, w); })));
      var grid = U.h('div', { class: 'cal__grid' });
      var first = new Date(y, m, 1), start = new Date(y, m, 1 - ((first.getDay() + 6) % 7)), tabbable = null;
      for (var i = 0; i < 42; i++) {
        var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), iso = L.todayStr(d);
        var b = U.h('button', { type: 'button', class: 'cal__day' + (d.getMonth() !== m ? ' is-other' : '') + (iso === now ? ' is-today' : ''), tabindex: '-1',
          'aria-label': U.longDate(iso) + ', ' + I.weekFull()[(d.getDay() + 6) % 7], dataset: { date: iso } }, String(d.getDate()));
        if (iso === now) b.setAttribute('aria-current', 'date');
        if (iso === value) b.setAttribute('aria-pressed', 'true');
        if (min && iso < min) b.disabled = true;
        b.addEventListener('click', function (e) { set(e.currentTarget.dataset.date); close(true); });
        b.addEventListener('keydown', onKey);
        grid.appendChild(b);
        if (!b.disabled && (iso === focusDate || (!tabbable && d.getMonth() === m))) tabbable = b;
      }
      pop.appendChild(grid);
      if (tabbable) tabbable.tabIndex = 0;
      var quick = U.h('div', { class: 'cal__quick' });
      [[t('Bugun'), 0], [t('Ertaga'), 1], [t('1 haftadan'), 7]].forEach(function (q) {
        var iso = L.addDays(now, q[1]);
        quick.appendChild(U.h('button', { type: 'button', class: 'chip', disabled: !!(min && iso < min), onClick: function () { set(iso); close(true); } }, q[0]));
      });
      quick.appendChild(U.h('button', { type: 'button', class: 'chip chip--ghost', onClick: function () { set(''); close(true); } }, t('Tozalash')));
      pop.appendChild(quick);
      return tabbable;
    }
    function shift(n) {
      var d = new Date(view.y, view.m + n, 1);
      view = { y: d.getFullYear(), m: d.getMonth() };
      render(null);
      pop.querySelectorAll('.cal__nav .icon-btn')[n < 0 ? 0 : 1].focus();
    }
    function onKey(e) {
      var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key], cur = e.currentTarget.dataset.date, target = null;
      if (step) target = L.addDays(cur, step);
      if (e.key === 'PageUp' || e.key === 'PageDown') {
        var d = L.parseDate(cur);
        target = L.todayStr(new Date(d.getFullYear(), d.getMonth() + (e.key === 'PageUp' ? -1 : 1), d.getDate()));
      }
      if (!target) return;
      e.preventDefault();
      var td = L.parseDate(target);
      view = { y: td.getFullYear(), m: td.getMonth() };
      var tb = render(target);
      var exact = pop.querySelector('.cal__day[data-date="' + target + '"]:not(:disabled)') || tb;
      if (exact) { exact.tabIndex = 0; exact.focus(); }
    }
    btn.addEventListener('click', function () {
      if (!pop.hidden) { close(true); return; }
      var base = L.parseDate(value || min || L.todayStr());
      view = { y: base.getFullYear(), m: base.getMonth() };
      pop.hidden = false; btn.setAttribute('aria-expanded', 'true');
      var f = render(value || L.todayStr());
      if (f) f.focus();
    });
    pop.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); } });
    document.addEventListener('click', function (e) {
      if (pop.hidden) return;
      if (!e.composedPath().some(function (n) { return n === wrap; })) close(false);
    });
    set(value, true);
    return {
      el: wrap, button: btn,
      get: function () { return value; },
      set: function (v) { set(v, true); },
      setMin: function (v) { min = v; },
      setError: function (msg) { if (msg) btn.setAttribute('aria-invalid', 'true'); else btn.removeAttribute('aria-invalid'); },
      focus: function () { btn.focus(); }
    };
  };

  /* ---------------- maydon yordamchilari ---------------- */
  // field(label, control, { id, hint, optional }) — xato xabari uchun <p id="ID-error">
  U.field = function (label, control, opts) {
    var o = opts || {};
    var err = U.h('p', { class: 'field__error', id: o.id + '-error', role: 'alert' });
    // ID faqat haqiqiy maydonga beriladi (o'ram div'ga emas — takroriy ID bo'lmasin)
    if (o.id && !control.id && /^(INPUT|SELECT|TEXTAREA)$/.test(control.tagName)) control.id = o.id;
    var target = control.querySelector && control.tagName === 'DIV' ? control.querySelector('button, input, select, textarea') : control;
    if (target && target.setAttribute) target.setAttribute('aria-describedby', (o.id + '-error') + (o.hint ? ' ' + o.id + '-hint' : ''));
    return U.h('div', { class: 'field' + (o.class ? ' ' + o.class : '') },
      U.h('label', { class: 'field__label', for: target && target.id ? target.id : o.id }, label, o.optional ? U.h('span', { class: 'field__opt' }, ' ' + t('ixtiyoriy')) : null),
      control, o.hint ? U.h('p', { class: 'field__hint', id: o.id + '-hint' }, o.hint) : null, err);
  };
  U.showErrors = function (form, errors, map) {
    form.querySelectorAll('.field__error').forEach(function (p) { p.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach(function (n) { n.removeAttribute('aria-invalid'); });
    var first = null;
    Object.keys(errors || {}).forEach(function (k) {
      var id = (map && map[k]) || k;
      var p = form.querySelector('#' + id + '-error');
      if (p) p.textContent = t(errors[k]);
      var c = form.querySelector('#' + id) || form.querySelector('#' + id + '-btn');
      if (c && c.type === 'hidden') c = form.querySelector('#' + id + '-btn');
      if (c) { c.setAttribute('aria-invalid', 'true'); if (!first) first = c; }
    });
    if (first) first.focus();
    return !first;
  };

  /* ---------------- fayl yuklab olish ---------------- */
  U.download = function (filename, content, mime) {
    var blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = U.h('a', { href: url, download: filename, style: { display: 'none' } });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 1000);
  };

  App.UI = U;
})(typeof window !== 'undefined' ? window : globalThis);
