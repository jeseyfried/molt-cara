/* Scene 1: folio 17v is written out line by line as the reader scrolls.
   Two images of the page: the original, and one with the ink lifted off (inpainted).
   Each line is a slanted band; the band is copied from the original as the pen passes.
   The loupe reads the page under the cursor and shows the transcription of that line. */
(function () {
  'use strict';
  var MCC = window.MCC, D = window.LETTER;
  var scene = document.getElementById('letter');
  if (!MCC || !D || !scene) return;

  var folio = document.getElementById('folio');
  var canvas = document.getElementById('folioCanvas');
  var ctx = canvas.getContext('2d');
  var marks = document.getElementById('folioMarks');
  var quill = document.getElementById('folioQuill');
  var loupe = document.getElementById('loupe');
  var lctx = document.getElementById('loupeCanvas').getContext('2d');
  var slip = document.getElementById('slip');
  var elHead = document.getElementById('passageHead');
  var elEn = document.getElementById('passageEn');
  var elCa = document.getElementById('passageCa');
  var elGl = document.getElementById('glosses');
  var elHours = document.getElementById('hours');
  var NS = 'http://www.w3.org/2000/svg';
  var IW = D.W, IH = D.H;

  var lastMouse = null;
  var intro = { head: elHead.textContent, en: elEn.textContent };

  /* ----- geometry ----- */
  var lines = D.lines.map(function (l) {
    var slope = (l.yr - l.yl) / 515;
    return { t: l.t, x0: l.x0, x1: l.x1, y: function (x) { return l.yl + slope * (x - 300); } };
  });
  var units = lines.map(function (l) { return (l.x1 - l.x0) + 70; });
  units.push(320); // the scribe's subscription block
  var cum = [0];
  units.forEach(function (u, i) { cum.push(cum[i] + u); });
  var TOTAL = cum[cum.length - 1];
  var SUB = lines.length; // index of the subscription unit

  function bandPath(c, i, xr) {
    var l = lines[i], top = i === 0 ? 30 : 21, bot = 15;
    c.beginPath();
    c.moveTo(0, l.y(0) - top);
    c.lineTo(xr, l.y(xr) - top);
    c.lineTo(xr, l.y(xr) + bot);
    c.lineTo(0, l.y(0) + bot);
    c.closePath();
  }

  /* ----- images ----- */
  var orig = new Image(), blank = new Image(), loaded = 0, ready = false;
  orig.onload = blank.onload = function () { if (++loaded === 2) { ready = true; resize(); render(true); } };
  orig.src = 'assets/folio-17v.jpg';
  blank.src = 'assets/folio-17v-blank.jpg';

  var state = document.createElement('canvas'); state.width = IW; state.height = IH;
  var sctx = state.getContext('2d');
  var committed = document.createElement('canvas'); committed.width = IW; committed.height = IH;
  var cctx = committed.getContext('2d');
  var committedK = -1;

  function drawLineFull(c, i) {
    c.save(); bandPath(c, i, IW); c.clip(); c.drawImage(orig, 0, 0); c.restore();
  }
  function drawSub(c, frac) {
    var s = D.sub, w = (s.x1 - s.x0) * frac;
    c.save(); c.beginPath(); c.rect(s.x0, s.y0, w, s.y1 - s.y0); c.clip(); c.drawImage(orig, 0, 0); c.restore();
  }

  /* ----- marks overlay: current-line wash, glosses, subscription bracket ----- */
  var wash = document.createElementNS(NS, 'path'); wash.setAttribute('class', 'cur-line'); marks.appendChild(wash);
  var glossEls = D.glosses.map(function (g, gi) {
    var l = lines[g.line - 1], d = '', steps = 14;
    for (var s = 0; s <= steps; s++) {
      var x = g.x0 + (g.x1 - g.x0) * s / steps;
      var y = l.y(x) + 12 + Math.sin(s * 1.7 + gi) * 1.6;
      d += (s ? ' L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    var p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d); p.setAttribute('pathLength', '1'); p.setAttribute('class', 'gl');
    var n = document.createElementNS(NS, 'text');
    n.setAttribute('x', g.x1 + 4); n.setAttribute('y', l.y(g.x1) - 12); n.setAttribute('class', 'gl-n');
    n.textContent = gi + 1;
    marks.appendChild(p); marks.appendChild(n);
    // the pen passes the end of the word at this position
    var at = cum[g.line - 1] + (g.x1 - lines[g.line - 1].x0);
    return { g: g, p: p, n: n, at: at, on: false };
  });
  var sb = D.sub, bracket = document.createElementNS(NS, 'path');
  bracket.setAttribute('d', 'M' + (sb.x0 + 26) + ' ' + (sb.y0 - 6) + ' C' + (sb.x0 - 14) + ' ' + (sb.y0 + 10) + ' ' + (sb.x0 - 14) + ' ' + (sb.y1 - 14) + ' ' + (sb.x0 + 26) + ' ' + (sb.y1 + 2));
  bracket.setAttribute('pathLength', '1'); bracket.setAttribute('class', 'sub-bracket');
  marks.appendChild(bracket);
  var subGloss = { g: { w: 'subscription', g: 'The scribe’s subscription. The season’s notes identify the scribe as Bartholomeus Sirvent, Violant’s chancery scribe.' }, on: false };

  /* ----- hours timeline ----- */
  D.hours.forEach(function (h) {
    var li = document.createElement('li');
    li.innerHTML = '<span class="d">' + h.d + '</span>' + (h.h ? '<span class="h">' + h.h + '</span>' : '') + '<span class="t">' + h.t + '</span>';
    elHours.appendChild(li);
  });
  var hourEls = [].slice.call(elHours.children);

  /* ----- sizing ----- */
  var cw = 0, chh = 0, dpr = 1, scale = 1;
  function resize() {
    var r = folio.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = r.width; chh = r.height; scale = cw / IW;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(chh * dpr);
    render(true);
  }

  /* ----- render ----- */
  var lastPos = -1, lastP = 0;
  function posFromP(p) { return MCC.range(p, 0.05, 0.93) * TOTAL; }
  function locate(pos) {
    for (var k = 0; k < units.length; k++) if (pos < cum[k + 1]) return { k: k, f: (pos - cum[k]) / units[k] };
    return { k: units.length, f: 0 };
  }

  function render(force) {
    if (!ready) return;
    var pos = MCC.still() ? (lastP > 0.05 ? TOTAL : 0) : posFromP(lastP);
    if (!force && Math.abs(pos - lastPos) < 0.5) return;
    lastPos = pos;
    var L = locate(pos), k = L.k, f = L.f;

    // committed layer: blank page + every finished line
    var doneLines = Math.min(k, lines.length);
    if (committedK !== doneLines) {
      cctx.drawImage(blank, 0, 0);
      for (var i = 0; i < doneLines; i++) drawLineFull(cctx, i);
      committedK = doneLines;
    }
    sctx.drawImage(committed, 0, 0);
    var xr = 0, writing = false;
    if (k < lines.length) {
      var l = lines[k];
      // the pen spends the first part of each unit crossing the line, the rest lifted
      var span = (l.x1 - l.x0) / units[k];
      var ff = MCC.clamp(f / span, 0, 1);
      xr = l.x0 + ff * (l.x1 - l.x0 + 6);
      sctx.save(); bandPath(sctx, k, xr); sctx.clip(); sctx.drawImage(orig, 0, 0); sctx.restore();
      writing = ff > 0 && ff < 1;
    } else if (k === SUB) {
      drawSub(sctx, MCC.clamp(f * 1.15, 0, 1));
    } else {
      drawSub(sctx, 1);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(state, 0, 0, canvas.width, canvas.height);

    // quill and current-line wash
    if (writing && !MCC.still()) {
      var qy = lines[k].y(xr);
      quill.style.transform = 'translate(' + (xr * scale - 4) + 'px,' + (qy * scale - 56) + 'px) rotate(' + (10 + Math.sin(xr / 23) * 5) + 'deg)';
      quill.classList.add('is-on');
    } else quill.classList.remove('is-on');
    if (k < lines.length && pos > 0) {
      var ln = lines[k], a = ln.x0 - 10, b = ln.x1 + 10;
      wash.setAttribute('d', 'M' + a + ' ' + (ln.y(a) - 19) + ' L' + b + ' ' + (ln.y(b) - 19) + ' L' + b + ' ' + (ln.y(b) + 13) + ' L' + a + ' ' + (ln.y(a) + 13) + 'Z');
      wash.style.opacity = 1;
    } else wash.style.opacity = 0;

    // glosses
    var changed = false;
    glossEls.forEach(function (ge) {
      var on = pos >= ge.at;
      if (on !== ge.on) { ge.on = on; ge.p.classList.toggle('is-on', on); ge.n.classList.toggle('is-on', on); changed = true; }
    });
    var subOn = k >= SUB && (k > SUB || f > 0.6);
    if (subOn !== subGloss.on) { subGloss.on = subOn; bracket.classList.toggle('is-on', subOn); changed = true; }
    if (changed) paintGlosses();

    paintReading(k, f, pos);
    if (lastMouse && MCC.loupe && loupe.classList.contains('is-on')) showLoupe(lastMouse[0], lastMouse[1]);
  }

  function paintGlosses() {
    var on = glossEls.filter(function (g) { return g.on; }).map(function (g) { return { n: glossEls.indexOf(g) + 1, g: g.g }; });
    if (subGloss.on) on.push({ n: '', g: subGloss.g });
    var show = on.slice(-2);
    elGl.innerHTML = show.map(function (o) {
      return '<p class="gloss">' + (o.n ? '<span class="n">' + o.n + '</span>' : '') + '<i lang="ca">' + o.g.w + '</i>: ' + o.g.g + '</p>';
    }).join('');
  }

  var lastPassage = -2, lastLineShown = -2;
  function paintReading(k, f, pos) {
    var line = Math.min(k, lines.length - 1) + 1; // 1-based
    var pi = -1;
    if (pos > 0) {
      D.passages.forEach(function (ps, i) {
        var shared = i > 0 && D.passages[i - 1].b === ps.a;
        if (ps.a < line || (ps.a === line && (!shared || f > 0.55 || k >= lines.length))) pi = i;
      });
    }
    if (pi !== lastPassage) {
      lastPassage = pi;
      if (pi < 0) { elHead.textContent = intro.head; elEn.textContent = intro.en; }
      else { elHead.textContent = D.passages[pi].head; elEn.textContent = D.passages[pi].en; }
      var w = pi < 0 ? null : D.passages[pi].when;
      hourEls.forEach(function (li, i) {
        li.classList.toggle('is-now', w !== null && i === w);
        li.classList.toggle('is-past', w !== null && i < w);
      });
    }
    var done = k >= units.length;
    var key = pos <= 0 ? -1 : (done ? 99 : line);
    if (key !== lastLineShown) {
      lastLineShown = key;
      if (key === -1) elCa.innerHTML = '';
      else if (done) elCa.textContent = 'The page is complete. With the loupe on, move across the folio to read any line.';
      else elCa.innerHTML = '<b>Line ' + line + '</b>' + esc(lines[line - 1].t);
    }
  }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  MCC.addScene({
    el: scene,
    update: function (p) { lastP = p; render(false); },
    resize: resize
  });
  MCC.listeners.motion.push(function () { render(true); });

  /* ----- loupe ----- */
  var Z = 2.5, hideTimer = null;
  function revealedTo(i) {
    // how far (image x) line i has been written
    var L = locate(lastPos);
    if (i < L.k) return IW;
    if (i > L.k) return -1;
    var l = lines[i], span = (l.x1 - l.x0) / units[i];
    return l.x0 + MCC.clamp(L.f / span, 0, 1) * (l.x1 - l.x0);
  }
  function showLoupe(cx, cy) {
    var ix = cx / scale, iy = cy / scale;
    loupe.style.left = cx + 'px'; loupe.style.top = cy + 'px';
    loupe.classList.add('is-on');
    var srcW = loupe.offsetWidth / (scale * Z);
    var cv = lctx.canvas;
    lctx.fillStyle = '#c9b88c'; lctx.fillRect(0, 0, cv.width, cv.height);
    lctx.drawImage(state, ix - srcW / 2, iy - srcW / 2, srcW, srcW, 0, 0, cv.width, cv.height);
    // nearest line under the lens
    var best = -1, bd = 1e9;
    lines.forEach(function (l, i) { var d = Math.abs(l.y(ix) - 4 - iy); if (d < bd) { bd = d; best = i; } });
    if (best >= 0 && bd < 22 && revealedTo(best) > ix - 40) {
      slip.querySelector('.slip__n').textContent = 'Line ' + (best + 1);
      slip.querySelector('.slip__t').textContent = lines[best].t;
      slip.classList.add('is-on');
      var sw = slip.offsetWidth, left = MCC.clamp(cx - sw / 2, 4, cw - sw - 4);
      var top = cy + loupe.offsetHeight / 2 + 8;
      if (top + slip.offsetHeight > chh) top = cy - loupe.offsetHeight / 2 - slip.offsetHeight - 8;
      slip.style.left = left + 'px'; slip.style.top = top + 'px';
    } else slip.classList.remove('is-on');
  }
  function hideLoupe() { loupe.classList.remove('is-on'); slip.classList.remove('is-on'); }
  function local(e) { var r = folio.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  folio.addEventListener('pointermove', function (e) {
    if (!MCC.loupe || !ready || e.pointerType === 'touch') return;
    var p = local(e); lastMouse = p; showLoupe(p[0], p[1]);
  });
  folio.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') { lastMouse = null; hideLoupe(); } });
  folio.addEventListener('pointerdown', function (e) {
    if (!MCC.loupe || !ready || e.pointerType !== 'touch') return;
    var p = local(e); showLoupe(p[0], p[1] - 90);
    clearTimeout(hideTimer); hideTimer = setTimeout(function () { hideLoupe(); hideTimer = null; }, 2600);
  });
  function paintLoupeState() { folio.classList.toggle('loupe-on', MCC.loupe); if (!MCC.loupe) hideLoupe(); }
  MCC.listeners.loupe.push(paintLoupeState); paintLoupeState();

  /* ----- full text for reading at leisure (and for screen readers) ----- */
  var full = document.getElementById('fullText');
  if (full) {
    var ol = full.querySelector('.ft-ca'), en = full.querySelector('.ft-en');
    lines.forEach(function (l) { var li = document.createElement('li'); li.textContent = l.t; ol.appendChild(li); });
    D.passages.forEach(function (p) { var para = document.createElement('p'); para.textContent = p.en; en.appendChild(para); });
  }
})();
