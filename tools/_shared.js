/* ============================================================
   SHARED TOOL RUNTIME — inlined into every tool page by
   tools/build.py. Edit THIS file, never the inlined copy.
   Run `python3 tools/build.py` after changing it.

   Exposes on window.Viz:
     Viz.loop(opts)      animation lifecycle (golden rules 2-5)
     Viz.seg(el, cb)     segmented button group + aria-pressed
     Viz.canvas(cv, ctx) DPR-capped canvas sizing
     Viz.autoHeight()    report content height to an embedding page
     Viz.isMobile(w)     width below Viz.MOBILE_W
     Viz.reducedMotion   prefers-reduced-motion, resolved once
     Viz.FRAME_MS / Viz.DPR_CAP / Viz.MOBILE_W   site-wide caps

   ES5 only, no dependencies, no runtime fetches. See TOOLS.md.
   ============================================================ */
(function (window, document) {
  'use strict';

  var Viz = {};

  /* Site-wide caps. Changing these changes every tool — see the
     performance budget table in TOOLS.md before touching them. */
  Viz.FRAME_MS = 32;   /* ~30 fps */
  Viz.DPR_CAP = 2;
  Viz.MOBILE_W = 420;  /* below this, tools drop to a cheaper tier */

  Viz.reducedMotion = !!(window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  Viz.isMobile = function (w) {
    return (w || window.innerWidth || 0) < Viz.MOBILE_W;
  };

  /* ---------------------------------------------------------
     Viz.loop — the only supported way to animate.

     Owns running/raf/lastT/inView/tabHidden, the IntersectionObserver,
     the visibilitychange handler and the debounced resize, so that
     "never animate off-screen or in a background tab" is structural
     rather than something each tool must remember.

       opts.shouldRun  () => bool   is anything actually moving?
                                    (visibility is applied on top)
       opts.tick       (dt) => void advance state; omit if render-only
       opts.render     () => void   draw one frame  [required]
       opts.observe    Element      element whose visibility gates the
                                    loop [required]
       opts.resize     () => void   called debounced on window resize; must
                                    leave a correct frame (the runtime does
                                    not render again after it)
       opts.fps        number       frames per second; default Viz.FRAME_MS

     Returns a handle: { update, start, stop, isRunning(), destroy }.
       update()   call after ANY state change that could alter shouldRun();
                  re-evaluates and renders one final frame when halting, so
                  the static view stays correct. No-op once destroyed.
       start()    enforces the visibility gate itself, so the drag-start
                  shortcut cannot smuggle in an off-screen rAF.
       destroy()  disconnects the observer and removes both listeners.
     --------------------------------------------------------- */
  Viz.loop = function (opts) {
    if (!opts || typeof opts.render !== 'function') {
      throw new Error('Viz.loop: opts.render is required');
    }
    if (!opts.observe) {
      throw new Error('Viz.loop: opts.observe element is required');
    }

    var render = opts.render;
    var tick = typeof opts.tick === 'function' ? opts.tick : null;
    var userShould = typeof opts.shouldRun === 'function' ? opts.shouldRun : function () { return true; };
    var frameMs = opts.fps ? (1000 / opts.fps) : Viz.FRAME_MS;

    var running = false, raf = 0, lastT = 0;
    var inView = true, tabHidden = false;
    var destroyed = false;

    function shouldRun() {
      return !destroyed && inView && !tabHidden && !!userShould();
    }

    function frame(ts) {
      if (!running) return;
      if (ts - lastT < frameMs) { raf = window.requestAnimationFrame(frame); return; }
      var dt = lastT ? (ts - lastT) : frameMs;
      lastT = ts;
      if (tick) tick(dt);
      render();
      /* tick() may have ended the animation (e.g. integration done) */
      if (!shouldRun()) { stop(); render(); return; }
      raf = window.requestAnimationFrame(frame);
    }

    /* start() is part of the public handle, so it has to enforce rule 2 itself
       -- it used to check only `running || destroyed`, which meant a tool
       calling it directly (swsh does, on drag start) could kick off a rAF
       while the frame was scrolled out of view or the tab was hidden. frame()
       caught it one frame later, so the cost was small, but "never animate
       off-screen" was not actually guaranteed by the API that advertises this
       method. Nothing is lost by refusing: the observer calls update() when
       the element comes back, which starts the loop then. */
    function start() {
      if (running || destroyed || !inView || tabHidden) return;
      running = true; lastT = 0;
      raf = window.requestAnimationFrame(frame);
    }

    function stop() {
      running = false;
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    }

    /* The one entry point tools should call. Renders once when halting so the
       static frame stays correct -- but never after destroy(), or a stray
       call would paint through a torn-down tool. */
    function update() {
      if (destroyed) return;
      if (shouldRun()) start();
      else { stop(); render(); }
    }

    /* Every listener below is RETAINED so destroy() can undo it. They used to
       be anonymous and unreachable: destroy() set a flag and stopped the rAF,
       but the observer, the visibilitychange handler and the resize handler
       all stayed live, so a destroyed loop kept calling the tool's render()
       on every tab switch and every resize, and pinned its whole closure
       graph. Nothing calls destroy() on this site yet -- the docblock
       advertises it, so the first caller would have inherited that. */
    var io = null;
    if ('IntersectionObserver' in window) {
      io = new window.IntersectionObserver(function (es) {
        inView = es[0].isIntersecting;
        update();
      }, { threshold: 0.02 });
      io.observe(opts.observe);
    }

    function onVisibility() {
      tabHidden = document.hidden;
      update();
    }
    document.addEventListener('visibilitychange', onVisibility);

    /* Debounced: mobile browsers fire resize continuously while the
       URL bar collapses during scroll. */
    var rt = 0, onResize = null;
    if (typeof opts.resize === 'function') {
      onResize = function () {
        clearTimeout(rt);
        rt = setTimeout(function () {
          opts.resize();
          /* CONTRACT: opts.resize() must leave a correct frame on screen.
             Both tools end theirs with render(). This used to call update()
             here, which renders again whenever the loop is idle -- so every
             resize drew the same frame twice (three times in swsh, whose
             resize() also called updateRun()). Re-evaluate the run state
             without the extra paint. */
          if (shouldRun()) start(); else stop();
        }, 150);
      };
      window.addEventListener('resize', onResize);
    }

    return {
      update: update,
      start: start,
      stop: stop,
      isRunning: function () { return running; },
      destroy: function () {
        destroyed = true;
        stop();
        if (io) io.disconnect();
        document.removeEventListener('visibilitychange', onVisibility);
        if (onResize) window.removeEventListener('resize', onResize);
        clearTimeout(rt);
      }
    };
  };

  /* ---------------------------------------------------------
     Viz.seg — segmented button group.

     Replaces the hand-written
       [].forEach.call(this.children, function(x){ x.setAttribute(...) })
     block, which appeared four times across the first two tools.

       el  container with <button> children carrying data-* payloads
       cb  (button, dataset) => void, called on click

     Sets aria-pressed on the winner and clears it on the rest.
     Viz.seg.select(el, predicate) sets the pressed button
     programmatically without firing the callback.
     --------------------------------------------------------- */
  Viz.seg = function (el, cb) {
    if (!el) return;
    el.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b || b.parentNode !== el) return;
      press(el, b);
      if (cb) cb(b, b.dataset);
    });
  };

  function press(el, winner) {
    var kids = el.children;
    for (var i = 0; i < kids.length; i++) {
      kids[i].setAttribute('aria-pressed', kids[i] === winner);
    }
  }

  Viz.seg.select = function (el, predicate) {
    if (!el) return null;
    var kids = el.children, winner = null;
    for (var i = 0; i < kids.length; i++) {
      if (predicate(kids[i], kids[i].dataset)) { winner = kids[i]; break; }
    }
    if (winner) press(el, winner);
    return winner;
  };

  /* ---------------------------------------------------------
     Viz.canvas — DPR-capped backing-store sizing.

     Resolves the 1.5-vs-2 divergence between the first two tools
     to one site-wide cap. Sets the transform so all drawing code
     works in CSS pixels.

     Returns {w, h, dpr} in CSS pixels. Call from your resize().
     --------------------------------------------------------- */
  Viz.canvas = function (cv, ctx) {
    var dpr = Math.min(window.devicePixelRatio || 1, Viz.DPR_CAP);
    var w = cv.clientWidth, h = cv.clientHeight;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: w, h: h, dpr: dpr };
  };

  /* ---------------------------------------------------------
     Viz.autoHeight — tell the host page how tall we actually are.

     Hard-coded iframe heights cannot work here. Content height is
     driven by how the control rows WRAP, which is not monotonic in
     viewport width: the geodesic tool measured 1076px at 320 wide,
     931px at 430, 866px at 600 and 692px at 700. Every fixed number
     clips at some width, and the tools are exactly the kind of thing
     people open on a phone.

     So the embedded page measures itself and posts the height up;
     index.html applies it. Same-origin postMessage, no fetch, no
     dependency -- the self-contained rule is about what the visitor's
     browser downloads, and this downloads nothing.

     The CSS heights stay as the floor: if script is off or the message
     never arrives, the page renders exactly as before.
     --------------------------------------------------------- */
  Viz.autoHeight = function () {
    if (window.parent === window) return;   /* standalone: nothing to tell */
    var last = 0, pending = 0;
    function send() {
      pending = 0;
      /* BODY only. documentElement.scrollHeight is clamped to at least the
         viewport -- inside an iframe that is the iframe's own height, so
         including it makes the reported height a ratchet: it can grow but
         never shrink, and the frame stays stuck at whatever the CSS floor
         was (356px of dead space under the geodesic tool at 700px wide).
         The body box is auto-sized to its content and has no such floor.
         Safe here because the embed panel heights are fixed in px -- if a
         tool ever sizes a panel in vh, shrinking the frame would feed back
         into the measurement. */
      var b = document.body;
      var h = Math.ceil(Math.max(b.scrollHeight, b.offsetHeight,
                                 b.getBoundingClientRect().height));
      if (h && Math.abs(h - last) > 1) {
        last = h;
        try { window.parent.postMessage({ type: 'viz-height', h: h }, location.origin); }
        catch (e) { /* host on another origin: it keeps its CSS height */ }
      }
    }
    function schedule() { if (!pending) pending = setTimeout(send, 60); }
    if (window.ResizeObserver) {
      /* Catches control rows re-wrapping, which plain resize events miss. */
      new window.ResizeObserver(schedule).observe(document.body);
    }
    window.addEventListener('resize', schedule);
    window.addEventListener('load', schedule);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
    schedule();
  };

  window.Viz = Viz;
})(window, document);
