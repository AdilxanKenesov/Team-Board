(function () {
  'use strict';

  var T = window.Taxta;
  var storage = null;
  try { storage = window.localStorage; } catch (e) { storage = null; }

  // Birinchi ochilish yoki buzilgan ma'lumot — namuna taxta
  var loaded = storage ? T.load(storage) : null;
  var tasks = loaded || T.sampleTasks();
  var storageOk = storage ? T.save(storage, tasks) : false;
  if (!storageOk) document.getElementById('storage-warning').hidden = false;

  var form = document.getElementById('add-form');
  var input = document.getElementById('title');
  var errorEl = document.getElementById('title-error');
  var statusEl = document.getElementById('status');

  // Har ustundagi tugmalar: [yo'nalish, matn, turi]
  var ACTIONS = {
    new: [['doing', 'Boshlash →', 'fwd']],
    doing: [['new', '← Qaytarish', 'back'], ['done', 'Tugatish →', 'fwd']],
    done: [['doing', '← Qayta ochish', 'back']]
  };

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(ts) {
    var d = new Date(ts);
    return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function persist() { if (storage) T.save(storage, tasks); }
  function setStatus(text) { statusEl.textContent = text; }

  function renderColumn(status, highlightId) {
    var list = document.getElementById('list-' + status);
    var items = T.byStatus(tasks, status);
    list.innerHTML = '';

    if (!items.length) {
      var empty = document.createElement('li');
      empty.className = 'empty';
      empty.textContent = 'Hozircha vazifa yo‘q.';
      list.appendChild(empty);
      return;
    }

    items.forEach(function (task) {
      var li = document.createElement('li');
      li.className = 'task' + (task.id === highlightId ? ' just-moved' : '');
      li.dataset.id = task.id;

      var title = document.createElement('p');
      title.className = 'task__title';
      title.textContent = task.title; // textContent: kiritilgan matn HTML bo'lib ishlamaydi

      var meta = document.createElement('div');
      meta.className = 'task__meta';
      var when = document.createElement('span');
      when.textContent = (status === 'new' ? 'Qo‘shildi: ' : status === 'doing' ? 'Boshlandi: ' : 'Tugadi: ') + fmt(task.updatedAt);
      meta.appendChild(when);
      if (task.sample) {
        var badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = 'Namuna';
        meta.appendChild(badge);
      }

      var actions = document.createElement('div');
      actions.className = 'task__actions';
      ACTIONS[status].forEach(function (a) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'move move--' + a[2];
        btn.textContent = a[1];
        btn.dataset.to = a[0];
        btn.setAttribute('aria-label', '“' + task.title + '”: ' + T.LABELS[a[0]] + ' ustuniga o‘tkazish');
        btn.addEventListener('click', function () { onMove(task.id, a[0]); });
        actions.appendChild(btn);
      });

      li.appendChild(title);
      li.appendChild(meta);
      li.appendChild(actions);
      list.appendChild(li);
    });
  }

  function renderStats() {
    var c = T.counts(tasks);
    T.STATUSES.forEach(function (s) {
      document.getElementById('count-' + s).textContent = c[s];
      document.getElementById('seg-' + s).style.flexGrow = c.total ? c[s] : 0;
    });
    document.getElementById('progress-text').textContent = c.total
      ? 'Jami ' + c.total + ' · Yangi ' + c.new + ' · Bajarilmoqda ' + c.doing + ' · Tugagan ' + c.done + ' (' + c.donePercent + '%)'
      : 'Hali vazifa yo‘q';
    document.getElementById('sample-note').hidden = !tasks.some(function (t) { return t.sample; });
  }

  function render(highlightId) {
    T.STATUSES.forEach(function (s) { renderColumn(s, highlightId); });
    renderStats();
  }

  function clearError() {
    errorEl.textContent = '';
    input.removeAttribute('aria-invalid');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var r = T.addTask(tasks, input.value);
    if (!r.ok) {
      errorEl.textContent = r.error;
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    clearError();
    tasks = r.tasks;
    persist();
    render(r.task.id);
    form.reset();
    input.focus();
    setStatus('“' + r.task.title + '” Yangi ustuniga qo‘shildi.');
  });
  input.addEventListener('input', clearError);

  function onMove(id, to) {
    var r = T.moveTask(tasks, id, to);
    if (!r.ok) return; // eski tugmani tez qayta bosish — e'tiborsiz
    tasks = r.tasks;
    persist();
    render(id);
    setStatus('“' + r.task.title + '” → ' + T.LABELS[to] + '.');
    // Fokus vazifaning yangi joyidagi birinchi tugmasiga o'tadi
    var moved = document.querySelector('.task[data-id="' + id + '"] .move');
    if (moved) moved.focus();
  }

  // Taxtani tozalash — sahifa ichidagi tasdiq bilan
  var resetBtn = document.getElementById('reset');
  var confirmBox = document.getElementById('reset-confirm');
  resetBtn.addEventListener('click', function () {
    confirmBox.hidden = false;
    document.getElementById('reset-no').focus();
  });
  document.getElementById('reset-no').addEventListener('click', function () {
    confirmBox.hidden = true;
    resetBtn.focus();
  });
  document.getElementById('reset-yes').addEventListener('click', function () {
    tasks = [];
    persist();
    confirmBox.hidden = true;
    render();
    setStatus('Taxta tozalandi. Birinchi vazifani qo‘shing.');
    input.focus();
  });

  // Boshqa oynada o'zgarsa, shu oyna ham yangilanadi
  window.addEventListener('storage', function (e) {
    if (e.key === T.STORAGE_KEY && storage) {
      tasks = T.load(storage) || [];
      render();
    }
  });

  render();
})();
