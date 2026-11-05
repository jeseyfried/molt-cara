/* Shared helpers, the two toggles, and one scroll loop that drives every scene. */
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  var root = document.documentElement;

  var MCC = window.MCC = {
    clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    smooth: function (t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); },
    range: function (p, a, b) { return MCC.clamp((p - a) / (b - a), 0, 1); },
    still: function () { return root.classList.contains('still'); },
    loupe: true,
    scenes: [],
    listeners: { motion: [], loupe: [] },
    store: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    read: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    // progress of a tall section whose child is sticky: 0 when its top meets the viewport top, 1 at the end
    progress: function (el) {
      var r = el.getBoundingClientRect();
      var span = r.height - window.innerHeight;
      return span > 0 ? MCC.clamp(-r.top / span, 0, 1) : (r.top < 0 ? 1 : 0);
    },
    addScene: function (s) { MCC.scenes.push(s); requestTick(); },
    tick: function () { requestTick(); }
  };

  /* toggles */
  var tm = document.getElementById('toggleMotion');
  var tl = document.getElementById('toggleLoupe');
  function paintToggles() {
    var on = !MCC.still();
    tm.setAttribute('aria-pressed', on ? 'true' : 'false');
    tm.textContent = on ? 'Motion on' : 'Motion off';
    tl.setAttribute('aria-pressed', MCC.loupe ? 'true' : 'false');
    tl.textContent = MCC.loupe ? 'Loupe on' : 'Loupe off';
  }
  if (MCC.read('mcc-loupe') === 'off') MCC.loupe = false;
  tm.addEventListener('click', function () {
    root.classList.toggle('still');
    MCC.store('mcc-motion', MCC.still() ? 'off' : 'on');
    paintToggles();
    MCC.listeners.motion.forEach(function (f) { f(!MCC.still()); });
    requestTick();
  });
  tl.addEventListener('click', function () {
    MCC.loupe = !MCC.loupe;
    MCC.store('mcc-loupe', MCC.loupe ? 'on' : 'off');
    paintToggles();
    MCC.listeners.loupe.forEach(function (f) { f(MCC.loupe); });
  });
  paintToggles();

  /* scroll loop */
  var ticking = false;
  function requestTick() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  function frame() {
    ticking = false;
    for (var i = 0; i < MCC.scenes.length; i++) {
      var s = MCC.scenes[i], r = s.el.getBoundingClientRect();
      var near = r.bottom > -window.innerHeight && r.top < window.innerHeight * 2;
      if (near) s.update(MCC.progress(s.el));
    }
    // light toggles over dark sections
    var dark = false, mid = 40;
    document.querySelectorAll('.scene--letter, .interlude').forEach(function (d) {
      var r = d.getBoundingClientRect(); if (r.top < mid && r.bottom > mid) dark = true;
    });
    document.body.classList.toggle('on-dark', dark);
  }
  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', function () {
    MCC.scenes.forEach(function (s) { if (s.resize) s.resize(); });
    requestTick();
  });
})();
