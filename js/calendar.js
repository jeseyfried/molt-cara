/* The season as a calendar: one square per episode, by the date of its document. */
(function () {
  'use strict';
  var E = window.EPISODES;
  var cal = document.getElementById('cal');
  var card = document.getElementById('epCard');
  var tagEl = document.getElementById('tagFilter');
  if (!E || !cal) return;

  var MONTHS = ['December', 'January', 'February', 'March', 'April', 'May', 'June'];
  var byMonth = {};
  E.forEach(function (e) {
    var m = e.doc.match(/^(\w+)\s+(\d+)/);
    if (!m) return;
    (byMonth[m[1]] = byMonth[m[1]] || {})[+m[2]] = e;
  });
  function who(e) {
    var s = e.place === 'Joan' ? 'Joan' : (e.sender || '');
    return /violant/i.test(s) ? 'v' : /joan/i.test(s) ? 'j' : 'o';
  }
  function senderName(e) { return e.place === 'Joan' ? 'Joan' : (e.sender || 'Unknown sender'); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  var head = document.createElement('div');
  head.className = 'cal-row'; head.setAttribute('aria-hidden', 'true');
  head.innerHTML = '<span></span>' + Array.from({ length: 31 }, function (_, i) { return '<span class="hd">' + ((i + 1) % 5 === 0 || i === 0 ? i + 1 : '') + '</span>'; }).join('');
  cal.appendChild(head);

  var buttons = [];
  MONTHS.forEach(function (mn) {
    var days = byMonth[mn]; if (!days) return;
    var row = document.createElement('div'); row.className = 'cal-row';
    row.innerHTML = '<span class="m">' + mn + '</span>';
    for (var d = 1; d <= 31; d++) {
      var e = days[d];
      if (!e) { var s = document.createElement('span'); s.className = 'day day--empty'; row.appendChild(s); continue; }
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'day day--' + who(e);
      b.setAttribute('aria-label', 'Episode ' + e.n + ', ' + e.doc + ', ' + senderName(e));
      b.dataset.n = e.n;
      row.appendChild(b);
      buttons.push({ b: b, e: e });
    }
    cal.appendChild(row);
  });

  var sel = null;
  function show(e) {
    if (sel) sel.classList.remove('is-sel');
    var hit = buttons.filter(function (x) { return x.e === e; })[0];
    if (hit) { sel = hit.b; sel.classList.add('is-sel'); }
    card.innerHTML =
      '<p class="no">Episode ' + e.n + '</p>' +
      '<h3>' + esc(e.doc) + '</h3>' +
      '<p class="who">' + esc(senderName(e)) + (e.rec ? ' to ' + esc(e.rec) : '') + (e.place && e.place !== 'Joan' ? ', from ' + esc(e.place) : '') + '</p>' +
      '<p>' + esc(e.s) + '</p>' +
      '<ul class="tags">' + e.tags.map(function (t) { return '<li><button type="button" data-tag="' + esc(t) + '">' + esc(t) + '</button></li>'; }).join('') + '</ul>' +
      '<p><a href="' + e.u + '">Open episode ' + e.n + '</a>' + (e.ref ? ' <span class="who">' + esc(e.ref) + '</span>' : '') + '</p>';
  }
  cal.addEventListener('click', function (ev) {
    var b = ev.target.closest('.day[data-n]'); if (!b) return;
    show(E[+b.dataset.n - 1]);
  });
  cal.addEventListener('mouseover', function (ev) {
    var b = ev.target.closest('.day[data-n]'); if (b) show(E[+b.dataset.n - 1]);
  });
  cal.addEventListener('focusin', function (ev) {
    var b = ev.target.closest('.day[data-n]'); if (b) show(E[+b.dataset.n - 1]);
  });

  // filters: by sender, or by a tag picked from a card
  var who_f = 'all', tag_f = null;
  function apply() {
    buttons.forEach(function (x) {
      var ok = (who_f === 'all' || who(x.e) === who_f) && (!tag_f || x.e.tags.indexOf(tag_f) >= 0);
      x.b.classList.toggle('is-dim', !ok);
    });
    if (tag_f) {
      var c = buttons.filter(function (x) { return x.e.tags.indexOf(tag_f) >= 0; }).length;
      tagEl.hidden = false;
      tagEl.innerHTML = 'Tagged “' + esc(tag_f) + '”: ' + c + (c === 1 ? ' episode' : ' episodes') + '<button type="button" class="chip" id="clearTag">Clear tag</button>';
      document.getElementById('clearTag').addEventListener('click', function () { tag_f = null; apply(); });
    } else { tagEl.hidden = true; tagEl.innerHTML = ''; }
  }
  document.querySelectorAll('.filters .chip[data-f]').forEach(function (c) {
    c.addEventListener('click', function () {
      who_f = c.dataset.f;
      document.querySelectorAll('.filters .chip[data-f]').forEach(function (o) { o.setAttribute('aria-pressed', o === c ? 'true' : 'false'); });
      apply();
    });
  });
  card.addEventListener('click', function (ev) {
    var t = ev.target.closest('button[data-tag]'); if (!t) return;
    tag_f = t.dataset.tag; apply();
  });

  show(E[126]); // open on episode 127, the letter above
})();
