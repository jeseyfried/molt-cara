/* The salutation writes itself: the traced script is revealed stroke by stroke through a mask,
   with a quill following the nib. One orchestrated moment on load; nothing else in the hero moves. */
(function () {
  'use strict';
  var MCC = window.MCC;
  var host = document.getElementById('heroScript');
  var quill = document.getElementById('heroQuill');
  var sheet = host.parentNode;
  if (!host || !window.fetch) return;

  fetch('assets/molt-cara-companyona.svg').then(function (r) {
    if (!r.ok) throw new Error(r.status);
    return r.text();
  }).then(function (txt) {
    var tmp = document.createElement('div');
    tmp.innerHTML = txt.trim();
    var svg = tmp.querySelector('svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.removeAttribute('role');
    var t = svg.querySelector('title'); if (t) t.remove();
    host.appendChild(svg);
    host.classList.add('is-live');
    run(svg);
  }).catch(function () { /* the <img> fallback stays visible */ });

  function run(svg) {
    var strokes = [].slice.call(svg.querySelectorAll('.mcc-s'));
    var lens = strokes.map(function (s) { return s.getTotalLength(); });
    strokes.forEach(function (s, i) { s.style.strokeDasharray = lens[i] + ' ' + (lens[i] + 2); });

    function finish() {
      strokes.forEach(function (s) { s.style.strokeDashoffset = 0; });
      quill.classList.remove('is-on');
    }
    if (MCC.still()) { finish(); return; }
    strokes.forEach(function (s, i) { s.style.strokeDashoffset = lens[i]; });

    // timeline: each stroke gets time in proportion to its length, plus a short pen-lift
    var speed = 1.15;           // user units per ms
    var lift = 35;              // ms between strokes
    var starts = [], t = 450;
    lens.forEach(function (L) { starts.push(t); t += L / speed + lift; });
    var total = t;
    var t0 = null;

    function place(stroke, len) {
      var pt = stroke.getPointAtLength(len);
      var ctm = svg.getScreenCTM(), box = sheet.getBoundingClientRect();
      if (!ctm) return;
      var x = pt.x * ctm.a + pt.y * ctm.c + ctm.e - box.left;
      var y = pt.x * ctm.b + pt.y * ctm.d + ctm.f - box.top;
      quill.style.transform = 'translate(' + (x - 6) + 'px,' + (y - 74) + 'px) rotate(' + (8 + Math.sin(len / 9) * 4) + 'deg)';
    }

    function step(now) {
      if (MCC.still()) { finish(); return; }
      if (t0 === null) t0 = now;
      var el = now - t0, active = -1;
      for (var i = 0; i < strokes.length; i++) {
        var d = (el - starts[i]) * speed;
        var shown = MCC.clamp(d, 0, lens[i]);
        strokes[i].style.strokeDashoffset = lens[i] - shown;
        if (d > 0 && d < lens[i]) active = i;
      }
      if (active >= 0) {
        quill.classList.add('is-on');
        place(strokes[active], MCC.clamp((el - starts[active]) * speed, 0, lens[active]));
      }
      if (el < total + 200) requestAnimationFrame(step);
      else finish();
    }
    requestAnimationFrame(step);
    MCC.listeners.motion.push(function (on) { if (!on) finish(); });
  }
})();
