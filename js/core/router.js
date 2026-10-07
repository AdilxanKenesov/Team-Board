/* Hash-router: #/admin/board?task=t_1 — himoya (rol), sarlavha, menyuda faol bo'lim. */
(function (root) {
  'use strict';
  var App = root.App = root.App || {};
  var R = { routes: [], current: null };

  // def: { name, role: 'guest'|'admin'|'member'|'user', title, nav, render(view, params, query) }
  R.add = function (pattern, def) {
    var keys = [];
    var re = new RegExp('^' + pattern.replace(/:(\w+)/g, function (m, k) { keys.push(k); return '([^/]+)'; }) + '$');
    R.routes.push({ pattern: pattern, re: re, keys: keys, def: def });
  };

  R.parse = function (hash) {
    var h = (hash || '').replace(/^#/, '') || '/';
    var q = {}, i = h.indexOf('?');
    if (i !== -1) {
      h.slice(i + 1).split('&').forEach(function (pair) {
        if (!pair) return;
        var kv = pair.split('=');
        q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
      });
      h = h.slice(0, i);
    }
    for (var r = 0; r < R.routes.length; r++) {
      var m = R.routes[r].re.exec(h);
      if (m) {
        var params = {};
        R.routes[r].keys.forEach(function (k, j) { params[k] = decodeURIComponent(m[j + 1]); });
        return { route: R.routes[r], path: h, params: params, query: q };
      }
    }
    return { route: null, path: h, params: {}, query: q };
  };

  R.go = function (hash, replace) {
    if (replace && root.history && root.history.replaceState) { root.history.replaceState(null, '', hash); R.onChange(); }
    else if (root.location.hash === hash) R.onChange();
    else root.location.hash = hash;
  };

  R.onChange = function () { if (App.onRoute) App.onRoute(R.parse(root.location.hash)); };
  R.start = function () {
    root.addEventListener('hashchange', R.onChange);
    R.onChange();
  };

  App.Router = R;
})(typeof window !== 'undefined' ? window : globalThis);
