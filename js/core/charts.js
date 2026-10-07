/* Kutubxonasiz SVG grafiklar: donut, guruhlangan ustunlar, yagona tooltip, jadval ko'rinishi.
   Ranglar CSS tokenlardan (klasslar orqali) — tungi rejim avtomatik. Matnlar hech qachon seriya rangida emas. */
(function (root) {
  'use strict';
  var App = root.App, U = App.UI, t = App.t;
  var h = U.h, NS = 'http://www.w3.org/2000/svg';
  var C = {};

  function svg(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] != null) el.setAttribute(k, attrs[k]); });
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) el.appendChild(arguments[i]);
    return el;
  }
  C.svg = svg;

  /* ---------------- yagona tooltip ---------------- */
  var tipEl = null;
  function tip() {
    if (!tipEl || !document.body.contains(tipEl)) {
      tipEl = h('div', { class: 'chart-tip', role: 'status', 'aria-live': 'polite', hidden: true });
      document.body.appendChild(tipEl);
    }
    return tipEl;
  }
  // rows: [{ cls, label, value }]
  C.showTip = function (title, rows, x, y) {
    var el = tip();
    U.clear(el);
    el.appendChild(h('b', { class: 'chart-tip__title' }, title));
    rows.forEach(function (r) {
      el.appendChild(h('span', { class: 'chart-tip__row' }, h('i', { class: 'key ' + (r.cls || '') }), h('span', null, r.label), h('b', { class: 'num' }, String(r.value))));
    });
    el.hidden = false;
    var w = el.offsetWidth, hh = el.offsetHeight;
    var left = Math.min(Math.max(8, x + 14), root.innerWidth - w - 8);
    var top = y - hh - 12 < 8 ? y + 16 : y - hh - 12;
    el.style.left = left + 'px'; el.style.top = top + 'px';
  };
  C.hideTip = function () { if (tipEl) tipEl.hidden = true; };
  // Elementga sichqoncha va klaviatura (fokus) tooltipini ulash
  C.bindTip = function (el, title, rows) {
    el.addEventListener('mousemove', function (e) { C.showTip(title, rows, e.clientX, e.clientY); });
    el.addEventListener('mouseleave', C.hideTip);
    el.addEventListener('focus', function () { var r = el.getBoundingClientRect(); C.showTip(title, rows, r.left + r.width / 2, r.top); });
    el.addEventListener('blur', C.hideTip);
  };
  root.addEventListener('scroll', function () { C.hideTip(); }, { passive: true });

  /* ---------------- legenda ---------------- */
  // items: [{ cls, label, value? }]
  C.legend = function (items) {
    return h('ul', { class: 'legend' }, items.map(function (it) {
      return h('li', null, h('i', { class: 'key ' + it.cls, 'aria-hidden': 'true' }), h('span', null, it.label),
        it.value != null ? h('b', { class: 'num' }, String(it.value)) : null);
    }));
  };

  /* ---------------- jadval ko'rinishi (accessibility) ---------------- */
  C.table = function (caption, head, rows) {
    return h('div', { class: 'table-wrap chart-table' }, h('table', { class: 'table table--compact' },
      h('caption', { class: 'sr-only' }, caption),
      h('thead', null, h('tr', null, head.map(function (x, i) { return h('th', { scope: 'col', class: i ? 'num' : null }, x); }))),
      h('tbody', null, rows.map(function (r) { return h('tr', null, r.map(function (x, i) { return h(i ? 'td' : 'th', { scope: i ? null : 'row', class: i ? 'num' : null }, String(x)); })); }))));
  };

  /* ---------------- donut ---------------- */
  // segs: [{ key, label, value, cls }]; opts: { center, centerLabel, title }
  C.donut = function (segs, opts) {
    var o = opts || {};
    var total = segs.reduce(function (s, x) { return s + x.value; }, 0);
    var R = 54, SW = 16, CIRC = 2 * Math.PI * R, GAP = 2.5;
    var g = svg('g', { transform: 'rotate(-90 70 70)' });
    g.appendChild(svg('circle', { cx: 70, cy: 70, r: R, class: 'donut__track' }));
    var acc = 0, live = segs.filter(function (s) { return s.value > 0; });
    live.forEach(function (s) {
      var len = s.value / total * CIRC;
      var dash = live.length > 1 ? Math.max(len - GAP, 0.5) : len;
      var arc = svg('circle', { cx: 70, cy: 70, r: R, class: 'donut__seg ' + s.cls, 'stroke-dasharray': dash.toFixed(2) + ' ' + (CIRC - dash).toFixed(2),
        'stroke-dashoffset': (-acc).toFixed(2), tabindex: '0', role: 'img',
        'aria-label': s.label + ': ' + s.value + ' (' + Math.round(s.value / total * 100) + '%)' });
      C.bindTip(arc, s.label, [{ cls: s.cls, label: t('Soni'), value: s.value }, { label: t('Ulushi'), value: Math.round(s.value / total * 100) + '%' }]);
      g.appendChild(arc);
      acc += len;
    });
    var chart = svg('svg', { viewBox: '0 0 140 140', class: 'donut__svg', 'aria-hidden': total ? null : 'true' }, g);
    var center = h('div', { class: 'donut__center' }, h('b', { class: 'num' }, String(o.center != null ? o.center : total)), h('span', null, o.centerLabel || t('jami')));
    var legend = h('ul', { class: 'legend legend--stack' }, segs.map(function (s) {
      var pct = total ? Math.round(s.value / total * 100) : 0;
      return h('li', null, h('i', { class: 'key ' + s.cls, 'aria-hidden': 'true' }), h('span', null, s.label),
        h('b', { class: 'num' }, String(s.value)), h('small', { class: 'num' }, pct + '%'));
    }));
    return h('div', { class: 'donut' }, h('div', { class: 'donut__fig', role: 'group', 'aria-label': o.title || '' }, chart, center), legend);
  };

  /* ---------------- guruhlangan ustunlar ---------------- */
  // data: [{ label, title, values: { key: n } }]; series: [{ key, label, cls }]
  function roundTop(x, y, w, hgt, r) {
    var rr = Math.min(r, hgt, w / 2);
    if (hgt <= 0) return '';
    return 'M' + x + ',' + (y + hgt) + 'V' + (y + rr) + 'Q' + x + ',' + y + ' ' + (x + rr) + ',' + y +
      'H' + (x + w - rr) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + rr) + 'V' + (y + hgt) + 'Z';
  }
  function niceMax(v) {
    if (v <= 4) return 4;
    var step = Math.pow(10, Math.floor(Math.log10(v)));
    var n = Math.ceil(v / step);
    var nice = n <= 2 ? 2 : n <= 4 ? 4 : n <= 5 ? 5 : 10;
    return Math.max(4, nice * step);
  }
  C.columns = function (data, series, opts) {
    var o = opts || {};
    var W = o.width || 600, H = o.height || 220, PL = 30, PR = 8, PT = 12, PB = 26;
    var iw = W - PL - PR, ih = H - PT - PB;
    var max = 0;
    data.forEach(function (d) { series.forEach(function (s) { max = Math.max(max, d.values[s.key] || 0); }); });
    var top = niceMax(max), ticks = 4;
    var root_ = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'cols__svg', role: 'img', 'aria-label': o.title || '' });
    for (var i = 0; i <= ticks; i++) {
      var v = top / ticks * i, y = PT + ih - ih * i / ticks;
      root_.appendChild(svg('line', { x1: PL, x2: W - PR, y1: y, y2: y, class: i ? 'grid' : 'axis' }));
      var lbl = svg('text', { x: PL - 6, y: y + 3.5, class: 'tick', 'text-anchor': 'end' }); lbl.textContent = String(Math.round(v * 10) / 10);
      root_.appendChild(lbl);
    }
    var band = iw / data.length;
    var groupW = Math.min(band * 0.62, 34);
    var barW = (groupW - 2 * (series.length - 1)) / series.length;
    var every = data.length > 16 ? 5 : data.length > 10 ? 2 : 1;
    data.forEach(function (d, di) {
      var gx = PL + band * di + (band - groupW) / 2;
      series.forEach(function (s, si) {
        var v = d.values[s.key] || 0, bh = ih * v / top;
        var x = gx + si * (barW + 2);
        if (v > 0) root_.appendChild(svg('path', { d: roundTop(x, PT + ih - bh, barW, bh, 4), class: 'bar-mark ' + s.cls }));
      });
      if (di % every === 0 || di === data.length - 1) {
        var xl = svg('text', { x: PL + band * di + band / 2, y: H - 8, class: 'tick', 'text-anchor': 'middle' }); xl.textContent = d.label;
        root_.appendChild(xl);
      }
      // Ko'rinmas katta nishon — butun ustun kengligi
      var hit = svg('rect', { x: PL + band * di, y: PT, width: band, height: ih, class: 'hit', tabindex: '0',
        'aria-label': d.title + ': ' + series.map(function (s) { return s.label + ' ' + (d.values[s.key] || 0); }).join(', ') });
      C.bindTip(hit, d.title, series.map(function (s) { return { cls: s.cls, label: s.label, value: d.values[s.key] || 0 }; }));
      hit.addEventListener('mouseenter', function () { hit.classList.add('is-on'); });
      hit.addEventListener('mouseleave', function () { hit.classList.remove('is-on'); });
      root_.insertBefore(hit, root_.firstChild);
    });
    return h('div', { class: 'cols' }, root_);
  };

  App.Charts = C;
})(window);
