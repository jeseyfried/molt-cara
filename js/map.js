/* Scene 2: a portolan-style outline of Western Europe and the Mediterranean.
   Scroll draws the coast, Violant's road from Bar, the letter of 30 April, and then every
   letter of the season in date order, plotted at the seat of its recipient. */
(function () {
  'use strict';
  var MCC = window.MCC, P = window.PLACES, E = window.EPISODES;
  var scene = document.getElementById('map');
  var host = document.getElementById('chartSvg');
  if (!MCC || !P || !E || !scene || !window.fetch) return;
  var NS = 'http://www.w3.org/2000/svg';
  var tip = document.getElementById('mapTip');
  var dateEl = document.getElementById('mapDate');
  var caps = [].slice.call(document.querySelectorAll('#captions .cap'));

  var byName = {};
  P.places.forEach(function (p) { byName[p.name] = p; });
  var epByN = {};
  E.forEach(function (e) { epByN[e.n] = e; });

  // where each letter was issued
  function originOf(e) {
    var pl = (e.place || '').toLowerCase();
    if (pl.indexOf('girona') >= 0) return byName.Girona;
    if (pl.indexOf('granollers') >= 0) return byName.Granollers;
    if (pl.indexOf('barcelona') >= 0 || e.place === 'Joan') return byName.Barcelona;
    return null;
  }
  function senderOf(e) {
    var s = (e.place === 'Joan' ? 'Joan' : e.sender || '');
    return /violant/i.test(s) ? 'v' : /joan/i.test(s) ? 'j' : 'o';
  }
  // destination of each episode
  var dest = {};
  P.places.forEach(function (p) { p.eps.forEach(function (n) { dest[n] = p; }); });
  var placedCount = Object.keys(dest).length;
  var unplaced = E.length - placedCount;

  // tallies for captions
  var tally = P.places.filter(function (p) { return p.eps.length; }).sort(function (a, b) { return b.eps.length - a.eps.length; });
  document.getElementById('capCount').textContent =
    'Every letter of the season, in date order, drawn to the seat of the person it was addressed to. ' +
    placedCount + ' of the ' + E.length + ' can be placed that way; the most went to ' + tally[0].name +
    ' (' + tally[0].eps.length + ') and ' + tally[1].name + ' (' + tally[1].eps.length + ').';
  document.getElementById('capEnd').textContent =
    'Hover over or tap a place to see the episodes that wrote to it. Another ' + unplaced +
    ' letters went to people whose whereabouts the documents don’t fix, so they aren’t drawn.';

  fetch('assets/map.svg').then(function (r) { if (!r.ok) throw 0; return r.text(); }).then(function (txt) {
    host.innerHTML = txt;
    build(host.querySelector('svg'));
  }).catch(function () {
    host.innerHTML = '<p>The map could not be loaded.</p>';
  });

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function curve(a, b, bend) {
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / len, ny = dx / len;
    if (ny > 0) { nx = -nx; ny = -ny; } // bow northward, like a course drawn over the sea
    var c = { x: mx + nx * len * bend, y: my + ny * len * bend };
    return 'M' + a.x + ' ' + a.y + ' Q' + c.x.toFixed(1) + ' ' + c.y.toFixed(1) + ' ' + b.x + ' ' + b.y;
  }

  function build(svg) {
    svg.removeAttribute('role');
    var coast = svg.querySelector('.coast');
    var rhumbs = svg.querySelector('.rhumbs');
    var seas = [].slice.call(svg.querySelectorAll('.sea'));
    var gR = svg.querySelector('.routes'), gM = svg.querySelector('.marks');

    // Violant's road and the 30 April letter
    var B = byName.Barcelona, A = byName.Avignon, Bar = byName['Bar-le-Duc'], Pa = byName.Paris;
    var road = el('path', { 'class': 'violant-road', d: 'M' + Bar.x + ' ' + Bar.y + ' Q' + (Bar.x - 20) + ' ' + (Bar.y - 4) + ' ' + Pa.x + ' ' + Pa.y + ' Q' + (Pa.x - 30) + ' ' + ((Pa.y + B.y) / 2) + ' ' + B.x + ' ' + B.y }, gR);
    var roadLen = road.getTotalLength();
    road.style.strokeDasharray = '6 4';
    var heroRoute = el('path', { 'class': 'route route--hero', d: curve(B, A, 0.28) }, gR);
    var heroLen = heroRoute.getTotalLength();
    heroRoute.style.strokeDasharray = heroLen + ' ' + heroLen;
    var seal = el('circle', { 'class': 'seal', r: 5 }, gM);

    // one route per placed letter
    var routes = [];
    E.forEach(function (e) {
      var d = dest[e.n], o = originOf(e);
      if (!d || !o || d === o) { routes.push(null); return; }
      var path = el('path', { 'class': 'route route--' + senderOf(e), d: curve(o, d, 0.18), pathLength: 1 }, gR);
      path.style.strokeDasharray = '1 1'; path.style.strokeDashoffset = 1; path.style.opacity = 0;
      routes.push({ n: e.n, path: path, on: false });
    });

    // origins
    ['Barcelona', 'Girona', 'Granollers'].forEach(function (n) {
      var p = byName[n]; el('circle', { 'class': 'origin', cx: p.x, cy: p.y, r: 3.2, 'data-o': n }, gM);
    });

    // destination pins
    // smaller places first, so the busiest sit on top and win the click
    var pins = tally.slice().reverse().map(function (p) {
      var g = el('g', { 'class': 'place', tabindex: '-1', role: 'button', 'aria-label': p.name + ', ' + p.eps.length + (p.eps.length === 1 ? ' letter' : ' letters') }, gM);
      var c = el('circle', { 'class': 'pin', cx: p.x, cy: p.y, r: 0 }, g);
      var hit = el('circle', { cx: p.x, cy: p.y, r: 8, fill: 'transparent' }, g);
      var t = el('text', { 'class': 'lbl', x: p.x, y: p.y }, gM);
      t.textContent = p.name;
      g.addEventListener('click', function (ev) { ev.stopPropagation(); openTip(p, g); });
      g.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openTip(p, g); } });
      g.addEventListener('pointerenter', function (ev) { if (ev.pointerType === 'mouse' && interactive) openTip(p, g); });
      return { p: p, g: g, c: c, hit: hit, t: t, count: 0 };
    });
    // labels for the story steps
    function label(p, txt, cls) { var t = el('text', { 'class': 'lbl ' + (cls || ''), x: p.x, y: p.y }, gM); t.textContent = txt; t.style.opacity = 0; return { t: t, p: p }; }
    var storyLabels = {
      bar: label(Bar, 'Bar', 'lbl--red'), paris: label(Pa, 'Paris', 'lbl--red'),
      bcn: label(B, 'Barcelona'), avi: label(A, 'Avignon', 'lbl--red')
    };

    // zoom box around the Crown's heartland, at the map's aspect ratio
    var crown = ['Valencia', 'Elx', 'Perpignan', 'Zaragoza', 'Palma', 'Teruel', 'Girona', 'Huesca'].map(function (n) { return byName[n]; });
    var zx0 = Math.min.apply(null, crown.map(function (p) { return p.x; })) - 14;
    var zx1 = Math.max.apply(null, crown.map(function (p) { return p.x; })) + 14;
    var zy0 = Math.min.apply(null, crown.map(function (p) { return p.y; })) - 14;
    var zy1 = Math.max.apply(null, crown.map(function (p) { return p.y; })) + 14;
    var zw = Math.max(zx1 - zx0, (zy1 - zy0) * 1000 / 640), zh = zw * 640 / 1000;
    var Zb = [(zx0 + zx1 - zw) / 2, (zy0 + zy1 - zh) / 2, zw, zh];
    var Fb = [0, 0, 1000, 640];

    var interactive = false;
    function openTip(p, g) {
      if (!interactive) return;
      var items = p.eps.map(function (n) {
        var e = epByN[n]; var s = e.s.length > 120 ? e.s.slice(0, 117).replace(/\s+\S*$/, '') + '…' : e.s;
        return '<li><a href="' + e.u + '">Ep. ' + n + '</a><span>' + e.doc.replace(/, 1387$/, '') + '.</span> ' + escapeHtml(s) + '</li>';
      }).join('');
      tip.innerHTML = '<button class="x" type="button" aria-label="Close">×</button><h4>' + p.name + '</h4><ul>' + items + '</ul>';
      tip.hidden = false;
      var cr = document.getElementById('chart').getBoundingClientRect(), gr = g.getBoundingClientRect();
      var left = gr.left - cr.left + 16, top = gr.top - cr.top - 10;
      if (left + tip.offsetWidth > cr.width) left = gr.left - cr.left - tip.offsetWidth - 16;
      if (left < 0) left = 4;
      if (top + tip.offsetHeight > cr.height) top = cr.height - tip.offsetHeight - 4;
      tip.style.left = Math.max(0, left) + 'px'; tip.style.top = Math.max(0, top) + 'px';
      tip.querySelector('.x').addEventListener('click', closeTip);
    }
    function closeTip() { tip.hidden = true; }
    document.addEventListener('click', function (ev) { if (!tip.hidden && !tip.contains(ev.target)) closeTip(); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closeTip(); });

    var lastCap = -1, lastN = -1, lastU = -1;
    function update(p) {
      var still = MCC.still();
      // A: coast and wind lines
      coast.style.strokeDashoffset = still ? 0 : 1 - MCC.range(p, 0, 0.1);
      rhumbs.style.opacity = (still ? 1 : MCC.range(p, 0.03, 0.12)) * 0.6;

      // zoom: in for the heartland, then back out
      var zin = MCC.smooth(MCC.range(p, 0.70, 0.75)) - MCC.smooth(MCC.range(p, 0.81, 0.86));
      var vb = Fb.map(function (v, i) { return MCC.lerp(v, Zb[i], zin); });
      svg.setAttribute('viewBox', vb.map(function (v) { return v.toFixed(2); }).join(' '));
      // user units per CSS pixel: keeps marks and labels the same size on screen at any zoom or width
      var rw = svg.getBoundingClientRect().width || 1000;
      var u = vb[2] / rw;
      seas.forEach(function (s, i) { s.style.opacity = (still ? 1 : MCC.range(p, 0.06, 0.12)) * (1 - zin) * (/Leó/.test(s.textContent) ? 1 - MCC.range(p, 0.6, 0.64) : 1); });
      coast.style.strokeWidth = 1 * u;
      road.style.strokeWidth = 2.2 * u; heroRoute.style.strokeWidth = 2.2 * u;
      if (Math.abs(u - lastU) > 1e-4) { lastU = u; routes.forEach(function (r) { if (r) r.path.style.strokeWidth = 1 * u; }); }

      // B: Violant's road
      var rb = MCC.range(p, 0.13, 0.24);
      road.style.strokeDasharray = (rb * roadLen) + ' ' + roadLen;
      road.style.opacity = p < 0.4 ? 1 : 1 - 0.75 * MCC.range(p, 0.4, 0.46);
      storyLabels.bar.t.style.opacity = MCC.range(p, 0.13, 0.15);
      storyLabels.paris.t.style.opacity = MCC.range(p, 0.17, 0.19);
      storyLabels.bcn.t.style.opacity = MCC.range(p, 0.22, 0.24) * (1 - MCC.range(p, 0.4, 0.43));

      // C: the 30 April letter, with a seal riding along it
      var rc = MCC.range(p, 0.27, 0.35);
      heroRoute.style.strokeDashoffset = heroLen * (1 - rc);
      heroRoute.style.opacity = p < 0.4 ? 1 : 1 - 0.6 * MCC.range(p, 0.4, 0.46);
      var sp = heroRoute.getPointAtLength(heroLen * rc);
      seal.setAttribute('cx', sp.x); seal.setAttribute('cy', sp.y);
      seal.setAttribute('r', 6 * u);
      seal.style.opacity = rc > 0 && p < 0.4 ? 1 : 0;
      storyLabels.avi.t.style.opacity = MCC.range(p, 0.33, 0.35) * (1 - MCC.range(p, 0.4, 0.43));

      // D: every letter in date order
      var n = Math.floor(MCC.range(p, 0.41, 0.70) * E.length + (p >= 0.70 ? 1 : 0));
      n = MCC.clamp(n, 0, E.length);
      if (n !== lastN) {
        lastN = n;
        routes.forEach(function (r, i) {
          if (!r) return;
          var on = i < n;
          if (on !== r.on) {
            r.on = on;
            r.path.style.transition = still ? 'none' : 'stroke-dashoffset .7s ease-out, opacity .3s';
            r.path.style.strokeDashoffset = on ? 0 : 1;
            r.path.style.opacity = on ? '' : 0;
          }
        });
        pins.forEach(function (pn) { pn.count = pn.p.eps.filter(function (e) { return e <= n; }).length; });
      }
      var dt = n > 0 && p < 0.86 ? E[n - 1].doc.replace(/, 1387$/, '') + '. Episode ' + n : '';
      if (dateEl.textContent !== dt) dateEl.textContent = dt;
      var endState = p >= 0.86;
      pins.forEach(function (pn) {
        var r = pn.count ? (2.2 + Math.sqrt(pn.count) * 1.8) * u : 0;
        pn.c.setAttribute('r', r.toFixed(2));
        pn.hit.setAttribute('r', (Math.max(r / u, 11)) * u);
        var big = zin > 0.5 ? (pn.count >= 2 && inBox(pn.p, vb)) : pn.count >= 4;
        var show = pn.count && (big && (p > 0.62 || zin > 0.5));
        pn.t.style.opacity = show ? 1 : 0;
        pn.t.setAttribute('font-size', (13.5 * u).toFixed(2)); pn.t.setAttribute('stroke-width', (3.5 * u).toFixed(2));
        var west = zin < 0.5 && pn.p.x < B.x - 12;
        pn.t.setAttribute('text-anchor', west ? 'end' : 'start');
        pn.t.setAttribute('x', (west ? pn.p.x - r - 2.5 * u : pn.p.x + r + 2.5 * u).toFixed(2));
        pn.t.setAttribute('y', (pn.p.y + 4 * u).toFixed(2));
        pn.g.setAttribute('tabindex', endState && pn.count ? '0' : '-1');
      });
      Object.keys(storyLabels).forEach(function (k) {
        var s = storyLabels[k], left = k === 'paris'; s.t.setAttribute('font-size', 15 * u); s.t.setAttribute('stroke-width', 3.5 * u); s.t.setAttribute('text-anchor', left ? 'end' : 'start'); s.t.setAttribute('x', s.p.x + (left ? -7 : 7) * u); s.t.setAttribute('y', s.p.y - 7 * u);
      });
      [].forEach.call(gM.querySelectorAll('.origin'), function (o) { o.setAttribute('r', 3.4 * u); });
      interactive = endState;
      if (!endState) closeTip();

      // captions
      var ci = p < 0.12 ? 0 : p < 0.26 ? 1 : p < 0.40 ? 2 : p < 0.70 ? 3 : p < 0.82 ? 4 : 5;
      if (ci !== lastCap) { lastCap = ci; caps.forEach(function (c, i) { c.classList.toggle('is-on', i === ci); }); }
    }
    function inBox(pt, vb) { return pt.x > vb[0] && pt.x < vb[0] + vb[2] && pt.y > vb[1] && pt.y < vb[1] + vb[3]; }

    MCC.addScene({ el: scene, update: update });
  }
  function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
})();
