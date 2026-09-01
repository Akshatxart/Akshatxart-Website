/* ============================================================
   works-globe.js
   Project cards on a rotating 3D sphere — port of
   michalzalobny.com's globe mode.

   - Golden-angle sphere distribution (their exact getSpherePoints)
   - Cards billboard toward the camera, depth-fade on the far
     hemisphere (their fadeBack formula)
   - Rotation: idle auto-spin, page-scroll momentum while the
     Works section is in view, pointer drag with inertia, and a
     hover speed boost.
   - Card hover: GSAP tilt + center zoom + motion blur (the
     interaction already used on this site)
   - Mobile (<768px): script no-ops; CSS shows a flat grid
   ============================================================ */
(function () {
  "use strict";

  if (window.matchMedia("(max-width: 767px)").matches) return; // flat grid via CSS

  var section = document.getElementById("page3");
  var stage = document.getElementById("worksGlobeStage");
  var group = document.getElementById("worksGlobeGroup");
  var cards = Array.prototype.slice.call(document.querySelectorAll("[data-globe-card]"));
  var scrollContainer = document.querySelector(".scroll-container");

  if (!section || !stage || !group) return;

  var hoopsContainer = document.getElementById("worksGlobeHoops");
  var canvasIds = ["hoop0", "hoop1", "hoop2", "hoop3", "hoop4", "hoop5", "hoop6", "hoop7"];
  var hoopCanvases = [];
  var hoopCtxs = [];
  for (var ci = 0; ci < canvasIds.length; ci++) {
    var cv = document.getElementById(canvasIds[ci]);
    hoopCanvases.push(cv);
    hoopCtxs.push(cv ? cv.getContext("2d") : null);
  }
  var SCRAMBLE_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789#@$&";
  var SCRAMBLE_FONT = '900 8px Consolas, "Roboto Mono", Menlo, Monaco, "Courier New", monospace';
  var hoops = []; // { canvas, ctx, chars[] }
  // 8 great-circle rotations forming a wireframe globe
  var HOOP_ROTATIONS = [
    "rotateX(90deg)",                         // equator (flat ring)
    "rotateY(0deg)",                          // meridian 0°
    "rotateY(36deg)",                         // meridian 36°
    "rotateY(72deg)",                         // meridian 72°
    "rotateY(108deg)",                        // meridian 108°
    "rotateY(144deg)",                        // meridian 144°
    "rotateX(45deg)",                         // latitude 45° north
    "rotateX(-45deg)"                         // latitude 45° south
  ];

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof window.gsap !== "undefined";

  // ---- golden-angle sphere points (exact port) ----
  function getSpherePoints(amount) {
    if (amount <= 0) return [];
    if (amount === 1) return [{ x: 0, y: 0, z: 0 }];
    var positions = [];
    var goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < amount; i++) {
      var y = 1 - (i / (amount - 1)) * 2;
      var radiusAtY = Math.sqrt(1 - y * y);
      var theta = goldenAngle * i;
      positions.push({
        x: Math.cos(theta) * radiusAtY,
        y: y,
        z: Math.sin(theta) * radiusAtY
      });
    }
    return positions;
  }

  // deterministic PRNG + shuffle (reference shuffles with seed 32)
  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffleArray(arr, seed) {
    var rnd = mulberry32(seed);
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  var rawPoints = getSpherePoints(cards.length);
  var order = shuffleArray(rawPoints.map(function (_, i) { return i; }), 32);
  var points = order.map(function (idx) { return rawPoints[idx]; });

  // ---- hoops: canvas rings with scrambling text ----
  var dpr = window.devicePixelRatio || 1;

  function buildHoop(canvas, ctx, radius, rotationCSS) {
    var size = Math.ceil(radius * 2 + 20); // extra padding for text overshoot
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    canvas.style.left = (-size / 2) + "px";
    canvas.style.top = (-size / 2) + "px";
    if (rotationCSS) canvas.style.transform = rotationCSS;
    ctx.scale(dpr, dpr);

    var circ = 2 * Math.PI * radius;
    var charCount = Math.ceil(circ / 5); // very tight spacing
    var chars = [];
    for (var i = 0; i < charCount; i++) {
      chars.push(SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]);
    }

    return { canvas: canvas, ctx: ctx, chars: chars, charCount: charCount, radius: radius, size: size };
  }

  var glitchChance = 0.08; // ~8% of chars get a glitch effect per frame

  function drawHoop(h) {
    var ctx = h.ctx;
    var cx = h.size / 2;
    var cy = h.size / 2;
    ctx.clearRect(0, 0, h.size, h.size);
    ctx.font = SCRAMBLE_FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    var angleStep = (2 * Math.PI) / h.charCount;
    for (var i = 0; i < h.charCount; i++) {
      var angle = angleStep * i - Math.PI / 2;
      var x = cx + h.radius * Math.cos(angle);
      var y = cy + h.radius * Math.sin(angle);
      var ch = h.chars[i];
      var rnd = Math.random();

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);

      if (rnd < glitchChance) {
        // --- glitch: random offset + color split ---
        var gx = (Math.random() - 0.5) * 4; // ±2px horizontal offset
        var gy = (Math.random() - 0.5) * 3; // ±1.5px vertical offset
        // light shadow layer
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = "#888888";
        ctx.fillText(ch, gx - 1.5, gy);
        // dark shadow layer
        ctx.fillStyle = "#333333";
        ctx.fillText(ch, gx + 1.5, gy);
        // main char on top
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = "rgba(10, 10, 10, 0.9)";
        ctx.fillText(ch, gx, gy);
        ctx.globalAlpha = 1;
      } else if (rnd < glitchChance + 0.04) {
        // --- scanline slice: character shifted + stretched ---
        ctx.fillStyle = "rgba(10, 10, 10, 0.25)";
        ctx.fillText(ch, 0, -2);
        ctx.fillStyle = "rgba(10, 10, 10, 0.5)";
        ctx.fillText(ch, 2, 0);
      } else {
        // --- normal ---
        ctx.fillStyle = "rgba(10, 10, 10, 0.35)";
        ctx.fillText(ch, 0, 0);
      }

      ctx.restore();
    }
  }

  function scrambleHoop(h) {
    var count = Math.ceil(h.charCount * 0.15); // fewer chars per tick = slower decode
    for (var i = 0; i < count; i++) {
      h.chars[Math.floor(Math.random() * h.charCount)] = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
    }
    drawHoop(h);
  }

  var scrambleFrame = 0;
  var SCRAMBLE_EVERY = 30; // scramble every N frames (~30 frames @60fps ≈ 500ms)

  function tickScramble() {
    scrambleFrame++;
    if (scrambleFrame >= SCRAMBLE_EVERY) {
      scrambleFrame = 0;
      for (var i = 0; i < hoops.length; i++) scrambleHoop(hoops[i]);
    }
  }

  // ---- state ----
  var rot = 0;          // group rotation around Y (rad)
  var tilt = 0;         // group tilt around X (rad)
  var rotVel = 0;       // inertia, rad/s
  var tiltVel = 0;
  var AUTO_RATE = 0.12; // idle spin rad/s (~52s per turn)
  var HOVER_MULT = 2.6;
  var DECAY = 3.7;      // /s inertia decay (tau ~ 0.27s)
  var SCROLL_SPIN = 0.0075; // matches the reference's ~0.002 rad/px of scroll
  var DRAG_ROT = 0.4;   // (rad/s) per px of horizontal drag
  var DRAG_TILT = 0.25; // (rad/s) per px of vertical drag
  var lastT = 0;
  var hovered = false;
  var dragging = false;
  var isTouchDrag = false;
  var lastPX = 0;
  var lastPY = 0;
  var pointerX = -9999;
  var pointerY = -9999;
  var R = 300;
  var rafId = null;
  var lastScrollTop = scrollContainer ? scrollContainer.scrollTop : null;

  function smoothstep(edge0, edge1, x) {
    var t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  // ---- sizing: sphere radius fits cards inside the viewport ----
  function resize() {
    var w = stage.clientWidth || section.clientWidth;
    var h = stage.clientHeight || section.clientHeight;
    if (w <= 0 || h <= 0) return;
    var cap = 0.32 * Math.min(w, h);
    R = Math.max(120, cap);

    // rebuild hoops for the new radius
    rebuildHoops();
  }

  function rebuildHoops() {
    hoops = [];
    for (var i = 0; i < hoopCanvases.length; i++) {
      if (!hoopCanvases[i] || !hoopCtxs[i]) continue;
      hoopCtxs[i].setTransform(1, 0, 0, 1, 0, 0);
      hoops.push(buildHoop(hoopCanvases[i], hoopCtxs[i], R, HOOP_ROTATIONS[i]));
    }
    for (var j = 0; j < hoops.length; j++) drawHoop(hoops[j]);
  }



  // ---- one frame of transforms (also used once for reduced motion) ----
  function applyTransforms() {
    var cosT = Math.cos(tilt);
    var sinT = Math.sin(tilt);
    var cosR = Math.cos(rot);
    var sinR = Math.sin(rot);

    var tiltS = tilt.toFixed(4);
    var rotS = rot.toFixed(4);
    var negTiltS = (-tilt).toFixed(4);
    var negRotS = (-rot).toFixed(4);
    var rR = R;
    group.style.transform = "rotateX(" + tiltS + "rad) rotateY(" + rotS + "rad)";

    for (var i = 0; i < cards.length; i++) {
      var p = points[i];
      var x1 = p.x * cosR + p.z * sinR;
      var z1 = -p.x * sinR + p.z * cosR;
      var y2 = p.y * cosT - z1 * sinT;
      var z2 = p.y * sinT + z1 * cosT;

      cards[i].style.transform =
        "translate3d(" + (p.x * rR).toFixed(2) + "px," + (-p.y * rR).toFixed(2) + "px," + (p.z * rR).toFixed(2) + "px)" +
        " rotateY(" + negRotS + "rad) rotateX(" + negTiltS + "rad)";

      var fade = clamp(z2 + 1, 0, 1);
      fade = smoothstep(0.12, 1, fade);
      cards[i].style.opacity = (Math.min(fade + 0.1, 1)).toFixed(3);
    }
  }

  // ---- main loop ----
  // A persistent rAF with a cheap in-view gate (no IntersectionObserver —
  // some webviews never fire it). Only runs the sphere while the Works
  // section is actually on screen.
  function isInView() {
    var r = section.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    if (r.height <= 0) return false;
    var visible = Math.min(r.bottom, vh) - Math.max(r.top, 0);
    return visible > r.height * 0.12;
  }

  function step(t) {
    if (!isInView()) {
      lastT = 0;
      lastScrollTop = scrollContainer ? scrollContainer.scrollTop : null;
      scrambleFrame = 0;
      return;
    }

    tickScramble();

    if (!lastT) lastT = t;
    var dt = Math.min((t - lastT) / 1000, 0.05);
    lastT = t;

    // page scroll adds spin momentum while the section is in view
    if (scrollContainer) {
      var st = scrollContainer.scrollTop;
      if (lastScrollTop !== null) {
        var d = st - lastScrollTop;
        if (Math.abs(d) > 0.01) rotVel += d * SCROLL_SPIN;
      }
      lastScrollTop = st;
    }
    rotVel = clamp(rotVel, -10, 10);

    // idle auto-spin (+ hover boost); drag momentum decays (time-based)
    var decay = Math.exp(-DECAY * dt);
    rot += AUTO_RATE * (hovered ? HOVER_MULT : 1) * dt + rotVel * dt;
    tilt += tiltVel * dt;
    rotVel *= decay;
    tiltVel *= decay;
    if (Math.abs(rotVel) < 0.02) rotVel = 0;
    if (Math.abs(tiltVel) < 0.02) tiltVel = 0;
    tilt = clamp(tilt, -0.55, 0.55);

    applyTransforms();
  }

  function frame(t) {
    rafId = requestAnimationFrame(frame);
    step(t);
  }

  function start() {
    if (rafId !== null || reduceMotion) return;
    rafId = requestAnimationFrame(frame);
  }

  // ---- pointer interaction ----
  function pointerHover() {
    // cursor within ~1.25x of the sphere radius => boost the spin
    var rect = stage.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var dx = pointerX - cx;
    var dy = pointerY - cy;
    hovered = Math.sqrt(dx * dx + dy * dy) < R * 1.25;
  }

  stage.addEventListener("pointerdown", function (e) {
    isTouchDrag = e.pointerType === "touch";
    dragging = true;
    lastPX = e.clientX;
    lastPY = e.clientY;
    stage.classList.add("is-dragging");
    if (!isTouchDrag) e.preventDefault();
    try {
      stage.setPointerCapture(e.pointerId);
    } catch (err) { /* ignore */ }
  });

  stage.addEventListener("pointermove", function (e) {
    pointerX = e.clientX;
    pointerY = e.clientY;
    if (!dragging) return;
    var dx = e.clientX - lastPX;
    var dy = e.clientY - lastPY;
    lastPX = e.clientX;
    lastPY = e.clientY;
    if (isTouchDrag) {
      // vertical pans keep scrolling the page (touch-action: pan-y)
      rotVel += dx * DRAG_ROT;
    } else {
      rotVel += dx * DRAG_ROT;
      tiltVel += dy * DRAG_TILT;
    }
    rotVel = clamp(rotVel, -10, 10);
    tiltVel = clamp(tiltVel, -4, 4);
  });

  function endDrag() {
    dragging = false;
    isTouchDrag = false;
    stage.classList.remove("is-dragging");
  }

  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);
  stage.addEventListener("pointerleave", function () {
    endDrag();
    pointerX = -9999;
    pointerY = -9999;
    hovered = false;
  });

  // ---- card hover: tilt + center zoom + motion blur (GSAP) ----
  function bindCardHover() {
    cards.forEach(function (card) {
      var inner = card.querySelector("[data-globe-card-inner]");
      if (!inner) return;

      if (hasGsap) {
        var enterAnim = null;

        card.addEventListener("pointerenter", function () {
          if (enterAnim) enterAnim.kill();
          enterAnim = gsap.fromTo(
            inner,
            { scale: 1, filter: "blur(3px)" },
            {
              scale: 1.22,
              filter: "blur(0px)",
              duration: 0.55,
              ease: "power3.out",
              overwrite: "auto"
            }
          );
        });

        card.addEventListener("pointermove", function (e) {
          var r = card.getBoundingClientRect();
          var nx = (e.clientX - r.left) / r.width - 0.5;
          var ny = (e.clientY - r.top) / r.height - 0.5;
          gsap.to(inner, {
            rotateX: ny * -12,
            rotateY: nx * 14,
            duration: 0.35,
            ease: "power2.out",
            overwrite: "auto"
          });
        });

        card.addEventListener("pointerleave", function () {
          gsap.to(inner, {
            rotateX: 0,
            rotateY: 0,
            scale: 1,
            filter: "blur(0px)",
            duration: 0.6,
            ease: "power3.out",
            overwrite: "auto"
          });
        });
      }
    });
  }

  // ---- init ----
  resize();
  rebuildHoops();
  applyTransforms(); // static sphere for reduced-motion / pre-loop paint

  if (!reduceMotion) {
    bindCardHover();
    stage.addEventListener("pointermove", pointerHover);
    start();
  }


  var resizeT = null;
  window.addEventListener("resize", function () {
    if (resizeT) clearTimeout(resizeT);
    resizeT = setTimeout(function () {
      resize();
      applyTransforms();
    }, 150);
  });
})();
