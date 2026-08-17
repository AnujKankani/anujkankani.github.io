#!/usr/bin/env node
/* Regression tests for the interactive tools.

   Started as physics-only and outgrew that. Every review round has found
   its bugs in the layer BETWEEN the physics and the screen -- a preset
   that silently flips the sign of m, an axis that frames the wrong band,
   a CSS rule that loses on specificity -- so the suite now covers:

     physics      closed forms, landmarks, numerical identities
     UI state     presets and sliders driven through loadUI()
     input        drag handling, including the per-gesture axis lock
     rendering    axis framing, projection, orientation triad
     layout       the embed auto-height contract, load-bearing CSS
     budget       gzipped size and no allocation in the hot path
     build        that the pages match tools/_shared.* (shells out to
                  build.py --check; the suite reads _shared.js directly,
                  so without this it stays green over a stale page)
     figure       the hero SVG and its CSS animation, including that the
                  delays baked into the pasted figure re-derive from the
                  generator's constants

   It exercises the ACTUAL functions inlined in the tool pages (via
   tools/extract.js), not copies, wherever they can be called -- which
   since the 2026-08-15 pure-function refactor is everywhere in the
   geodesic physics. Where the thing under test is markup or CSS it
   matches source text, and those matches are scoped to the relevant RULE
   BODY or function, with comments stripped.

   THE RECURRING FAILURE HERE IS A CHECK THAT CANNOT FAIL, and it has
   taken several forms: a suite that re-derived the formula it was
   "testing" and passed with the tool file deleted; assertions that were
   arithmetic on the test's own constants (Math.sqrt(12)**2 === 12); a
   regex broad enough to match prose in a comment; a predicate counting
   call sites that also matched the declaration; a touch test using
   perfectly axis-aligned drags, which passed with the feature deleted.
   Two habits catch these: MUTATE THE SHIPPED CODE (not the test's copy)
   and confirm the check goes red, and try deleting the file under test
   to see what still passes.

   Usage:
     node tools/test.js          # run all
     node tools/test.js swsh     # run suites matching a substring

   No dependencies. Requires the website_env conda env for node:
     /home/anuj/anaconda3/envs/website_env/bin/node tools/test.js

   See TOOLS.md "Physics rules" for the conventions being checked.
*/
'use strict';

const { loadTool, loadUI, ROOT } = require('./extract.js');

/* ---------------- tiny test harness ---------------- */
let passed = 0, failed = 0, suiteName = '';
const failures = [];

function suite(name, fn) {
  const filter = process.argv[2];
  if (filter && !name.toLowerCase().includes(filter.toLowerCase())) return;
  suiteName = name;
  console.log('\n\x1b[1m' + name + '\x1b[0m');
  fn();
}

function ok(label, cond, detail) {
  if (cond) { passed++; console.log('  \x1b[32m✓\x1b[0m ' + label); }
  else {
    failed++;
    failures.push(suiteName + ' :: ' + label + (detail ? '\n      ' + detail : ''));
    console.log('  \x1b[31m✗ ' + label + '\x1b[0m' + (detail ? '\n      ' + detail : ''));
  }
}

function close(label, got, want, tol) {
  tol = tol === undefined ? 1e-10 : tol;
  const d = Math.abs(got - want);
  ok(label, d <= tol, `got ${got}  want ${want}  |Δ|=${d.toExponential(3)} tol=${tol}`);
}

/* ==================================================================
   Spin-weighted spherical harmonics
   Closed forms from the standard s=-2 expressions; see TOOLS.md.
   ================================================================== */
suite('swsh-visualizer :: -2Y_lm closed forms', () => {
  const { swsh } = loadTool('swsh-visualizer.html', ['swsh']);
  const mag = (v) => Math.hypot(v[0], v[1]);
  const PI = Math.PI;

  // -2Y_22(th,ph) = sqrt(5/64pi) (1+cos th)^2 e^{2i ph}
  const y22 = (th) => Math.sqrt(5 / (64 * PI)) * Math.pow(1 + Math.cos(th), 2);
  [0.3, PI / 2, 1.9, 2.7].forEach((th) => {
    close(`-2Y22 magnitude at th=${th.toFixed(2)}`, mag(swsh(-2, 2, 2, th, 0)), y22(th), 1e-12);
  });

  // -2Y_2-2(th,ph) = sqrt(5/64pi) (1-cos th)^2 e^{-2i ph}
  const y2m2 = (th) => Math.sqrt(5 / (64 * PI)) * Math.pow(1 - Math.cos(th), 2);
  [0.4, PI / 2, 2.2].forEach((th) => {
    close(`-2Y2-2 magnitude at th=${th.toFixed(2)}`, mag(swsh(-2, 2, -2, th, 0)), y2m2(th), 1e-12);
  });

  // -2Y_20(th) = sqrt(15/32pi) sin^2(th)
  const y20 = (th) => Math.sqrt(15 / (32 * PI)) * Math.pow(Math.sin(th), 2);
  [0.5, PI / 2, 2.0].forEach((th) => {
    close(`-2Y20 magnitude at th=${th.toFixed(2)}`, mag(swsh(-2, 2, 0, th, 0)), y20(th), 1e-12);
  });

  /* Azimuthal dependence must be exactly e^{i m ph}.
     Use the SIGNED amplitude at ph=0, not |Y|: for odd l+m the real
     amplitude is negative (Condon-Shortley (-1)^m phase), so comparing
     against a magnitude fails by exactly -1. */
  [[3, 3], [2, 2], [5, 5], [4, 2]].forEach(([l, m]) => {
    const th = 1.1, ph = 0.7;
    const a0 = swsh(-2, l, m, th, 0)[0];   // signed, imag part is 0 at ph=0
    const v = swsh(-2, l, m, th, ph);
    close(`e^{imph} real part (l=${l},m=${m})`, v[0], a0 * Math.cos(m * ph), 1e-12);
    close(`e^{imph} imag part (l=${l},m=${m})`, v[1], a0 * Math.sin(m * ph), 1e-12);
  });

  /* Lock in the Condon-Shortley phase itself, so a future refactor
     that drops the (-1)^m prefactor fails loudly. */
  ok('(-1)^m phase: l=3,m=3 negative at ph=0', swsh(-2, 3, 3, 1.1, 0)[0] < 0);
  ok('(-1)^m phase: l=2,m=2 positive at ph=0', swsh(-2, 2, 2, 1.1, 0)[0] > 0);

  // -2Y_22 vanishes at the south pole, -2Y_2-2 at the north pole.
  close('-2Y22 -> 0 at th=pi', mag(swsh(-2, 2, 2, PI - 1e-7, 0)), 0, 1e-12);
  close('-2Y2-2 -> 0 at th=0', mag(swsh(-2, 2, -2, 1e-7, 0)), 0, 1e-12);
});

suite('swsh-visualizer :: orthonormality', () => {
  const { swsh } = loadTool('swsh-visualizer.html', ['swsh']);
  const PI = Math.PI;

  /* <lm|l'm'> = int conj(Y_lm) Y_l'm' dOmega = delta.
     Gauss-Legendre would be tighter, but a fine midpoint grid in
     cos(theta) is adequate at 1e-6 and keeps this dependency-free.
     The phi integral is exact for these integrands via orthogonality
     of e^{i m phi} on a uniform grid, so only theta needs resolution. */
  const NT = 4000;
  function overlap(l1, m1, l2, m2) {
    if (m1 !== m2) return 0; // phi integral kills it exactly
    let s = 0;
    for (let i = 0; i < NT; i++) {
      const u = -1 + (i + 0.5) * (2 / NT);      // midpoint in cos(theta)
      const th = Math.acos(u);
      const a = swsh(-2, l1, m1, th, 0);
      const b = swsh(-2, l2, m2, th, 0);
      s += (a[0] * b[0] + a[1] * b[1]) * (2 / NT);
    }
    return s * 2 * PI;
  }

  close('<2,2|2,2> = 1', overlap(2, 2, 2, 2), 1, 1e-6);
  close('<3,3|3,3> = 1', overlap(3, 3, 3, 3), 1, 1e-6);
  close('<4,2|4,2> = 1', overlap(4, 2, 4, 2), 1, 1e-6);
  close('<2,2|3,2> = 0', overlap(2, 2, 3, 2), 0, 1e-6);
  close('<2,2|4,2> = 0', overlap(2, 2, 4, 2), 0, 1e-6);
  close('<3,1|5,1> = 0', overlap(3, 1, 5, 1), 0, 1e-6);
});

/* ==================================================================
   Schwarzschild geodesics -- landmark values must be exact.
   Geometrized units, G = c = M = 1. See TOOLS.md "Physics rules".
   ================================================================== */
suite('geodesic-explorer :: Schwarzschild landmarks', () => {
  const PI = Math.PI;

  /* These bind the SHIPPED Kerr functions at a = 0, which is Schwarzschild.
     They used to be local re-derivations, because Veff/accel closed over
     module-level mu/L and could not be probed from outside -- so this whole
     suite asserted the test's own arithmetic and passed with the tool file
     DELETED (verified: "all 14 checks passed" with geodesic-explorer.html
     moved out of the tree). The pure forms exist now; use them. */
  const g = loadTool('geodesic-explorer.html', ['veffOf', 'accelOf', 'rISCO']);
  const Veff = (r, mu, L) => g.veffOf(r, mu, L, 0, 1);
  const accel = (r, mu, L) => g.accelOf(r, mu, L, 0, 1);

  // ISCO at r=6M: circular orbit needs L^2 = r^2 M/(r-3M) -> L^2=12 at r=6.
  const Lisco = Math.sqrt(12);
  close('shipped rISCO is 6M at a=0', g.rISCO(0, true), 6, 1e-9);
  close('accel vanishes at r=6M for L_isco', accel(6, 1, Lisco), 0, 1e-12);

  // L = sqrt(12) is the minimum for a stable circular orbit.
  ok('no circular orbit below ISCO L', (() => {
    // dVeff/dr = 0 has no root for r>6 when L < sqrt(12)
    const L = Math.sqrt(11.9);
    for (let r = 6; r < 60; r += 0.01) {
      if (Math.abs(accel(r, 1, L)) < 1e-6) return false;
    }
    return true;
  })());

  // Photon sphere at r=3M: for mu=0, accel = L^2/r^3 - 3L^2/r^4 = 0 -> r=3.
  close('photon sphere: accel(3) = 0 for mu=0', accel(3, 0, 4), 0, 1e-12);
  ok('photon sphere is the only root', Math.abs(accel(2.9, 0, 4)) > 1e-6 &&
                                       Math.abs(accel(3.1, 0, 4)) > 1e-6);

  // Critical impact parameter b = 3*sqrt(3) M ~= 5.196.
  const bcrit = 3 * Math.sqrt(3);
  close('shipped bCrit is 3sqrt(3) at a=0',
    loadTool('geodesic-explorer.html', ['bCrit']).bCrit(0, true), bcrit, 1e-9);
  // Peak of the photon effective potential sits at r=3M with V = 1/b_crit^2.
  close('V_photon peak = 1/b_crit^2', Veff(3, 0, 1) / 1, 1 / (bcrit * bcrit), 1e-12);

  // Horizon: Veff vanishes at r=2M for any L.
  [0, 1].forEach((mu) => {
    [3, 4.6, 8].forEach((L) => {
      close(`Veff(2M)=0  (mu=${mu}, L=${L})`, Veff(2, mu, L), 0, 1e-12);
    });
  });

  // Newtonian limit: far from the hole, Veff -> mu - 2mu/r + L^2/r^2.
  const r = 5000, L = 4;
  close('Veff -> Newtonian at large r',
    Veff(r, 1, L), 1 - 2 / r + L * L / (r * r) - 2 * L * L / (r * r * r), 1e-9);
});

suite('geodesic-explorer :: Schwarzschild limit still holds', () => {
  /* The page now implements equatorial KERR, so the old source-regex
     guards for the Schwarzschild-only expressions no longer apply --
     the Kerr forms are pinned by the "Kerr dynamics" suite instead.
     What still must hold is that a = 0 reproduces Schwarzschild
     exactly, which is checked here numerically rather than textually. */
  const g = loadTool('geodesic-explorer.html',
    ['rHorizon', 'veffOf', 'accelOf']);

  /* The SHIPPED Kerr forms, evaluated at a = 0 and compared against the
     Schwarzschild closed forms written out longhand below. These were local
     re-derivations until 2026-08-15, which made two of this suite's three
     checks compare the test's arithmetic to the test's arithmetic. */
  const VeffK = (r, a, E, L, mu) => g.veffOf(r, mu, L, a, E);
  const accelK = (r, a, E, L, mu) => g.accelOf(r, mu, L, a, E);

  let worstV = 0, worstA = 0;
  [[1, 4.6], [1, 3.0], [0, 5.2]].forEach(([mu, L]) => {
    for (let r = 2.5; r < 40; r += 0.25) {
      worstV = Math.max(worstV,
        Math.abs(VeffK(r, 0, 1, L, mu) - (1 - 2 / r) * (mu + L * L / (r * r))));
      worstA = Math.max(worstA,
        Math.abs(accelK(r, 0, 1, L, mu)
                 - (-mu / (r * r) + L * L / (r ** 3) - 3 * L * L / (r ** 4))));
    }
  });
  ok(`a=0 Veff equals (1-2/r)(mu + L^2/r^2) (max dev ${worstV.toExponential(1)})`,
    worstV < 1e-13);
  ok(`a=0 accel keeps the -3L^2/r^4 term (max dev ${worstA.toExponential(1)})`,
    worstA < 1e-13);
  close('a=0 horizon is r=2M', g.rHorizon(0), 2, 1e-12);
});

/* ==================================================================
   Shared runtime invariants
   ================================================================== */
/* Caps, the embed auto-height contract, and the touch-target floor -- the
   parts of the shared runtime and stylesheet whose failure is silent. */
suite('shared runtime :: caps, embed contract, touch targets', () => {
  const fs = require('fs');
  const path = require('path');
  const js = fs.readFileSync(path.join(__dirname, '_shared.js'), 'utf8');
  ok('FRAME_MS = 32 (~30fps)', /Viz\.FRAME_MS\s*=\s*32/.test(js));
  ok('DPR_CAP = 2', /Viz\.DPR_CAP\s*=\s*2/.test(js));
  ok('MOBILE_W = 420', /Viz\.MOBILE_W\s*=\s*420/.test(js));
  ok('loop ANDs in visibility (cannot be bypassed)',
    /inView\s*&&\s*!tabHidden/.test(js));
  ok('loop requires an observe element',
    /opts\.observe.*required|required.*observe/s.test(js));

  /* ---- embed auto-height ----
     Fixed iframe heights cannot work: content height depends on how the
     control rows wrap, which is not monotonic in width (geodesic measured
     1076px at 320 wide, 931 at 430, 866 at 600, 692 at 700). Before this,
     every phone width clipped the geodesic tool's bottom control row --
     146px cut at 390, 236px at 320 -- and swsh clipped at 430 and at 700. */
  const css = fs.readFileSync(path.join(__dirname, '_shared.css'), 'utf8');
  ok('Viz.autoHeight exists', /Viz\.autoHeight\s*=\s*function/.test(js));
  ok('autoHeight is a no-op when not embedded',
    /if\s*\(window\.parent === window\)\s*return/.test(js));
  ok('autoHeight posts same-origin only',
    /postMessage\([^)]*location\.origin\)/.test(js));
  ok('autoHeight watches body size, not just window resize',
    /ResizeObserver/.test(js) && /observe\(document\.body\)/.test(js));
  /* documentElement.scrollHeight is clamped to at least the viewport, which
     inside an iframe is the frame's own height. Including it turns the
     reported height into a ratchet -- it grows but never shrinks, pinning the
     frame at the CSS floor (356px of dead space under the geodesic tool at
     700px wide, while nothing was clipped, so it looked fine at a glance). */
  {
    /* Anchored on the ASSIGNMENT, not the name: the file header lists
       `Viz.autoHeight()` in its API summary, and an unanchored match starts
       there and captures an unrelated function. */
    const body = /Viz\.autoHeight = function[\s\S]*?\n  \};/.exec(js);
    /* Strip comments first: the comment above this very code explains the
       documentElement trap by name, and a raw match finds that prose instead
       of the declaration. (Second time this bit -- see the swsh vertical-rail
       CSS test, which matched its own comment too.) */
    const code = body
      ? body[0].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
      : '';
    ok('autoHeight measures the body box, not the clamped documentElement',
      !!body &&
      !/documentElement/.test(code) &&
      /getBoundingClientRect\(\)\.height/.test(code));
  }

  const root = path.resolve(__dirname, '..');
  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  /* Scope to the LISTENER BODY, not the whole file. These three ran against
     all of index.html, so a comment anywhere in it that happened to quote
     `e.origin !== location.origin` would satisfy the check -- the exact trap
     this file's own header warns about twice, and the one that has bitten the
     social-preview suite three times. Nothing matched by accident today; the
     defect was that it could. */
  const listener = (function(){
    const i = home.indexOf("addEventListener('message'");
    if (i < 0) return '';
    const j = home.indexOf('})();', i);
    /* Strip comments too. Scoping to the listener is not enough on its own:
       replacing the origin gate with a comment that MENTIONS it still passed,
       because the comment lives inside the same block. Match code only. */
    return (j < 0 ? home.slice(i) : home.slice(i, j))
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
  })();
  ok('found the host message listener', listener.length > 100);
  ok('host validates message origin',
    /e\.origin !== location\.origin/.test(listener));
  ok('host matches the sending frame by contentWindow',
    /contentWindow === e\.source/.test(listener));
  ok('host bounds the height it will accept', /h > 4000/.test(listener));
  ['swsh-visualizer.html', 'geodesic-explorer.html'].forEach((f) => {
    ok(`${f} calls Viz.autoHeight()`,
      /Viz\.autoHeight\(\)/.test(fs.readFileSync(path.join(root, f), 'utf8')));
  });

  /* The coarse-pointer height bump MUST stay scoped to .row sliders. The
     geodesic zoom rail is positioned with top AND bottom; adding height to
     it over-constrains the box and collapses the rail to 44px at the top. */
  ok('touch height bump is scoped to .row sliders',
    /\.row input\[type=range\]\{height:44px/.test(css) &&
    !/^\s*input\[type=range\]\{height:44px/m.test(css));
  ok('touch targets meet the 44px floor', /min-height:44px/.test(css));
});

/* ==================================================================
   Viz.loop lifecycle -- golden rules 2-5 must hold structurally.
   Drives the real runtime with a fake rAF/observer/visibility.
   ================================================================== */
suite('shared runtime :: shipped pages match tools/_shared.*', () => {
  /* Every runtime assertion in this file reads tools/_shared.js DIRECTLY, so
     the whole suite passes while the deployed pages carry a stale inlined
     copy. Measured: edit _shared.js without rebuilding and you get
     "all checks passed" from here and "STALE ... exit 1" from build.py. With
     no CI, the one command run before pushing has to notice.

     Shell out to build.py rather than reimplementing its formatting here: a
     JS copy of the banner-and-indent transform would be a second source of
     truth, and the failure mode of getting it subtly wrong is a check that
     fails on formatting instead of on staleness. python3 is not optional in
     this repo -- it is the build step and the dev server -- so a missing
     interpreter is a real failure, not a reason to skip. */
  const { spawnSync } = require('child_process');
  const path = require('path');
  const root = path.resolve(__dirname, '..');
  const r = spawnSync('python3', [path.join(root, 'tools/build.py'), '--check'],
    { cwd: root, encoding: 'utf8' });
  const out = ((r.stdout || '') + (r.stderr || '')).trim().split('\n').pop();
  ok(`tools/build.py --check is clean (${r.error ? r.error.code : out})`,
    !r.error && r.status === 0);
});

suite('shared runtime :: Viz.loop enforces the golden rules', () => {
  const vm = require('vm');
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '_shared.js'), 'utf8');

  function harness() {
    let rafQ = [], observerCb = null, visCb = null, resizeCb = null, timers = [];
    /* Listener bookkeeping: destroy() has to give every one of these back,
       and the only way to prove it is to count. */
    const live = { win: 0, doc: 0, observers: 0 };
    const sb = {
      window: {
        matchMedia: () => ({ matches: false }),
        devicePixelRatio: 1, innerWidth: 900,
        requestAnimationFrame: (f) => { rafQ.push(f); return rafQ.length; },
        cancelAnimationFrame: () => { rafQ = []; },
        addEventListener: (t, cb) => { live.win++; if (t === 'resize') resizeCb = cb; },
        removeEventListener: () => { live.win--; },
        IntersectionObserver: function (cb) {
          observerCb = cb; live.observers++;
          return { observe: () => {}, disconnect: () => { live.observers--; } };
        }
      },
      document: {
        addEventListener: (t, cb) => { if (t === 'visibilitychange') visCb = cb; live.doc++; },
        removeEventListener: () => { live.doc--; },
        hidden: false
      },
      Math, console,
      /* Run the debounce synchronously so a test can drive the resize path. */
      setTimeout: (f) => { timers.push(f); return timers.length; },
      clearTimeout: () => {}
    };
    sb.window.window = sb.window;
    sb.globalThis = sb;
    vm.createContext(sb);
    vm.runInContext(src, sb);
    let t = 0;
    return {
      Viz: sb.window.Viz,
      pump(n) { for (let i = 0; i < n; i++) { const q = rafQ; rafQ = []; q.forEach((f) => f(t += 100)); } },
      scrollOff() { observerCb([{ isIntersecting: false }]); },
      scrollOn() { observerCb([{ isIntersecting: true }]); },
      hideTab() { sb.document.hidden = true; visCb(); },
      showTab() { sb.document.hidden = false; visCb(); },
      live,
      fireVis() { visCb(); },
      fireResize() { if (resizeCb) resizeCb(); const q = timers; timers = []; q.forEach((f) => f()); }
    };
  }

  const H = harness();
  let ticks = 0, moving = true;
  const h = H.Viz.loop({
    observe: {}, shouldRun: () => moving,
    tick: () => { ticks++; }, render: () => {}
  });

  h.update(); H.pump(5);
  ok('runs while visible and moving', h.isRunning() && ticks === 5);

  H.scrollOff();
  let t0 = ticks; H.pump(5);
  ok('rule 2: halts when scrolled off-screen', !h.isRunning() && ticks === t0);

  H.scrollOn(); H.pump(2);
  ok('resumes when scrolled back on-screen', h.isRunning());

  H.hideTab();
  t0 = ticks; H.pump(5);
  ok('rule 2: halts when the tab is backgrounded', !h.isRunning() && ticks === t0);
  H.showTab(); H.pump(2);

  moving = false; h.update();
  t0 = ticks; H.pump(5);
  ok('rule 3: halts when nothing is moving', !h.isRunning() && ticks === t0);

  /* The geodesic case: tick() ends the animation part-way through. */
  let done = false, n = 0;
  const h2 = H.Viz.loop({
    observe: {}, shouldRun: () => !done,
    tick: () => { n++; if (n === 3) done = true; }, render: () => {}
  });
  h2.update(); H.pump(20);
  ok('halts when tick() ends the animation mid-flight', !h2.isRunning() && n === 3);

  /* Misuse must fail loudly rather than silently animating forever. */
  let threw = 0;
  try { H.Viz.loop({ observe: {} }); } catch (e) { threw++; }
  try { H.Viz.loop({ render: () => {} }); } catch (e) { threw++; }
  ok('throws without render or observe', threw === 2);

  /* start() is public, so it must enforce rule 2 on its own. It used to check
     only running/destroyed, letting a tool that calls it directly (swsh, on
     drag start) begin a rAF while off-screen or backgrounded. */
  {
    const V = harness();
    let painted = 0;
    const h4 = V.Viz.loop({
      observe: {}, shouldRun: () => true, render: () => { painted++; }
    });
    V.scrollOff();
    const p0 = painted;
    h4.start();
    V.pump(3);
    ok('start() refuses while off-screen', !h4.isRunning() && painted === p0);
    V.scrollOn();
    h4.start(); V.pump(1);
    ok('start() works again once visible', h4.isRunning());
    h4.destroy();
  }

  /* One paint per debounced resize. opts.resize() leaves the frame; the
     runtime only re-evaluates the run state after it. */
  {
    const R = harness();
    let painted = 0, resized = 0;
    const h5 = R.Viz.loop({
      observe: {}, shouldRun: () => false,
      render: () => { painted++; },
      resize: () => { resized++; painted++; }
    });
    h5.update();
    const p0 = painted;
    R.fireResize();
    ok(`resize paints once, not twice (${painted - p0} paint(s))`,
      resized === 1 && painted - p0 === 1);
    h5.destroy();
  }

  /* destroy() must give back everything the loop took. It used to set a flag
     and cancel the rAF while leaving the IntersectionObserver, the
     visibilitychange handler and the resize handler live -- so a destroyed
     loop kept calling the tool's render() on every tab switch and resize, and
     held its whole closure graph alive. Nothing on this site calls destroy()
     yet; the docblock advertises it, so the first caller would have paid. */
  {
    const D = harness();
    let renders = 0;
    const before = { ...D.live };
    const h3 = D.Viz.loop({
      observe: {}, shouldRun: () => true,
      render: () => { renders++; }, resize: () => {}
    });
    ok('loop takes listeners while alive',
      D.live.observers === before.observers + 1 &&
      D.live.doc === before.doc + 1 && D.live.win === before.win + 1);

    h3.destroy();
    ok('destroy() releases observer and both listeners',
      D.live.observers === before.observers &&
      D.live.doc === before.doc && D.live.win === before.win);

    const r0 = renders;
    D.fireVis();
    h3.update();
    D.pump(5);
    ok('a destroyed loop neither renders nor restarts',
      renders === r0 && !h3.isRunning());
  }
});

/* ==================================================================
   Geodesic widget: claims that must match the code's behaviour.
   Guards fixes from a derivation review -- the maths was correct but
   the status message and the note text asserted false physics.
   ================================================================== */
/* ==================================================================
   Equatorial Kerr. Exercises the page's OWN functions (loaded via the
   vm sandbox), not re-derived copies. Reference values are Bardeen,
   Press & Teukolsky (1972).
   ================================================================== */
suite('geodesic-explorer :: Kerr landmarks', () => {
  const g = loadTool('geodesic-explorer.html',
    ['rHorizon', 'rPhoton', 'rISCO', 'circEL', 'energyAtRest']);

  /* Every Kerr formula must collapse to Schwarzschild at a = 0. This is
     the single most valuable check: it ties the new code to the old,
     already-verified behaviour. */
  close('a=0: horizon -> 2M', g.rHorizon(0), 2, 1e-12);
  close('a=0: photon sphere (pro) -> 3M', g.rPhoton(0, true), 3, 1e-9);
  close('a=0: photon sphere (ret) -> 3M', g.rPhoton(0, false), 3, 1e-9);
  close('a=0: ISCO (pro) -> 6M', g.rISCO(0, true), 6, 1e-9);
  close('a=0: ISCO (ret) -> 6M', g.rISCO(0, false), 6, 1e-9);

  /* BPT reference values at a = 0.9 and extremal-ish spin. */
  close('a=0.9: horizon = 1 + sqrt(1-a^2)', g.rHorizon(0.9), 1.43589, 1e-4);
  close('a=0.9: prograde photon orbit', g.rPhoton(0.9, true), 1.55785, 1e-4);
  close('a=0.9: retrograde photon orbit', g.rPhoton(0.9, false), 3.91034, 1e-4);
  close('a=0.9: prograde ISCO', g.rISCO(0.9, true), 2.32088, 1e-4);
  close('a=0.9: retrograde ISCO', g.rISCO(0.9, false), 8.71735, 1e-4);
  close('a=0.998: prograde ISCO', g.rISCO(0.998, true), 1.23697, 1e-4);

  /* Extremal limits: r_h, r_ph(pro) and ISCO(pro) all -> M as a -> 1. */
  ok('a->1: horizon, photon orbit and prograde ISCO all approach M',
    Math.abs(g.rHorizon(1) - 1) < 1e-9 &&
    Math.abs(g.rPhoton(1, true) - 1) < 1e-9 &&
    Math.abs(g.rISCO(1, true) - 1) < 1e-6);

  /* Prograde orbits sit closer in than retrograde, for any a > 0. */
  let ordered = true;
  for (let a = 0.05; a < 1.0; a += 0.05) {
    if (!(g.rISCO(a, true) < g.rISCO(a, false)) ||
        !(g.rPhoton(a, true) < g.rPhoton(a, false)) ||
        !(g.rHorizon(a) < g.rPhoton(a, true))) ordered = false;
  }
  ok('prograde < retrograde, and horizon < photon orbit, for all a', ordered);

  /* Circular-orbit E, L at a=0 must match the Schwarzschild closed forms. */
  [8, 12, 20].forEach((r) => {
    const [E, L] = g.circEL(r, 0, true);
    close(`a=0 circular E at r=${r}`, E, (1 - 2 / r) / Math.sqrt(1 - 3 / r), 1e-10);
    close(`a=0 circular L at r=${r}`, L, Math.sqrt(r) / Math.sqrt(1 - 3 / r), 1e-10);
  });

  /* ISCO energy at a=0 is the textbook sqrt(8/9). */
  close('a=0: E_ISCO = sqrt(8/9)',
    g.circEL(6, 0, true)[0], Math.sqrt(8 / 9), 1e-9);
});

suite('geodesic-explorer :: Kerr dynamics', () => {
  const g = loadTool('geodesic-explorer.html',
    ['Veff', 'accel', 'dphidtau', 'energyAtRest', 'circEL',
     'rISCO', 'rHorizon', 'rPhoton', 'bCrit',
     'veffOf', 'accelOf', 'dphidtauOf', 'deltaOf']);
  const src = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'geodesic-explorer.html'), 'utf8');

  /* Binds the SHIPPED functions at an arbitrary state. These used to close
     over module-level mu/L/aSpin/Efix, so they could only be probed at
     whatever state the UI was in -- the suite carried a reimplementation and
     pinned the shipped code with a source regex instead, which tested the
     text rather than the arithmetic. The page now exposes pure forms and
     these are they, so every assertion below is against real code. */
  function mk(a, E, L, mu) {
    return {
      Veff: (r) => g.veffOf(r, mu, L, a, E),
      accel: (r) => g.accelOf(r, mu, L, a, E),
      dphi: (r) => g.dphidtauOf(r, L, a, E)
    };
  }

  ok('pure physics forms are exported',
    typeof g.veffOf === 'function' && typeof g.accelOf === 'function' &&
    typeof g.dphidtauOf === 'function' && typeof g.deltaOf === 'function');

  /* The one-arg wrappers are the only thing the tool itself calls, so the
     assertions above are worth nothing unless the wrappers really do forward
     the CURRENT module state. Drive the live UI to several states and compare
     both paths -- this is the seam the refactor introduced, and the only way
     the shipped tool could now disagree with what is tested. */
  {
    const ui = loadUI('geodesic-explorer.html');
    const sb = ui.sb;
    let worstW = 0;
    [[0, 4.6, 1, 1], [0.9, 4.6, 1, 0.97], [0.35, 5.2, 0, 1], [0.99, 3.1, 1, 0.94]]
      .forEach(([a, Lz, m, E]) => {
        sb.aSpin = a; sb.L = Lz; sb.mu = m; sb.Efix = E;
        for (let r = 2.2; r < 40; r += 0.37) {
          worstW = Math.max(worstW,
            Math.abs(sb.Veff(r) - sb.veffOf(r, m, Lz, a, E)),
            Math.abs(sb.accel(r) - sb.accelOf(r, m, Lz, a, E)),
            Math.abs(sb.dphidtau(r) - sb.dphidtauOf(r, Lz, a, E)));
        }
      });
    ok(`wrappers forward live module state (max dev ${worstW.toExponential(1)})`,
      worstW === 0);
  }

  /* accel must be exactly -(1/2) dVeff/dr, for any spin. */
  let worstD = 0;
  [[0, 1, 4.6, 1], [0.9, 0.98, 4.6, 1], [-0.9, 0.97, 4.6, 1],
   [0.5, 1, 5.2, 0]].forEach(([a, E, L, mu]) => {
    const f = mk(a, E, L, mu), h = 1e-6;
    for (let r = 3; r < 30; r += 0.5) {
      const num = -(f.Veff(r + h) - f.Veff(r - h)) / (4 * h);
      worstD = Math.max(worstD, Math.abs(num - f.accel(r)));
    }
  });
  ok(`accel = -(1/2) dVeff/dr at all spins (max dev ${worstD.toExponential(1)})`,
    worstD < 1e-6);

  /* a=0 must reproduce the Schwarzschild expressions exactly. */
  let worstS = 0;
  const f0 = mk(0, 0.96, 4.6, 1);
  for (let r = 2.5; r < 40; r += 0.25) {
    worstS = Math.max(worstS,
      Math.abs(f0.Veff(r) - (1 - 2 / r) * (1 + 4.6 * 4.6 / (r * r))),
      Math.abs(f0.dphi(r) - 4.6 / (r * r)));
  }
  ok(`a=0 Kerr reduces to Schwarzschild (max dev ${worstS.toExponential(1)})`,
    worstS < 1e-12);

  /* Release-from-rest energy solves the implicit condition E^2 = Veff(r0;E). */
  let worstE = 0;
  [[0, 4.6, 12], [0.9, 4.6, 12], [-0.9, 4.6, 12], [0.5, 5.2, 20]]
    .forEach(([a, L, r0]) => {
      const E = g.energyAtRest(r0, a, L, 1);
      worstE = Math.max(worstE, Math.abs(E * E - mk(a, E, L, 1).Veff(r0)));
    });
  ok(`energyAtRest solves E^2 = Veff(r0;E) (max residual ${worstE.toExponential(1)})`,
    worstE < 1e-12);

  /* The circular-orbit E,L really give a circular orbit: accel(r) = 0. */
  let worstC = 0;
  [[0, 8.24], [0.9, 5.0], [0.9, 3.0], [-0.9, 10.0], [0.5, 6.0]]
    .forEach(([a, r]) => {
      const [E, L] = g.circEL(r, a, true);
      worstC = Math.max(worstC, Math.abs(mk(a, E, L, 1).accel(r)));
    });
  ok(`circEL gives accel(r)=0, i.e. genuinely circular (max ${worstC.toExponential(1)})`,
    worstC < 1e-9);

  /* The ISCO is marginally stable: d^2Veff/dr^2 = 0 there.
     NOTE the NEGATIVE spins. The original suite tested a >= 0 only, which
     is exactly why the prograde/retrograde sign bug survived: rISCO is EVEN
     in a, so with signed a and pro=L>=0 the marker and the dynamics agreed
     by construction for a > 0 and disagreed for a < 0. Passing |a| with
     pro = sign(a*L) is what makes both halves consistent. */
  [0, 0.5, 0.9, -0.5, -0.9].forEach((a) => {
    const aA = Math.abs(a), pro = true;      // co-rotating branch
    const r = g.rISCO(aA, pro), [E, L0] = g.circEL(r, aA, pro);
    // For a < 0 the co-rotating orbit has L < 0 in the signed convention.
    const L = a < 0 ? -L0 : L0;
    const f = mk(a, E, L, 1), h = 1e-4;
    const d2 = (f.Veff(r + h) - 2 * f.Veff(r) + f.Veff(r - h)) / (h * h);
    ok(`ISCO marginally stable at a=${a} (V'' = ${d2.toExponential(1)})`,
      Math.abs(d2) < 2e-4);
  });

  /* The spin slider is now a >= 0 and the orbit sense is an explicit UI
     toggle (S.pro), so the markers and the dynamics read the SAME flag and
     cannot disagree. That is a structural fix for the earlier bug, where a
     sign(a*L) inference in the renderer diverged from the landmark call. */
  ok('spin slider is non-negative',
    /id="slA" min="0" max="0\.99"/.test(src));
  ok('renderer takes the orbit sense from S.pro, not from a sign inference',
    /var pro = S\.pro, aAbs = aSpin/.test(src) &&
    /var proP = S\.pro, aAbsP = aSpin/.test(src));
  ok('L sign comes from the prograde/retrograde toggle',
    /L = Math\.abs\(Lmag\) \* \(S\.pro\?1:-1\)/.test(src));
  ok('presets bypass slider quantisation via S.exactL / S.exactR',
    /S\.exactL!==undefined\) \? S\.exactL/.test(src) &&
    /S\.exactR!==undefined\) \? S\.exactR/.test(src));
  ok('moving a slider drops out of preset mode and clears the override',
    /S\.activePreset=null;S\.exactL=undefined;syncLocks\(\)/.test(src) &&
    /S\.activePreset=null;S\.exactR=undefined;syncLocks\(\)/.test(src));

  /* The L slider must expose MAGNITUDE only. It is set in two places --
     the markup attribute and relabel() -- and relabel() runs on load, so a
     negative range there silently overrides the markup. Check both, or the
     UI offers two contradictory ways to say "retrograde". */
  ok('L slider markup is non-negative',
    /id="slL" min="0\.5"/.test(src));
  ok('relabel() keeps the L/b slider non-negative for both particle types',
    !/sl\.min=-/.test(src) &&
    /\|b\|'; sl\.min=0;/.test(src) &&
    /\|L\|'; sl\.min=0\.5;/.test(src));
  ok('slider labels say |L| and |b|, since the sign lives in the toggle',
    /Angular momentum \|L\|/.test(src) && /Impact parameter \|b\|/.test(src));

  /* relabel() must not pin the r0 bounds for massive particles -- clampR0()
     owns them, and relabel() runs afterwards on preset changes. */
  ok('relabel() leaves the massive r0 bounds to clampR0()',
    !/l2\.textContent='Start radius r₀';\s+sr\.min=[\d.]+; sr\.max=40/.test(src));
  ok('legend reads the same S.pro flag',
    /var a=parseFloat\(document\.getElementById\('slA'\)\.value\), pro=S\.pro/.test(src));

  /* r0 is floored at 1.2 * r_ISCO: inside the ISCO no stable circular orbit
     exists, so every "released from rest" start there just plunges. The
     floor moves a long way with spin, so it must be dynamic. */
  /* r0 no longer tracks the ISCO. The band moving under the user caused a
     ratchet (drag spin up and back, r0 was left pinned to a bound) and made
     every preset radius clamp-sensitive. The ISCO's spin-dependence is now
     DRAWN instead: the marked circle plus a shaded no-stable-orbit region. */
  ok('massive r0 range is fixed, floored only by the horizon',
    /return \[rHorizon\(aSpin\) \+ 0\.15, R0_MAX\]/.test(src) &&
    /var R0_MAX = 40/.test(src));
  ok('the no-stable-circular-orbit region is shaded',
    /ctx\.fill\('evenodd'\)/.test(src) &&
    /no stable circular orbit exists/.test(src));

  /* The floor depends on SPIN ONLY, never the sense, so toggling
     prograde/retrograde cannot move r0. */
  {
    const sb = loadUI('geodesic-explorer.html').sb;
    sb.S.type = 'massive'; sb.relabel(); sb.clampR0();
    sb._els.slR.value = 20;
    const before = parseFloat(sb._els.slR.value);
    sb.S.pro = false; sb.clampR0();
    const mid = parseFloat(sb._els.slR.value);
    sb.S.pro = true; sb.clampR0();
    ok('sense toggle leaves r0 untouched',
      before === 20 && mid === 20 && parseFloat(sb._els.slR.value) === 20,
      `${before} -> ${mid} -> ${sb._els.slR.value}`);

    sb._els.slA.value = 0.99; sb.aSpin = 0.99; sb.clampR0();
    const hi = parseFloat(sb._els.slR.value);
    sb._els.slA.value = 0; sb.aSpin = 0; sb.clampR0();
    ok('a full spin sweep leaves r0 untouched (no ratchet)',
      hi === 20 && parseFloat(sb._els.slR.value) === 20,
      `20 -> ${hi} -> ${sb._els.slR.value}`);
  }

  /* Both ISCO branches must stay inside the fixed range at every spin,
     or the shaded region would be clipped by the slider. */
  let iscoVisible = true;
  for (let a = 0; a <= 0.99; a += 0.03) {
    [true, false].forEach((pro) => {
      const i = g.rISCO(a, pro);
      if (!(i > g.rHorizon(a) + 0.15) || !(i < 40)) iscoVisible = false;
    });
  }
  ok('both ISCO branches lie inside the fixed r0 range at every spin',
    iscoVisible);
  /* Behavioural, not textual. This was four regexes pinned to the exact
     source of clampR0, so it broke the moment the rounding was corrected and
     told us nothing about whether the bounds were right. What matters is that
     the slider range is always a SUBSET of the legal range: toFixed() rounds
     to nearest, which pushed the low bound below r_ph at some spins (letting
     r0 start inside the photon orbit) and above it at others (making the
     circular null orbit unselectable, which a comment claimed it was). */
  {
    const ui = loadUI('geodesic-explorer.html');
    const sb2 = ui.sb;
    let worstLo = 0, worstHi = 0, illegal = 0;
    ['massive', 'photon'].forEach((type) => {
      for (let a = 0; a <= 0.99; a += 0.03) {
        sb2.S.type = type;
        sb2.aSpin = a; sb2._els.slA.value = String(a);
        sb2.clampR0();
        const b = sb2.r0Bounds();
        const lo = parseFloat(sb2._els.slR.min), hi = parseFloat(sb2._els.slR.max);
        if (lo < b[0] - 1e-12 || hi > b[1] + 1e-12) illegal++;
        worstLo = Math.max(worstLo, lo - b[0]);
        worstHi = Math.max(worstHi, b[1] - hi);
      }
    });
    ok(`clampR0 keeps the slider range inside the legal range (${illegal} violations)`,
      illegal === 0);
    /* ...and rounds outward by less than one slider step, so nothing usable
       is given away. */
    ok(`clampR0 rounds outward by under 0.01 (lo +${worstLo.toFixed(4)}, hi -${worstHi.toFixed(4)})`,
      worstLo < 0.01 + 1e-9 && worstHi < 0.01 + 1e-9);
  }
  /* The effective-potential panel spans r = 0 .. 2*r_ISCO, so its scale
     tracks the ISCO with spin rather than the orbit viewport. The CURVE is
     still clipped to the horizon: Veff -> -infinity as r -> 0, so sampling
     to the origin would destroy the y-scale. */
  ok('potential x-range is 0 .. 2*r_ISCO (photon orbit for null geodesics)',
    /return 2 \* \(\(S\.type==='photon'\) \? rPhoton\(aSpin, S\.pro\) : rISCO\(aSpin, S\.pro\)\)/
      .test(src));
  ok('potential axis starts AT the horizon',
    /var rMin=rHorizon\(aSpin\), rMax=potRMax\(\)/.test(src));
  ok('sampling offset scales with the plot width, so the gap stays sub-pixel',
    /rMin=rhB \+ 0\.0015\*\(rMax-rhB\)/.test(src));
  ok('one shaded band: horizon -> photon orbit',
    /ctx\.fillRect\(X\(rMin\),padT,X\(rPhoton\(aAbsP,proP\)\)-X\(rMin\)/.test(src) &&
    !/X\(rhP\)-X\(0\)/.test(src));

  /* The shaded band must be non-empty: the photon orbit always sits
     outside the horizon, so horizon -> photon orbit has positive width. */
  let bandWidth = true;
  for (let a = 0; a <= 0.99; a += 0.09) {
    [true, false].forEach((pro) => {
      if (!(g.rPhoton(a, pro) > g.rHorizon(a))) bandWidth = false;
    });
  }
  ok('horizon -> photon-orbit band has positive width at every spin', bandWidth);

  /* The window must actually contain the physics: the barrier peak and the
     ISCO both have to be inside 2*r_ISCO, or the panel shows nothing useful. */
  let windowOk = true;
  for (let a = 0; a <= 0.99; a += 0.09) {
    [true, false].forEach((pro) => {
      const iss = g.rISCO(a, pro);
      if (!(2 * iss > g.rPhoton(a, pro)) || !(2 * iss > iss)) windowOk = false;
    });
  }
  ok('2*r_ISCO window contains the ISCO and the photon orbit at every spin',
    windowOk);

  /* Equatorial-only by construction: spin along +z, theta = pi/2 fixed.
     The state vector is [r, dr/dtau, phi] -- three components, no theta.
     So there is no orbital-PLANE precession in this tool, and the preset
     named for precession must be the in-plane periapsis rosette. */
  ok('state vector is 3-component (no theta dynamics)',
    /var st=\[\d+(\.\d+)?,\s*0,\s*0\]/.test(src) &&
    /o\[0\]=s\[1\]; o\[1\]=accel\(s\[0\]\); o\[2\]=dphidtau\(s\[0\]\)/.test(src));
  ok('the equatorial / +z assumption is stated in the source',
    /spin is along \+z BY CONSTRUCTION/.test(src) &&
    /no\s*\n?\s*\/\/ orbital-PLANE precession \(Lense-Thirring\)/.test(src));
  ok('orbit panel states the plane and spin axis',
    /Orbit \(equatorial plane, spin along \+z\)/.test(src));
  ok('no precession preset remains',
    !/data-p="precession"/.test(src) && !/precession:\{t:'massive'/.test(src));

  /* The rosette itself is still reachable from the sliders even without a
     preset -- bound, eccentric orbits exist inside the band. Assert that,
     so removing the button did not remove the physics. */
  {
    const E = g.energyAtRest(7.0, 0, 3.9, 1);
    ok(`bound eccentric orbits are still reachable (E=${E.toFixed(4)} < 1)`,
      E < 1 && Math.abs(mk(0, E, 3.9, 1).accel(7.0)) > 1e-3);
  }

  /* The circular PHOTON orbit: r = r_ph, E = 1, L = b_crit, dr/dtau = 0.
     Previously unreachable -- the photon branch always launched inbound from
     r0, so even at exactly b_crit the ray spiralled instead of circling. */
  ok('bCrit reduces to 3*sqrt(3) at a = 0',
    Math.abs(g.bCrit(0, true) - 3 * Math.sqrt(3)) < 1e-12);
  [0, 0.5, 0.9].forEach((a) => {
    const rp = g.rPhoton(a, true), L = g.bCrit(a, true);
    const f = mk(a, 1, L, 0);
    close(`photon circular orbit is a turning point at a=${a}`,
      f.Veff(rp), 1, 1e-9);
    close(`photon circular orbit has accel=0 at a=${a}`, f.accel(rp), 0, 1e-9);
  });
  /* The tolerance special case is GONE. A photon at r_ph with b = b_crit
     now gets dr/dtau = 0 from the general branch, because E^2 - Veff is
     zero there to machine precision. Starts where E^2 < Veff are rejected
     rather than silently clamped into a fabricated trajectory. */
  ok('forbidden photon starts are rejected, not clamped',
    /if\(v < -1e-12\)\{/.test(src) &&
    /outcome='no ray with this b reaches r₀'/.test(src) &&
    !/Math\.abs\(S\.r0-rp\) < 1e-3/.test(src));
  ok('photon r0 range reaches the photon orbit',
    /return \[rPhoton\(aSpin, S\.pro\), 34\]/.test(src));

  /* The frame-dragging preset is gone; the dragging PHYSICS is still tested
     by the zero-L checks above, which is what actually matters. */
  ok('frame-dragging preset removed',
    !/data-p="dragging"/.test(src) && !/dragging:\{t:'photon'/.test(src));

  /* The potential panel's y_min. Asserting the formula in source text was
     useless -- it pinned an expression, not a property. What has to hold is
     that the axis frames what is drawn, over the whole parameter space:

       - it never inverts (y_min < y_max), or the plot turns inside out;
       - the dashed E^2 line stays inside the frame, since the turning points
         ARE its intersections with the curve. A floor keyed to Veff at the
         right edge broke this for 968 configs: a particle released near the
         horizon has E^2 ~ 0.07 while Veff(r_max) ~ 0.83, and a quarter of
         that is already above the energy line;
       - y_min is never below a quarter of Veff at the right edge, unless the
         E^2 cap above forces it down;
       - the drawn curve fills most of the panel rather than hugging the top. */
  {
    const sb = loadUI('geodesic-explorer.html').sb;
    const setup = (type, a, pro, Lmag, r0) => {
      sb.S.type = type; sb.S.pro = pro; sb.aSpin = a;
      sb.mu = type === 'photon' ? 0 : 1;
      sb.L = Lmag * (pro ? 1 : -1); sb.S.r0 = r0;
      if (type === 'photon') { sb.Efix = 1; sb.E2 = 1; }
      else { sb.Efix = sb.energyAtRest(r0, a, sb.L, sb.mu); sb.E2 = sb.Efix * sb.Efix; }
      if (!isFinite(sb.E2)) return null;
      sb.buildPot();
      return true;
    };
    /* Every assertion is checked at both ends of the y-zoom and in between:
       the axis is a blend of two frames, so a property holding at t=0 and
       t=1 is not automatically true at t=0.5. */
    const ZOOMS = [0, 0.25, 0.5, 0.75, 1];
    let n = 0, inverted = 0, e2Out = 0, belowQuarter = 0;
    for (let a = 0; a <= 0.99; a += 0.09) {
      for (const pro of [true, false]) {
        const rh = sb.rHorizon(a), rp = sb.rPhoton(a, pro);
        for (let L = 0.5; L <= 7; L += 0.5)
          for (let r = rh + 0.15; r <= 40; r += 2.5) {
            const f = setup('massive', a, pro, L, r); if (!f) continue;
            for (const t of ZOOMS) {
              const [lo, hi] = sb.potRange(t); n++;
              if (!isFinite(lo) || !isFinite(hi) || !(lo < hi)) { inverted++; continue; }
              if (sb.E2 < lo - 1e-12 || sb.E2 > hi + 1e-12) e2Out++;
              /* The 0.25*Veff(r_max) floor governs the WIDE end only -- the
                 tight end is meant to drop below it and let the horizon dive
                 run off the bottom. Even at the wide end the floor yields
                 when the outer band reaches lower than it, since the wide
                 frame is the union of the auto frame and the tight one;
                 without that the slider zoomed OUT as it was dragged right. */
              if (t === 0) {
                const q = 0.25 * sb.Veff(sb.potRMax());
                const cap = sb.E2 - 0.04 * (sb.potMax - sb.E2);
                const d = Math.max(sb.potMaxOut - sb.potMinOut, 1e-9);
                const band = sb.potMinOut - 0.08 * d;
                if (lo < Math.min(q, cap, band) - 1e-9) belowQuarter++;
              }
            }
          }
        for (let b = 0; b <= 9; b += 0.5)
          for (let r = rp; r <= 34; r += 2.5) {
            const f = setup('photon', a, pro, b, r); if (!f) continue;
            for (const t of ZOOMS) {
              const [lo, hi] = sb.potRange(t); n++;
              if (!isFinite(lo) || !isFinite(hi) || !(lo < hi)) { inverted++; continue; }
              if (sb.E2 < lo - 1e-12 || sb.E2 > hi + 1e-12) e2Out++;
              /* The 0.25*Veff(r_max) floor governs the WIDE end only -- the
                 tight end is meant to drop below it and let the horizon dive
                 run off the bottom. Even at the wide end the floor yields
                 when the outer band reaches lower than it, since the wide
                 frame is the union of the auto frame and the tight one;
                 without that the slider zoomed OUT as it was dragged right. */
              if (t === 0) {
                const q = 0.25 * sb.Veff(sb.potRMax());
                const cap = sb.E2 - 0.04 * (sb.potMax - sb.E2);
                const d = Math.max(sb.potMaxOut - sb.potMinOut, 1e-9);
                const band = sb.potMinOut - 0.08 * d;
                if (lo < Math.min(q, cap, band) - 1e-9) belowQuarter++;
              }
            }
          }
      }
    }
    ok('potential axis scan covers the parameter space', n > 25000, `n=${n}`);
    ok('potential y axis never inverts at any zoom', inverted === 0, `${inverted} inverted`);
    ok('E^2 line inside the potential frame at every zoom', e2Out === 0, `${e2Out} clipped`);
    ok('wide end never below 0.25 * Veff(r_max) unless capped by E^2',
      belowQuarter === 0, `${belowQuarter} below`);

    /* Utilisation at the tight end of the zoom. The band that carries the
       physics is the curve OUTSIDE potRCut() together with the E^2 line --
       when the energy sits outside the curve's range the frame still has to
       contain it, so measuring against the curve alone understates the fit.
       Keying the axis to 0.25*E^2 left the a=0 circular potential occupying
       9% of the panel height; this is the regression guard for that. */
    let worstUse = 100, worstAt = '';
    for (const p of ['circular', 'rosette', 'plunge', 'bending',
                     'whirl', 'photoncirc', 'isco', 'retro']) {
      for (const a of [0, 0.3, 0.5, 0.7, 0.9, 0.99]) {
        const ui = loadUI('geodesic-explorer.html');
        ui.preset(p);
        ui.sb.aSpin = a; ui.sb._els.slA.value = a;
        if (ui.sb.S.activePreset) ui.sb.applyPreset(ui.sb.presets[ui.sb.S.activePreset]);
        const s = ui.sb, rc = s.potRCut(), rMax = s.potRMax();
        let mn = s.E2, mx = s.E2;
        for (let r = Math.max(rc, s.rHorizon(a) + 1e-3); r <= rMax; r += (rMax - rc) / 400) {
          const v = s.Veff(r); if (v < mn) mn = v; if (v > mx) mx = v;
        }
        const [lo, hi] = s.potRange(1);
        const use = (mx - mn) / (hi - lo) * 100;
        if (use < worstUse) { worstUse = use; worstAt = `${p} a=${a}`; }
      }
    }
    ok('tight zoom fills >= 80% of the potential panel',
      worstUse >= 80, `worst ${worstUse.toFixed(0)}% at ${worstAt}`);

    /* potRCut() marks the left edge of the band the tight zoom frames, so the
       barrier peak has to lie at or outside it or the zoom cuts the peak off.
       For MASSIVE orbits the peak is always at or outside the light ring, so
       r_ph works. For PHOTONS it is not pinned there -- it sits at
       3(L-aE)/(L+aE) and falls INSIDE the light ring for about a third of the
       b range -- which is why potRCut takes the smaller of the two. */
    {
      const s = loadUI('geodesic-explorer.html').sb;
      let clipped = 0, checked = 0, worst = null;
      for (let a = 0; a <= 0.99; a += 0.09) {
        for (const pro of [true, false]) {
          const rh = s.rHorizon(a), rp = s.rPhoton(a, pro);
          for (const [type, mu] of [['massive', 1], ['photon', 0]]) {
            for (let Lm = 0.5; Lm <= 9; Lm += 0.5) {
              if (type === 'massive' && Lm > 7) continue;
              s.S.type = type; s.S.pro = pro; s.aSpin = a; s.mu = mu;
              s.L = Lm * (pro ? 1 : -1);
              if (type === 'photon') { s.Efix = 1; s.E2 = 1; }
              else {
                s.S.r0 = 20; s.Efix = s.energyAtRest(20, a, s.L, 1);
                s.E2 = s.Efix * s.Efix;
              }
              if (!isFinite(s.E2)) continue;
              const rMax = s.potRMax();
              let best = -Infinity, br = 0;
              for (let r = rh + 1e-3; r <= rMax; r += (rMax - rh) / 2000) {
                const v = s.Veff(r); if (v > best) { best = v; br = r; }
              }
              checked++;
              const cut = s.potRCut();
              /* br === rh means no interior peak in the window; nothing to cut. */
              if (br > rh + 1e-2 && cut > br + 1e-2) {
                clipped++;
                const d = cut - br;
                if (!worst || d > worst.d) {
                  worst = { type, a: +a.toFixed(2), pro, L: +Lm.toFixed(1),
                            cut: +cut.toFixed(2), peak: +br.toFixed(2), d: +d.toFixed(2) };
                }
              }
            }
          }
        }
      }
      ok('potRCut peak scan covers both particle types', checked > 400, `n=${checked}`);
      ok('tight zoom never cuts the barrier peak off the left edge',
        clipped === 0, `${clipped}/${checked} clipped, worst ${JSON.stringify(worst)}`);
    }

    /* The zoom is monotone: dragging right must never widen the frame. */
    {
      const s = loadUI('geodesic-explorer.html').sb;
      let bad = 0, checked = 0;
      for (const p of ['circular', 'isco', 'retro', 'bending', 'whirl']) {
        for (const a of [0, 0.5, 0.9]) {
          const ui = loadUI('geodesic-explorer.html');
          ui.preset(p); ui.sb.aSpin = a; ui.sb._els.slA.value = a;
          if (ui.sb.S.activePreset) ui.sb.applyPreset(ui.sb.presets[ui.sb.S.activePreset]);
          let prev = Infinity;
          for (const t of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
            const [lo, hi] = ui.sb.potRange(t);
            if (hi - lo > prev + 1e-9) bad++;
            prev = hi - lo; checked++;
          }
        }
      }
      ok('y-zoom is monotone (never widens as it increases)',
        bad === 0, `${bad} of ${checked} widened`);
    }

    /* The zoom is a view control: it must not touch the physics. */
    {
      const ui = loadUI('geodesic-explorer.html');
      const before = ui.state();
      ui.sb.S.yzoom = 0; ui.sb.drawPot();
      ui.sb.S.yzoom = 1; ui.sb.drawPot();
      const after = ui.state();
      ok('y-zoom does not perturb the orbit state',
        before.L === after.L && before.r0 === after.r0 &&
        before.E2 === after.E2 && before.a === after.a);
    }

    /* Layout contract for the vertical zoom rail. These are structural, not
       behavioural, because the rail is pure CSS -- but each guards a way the
       panel actually breaks. */
    {
      const html = require('fs').readFileSync(
        require('path').join(ROOT, 'geodesic-explorer.html'), 'utf8');
      const potPanel = /<div class="panel pot">[\s\S]*?<\/div>/.exec(html);
      ok('zoom rail sits inside the potential panel',
        !!potPanel && /id="slY"/.test(potPanel[0]));
      /* Matched against the RULE BODY, not the whole file: the comment above
         the rule names these same properties in prose, so a whole-file regex
         passed even with the declaration deleted. */
      const rail = /\.panel\.pot input\.yzoom\{([^}]*)\}/.exec(html);
      ok('zoom rail is marked vertical for every engine',
        !!rail &&
        /writing-mode:\s*vertical-/.test(rail[1]) &&
        /-webkit-appearance:\s*slider-vertical/.test(rail[1]) &&
        /direction:\s*rtl/.test(rail[1]) &&
        /orient="vertical"/.test(html));
      /* Without this the rail overlays the curve and the "r →" / E² labels. */
      ok('potential canvas yields width to the rail',
        /\.panel\.pot canvas\{[^}]*width:calc\(100% ?- ?\d+px\)/.test(html));
      /* `input[type=range]{min-width:150px}` is (0,1,1) and comes later in
         the sheet, so the rail's rule has to outrank it or it renders 150px
         wide straight across the plot. */
      ok('zoom rail rule outranks the generic range min-width',
        /\.panel\.pot input\.yzoom\{[^}]*min-width:0/.test(html));
    }
  }

  /* Trail resolution: vertices are emitted by ACCUMULATED ANGLE, not once
     per frame. One-per-frame drew chords spanning most of a revolution near
     the horizon at high spin (2.34 scene units at a=0.9) -- the polyline was
     not the orbit. */
  ok('trail vertices are spaced by accumulated angle',
    /trailPhi \+= Math\.abs\(st\[2\]-phPrev\)/.test(src) &&
    /if\(trailPhi >= TRAIL_DPHI\)\{ trailPhi=0; pushTrail\(\); \}/.test(src));
  ok('the angle accumulator resets with the trail',
    /trailX\.length=0; trailY\.length=0; trailPhi=0;/.test(src));

  /* Drive the real integrator and measure what would be drawn. */
  {
    const cases = [[0, true, 3.9, 7.0], [0.9, true, 2.1, 2.4],
                   [0.9, false, 4.2, 9.0], [0.99, true, 2.2, 1.8]];
    let worst = 0, worstCase = '';
    cases.forEach(([a, pro, L, r0]) => {
      const sb = loadUI('geodesic-explorer.html').sb;
      sb.aSpin = a; sb.S.pro = pro; sb.S.type = 'massive';
      sb._els.slA.value = a; sb.relabel(); sb.clampR0();
      sb.S.exactL = L; sb.S.exactR = r0; sb.reset();
      for (let f = 0; f < 600 && !sb.done; f++) sb.step();
      for (let i = 1; i < sb.trailX.length; i++) {
        const c = Math.hypot(sb.trailX[i] - sb.trailX[i - 1],
                             sb.trailY[i] - sb.trailY[i - 1]);
        if (c > worst) { worst = c; worstCase = `a=${a} ${pro ? 'pro' : 'ret'}`; }
      }
      ok(`trail stays bounded at a=${a} ${pro ? 'pro' : 'ret'}`,
        sb.trailX.length <= sb.TRAIL);
    });
    ok(`no drawn trail chord exceeds 0.5M (worst ${worst.toFixed(3)} at ${worstCase})`,
      worst < 0.5, `worst chord ${worst.toFixed(3)}`);
  }

  /* Preset coverage lives in the "presets drive the UI" suite below, which
     clicks them for real. The old test here asserted arithmetic on
     hard-coded literals and passed while two presets were broken. */
  ok('horizon disc follows the spin, not a fixed 2M',
    /var rh=rHorizon\(aSpin\)\*sc/.test(src));
  ok('legend reads live values rather than hard-coded 2M/3M/6M',
    /legH.*rHorizon\(a\)\.toFixed/.test(src) && !/photon sphere r=3M/.test(src));

  /* circEL returns NaN for retrograde orbits inside their ISCO -- a latent
     trap if a preset is ever wired there. Document the safe domain. */
  ok('circEL is finite at and outside the ISCO for both senses',
    [0, 0.5, 0.9].every((a) =>
      [true, false].every((pro) => {
        const [E, L] = g.circEL(g.rISCO(a, pro) + 1e-6, a, pro);
        return Number.isFinite(E) && Number.isFinite(L);
      })));

  /* Frame dragging: a photon with L = 0 still acquires dphi/dtau != 0 for
     a != 0, and its sense follows the hole's spin. That is the physical
     content of the new term, so test it directly. */
  const dragPro = mk(0.9, 1, 0, 0).dphi(6);
  const dragRet = mk(-0.9, 1, 0, 0).dphi(6);
  const dragNone = mk(0, 1, 0, 0).dphi(6);
  ok('zero-L photon is dragged prograde by a>0', dragPro > 1e-3);
  ok('zero-L photon is dragged retrograde by a<0', dragRet < -1e-3);
  close('no dragging at a=0', dragNone, 0, 1e-15);

  /* RK4 conserves the constraint E^2 - Veff - (dr/dtau)^2 = 0. */
  function drift(a, E, L, mu, r0, inbound) {
    const f = mk(a, E, L, mu);
    const s = inbound
      ? [r0, -Math.sqrt(Math.max(E * E - f.Veff(r0), 0)), Math.PI]
      : [r0, 0, 0];
    const k1 = [0, 0, 0], k2 = [0, 0, 0], k3 = [0, 0, 0], k4 = [0, 0, 0], t = [0, 0, 0];
    const dv = (s, o) => { o[0] = s[1]; o[1] = f.accel(s[0]); o[2] = f.dphi(s[0]); };
    let worst = 0;
    for (let n = 0; n < 60000; n++) {
      dv(s, k1);
      for (let i = 0; i < 3; i++) t[i] = s[i] + 0.01 * k1[i]; dv(t, k2);
      for (let i = 0; i < 3; i++) t[i] = s[i] + 0.01 * k2[i]; dv(t, k3);
      for (let i = 0; i < 3; i++) t[i] = s[i] + 0.02 * k3[i]; dv(t, k4);
      for (let i = 0; i < 3; i++) s[i] += 0.02 / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
      if (s[0] < 1.05 || s[0] > 400) break;
      worst = Math.max(worst, Math.abs(E * E - f.Veff(s[0]) - s[1] * s[1]));
    }
    return worst;
  }
  const dPro = drift(0.9, g.energyAtRest(12, 0.9, 4.6, 1), 4.6, 1, 12, false);
  const dRet = drift(-0.9, g.energyAtRest(12, -0.9, 4.6, 1), 4.6, 1, 12, false);
  const dPh = drift(0.9, 1, 5.6, 0, 26, true);
  ok(`RK4 conserves the constraint, a=+0.9 (${dPro.toExponential(1)})`, dPro < 1e-5);
  ok(`RK4 conserves the constraint, a=-0.9 (${dRet.toExponential(1)})`, dRet < 1e-5);
  ok(`RK4 conserves the constraint, photon a=0.9 (${dPh.toExponential(1)})`, dPh < 1e-8);

  /* No NaN anywhere on the reachable slider grid. */
  let nan = 0, cases = 0;
  for (let a = -0.99; a <= 0.99; a += 0.11) {
    for (let L = -7; L <= 7; L += 0.7) {
      for (let r0 = 6; r0 <= 40; r0 += 4) {
        cases++;
        const E = g.energyAtRest(r0, a, L, 1);
        const f = mk(a, E, L, 1);
        if (!Number.isFinite(E) || !Number.isFinite(f.Veff(r0)) ||
            !Number.isFinite(f.accel(r0)) || !Number.isFinite(f.dphi(r0))) nan++;
      }
    }
  }
  ok(`no NaN over ${cases} reachable (a, L, r0) states`, nan === 0);
});

suite('geodesic-explorer :: claims match behaviour', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'geodesic-explorer.html'), 'utf8');

  /* A legend entry is a claim that a marker is on screen, so it must appear
     exactly when that marker is drawn. Two of the four are conditional:

       photon orbit  drawn inside `if (S.guides)`
       ISCO          drawn inside `if (S.guides)` AND `if (S.type!=='photon')`

     The horizon and the E^2 line are drawn unconditionally and never hide.
     This shipped wrong: syncLegend() had no type branch, so photon mode kept
     a coloured swatch and "ISCO 6.00M" for a marker on neither canvas -- and
     the ISCO is not a meaningful quantity for a null geodesic at all.

     Checked as source contracts because the visibility is set in JS from
     state the harness cannot drive without a browser; the live states were
     verified separately by driving the widget in a scratch iframe harness. */
  const legendJs = (src.match(/function syncLegend\(\)\{[\s\S]*?\n\}/) || [''])[0];
  ok('legend gives its conditional entries handles',
    /id="legPhotonItem"/.test(src) && /id="legIscoItem"/.test(src));
  ok('legend hides the photon-orbit entry when guides are off',
    /legPhotonItem'\)\.style\.display\s*=\s*S\.guides\s*\?/.test(legendJs));
  ok('legend hides the ISCO entry in photon mode and when guides are off',
    /legIscoItem'\)[\s\S]{0,80}S\.guides\s*&&\s*S\.type!=='photon'/.test(legendJs));
  /* syncLegend now depends on S.guides, so the guides button must call it --
     before, that handler only re-rendered the canvases. */
  ok('the guides toggle re-syncs the legend',
    /guidesBtn'\)\.onclick[^\n]*syncLegend\(\)/.test(src));

  /* Bound to the shipped functions at a = 0. This suite checks that the
     tool's on-screen CLAIMS are true of the tool's own physics, so it has to
     ask the tool, not a copy of it. */
  const gc = loadTool('geodesic-explorer.html', ['veffOf', 'accelOf']);
  const Veff = (r, mu, L) => gc.veffOf(r, mu, L, 0, 1);
  const accel = (r, mu, L) => gc.accelOf(r, mu, L, 0, 1);

  /* The r > Rview*2.2 cutoff is a VIEWPORT test. A massive particle
     released from rest has E^2 = Veff(r0) < 1 and is therefore bound,
     so the message must not claim escape on that test alone. */
  ok('escape message is gated on E^2, not just the view box',
    /E2>=1 \? 'unbound — escaped'/.test(src));

  /* Those states are genuinely bound: verify the physics the gate
     now encodes. Apoapsis lies beyond the cutoff, so the old message
     fired on orbits that in fact turn around. */
  [[4.6, 12], [5.0, 14], [6.0, 20]].forEach(([L, r0]) => {
    const E2 = Veff(r0, 1, L);
    ok(`released orbit is bound (L=${L}, r0=${r0}): E^2=${E2.toFixed(3)} < 1`,
      E2 < 1);
  });

  /* Below L = 2*sqrt(3) no circular orbit exists at any radius, so
     there is no centrifugal barrier to "fail to clear" -- the note
     text now says this instead. */
  function circularRadii(L) {
    let n = 0;
    for (let r = 2.02; r < 200; r += 0.002) {
      if (accel(r, 1, L) * accel(r + 0.002, 1, L) < 0) n++;
    }
    return n;
  }
  ok('no circular orbit below L = 2*sqrt(3) (so: no barrier)',
    circularRadii(3.0) === 0 && circularRadii(2 * Math.sqrt(3) - 0.01) === 0);
  ok('circular orbits appear above L = 2*sqrt(3)',
    circularRadii(2 * Math.sqrt(3) + 0.01) === 2 && circularRadii(4.6) === 2);
  /* The old "too low to clear the potential barrier" wording was wrong
     (for L^2 < 12 there is no barrier at all). The note is now Kerr-aware
     and must not have regressed to that phrasing. */
  ok('note does not claim a barrier that is not cleared',
    !/too low to clear the potential barrier/.test(src));
  ok('note explains prograde vs retrograde, which is why spin matters',
    /prograde/.test(src) && /retrograde/.test(src));
  ok('note states the spin-dependent horizon',
    /r₊ = M \+ √\(M² − a²\)/.test(src));

  /* "falls inward" was wrong for ~48% of reachable states: r0 is a
     turning point, and the particle moves outward whenever r0 is
     inside the circular-orbit radius for that L. */
  let outward = 0, total = 0;
  for (let L = 3.0; L <= 7.0; L += 0.05) {
    for (let r0 = 6; r0 <= 40; r0 += 0.5) {
      total++;
      if (accel(r0, 1, L) > 0) outward++;
    }
  }
  ok(`release point moves outward in a large fraction of states ` +
     `(${(100 * outward / total).toFixed(0)}%), so "falls inward" is wrong`,
    outward / total > 0.3);
  ok('note no longer claims the particle always falls inward',
    !/falls inward/.test(src));
});

/* ==================================================================
   SWSH widget: geometry and node counting.
   These guard fixes found by a derivation review -- a mirrored
   coordinate frame and swapped view buttons both shipped unnoticed.
   ================================================================== */
suite('swsh-visualizer :: geometry and nodes', () => {
  const { swsh } = loadTool('swsh-visualizer.html', ['swsh']);
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'swsh-visualizer.html'), 'utf8');

  /* The plotted triple must be RIGHT-handed. (X,Y,Z) -> (X,Z,Y) is a
     transposition (det -1) and mirrors the figure, which reverses the
     apparent handedness of +m vs -m -- for s=-2 that is the circular
     polarisation, so it is a physics error, not a cosmetic one. */
  ok('coordinate triple is right-handed (z3 negated)',
    /var x3=st\*Math\.cos\(ph\),\s*y3=ctv,\s*z3=-st\*Math\.sin\(ph\)/.test(src));

  /* "top" must tilt the north pole (theta=0) toward the viewer, where -2Y_22
     peaks -- i.e. POSITIVE elevation, and "bottom" the negative one. Pinning
     the literal 1.5 was over-tight: the presets and the drag clamp have to
     agree on the magnitude or the first drag after clicking "top" snaps the
     sphere, so both now read EL_MAX. Assert the shared constant and the two
     signs instead of a number. */
  ok('top/bottom views use +/-EL_MAX',
    /v==='top'\?EL_MAX\s*:\s*\(v==='bottom'\?-EL_MAX/.test(src));
  ok('drag clamp uses the same EL_MAX as the view presets',
    /S\.el=Math\.max\(-EL_MAX,Math\.min\(EL_MAX,S\.el\)\)/.test(src));
  {
    const m = /var EL_MAX=([\d.]+)/.exec(src);
    ok('EL_MAX is a positive elevation below the pole',
      !!m && +m[1] > 0 && +m[1] < Math.PI / 2, m ? `EL_MAX=${m[1]}` : 'not found');
  }

  /* The stage box is NOT square -- `width:100%` is definite, so aspect-ratio
     derives the height and max-height clamps the height alone. Blitting the
     square buffer across the whole box is a non-uniform scale: the sphere came
     out 2.3x wide embedded, 1.5x standalone. */
  ok('blit is letterboxed into a square, not stretched to the box',
    /SIDE=W<H\?W:H/.test(src) &&
    /drawImage\(buf,\(W-SIDE\)\*0\.5,\(H-SIDE\)\*0\.5,SIDE,SIDE\)/.test(src) &&
    !/drawImage\(buf,0,0,W,H\)/.test(src));

  /* buildGeo stores (X, Z, -Y), so code-space component 2 is MINUS physical y.
     Labelling (0,0,+1) as "y" advertised a left-handed frame, which inverts
     the apparent circular polarisation that sign(m) carries for s=-2. */
  {
    const { AXES } = loadTool('swsh-visualizer.html', ['AXES']);
    /* buildGeo's mapping, verbatim: (X, Z, -Y) for the physical direction at
       (theta, phi). drawAxes pushes the AXES rows through the SAME transform,
       so each row must equal the code-space vector of the axis it labels. */
    const code = (th, ph) => [Math.sin(th) * Math.cos(ph),
                              Math.cos(th),
                              -Math.sin(th) * Math.sin(ph)];
    const want = { x: code(Math.PI / 2, 0),
                   y: code(Math.PI / 2, Math.PI / 2),
                   z: code(0, 0) };
    let worst = 0, bad = [];
    for (const row of AXES) {
      const lab = row[3], w = want[lab];
      const d = row[0] * w[0] + row[1] * w[1] + row[2] * w[2];
      worst = Math.max(worst, Math.abs(d - 1));
      if (Math.abs(d - 1) > 1e-12) bad.push(`${lab}: dot=${d.toFixed(3)}`);
    }
    ok('every triad arm points along the axis it labels',
      bad.length === 0, bad.join(', ') || `max dev ${worst.toExponential(1)}`);
  }

  /* Dropping l must clamp |m| and KEEP the sign: `S.m=L` turned m=-8 into
     m=+2 on a drop from l=8 to l=2 -- silently the mirrored mode. */
  ok('reducing l preserves the sign of m',
    /if\(Math\.abs\(S\.m\)>L\)S\.m=\(S\.m<0\?-L:L\)/.test(src));

  /* Im(-2Y_lm) is identically zero at m=0, so that state must be unreachable
     rather than drawn as a featureless ball under a "- / +" legend. */
  {
    const g = loadTool('swsh-visualizer.html', ['swsh']);
    let worst = 0;
    for (let l = 2; l <= 8; l++)
      for (let i = 0; i <= 40; i++)
        for (let j = 0; j <= 40; j++)
          worst = Math.max(worst,
            Math.abs(g.swsh(-2, l, 0, Math.PI * i / 40, 2 * Math.PI * j / 40)[1]));
    ok('Im is exactly zero at m=0 (the reason Im is disabled there)',
      worst === 0, `max|Im|=${worst}`);
    ok('Im is disabled when m=0 and never left selected',
      /function syncFieldAvail\(\)/.test(src) &&
      /im\.disabled=off/.test(src) &&
      /if\(off && S\.field==='im'\) setField\('re'\)/.test(src));
    /* Count CALL SITES only. `function syncFieldAvail(){` contains the literal
       "syncFieldAvail()", so the declaration matched too and this quietly
       required one fewer call than its threshold named. */
    /* Axis lock: a gesture picks one axis and keeps it. touch-action:pan-y only
     hands a vertical swipe back to the page after the first few touchmoves
     have already been delivered, so without this the opening pixels of a page
     scroll tilt the sphere and the tilt survives the pointercancel. Driven
     through the real handlers rather than asserted on source text. */
  {
    const ui = loadUI('swsh-visualizer.html');
    const s2 = ui.sb;
    function gesture(steps){
      s2.down(100, 100);
      steps.forEach(([x, y]) => s2.move(x, y));
      const out = { az: s2.S.az, el: s2.S.el };
      s2.up();
      return out;
    }
    /* DOMINANTLY vertical, not purely: a pure drag has zero movement on the
       other axis, so it passes with or without a lock and proves nothing.
       (First version of this check did exactly that and survived deleting the
       feature.) Real scroll gestures always carry some sideways drift, and
       that drift is what used to tilt the sphere. */
    s2.S.az = 0; s2.S.el = 0;
    const vert = gesture([[104, 112], [110, 130], [118, 160]]);
    ok(`a mostly-vertical drag leaves azimuth untouched (az ${vert.az.toFixed(3)})`,
      Math.abs(vert.az) < 1e-12 && Math.abs(vert.el) > 0);
    s2.S.az = 0; s2.S.el = 0;
    const horiz = gesture([[112, 104], [140, 110], [180, 118]]);
    ok(`a mostly-horizontal drag leaves elevation untouched (el ${horiz.el.toFixed(3)})`,
      Math.abs(horiz.el) < 1e-12 && Math.abs(horiz.az) > 0);
    s2.S.az = 0; s2.S.el = 0;
    const tiny = gesture([[102, 101]]);
    ok('a sub-threshold nudge moves nothing',
      Math.abs(tiny.az) < 1e-12 && Math.abs(tiny.el) < 1e-12);
  }

  ok('syncFieldAvail runs on both paths that change m',
      (src.match(/(?<!function\s)syncFieldAvail\(\)/g) || []).length >= 3);
  }

  /* A gesture the system steals leaves S.drag stuck true; shouldRun is
     `S.spin || S.drag` and tick is `if(S.spin && !S.drag)`, so the loop then
     runs forever on a motionless sphere. */
  ok('drag is released on cancelled gestures and window blur',
    /addEventListener\('touchcancel',up\)/.test(src) &&
    /addEventListener\('pointercancel',up\)/.test(src) &&
    /addEventListener\('blur',up\)/.test(src));

  ok('view segment reports pressed state',
    /id="viewSeg"[^>]*role="group"/.test(src) &&
    /viewSeg'\)\.addEventListener[\s\S]{0,400}?aria-pressed',x===b/.test(src));

  /* devicePixelRatio changes on browser zoom and on a move between monitors,
     and both fire resize. Viz.canvas re-reads it; a cached DPR does not. */
  ok('canvas sizing goes through Viz.canvas rather than a cached DPR',
    /var m=Viz\.canvas\(cv,ctx\)/.test(src) &&
    !/var W=0,H=0,DPR=Math\.min\(window\.devicePixelRatio/.test(src));

  /* Node counting in latitude: the spin weight sets a floor, so the
     scalar l-|m| rule is wrong wherever |m| < |s|. */
  function polarNodes(l, m) {
    let prev = null, n = 0;
    for (let i = 1; i < 1200; i++) {
      const v = swsh(-2, l, m, Math.PI * i / 1200, 0)[0];
      if (prev !== null && Math.sign(v) !== Math.sign(prev) && v !== 0) n++;
      prev = v;
    }
    return n;
  }
  let spinOk = 0, scalarOk = 0, total = 0;
  for (let l = 2; l <= 8; l++) {
    for (let m = -l; m <= l; m++) {
      const n = polarNodes(l, m);
      total++;
      if (n === l - Math.max(Math.abs(m), 2)) spinOk++;
      if (n === l - Math.abs(m)) scalarOk++;
    }
  }
  ok(`spin-weighted rule l-max(|m|,2) holds for all ${total} modes`,
    spinOk === total, `matched ${spinOk}/${total}`);
  ok('scalar rule l-|m| genuinely fails (so the copy must not use it)',
    scalarOk < total, `scalar matched ${scalarOk}/${total}`);

  /* |Y| and |Y|^2 are both exactly axisymmetric -- the azimuthal-lobe claim
     does not apply in either view, which the on-page note now says. */
  {
    let worstQ = 0, worstM = 0;
    for (let l = 2; l <= 8; l++) {
      for (let m = -l; m <= l; m++) {
        for (const th of [0.4, 1.1, 2.3]) {
          const ref = swsh(-2, l, m, th, 0);
          const q0 = ref[0] * ref[0] + ref[1] * ref[1];
          for (const ph of [0.7, 2.0, 4.5]) {
            const v = swsh(-2, l, m, th, ph);
            const q = v[0] * v[0] + v[1] * v[1];
            worstQ = Math.max(worstQ, Math.abs(q - q0));
            worstM = Math.max(worstM, Math.abs(Math.sqrt(q) - Math.sqrt(q0)));
          }
        }
      }
    }
    ok('|Y|^2 is phi-independent for every (l,m)', worstQ < 1e-12,
      `max dev ${worstQ.toExponential(1)}`);
    ok('|Y| is phi-independent for every (l,m)', worstM < 1e-12,
      `max dev ${worstM.toExponential(1)}`);
  }

  /* Every field the UI offers must be handled by BOTH the value expression
     and the colour branch in buildGeo. A field that reaches neither falls
     through to |Y|^2's value or to the diverging red/blue ramp, and a
     non-negative field on that ramp renders entirely as "+". */
  {
    /* Explicit requires: recent Node exposes fs/path as globals, so omitting
       these works here but would break on any older runtime. */
    const fs = require('fs'), path = require('path');
    const html = fs.readFileSync(path.join(ROOT, 'swsh-visualizer.html'), 'utf8');
    const offered = (html.match(/data-f="(\w+)"/g) || [])
      .map((s) => /data-f="(\w+)"/.exec(s)[1]);
    const valueExpr = /var v = field===[\s\S]*?: q;/.exec(html);
    const colourExpr = /if\(field==='abs'\|\|field==='mag'\)/.test(html);
    const signed = ['re', 'im'], unsigned = ['mag', 'abs'];
    ok('field buttons are the four expected', offered.length === 4 &&
      signed.concat(unsigned).every((f) => offered.indexOf(f) > -1),
      offered.join(','));
    ok('every offered field appears in the value expression',
      !!valueExpr && offered.every((f) => f === 'abs' || valueExpr[0].indexOf(`'${f}'`) > -1),
      valueExpr ? '' : 'value expression not found');
    ok('both magnitude fields take the sequential colour ramp', colourExpr);
  }

  /* swsh() must not return NaN at the exact poles. */
  const p0 = swsh(-2, 2, 2, 0, 0), pPi = swsh(-2, 2, 2, Math.PI, 0);
  ok('no NaN at theta = 0 or pi',
    Number.isFinite(p0[0]) && Number.isFinite(p0[1]) &&
    Number.isFinite(pPi[0]) && Number.isFinite(pPi[1]));
});

/* ==================================================================
   Presets driven through the REAL UI.

   The previous preset "tests" were arithmetic on hard-coded literals and
   passed while two presets were badly broken -- one set L to the slider
   minimum, and every one landed on the wrong radius depending on which
   preset had been clicked before it. These click the actual handler and
   assert the resulting state, which is the only way that class of bug
   shows up.
   ================================================================== */
suite('geodesic-explorer :: presets drive the UI', () => {
  const WANT = {
    circular:   { a: 0,   pro: true,  r0: 12.0, type: 'massive' },
    rosette:    { a: 0,   pro: true,  r0: 14.0, type: 'massive' },
    plunge:     { a: 0,   pro: true,  r0: 12.0, type: 'massive' },
    isco:       { a: 0.9, pro: true,  r0: 2.320883, type: 'massive' },
    retro:      { a: 0.9, pro: false, r0: 8.717349, type: 'massive' },
    photoncirc: { a: 0,   pro: true,  r0: 3.0,  type: 'photon' },
    whirl:      { a: 0,   pro: true,  r0: 26.0, type: 'photon' },
    bending:    { a: 0,   pro: true,  r0: 26.0, type: 'photon' }
  };
  const names = Object.keys(WANT);

  /* Each preset, from a fresh load. */
  names.forEach((n) => {
    const st = loadUI('geodesic-explorer.html').preset(n);
    const w = WANT[n];
    ok(`preset "${n}" sets a=${w.a}, ${w.pro ? 'pro' : 'ret'}, r0=${w.r0}`,
      Math.abs(st.a - w.a) < 1e-9 && st.pro === w.pro &&
      Math.abs(st.r0 - w.r0) < 1e-4 && st.type === w.type,
      `got a=${st.a} pro=${st.pro} r0=${st.r0} type=${st.type}`);
    ok(`preset "${n}" has a usable angular momentum`,
      Number.isFinite(st.L) && Math.abs(st.L) > 0.01,
      `L=${st.L}`);
  });

  /* Order independence: a range input clamps on assignment, so a preset
     written into the PREVIOUS band gets mangled. Click every preset after
     every other one. */
  let bad = [];
  names.forEach((prior) => {
    names.forEach((target) => {
      const ui = loadUI('geodesic-explorer.html');
      ui.preset(prior);
      const st = ui.preset(target);
      const w = WANT[target];
      if (Math.abs(st.a - w.a) > 1e-9 || Math.abs(st.r0 - w.r0) > 1e-4) {
        bad.push(`${prior}->${target} gave r0=${st.r0.toFixed(3)}`);
      }
    });
  });
  ok(`all ${names.length * names.length} preset transitions land correctly`,
    bad.length === 0, bad.slice(0, 3).join('; '));

  /* Preset mode locks L and r0; only the spin stays live. Explore! releases
     everything. This is the interaction contract, so drive it for real. */
  {
    const sb = loadUI('geodesic-explorer.html').sb;
    const locked = () => !!sb._els.slL.disabled && !!sb._els.slR.disabled;
    ok('loads in preset mode with L and r0 locked',
      sb.S.activePreset === 'circular' && locked());
    sb._els.presetSeg._segCb({ dataset: { p: 'explore' } }, { p: 'explore' });
    ok('Explore! unlocks all three sliders',
      sb.S.activePreset === null && !locked());
    sb._els.presetSeg._segCb({ dataset: { p: 'isco' } }, { p: 'isco' });
    ok('clicking a preset locks L and r0 again',
      sb.S.activePreset === 'isco' && locked());
    ok('the spin slider is never disabled', !sb._els.slA.disabled);
  }

  /* In preset mode the orbit must FOLLOW the spin. That is the point of the
     mode: drag the spin and watch the ISCO or photon orbit move. */
  {
    const sb = loadUI('geodesic-explorer.html').sb;
    const drive = (name, a) => {
      sb._els.presetSeg._segCb({ dataset: { p: name } }, { p: name });
      sb._els.slA.value = a; sb.aSpin = a;
      sb.applyPreset(sb.presets[name]);
      return sb.S.r0;
    };
    [0, 0.5, 0.9, 0.99].forEach((a) => {
      close(`prograde ISCO preset tracks the spin at a=${a}`,
        drive('isco', a), sb.rISCO(a, true), 1e-9);
      close(`retrograde ISCO preset tracks the spin at a=${a}`,
        drive('retro', a), sb.rISCO(a, false), 1e-9);
      close(`photon-circular preset tracks the spin at a=${a}`,
        drive('photoncirc', a), sb.rPhoton(a, true), 1e-9);
    });
  }

  /* The retrograde preset must actually be retrograde, with the L that
     circEL gives -- it previously fell through to the slider minimum. */
  {
    const st = loadUI('geodesic-explorer.html').preset('retro');
    const g = loadTool('geodesic-explorer.html', ['circEL', 'rISCO']);
    const wantL = -Math.abs(g.circEL(g.rISCO(0.9, false), 0.9, false)[1]);
    close('retro preset L matches circEL for the retrograde branch',
      st.L, wantL, 1e-9);
    ok('retro preset L is negative (retrograde)', st.L < 0);
  }

  /* The photon-circular preset must sit exactly on the circular null orbit,
     with dr/dtau = 0 falling out of the general branch -- no tolerance
     special case, which previously never fired and only appeared to work
     because a sqrt clamp masked it. */
  {
    const st = loadUI('geodesic-explorer.html').preset('photoncirc');
    const g = loadTool('geodesic-explorer.html', ['rPhoton', 'bCrit']);
    close('photoncirc r0 = r_photon', st.r0, g.rPhoton(0, true), 1e-9);
    close('photoncirc |L| = b_crit', Math.abs(st.L), g.bCrit(0, true), 1e-9);
    close('photoncirc is a turning point: E^2 - Veff = 0',
      st.E2 - (0 - 0 + (st.L * st.L) / (st.r0 * st.r0)
               - 2 * (st.L * st.L) / (st.r0 ** 3)), 0, 1e-9);
  }
});

/* ==================================================================
   Golden rule 1 -- resource-lightness, enforced where it can be.
   Payload is the one dimension checkable without a browser; CPU
   behaviour is covered by the Viz.loop suite above.
   ================================================================== */
suite('golden rule 1 :: resource budget', () => {
  const fs = require('fs');
  const path = require('path');
  const zlib = require('zlib');
  const root = path.join(__dirname, '..');

  /* TOOLS.md performance budget. Raised 15 -> 25 when the geodesic tool
     grew from Schwarzschild-only to full Kerr (spin-dependent landmarks,
     spin-following presets, an Explore mode). Payload is not the binding
     constraint here -- 25 KB gzipped is still ~1/100th of the BOB video on
     the same site, and golden rule 1's real target is CPU, which the
     Viz.loop and per-frame-allocation checks below cover. The cap exists to
     catch a tool ballooning by an order of magnitude, not to police
     incremental growth in a tool that genuinely does more. */
  const BUDGET_KB = 25;
  const tools = fs.readdirSync(root)
    .filter((f) => /-(visualizer|explorer)\.html$/.test(f));

  ok('found tool pages to check', tools.length > 0);

  tools.forEach((f) => {
    const gz = zlib.gzipSync(fs.readFileSync(path.join(root, f)), { level: 9 }).length;
    const kb = gz / 1024;
    ok(`${f} within ${BUDGET_KB} KB gzipped (${kb.toFixed(1)} KB)`, kb <= BUDGET_KB);
  });

  /* Per-frame allocation is the other half of the budget. Brace-match
     the hot functions and look for typed-array construction inside.
     Catches the blatant case; genuine per-frame garbage (closures,
     array literals) still needs a profiler. */
  function bodyOf(src, name) {
    const start = src.indexOf('function ' + name + '(');
    if (start < 0) return null;
    let i = src.indexOf('{', start);
    if (i < 0) return null;
    let depth = 0;
    for (let j = i; j < src.length; j++) {
      const c = src[j];
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return src.slice(i, j + 1); }
    }
    return null;
  }

  /* Lazy grow-once reuse is the CORRECT pattern and must not be
     flagged, e.g. swsh render():
         if(!VX||VX.length<n){VX=new Float32Array(n); ...}
     So a line that both constructs and is guarded by a length/null
     check is exempt; an unguarded construction is not. */
  /* Typed-array construction was the only thing this caught, which made it
     blind to the real offender: drawAxes() rebuilt 4 array literals, a .map
     closure, 3 object literals and a sort comparator EVERY FRAME with axes on
     by default. Array/object literals and the closure-taking iteration methods
     allocate just as surely, so they count too. */
  /* The last two alternatives were added 2026-08-15. The guard matched only
     array literals bound to a name, so it was blind to the two shapes that
     were actually allocating in the geodesic render loop: an array literal
     passed straight as an ARGUMENT (`ctx.setLineDash([4,5])`, 4 per frame) and
     a canvas object returned by a factory call (`ctx.createRadialGradient(...)`
     plus its addColorStops, 2 per frame). Both now match. */
  const ALLOC = /new\s+(Float32Array|Float64Array|Uint8ClampedArray|Uint8Array|Array)\b|\.(map|filter|concat|slice)\s*\(|=\s*\[[^\]]|return\s*\[[^\]]|\(\s*\[[^\]]|create(?:Radial|Linear|Conic)Gradient\s*\(|createPattern\s*\(|createImageData\s*\(/;
  /* An allocation on the hot path is fine when it only runs on CHANGE -- a
     gradient rebuilt when the geometry moves, a buffer reallocated when the
     canvas resizes. Two spellings of that:
       same line   `if (!buf) buf = new Float32Array(n);`
       cache block `if (cx !== _cx) { _g = ctx.createRadialGradient(...); ... }`
     The second is the common one and the original guard could not see it,
     because it only ever looked at the offending line itself. So track brace
     depth and treat a block opened by a cache-guard `if` as guarded
     throughout. Getting this wrong in the permissive direction is how the
     geodesic gradients hid for months -- keep the condition patterns narrow. */
  const GUARD_COND = /(?:!\w+|\.length\s*<|===\s*null|==\s*null|!==|!=[^=])/;
  const GUARDED = new RegExp('if\\s*\\([^)]*' + GUARD_COND.source + '[^)]*\\)');
  function guardedLines(body) {
    const lines = body.split('\n');
    const safe = new Array(lines.length).fill(false);
    let depth = 0, until = -1;
    lines.forEach((line, i) => {
      if (until >= 0 && depth > until) safe[i] = true;
      if (GUARDED.test(line)) {
        safe[i] = true;
        if (/\{\s*$/.test(line) && until < 0) until = depth;
      }
      depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      if (until >= 0 && depth <= until) until = -1;
    });
    return safe;
  }

  /* drawAxes and potRange are called from render()/drawPot() on every frame,
     so they are as hot as the functions that call them. */
  const HOT = ['render', 'step', 'drawOrbit', 'drawPot', 'drawAxes', 'potRange', 'loop'];
  tools.forEach((f) => {
    const src = fs.readFileSync(path.join(root, f), 'utf8')
      .replace(/<!-- VIZ:(CSS|JS) -->[\s\S]*?<!-- \/VIZ:\1 -->/g, '');
    const offenders = [];
    HOT.forEach((name) => {
      const b = bodyOf(src, name);
      if (!b) return;
      const safe = guardedLines(b);
      b.split('\n').forEach((line, i) => {
        if (ALLOC.test(line) && !safe[i]) {
          offenders.push(name + '(): ' + line.trim().slice(0, 60));
        }
      });
    });
    ok(`${f}: no unguarded allocation in hot path`, offenders.length === 0,
      offenders.length ? offenders.join(' | ') : '');
  });
});

suite('every page :: social preview and favicon', () => {
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..');
  const SITE = 'https://anujkankani.github.io/';
  /* DISCOVERED, not listed. This was a hardcoded array of three, so a tool
     built from tools/_template.html -- the documented way to start one --
     would pick up the budget and TODO-marker checks (both of which discover)
     but none of these: og:image being absolute, the card file existing, the
     canonical, the favicon staying a data: URI. Those are exactly the things
     TOOLS.md says fail SILENTLY, so such a page ships looking fine and shares
     as a bare URL. */
  const pages = ['index.html'].concat(
    fs.readdirSync(root).filter((f) => /-(visualizer|explorer)\.html$/.test(f)));
  ok(`social checks cover every deployed page (${pages.length})`,
    pages.length >= 3 && pages[0] === 'index.html');

  pages.forEach((f) => {
    const src = fs.readFileSync(path.join(root, f), 'utf8');
    /* Scope every match to the head. A regex over the whole file happily
       matches prose in a comment further down -- that false pass has bitten
       this suite three times already. */
    const head = src.slice(0, src.indexOf('</head>'));
    const meta = (attr, key) => {
      const m = head.match(
        new RegExp('<meta ' + attr + '="' + key.replace(/[:.]/g, '\\$&') +
                   '" content="([^"]*)">'));
      return m ? m[1] : null;
    };

    const desc = meta('name', 'description');
    ok(`${f}: has a description`, !!desc && desc.length > 40);
    /* Google truncates around 160 chars; longer is not an error but the tail
       is invisible, so keep the payload in the first 160. */
    ok(`${f}: description within 200 chars (${desc ? desc.length : 0})`,
      !!desc && desc.length <= 200);

    ['og:type', 'og:title', 'og:description', 'og:url', 'og:image',
     'og:image:width', 'og:image:height'].forEach((k) => {
      ok(`${f}: ${k} present`, !!meta('property', k));
    });
    ok(`${f}: twitter:card is summary_large_image`,
      meta('name', 'twitter:card') === 'summary_large_image');

    /* The two failure modes that produce a broken card with no error anywhere:
       a relative og:image (scrapers do not resolve it) and a URL pointing at a
       file that was never committed. */
    const img = meta('property', 'og:image');
    ok(`${f}: og:image is an absolute URL`, !!img && img.startsWith(SITE));
    const rel = img ? img.slice(SITE.length) : '';
    ok(`${f}: og:image file exists (${rel})`,
      !!rel && fs.existsSync(path.join(root, rel)));

    const canon = head.match(/<link rel="canonical" href="([^"]+)">/);
    ok(`${f}: canonical is absolute`, !!canon && canon[1].startsWith(SITE));
    ok(`${f}: og:url matches canonical`,
      !!canon && meta('property', 'og:url') === canon[1]);

    /* A favicon FILE would be the first runtime fetch other than the font. */
    const icon = head.match(/<link rel="icon" href="([^"]+)">/);
    ok(`${f}: favicon is inlined, not fetched`,
      !!icon && icon[1].startsWith('data:image/svg+xml,'));
    ok(`${f}: favicon has no raw spaces`, !!icon && !/\s/.test(icon[1]));

    ok(`${f}: theme-color declared`, !!meta('name', 'theme-color'));
  });

  /* index.html drives theme-color from the theme script rather than a
     media query, because a media query keeps reporting the SYSTEM colour
     after the user has explicitly toggled. Guard both halves of that. */
  const idx = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  ok('index.html: theme script sets theme-color',
    /meta\[name="theme-color"\]/.test(idx) && /__applyTheme/.test(idx));
  ok('index.html: toggle routes through the same path',
    /window\.__applyTheme\(next\)/.test(idx));

  /* The cards are generated; losing the generator makes them unmaintainable. */
  ['tools/og-card.html', 'tools/og-tool.html', 'tools/mkfav.js'].forEach((g) => {
    ok(`generator ${g} is committed`, fs.existsSync(path.join(root, g)));
  });
});

suite('every page :: structured data', () => {
  const fs = require('fs');
  const path = require('path');
  const root = path.resolve(__dirname, '..');
  const SITE = 'https://anujkankani.github.io/';
  const pages = ['index.html'].concat(
    fs.readdirSync(root).filter((f) => /-(visualizer|explorer)\.html$/.test(f)));

  pages.forEach((f) => {
    const src = fs.readFileSync(path.join(root, f), 'utf8');
    const m = src.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    ok(`${f}: has a JSON-LD block`, !!m);
    if (!m) return;

    /* Invalid JSON is worse than none: the block is silently discarded and the
       page looks fine, so nothing on the site would ever tell you. */
    let data = null;
    try { data = JSON.parse(m[1]); } catch (e) { /* reported below */ }
    ok(`${f}: JSON-LD parses`, !!data, data ? '' : 'JSON.parse failed');
    if (!data) return;

    const nodes = data['@graph'] || [data];
    ok(`${f}: declares @context`, data['@context'] === 'https://schema.org');
    const types = nodes.flatMap((n) => [].concat(n['@type'] || []));
    ok(`${f}: types are meaningful (${[...new Set(types)].join(', ')})`,
      types.length > 0);

    /* Every URL asserted here is a claim a crawler will follow. Relative ones
       silently resolve against the wrong base in some consumers. */
    const urls = JSON.stringify(data).match(/"https?:\/\/[^"]+"/g) || [];
    ok(`${f}: all JSON-LD URLs are absolute (${urls.length})`,
      urls.every((u) => /^"https?:\/\//.test(u)));

    /* sameAs is how a search engine decides two identities are one person.
       A placeholder there actively misinforms, so assert none creep in --
       this is the same failure mode as the footer's 0000-0000-0000-0000. */
    const flat = JSON.stringify(data);
    ok(`${f}: no placeholder identifiers in structured data`,
      !/YOUR_ID|0000-0000-0000-0000|example\.com|your\.email/.test(flat));
  });

  /* The tool pages are standalone applications, and saying so is what makes
     them eligible to surface for "... visualizer" style queries rather than
     only as pages that mention the words. */
  ['swsh-visualizer.html', 'geodesic-explorer.html'].forEach((f) => {
    const src = fs.readFileSync(path.join(root, f), 'utf8');
    const d = JSON.parse(
      src.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const app = (d['@graph'] || []).find((n) =>
      [].concat(n['@type'] || []).includes('WebApplication'));
    ok(`${f}: declares itself a WebApplication`, !!app);
    ok(`${f}: says it is free to use`, !!app && app.isAccessibleForFree === true);
    ok(`${f}: names what it is about`, !!app && (app.about || []).length >= 2);
    ok(`${f}: title contains the word a searcher would type`,
      /visuali[sz]er|explorer|simulator/i.test(
        (src.match(/<title>([^<]*)/) || ['', ''])[1]));
  });

  /* An ORCID is checksummed (ISO 7064 MOD 11-2), so a wrong one is detectable
     without a network call -- and the placeholder that shipped here for months,
     0000-0000-0000-0000, fails it. This is the cheapest possible guard against
     the single worst kind of error on an academic page: an identifier that
     looks right and points at the wrong person, or nobody. */
  {
    const orcidOK = (o) => {
      const d = o.replace(/-/g, '');
      if (!/^\d{15}[\dX]$/.test(d)) return false;
      let t = 0;
      for (const c of d.slice(0, 15)) t = (t + Number(c)) * 2;
      const r = (12 - (t % 11)) % 11;
      return (r === 10 ? 'X' : String(r)) === d[15];
    };
    const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const found = [...home.matchAll(/orcid\.org\/([\dX-]{19})/g)].map((m) => m[1]);
    ok(`ORCID present (${found.join(', ') || 'none'})`, found.length > 0);
    ok('every ORCID on the page passes its checksum', found.every(orcidOK));
    /* Belt and braces: the checksum would catch a typo, but the all-zeros
       placeholder is worth naming so the failure message is obvious. */
    ok('no placeholder ORCID', !/0000-0000-0000-0000/.test(home));
  }

  /* The address shown as the heading and the one behind the Email link have to
     agree -- they were different for a while, with a real address on display
     and a placeholder in the href, which is invisible until someone clicks. */
  {
    const home2 = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const shown = (home2.match(/<h2>\s*([\w.\-]+@[\w.\-]+)/) || [])[1];
    const linked = (home2.match(/href="mailto:([^"]+)"/) || [])[1];
    /* Assert AGREEMENT, not existence. Whether the address is clickable is a
       judgement call -- there is a real argument for leaving it as plain text
       -- but a mailto that disagrees with the address on screen is never
       intentional, and it is invisible until somebody clicks it. That is the
       failure this guards (the href sat on a placeholder for months while the
       heading showed the real thing). */
    ok(`displayed email is present (${shown || 'none'})`, !!shown);
    ok(`any mailto matches the displayed address (${linked || 'no mailto'})`,
      !linked || linked === shown);
  }

  /* Every identity link on the page was a placeholder at some point --
     mailto:your.email@, citations?user=YOUR_ID, orcid 0000-0000-0000-0000, and
     an arXiv author page that 404'd. Each looked plausible in the markup and
     was only wrong when followed, which is the worst failure mode on a page
     whose whole job is being contactable. Now that all four are real, lock the
     door: any of these shapes reappearing anywhere in the page fails. */
  {
    /* Comments stripped FIRST. The Random section sits commented out in this
       file complete with its href="#" placeholders, and matching raw HTML
       flagged those as dead links on a live page. Third time this suite has
       been caught matching markup that never renders -- match what ships. */
    const home3 = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
      .replace(/<!--[\s\S]*?-->/g, '');
    const BAD = [
      [/YOUR_ID/, 'Google Scholar user=YOUR_ID'],
      [/0000-0000-0000-0000/, 'placeholder ORCID'],
      [/your\.email@/, 'placeholder email'],
      [/example\.com/, 'example.com'],
      [/href="#"/, 'dead href="#" link'],
    ];
    const hits = BAD.filter(([re]) => re.test(home3)).map(([, name]) => name);
    ok(`no placeholder links remain (${hits.join(', ') || 'none'})`, hits.length === 0);

    /* Contact links are the point of the footer; assert they are all absolute
       and none is a bare fragment or relative path that would 404 off-site. */
    const footer = home3.slice(home3.indexOf('<footer'));
    const hrefs = [...footer.matchAll(/class="contact-links"[\s\S]*?<\/div>/g)]
      .flatMap((b) => [...b[0].matchAll(/href="([^"]+)"/g)].map((m) => m[1]));
    ok(`footer has the expected identity links (${hrefs.length})`, hrefs.length >= 5);
    const offsite = hrefs.filter((h) => !/^(mailto:|https:\/\/)/.test(h));
    ok(`every footer link is mailto: or https: (${offsite.join(', ') || 'ok'})`,
      offsite.every((h) => /\.pdf$/i.test(h)));
  }

  /* index.html is the identity page: it has to carry a Person that the tool
     pages can point back at, or the site is a set of unrelated documents. */
  {
    const d = JSON.parse(fs.readFileSync(path.join(root, 'index.html'), 'utf8')
      .match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const person = d['@graph'].find((n) => n['@type'] === 'Person');
    ok('index.html: carries a Person node', !!person);
    ok('index.html: the Person has a stable @id the tools reference',
      !!person && person['@id'] === SITE + '#anuj');
    const arts = d['@graph'].filter((n) => n['@type'] === 'ScholarlyArticle');
    ok(`index.html: publications are marked up (${arts.length})`, arts.length >= 5);
    ok('every article links its arXiv record',
      arts.every((a) => /^https:\/\/arxiv\.org\/abs\/[\d.]+$/.test(a.url || '')));
  }
});

suite('index.html :: software links', () => {
  const fs = require('fs');
  const path = require('path');
  const root = path.resolve(__dirname, '..');
  const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const sec = (function(){
    const i = src.indexOf('<section id="software"');
    return i < 0 ? '' : src.slice(i, src.indexOf('</section>', i));
  })();

  ok('software section present', sec.length > 400);

  const cards = [...sec.matchAll(/<div class="soft[^"]*">([\s\S]*?)<\/div>/g)].map((m) => m[1]);
  ok(`found the software cards (${cards.length})`, cards.length >= 5);

  /* Every card links its repo except LisaWave-JAX, which is unreleased. If a
     card gains a link it should be a real one -- an empty or placeholder href
     on a page aimed at hiring committees is worse than no link. */
  const named = (c) => (c.match(/<h3>([^<]*)/) || ['', '?'])[1].trim();
  const missing = cards.filter((c) => !/class="soft-link"/.test(c)).map(named);
  ok(`only LisaWave-JAX is unlinked (${missing.join(', ') || 'none'})`,
    missing.length === 1 && /LisaWave/i.test(missing[0]));

  /* Most point at a GitHub repo; the Einstein Toolkit points at its project
     site instead, because that is where the toolkit is actually documented and
     downloaded from -- its GitHub org is only part of the picture. Assert the
     shape (absolute https, no trailing slash, real host) rather than pinning
     the hosts, so a future entry can point wherever it should. */
  const hrefs = [...sec.matchAll(/class="soft-link" href="([^"]+)"/g)].map((m) => m[1]);
  ok(`every card link is an absolute https URL (${hrefs.length})`,
    hrefs.length === cards.length - 1 &&
    hrefs.every((h) => /^https:\/\/[\w.-]+\.[a-z]{2,}(\/[\w.-]+)*$/.test(h)));
  ok('no placeholder hrefs', !/class="soft-link" href="(#|)"/.test(sec));

  /* The visible text should be the URL it goes to, so a reader can see where
     a link leads before clicking and a wrong href is obvious on the page. */
  const pairs = [...sec.matchAll(/class="soft-link" href="([^"]+)">([^<]*)</g)];
  ok('link text matches its href',
    pairs.length > 0 && pairs.every(([, h, t]) =>
      h.replace(/^https:\/\//, '') === t.replace(/\s*&#8599;\s*$/, '').trim()));

  /* The first card carried style="color:var(--amber)" inline, which cannot be
     themed and only reads on the dark feature card. */
  ok('repo links are styled by class, not inline style',
    !/<a[^>]*class="soft-link"[^>]*style=/.test(sec));
});

suite('index.html :: touch targets', () => {
  const fs = require('fs');
  const path = require('path');
  const root = path.resolve(__dirname, '..');
  const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const css = (src.match(/<style>([\s\S]*?)<\/style>/) || ['', ''])[1];
  const coarse = (css.match(/@media \(pointer: coarse\)\{([\s\S]*?)\n  \}/) || ['', ''])[1]
    .replace(/\/\*[\s\S]*?\*\//g, '');

  ok('a coarse-pointer block exists', coarse.length > 40);

  /* Measured at 390px with the coarse rules applied by hand (headless reports
     pointer:fine): the arXiv links under the publications were 21px and under
     the explainers 16px, against WCAG 2.5.8's 24px floor and a 44pt target.
     They are standalone links on their own line, so the inline-in-text
     exemption does not cover them. */
  ok('standalone arXiv links are sized for touch',
    /\.exp-item figcaption a/.test(coarse) && /\.links a/.test(coarse));
  /* Vertical padding on an INLINE element overflows its line box instead of
     growing it, so these need inline-block or the padding is decorative. */
  /* Matched against the RULE the selectors share, not against a fixed
     selector list -- the list grew when the software repo links were added and
     a pinned list failed on an innocent edit. */
  ok('those links are inline-block, so the padding actually grows the box',
    /\.links a[^{]*\{[^}]*display:inline-block/.test(coarse));
  ok('the software repo links are sized for touch too',
    /\.soft-link/.test(coarse));

  /* .btn's base rule uses the `padding` SHORTHAND and is declared LATER in the
     sheet. A media query adds no specificity, so a bare `.btn` longhand here
     loses to it silently -- the same trap as `.wrap > .bleed`. */
  ok('the hero CTA rule outranks the later padding shorthand',
    /\.cta-row \.btn\{/.test(coarse) && !/^\s*\.btn\{/m.test(coarse));

  ok('nav links and the theme toggle are covered',
    /\.nav-links a/.test(coarse) && /\.theme-toggle/.test(coarse));
});

suite('index.html :: hero slideshow', () => {
  const fs = require('fs');
  const path = require('path');
  const root = path.resolve(__dirname, '..');
  const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const block = (function(){
    const i = src.indexOf('<div class="hero-slides');
    const j = src.indexOf('</div><!-- /.hero-top -->', i);
    return i < 0 ? '' : src.slice(i, j < 0 ? i + 6000 : j);
  })();
  const css = (src.match(/<style>([\s\S]*?)<\/style>/) || ['', ''])[1];
  /* Declaration checks run against a COMMENT-FREE copy. These rules are
     heavily commented and several comments quote the declaration being
     asserted, so matching raw CSS passes with the declaration deleted. The
     first version of the containing-block check fell for exactly that. */
  const cssCode = css.replace(/\/\*[\s\S]*?\*\//g, '');

  ok('slideshow block present', block.length > 400);

  const imgs = [...block.matchAll(/<img\s[^>]*>/g)].map((m) => m[0]);
  const creds = [...block.matchAll(/<span class="cr[^"]*"[^>]*>([^<]*)<\/span>/g)];
  const ns = Number((block.match(/--ns:(\d+)/) || [])[1]);
  const sceneOf = (t) => Number((t.match(/--s:(\d+)/) || [])[1]);
  const imgScenes = imgs.map(sceneOf);

  ok(`--ns matches the number of scenes (${ns} vs ${new Set(imgScenes).size})`,
    ns > 1 && new Set(imgScenes).size === ns);
  ok(`every scene 0..ns-1 is used (${[...new Set(imgScenes)].sort().join(',')})`,
    [...new Set(imgScenes)].sort((a, b) => a - b).every((v, k) => v === k));

  /* No scene may hold two images in the SAME column: they would overlap in
     one grid cell and only the last would ever be seen. */
  {
    const colOf = (t) => (/class="p1"/.test(t) ? 1 : /class="p2"/.test(t) ? 2 : 0);
    const seen = new Set(); let clash = 0;
    imgs.forEach((t) => {
      const key = sceneOf(t) + ':' + colOf(t);
      if (seen.has(key)) clash++;
      seen.add(key);
    });
    ok('no two images share a scene and column', clash === 0);
    /* A full-width slide cannot share its scene with anything, or it covers
       the other picture entirely. */
    const wide = imgs.filter((t) => /class="p(w|c)"/.test(t)).map(sceneOf);
    ok('full-width slides have their scene to themselves',
      wide.every((sc) => imgScenes.filter((x) => x === sc).length === 1));
  }

  /* THE non-obvious contract. A scene's visible window is 100/ns percent of
     the cycle, and CSS cannot compute a keyframe offset from a variable, so
     the last stop of @keyframes slidefade is hand-written and silently wrong
     the moment a scene is added. Wrong here does not look broken -- it looks
     like one photo lingering under the next. */
  const kf = (cssCode.match(/@keyframes slidefade\{([\s\S]*?)\n  \}/) || ['', ''])[1];
  const stops = [...kf.matchAll(/([\d.]+)%/g)].map((m) => Number(m[1]));
  const lastVisible = stops.filter((v) => v < 100).sort((a, b) => b - a)[0];
  ok(`scene window matches 100/ns (${lastVisible}% vs ${(100 / ns).toFixed(1)}%)`,
    Number.isFinite(lastVisible) && Math.abs(lastVisible - 100 / ns) < 0.51);

  /* The no-animation fallback pins scene 0 BY CLASS. Every item whose --s is
     0 must carry .s0, and nothing else may: an item marked .s0 but animated
     to a different scene would sit permanently on top of the others under
     reduced motion. Position-based selection was the earlier approach and it
     broke the moment scenes stopped holding the same number of items. */
  {
    const all = [...block.matchAll(/<(?:img|span)\s[^>]*>/g)].map((m) => m[0])
      .filter((t) => /--s:\d/.test(t));
    const marked = all.filter((t) => /class="[^"]*\bs0\b/.test(t));
    const inScene0 = all.filter((t) => sceneOf(t) === 0);
    ok(`.s0 marks exactly the scene-0 items (${marked.length} of ${inScene0.length})`,
      marked.length === inScene0.length &&
      marked.every((t) => sceneOf(t) === 0));
  }

  let total = 0; const missing = [];
  imgs.forEach((t) => {
    const a = (t.match(/src="([^"]+)"/) || [])[1];
    const f = path.join(root, a || '');
    if (!a || !fs.existsSync(f)) { missing.push(a || '?'); return; }
    total += fs.statSync(f).size;
  });
  ok(`every slide file exists (${imgs.length} checked)`, missing.length === 0, missing.join(', '));
  /* This is the heaviest thing the page fetches on load -- the videos below
     are lazy, these are not. Ten times the gzipped HTML is already generous;
     the lever is QUALITY in tools/mkphotos.py, not this number. */
  ok(`slideshow payload within budget (${(total / 1024).toFixed(0)} KB of 300)`,
    total < 300 * 1024);

  /* The wide slide must actually BE wide -- a portrait file in the spanning
     slot gets stretched by object-fit to a 1.56 box. */
  {
    const wideSrc = (imgs.find((t) => /class="pw"/.test(t)) || '').match(/width="(\d+)" height="(\d+)"/);
    ok(`the spanning slide is a landscape crop (${wideSrc ? wideSrc[1] + 'x' + wideSrc[2] : 'n/a'})`,
      !!wideSrc && Number(wideSrc[1]) / Number(wideSrc[2]) > 1.3);
  }

  ok('every slide has alt text', imgs.every((t) => /alt="[^"]{20,}"/.test(t)));
  ok('the illustrated slide declares itself an illustration',
    !/photo-ligo/.test(block) || /photo-ligo[\s\S]{0,300}alt="Illustration:/.test(block));

  /* Credits ride the same animation as the pictures, so a credit is on screen
     exactly while its own photo is. Separate timings would put the wrong name
     under the wrong picture -- worse than no credit. */
  ok('credits share the scene animation',
    /\.figanim \.hs-grid > \*\{[^}]*animation: slidefade/.test(cssCode));
  ok(`every credit maps to a real scene (${creds.map((c) => sceneOf(c[0])).join(',') || 'none'})`,
    creds.every((c) => imgScenes.includes(sceneOf(c[0]))));
  ok('every credit names a photographer',
    creds.every((c) => c[1].trim().length > 10));
  /* The photographs that need crediting are credited -- asserted from the
     filenames, not from trusting markup order. */
  {
    const need = imgs.filter((t) => /photo-(portrait|chalk|talk)\.jpg/.test(t)).map(sceneOf);
    const have = creds.map((c) => sceneOf(c[0]));
    ok(`credited photographs all carry a credit (scenes ${[...new Set(need)].join(',')})`,
      need.every((sc) => have.includes(sc)));
  }
  ok('credit row reserves its height whether or not a credit shows',
    /\.hs-grid\{[^}]*grid-template-rows:auto [\d.]+em/.test(cssCode));

  /* Setting width AND height to 100% makes the browser ignore aspect-ratio,
     and with an auto row height the pictures resolved to ~3:8 and ran 490px
     tall. One dimension plus a ratio, never both dimensions. */
  ok('slides size by one dimension plus aspect-ratio',
    /\.hs-grid img\{[^}]*height:auto/.test(cssCode) &&
    !/\.hs-grid img\{[^}]*height:100%/.test(cssCode));

  ok('slides carry .figanim so the shared observer pauses them',
    /class="hero-slides figanim"|class="figanim hero-slides"/.test(block));
  ok('the pause observer watches every .figanim, not just the figure',
    /querySelectorAll\('\.figanim'\)/.test(src) &&
    /figs\.forEach\(function\(fig\)\{ io\.observe\(fig\); \}\)/.test(src));

  {
    const rm = (cssCode.match(/@media \(prefers-reduced-motion:reduce\)\{([\s\S]*?)\n  \}/g) || [])
      .filter((b) => /hs-grid/.test(b)).join('');
    ok('reduced motion pins scene 0 rather than an empty frame',
      /animation:none/.test(rm) && /\.hs-grid > \.s0\{opacity:1/.test(rm));
    /* No check that scene 0 HAS a credit: whether it does depends on who took
       that photograph. The .s0 assertion above already covers credits, since
       it walks every item carrying --s -- so if scene 0 does have one, it is
       marked and therefore pinned. */
  }
  /* Below 900px the row stacks instead of the slideshow being hidden. It WAS
     display:none, which made every photograph invisible on phones -- where
     most visitors are. Assert the stack, and that the band is capped so a
     tablet does not get a 500px-tall slide. */
  {
    const mq = (cssCode.match(/@media \(max-width:900px\)\{([\s\S]*?)\n  \}/) || ['', ''])[1];
    ok('narrow viewports stack the hero row rather than dropping the photos',
      /flex-direction:column/.test(mq) && !/\.hero-slides\{display:none/.test(mq));
    ok('the stacked band is width-capped', /max-width:\d+px/.test(mq));
  }
});

suite('index.html :: hero figure', () => {
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..');
  const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

  /* Match the class ATTRIBUTE loosely: the block also carries `bleed`, and
     pinning the exact string made every check below silently fail the moment
     a second class was added. */
  const m = src.match(/<div class="hero-fig[^"]*">\s*([\s\S]*?)\s*<\/div>/);
  ok('hero figure block present', !!m);
  const fig = m ? m[1] : '';

  ok('figure is an inline <svg>', /^<svg\b/.test(fig));
  /* Referencing a file would be the first runtime fetch other than the font. */
  ok('figure is not a fetched asset',
    !/<img\b/.test(fig) && !/xlink:href|href\s*=\s*"[^"]*\.svg/.test(fig));

  /* The figure has no text, so the honesty about it being an illustration and
     the description for a screen reader both live in the aria-label. */
  const label = fig.match(/aria-label="([^"]*)"/);
  ok('figure has an aria-label', !!label && label[1].length > 40);
  ok('aria-label says it is an illustration',
    !!label && /illustration/i.test(label[1]));

  /* Regenerating and pasting is the obvious way to break theming: the
     standalone build is hard-coded light, and pasting THAT would leave a
     cream figure sitting on the dark page. */
  const hexes = fig.match(/#[0-9A-Fa-f]{6}/g) || [];
  ok(`figure uses theme variables, not literal colours (${hexes.length} found)`,
    hexes.length === 0, hexes.slice(0, 6).join(' '));
  ['--ink', '--field', '--wave-1', '--wave-2', '--wave-3'].forEach((v) => {
    ok(`figure references ${v}`, fig.indexOf('var(' + v + ')') > -1);
  });

  /* viewBox with no fixed width/height is what lets the CSS scale it. The
     origin is not assumed to be 0 0 -- the box has been cropped and uncropped
     once already, so only the shape of the attribute is pinned here. */
  const vb = fig.match(/viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/);
  ok('figure has a viewBox', !!vb);
  /* The viewBox is cropped to the drawn content, and its ratio is what sets
     the rendered height (height = width / aspect). It must stay WIDE: the
     figure runs full bleed, so a squarer box makes it tall enough to push the
     hero past the fold. 4.29:1 currently; anything under ~4 stops fitting a
     1280x720 screen. */
  const ar = vb ? Number(vb[3]) / Number(vb[4]) : 0;
  ok(`figure is a wide band (aspect ${ar.toFixed(2)}:1)`, ar >= 4 && ar <= 6);
  ok('figure has no fixed width/height', !/<svg[^>]*\swidth="\d/.test(fig));

  const css = src.slice(0, src.indexOf('</style>'));
  /* Full bleed, with a budgeted height so the hero still fits the first
     screen. Filling a wide short box without distorting needs slice; without
     it the drawing scales down and floats in an empty band. */
  ok('hero figure runs full bleed',
    /\.hero-fig\{[\s\S]{0,300}width:100vw;margin-left:calc\(50% - 50vw\)/.test(css));
  ok('hero svg keeps its aspect ratio',
    /\.hero-fig svg\{[\s\S]{0,120}height:auto/.test(css));
  /* Nothing may be cropped: no slice, and the viewBox must contain the art. */
  ok('hero svg does not crop the artwork',
    !/preserveAspectRatio="[^"]*slice"/.test(fig));
  ok('generator and page agree on the cropped viewBox', (function(){
    const g = fs.readFileSync(path.join(root, 'tools/mkfigure_light.py'), 'utf8');
    const m = g.match(/VB_X, VB_W = ([-\d.]+), ([\d.]+)[\s\S]{0,80}VB_Y, VB_H = ([-\d.]+), ([\d.]+)/);
    if (!m || !vb) return false;
    return Math.abs(Number(m[1]) - Number(vb[1])) < 1 &&
           Math.abs(Number(m[2]) - Number(vb[3])) < 1 &&
           Math.abs(Number(m[3]) - Number(vb[2])) < 1 &&
           Math.abs(Number(m[4]) - Number(vb[4])) < 1;
  })());
  /* 100vw includes the scrollbar, so full bleed only avoids a sideways scroll
     because .hero clips it. */
  ok('.hero clips the full-bleed child', /\.hero\{[^}]*overflow:hidden/.test(css));


  /* The breakout must keep the child combinator. Every bled block also carries
     a component rule with a `margin` shorthand declared LATER at equal
     specificity, so a bare `.bleed` loses margin-left and the block widens
     rightward off the page instead of centring. */
  ok('breakout uses .wrap > .bleed, not bare .bleed',
    /\.wrap\s*>\s*\.bleed\s*\{/.test(css) && !/^\s*\.bleed\s*\{/m.test(css));
  const bleed = css.match(/\.wrap\s*>\s*\.bleed\s*\{([^}]*)\}/);
  ok('breakout sets both width and margin-left',
    !!bleed && /width:/.test(bleed[1]) && /margin-left:/.test(bleed[1]));
  /* Guard the scrollbar allowance: 100vw includes it, so widening to exactly
     100vw overflows horizontally on desktop. */
  ok('breakout leaves scrollbar allowance',
    !!bleed && /100vw\s*-\s*\d+px/.test(bleed[1]));

  /* The scrollable-nav breakpoint must cover the width the desktop nav needs.
     At 720px it did not: the links wrapped onto two lines across the whole
     721-919px band, and below ~850px the nav also pushed the page into
     horizontal scroll with the theme toggle off-screen. iPad portrait (768px)
     sat inside that.

     The requirement is a function of what is IN the bar. With one toggle it
     measured 924px; the type toggle added ~42px and took it to 966px, which
     re-broke the 921-965 band in exactly the same way. So the number is
     pinned to the toggle count here: add or remove a button in the nav and
     this fails, which is the point -- it forces a re-measure with
     an iframe harness rather than letting the breakpoint quietly go
     stale. The old check asserted only `>= 900`, which the broken 920px
     value passed. */
  const navbp = css.match(/@media\(max-width:(\d+)px\)\{\s*\.nav-inner/);
  ok('scrollable-nav breakpoint exists', !!navbp);
  const navMarkup = src.slice(src.indexOf('<nav>'), src.indexOf('</nav>'));
  const toggles = (navMarkup.match(/class="theme-toggle/g) || []).length;
  ok('nav still carries exactly the three controls the breakpoint was measured for',
    toggles === 3);
  /* The icons must stay a tightened cluster. At the .nav-right gap of 20px the
     requirement measured 1020px -- past iPad landscape (1024) by four pixels. */
  ok('nav icon cluster keeps its own tighter gap',
    /\.nav-tools\{[^}]*gap:8px/.test(css));
  /* Every family the random-typeface button can roll must also be requested
     in the Google Fonts <link>, or picking it silently falls back to
     system-ui and the button looks broken. This drifts in one direction --
     someone adds a face to the JS pool and forgets the link -- and it is
     invisible in review, so it is asserted rather than trusted.

     Worth knowing why this is not merely theoretical: the Fonts API returns
     HTTP 200 and quietly OMITS a family whose axis spec is malformed. A
     `Bricolage Grotesque:opsz,wdth,wght@...` request 400s on its own but is
     dropped without a word inside a multi-family URL. */
  const link = (src.match(/fonts\.googleapis\.com\/css2\?([^"']+)/) || ['',''])[1];
  const linked = new Set(
    (link.match(/family=([^:&]+)/g) || [])
      .map(f => decodeURIComponent(f.slice(7)).replace(/\+/g, ' ')));
  const poolBlock = src.slice(src.indexOf('var FONTS=['),
                              src.indexOf('var FONTS=[') + 2000);
  const pool = (poolBlock.match(/\{n:'([^']+)'/g) || []).map(m => m.slice(4, -1));
  ok('random-typeface pool is non-empty', pool.length >= 2);
  const missing = pool.filter(f => !linked.has(f));
  ok(`every pooled typeface is in the font link (${pool.length} pooled, ${linked.size} linked)`,
    missing.length === 0, missing.join(', '));
  /* The body and mono roles are not part of the swap and must survive it. */
  ok('body and mono faces still requested',
    linked.has('Newsreader') && linked.has('IBM Plex Mono'));
  /* The pool drives weights through variables; a literal weight on a sans-role
     rule would override whatever the rolled face can actually render. */
  ok('heading weight is a variable, not a literal',
    /h1,h2,h3\{[^}]*font-weight:var\(--fw-head\)/.test(css));

  const NAV_NEED = 1008;  // measured at 1400px with document.fonts.ready resolved
  ok(`nav breakpoint covers the desktop nav's ${NAV_NEED}px requirement (${navbp ? navbp[1] : '?'}px)`,
    !!navbp && toggles === 3 && Number(navbp[1]) >= NAV_NEED - 1);
  /* The mobile treatment is what prevents the wrap; both halves must be there. */
  const navblk = navbp
    ? css.slice(css.indexOf(navbp[0]), css.indexOf(navbp[0]) + 700) : '';
  ok('mobile nav keeps links on one line', /white-space:nowrap/.test(navblk));
  ok('mobile nav scrolls horizontally instead of overflowing',
    /overflow-x:auto/.test(navblk));

  /* The artwork's own invariants, checked on the hero (the only copy now --
     the gutter rails were removed). */
  ok('figure ids are unique', (function(){
    const ids = src.match(/id="[a-z]{1,2}(?:hL|hR|jet)"/g) || [];
    return new Set(ids).size === ids.length;
  })());
  /* The static r is the no-animation fallback (reduced motion, or an engine
     that will not animate `r`): it must cover the whole drawing, or the jet
     is silently cropped rather than merely un-animated. `r="\d{3,}"` was the
     old predicate and accepted r="100", which crops badly -- so measure the
     drawn extent instead of trusting a digit count. */
  {
    const sr = fig.match(/class="jet-reveal"[^>]*\br="([\d.]+)"/);
    const jetG = fig.slice(fig.indexOf('<g class="jet"'));
    const coords = [...jetG.matchAll(/([\d.]+)\s+([\d.]+)/g)]
      .map((m) => Math.hypot(Number(m[1]) - 600, Number(m[2]) - 240));
    const reach = coords.length ? Math.max(...coords) : Infinity;
    ok(`static reveal radius covers the drawn jet (r=${sr && sr[1]} vs reach ${reach.toFixed(0)})`,
      !!sr && Number(sr[1]) >= reach);
  }
  ok('particle delays rise with distance from the hole', (function(){
    const ds = (fig.match(/--esc-delay:([\d.]+)s/g) || [])
      .map((x) => parseFloat(x.split(':')[1]));
    return ds.length >= 4 && Math.max(...ds) > Math.min(...ds) + 0.5;
  })());
  /* THE gate, and it has to be geometric. --esc-delay alone cannot do this
     job: CSS animation-delay applies to an animation's FIRST iteration only,
     and the particle drift loop (3s) does not divide the jet cycle (17s), so
     from the second cycle onward the delays are meaningless. Measured before
     the fix: 3 of 5 particles painted ahead of the front at t=17.3s, and 5 of
     5 by t=34.4s. Sharing the reveal clip gates them on every cycle with no
     constant to drift. */
  ok('particles share the jet reveal clip, so none can paint ahead of the front',
    /<g class="escs" clip-path="url\(#\w*jet\)"/.test(fig));
  ok('generator emits the escapee group inside the reveal clip',
    /<g class="escs" clip-path="url\(#\{J\}\)"/.test(
      fs.readFileSync(path.join(root, 'tools/mkfigure_light.py'), 'utf8')));

  ok('particles hidden during their delay (backwards fill)',
    /\.figanim \.esc\{[\s\S]{0,240}animation-fill-mode:backwards/.test(css));
  ok('animations pause while the figure is off-screen',
    /\.figanim\.is-paused \*\{animation-play-state:paused/.test(css));
  ok('figures honour prefers-reduced-motion',
    /prefers-reduced-motion:reduce\)\{[\s\S]{0,200}\.figanim[\s\S]{0,140}animation:none/.test(css));

  /* An auto-fit track minimum is a FLOOR the grid will not collapse below,
     so a bare minmax(290px,1fr) overflows any container narrower than 290px.
     That was the site's only horizontal scroll at 320px. min(...,100%) lets
     the track yield to the column. Mutation: drop the min() and 320px
     overflows by 5px again. */
  ok('explainer grid track minimum can collapse below its ideal',
    /\.exp-grid\{[^}]*minmax\(min\(\d+px,\s*100%\)/.test(css));

  /* tools/_template.html ships TODO: markers as fill-in prompts. A page
     copied from it and shipped with one still in place is an unfinished
     page, so no deployed file may contain the marker. */
  {
    const fs2 = require('fs'), path2 = require('path');
    const deployed = fs2.readdirSync(path2.join(__dirname, '..'))
      .filter((f) => f.endsWith('.html') && !f.startsWith('_'));
    const dirty = deployed.filter((f) =>
      fs2.readFileSync(path2.join(__dirname, '..', f), 'utf8').includes('TODO:'));
    ok(`no deployed page carries a template TODO marker (${deployed.length} checked)`,
      dirty.length === 0, dirty.join(', '));
  }

  /* The gutter rails were removed; nothing should reference them. */
  ok('no scroll-rail markup, CSS or JS remains',
    /* `is-hidden` is scoped to .figanim / the class toggle: a bare substring
       test would also fail on any future unrelated utility class of that
       name, which is a check that breaks on innocent edits. */
    !/scroll-rail/.test(src) && !/--rail-shift/.test(src) &&
    !/\.figanim[^{]*\.is-hidden|\.is-hidden[^{]*\.figanim|classList\.(?:toggle|add)\('is-hidden'/.test(src));

  /* The timing is duplicated: the CSS animates the reveal, and the generator
     uses the same numbers to place each particle's delay. If they drift, the
     particles stop lining up with the jet front -- so assert they agree
     rather than pinning either one to a literal. */
  const genSrc = fs.readFileSync(path.join(root, 'tools/mkfigure_light.py'), 'utf8');
  const gm = genSrc.match(/EMERGE_FRAC,\s*CYCLE_S\s*=\s*([\d.]+),\s*([\d.]+)/);
  const cssDur = css.match(/animation:jetgrow ([\d.]+)s/);
  /* The percentage at which the reveal REACHES ITS MAXIMUM. Derived from the
     keyframes rather than matched against a literal radius -- an earlier
     version hardcoded `r:1500px` here and silently stopped matching the
     moment the radius was retuned, taking two checks down with it. */
  const jetStops = [...css.matchAll(
    /@keyframes jetgrow\{([\s\S]*?)\n  \}/g)].flatMap((b) =>
      [...b[1].matchAll(/([\d.]+)%\s*\{r:([\d.]+)px;\}/g)]
        .map((m) => ({ pct: Number(m[1]), r: Number(m[2]) })));
  const rMax = jetStops.length ? Math.max(...jetStops.map((x) => x.r)) : NaN;
  /* Shaped like a regex match ([0] whole, [1] capture) so the consumers
     below keep reading cssPct[1]. */
  const cssPct = jetStops.length
    ? ['', String(Math.min(...jetStops.filter((x) => x.r === rMax).map((x) => x.pct)))]
    : null;
  ok('generator and CSS declare the shared timing', !!gm && !!cssDur && !!cssPct);
  ok(`generator and CSS agree on the cycle (${gm && gm[2]}s vs ${cssDur && cssDur[1]}s)`,
    !!gm && !!cssDur && Math.abs(Number(gm[2]) - Number(cssDur[1])) < 0.01);
  ok(`generator and CSS agree on the emerge fraction (${gm && gm[1]})`,
    !!gm && !!cssPct && Math.abs(Number(gm[1]) - Number(cssPct[1]) / 100) < 0.01);
  /* The reveal RADII are duplicated the same way: the generator divides each
     particle's distance by (R1 - R0) to place its delay, and jetgrow sweeps r
     across the same span. Drift here fires particles ahead of the jet front. */
  const gr = genSrc.match(/REVEAL_R0,\s*REVEAL_R1\s*=\s*([\d.]+),\s*([\d.]+)/);
  const cssR = css.match(/@keyframes jetgrow\{\s*0%\s*\{r:([\d.]+)px;\}[\s\S]*?\{r:([\d.]+)px;\}/);
  ok(`generator and CSS agree on the reveal radii (${gr && gr[1]}-${gr && gr[2]} vs ${cssR && cssR[1]}-${cssR && cssR[2]})`,
    !!gr && !!cssR &&
    Math.abs(Number(gr[1]) - Number(cssR[1])) < 0.01 &&
    Math.abs(Number(gr[2]) - Number(cssR[2])) < 0.01);

  /* The three checks above compare the generator's constants to the CSS.
     Neither side is the ARTEFACT: index.html carries a paste of the generator's
     output, and its baked --esc-delay values can be stale while both sources
     agree perfectly. Four realistic drifts passed green before this check --
     bumping CYCLE_S in generator AND keyframes without regenerating, and
     hand-editing the delays among them. So re-derive every delay from the
     particle's own coordinates in the pasted SVG, using the shared constants,
     and compare with what is actually written there. */
  {
    const hc = genSrc.match(/HCX,\s*HCY\s*=\s*(\d+),\s*(\d+)/);
    const CX = hc ? Number(hc[1]) : NaN, CY = hc ? Number(hc[2]) : NaN;
    const R0 = gr ? Number(gr[1]) : NaN, R1 = gr ? Number(gr[2]) : NaN;
    const EM = gm ? Number(gm[1]) : NaN, CYC = gm ? Number(gm[2]) : NaN;
    /* Each .esc group ends with the head circle; that is the point the delay
       is derived from in the generator. */
    const parts = [...fig.matchAll(
      /--esc-delay:([\d.]+)s"[\s\S]*?<circle cx="([\d.-]+)" cy="([\d.-]+)"/g)];
    let worst = 0;
    parts.forEach((m) => {
      const d = Math.hypot(Number(m[2]) - CX, Number(m[3]) - CY);
      const frac = Math.min(1, Math.max(0, (d - R0) / (R1 - R0)));
      worst = Math.max(worst, Math.abs(frac * EM * CYC - Number(m[1])));
    });
    ok(`baked --esc-delay values re-derive from the shared constants (${parts.length} particles, worst ${worst.toFixed(3)}s)`,
      parts.length >= 4 && hc && gr && gm && worst < 0.011);
  }

  /* The hold phase: jet and wave sit still while only particles move. */
  const jf = css.match(/@keyframes jetfade\{([\s\S]*?)\n  \}/);
  const stops = jf
    ? [...jf[1].matchAll(/([\d.]+)%\s*\{opacity:([\d.]+);\}/g)]
        .map((m) => ({ pct: Number(m[1]), op: Number(m[2]) }))
    : [];
  const holdEnd = Math.max(...stops.filter((x) => x.op === 1).map((x) => x.pct), 0);
  const jetDone = cssPct ? Number(cssPct[1]) : 0;
  ok('cycle holds after the jet completes, before fading',
    stops.length >= 4 && holdEnd > jetDone + 10,
    `jet done ${jetDone}%, hold ends ${holdEnd}%`);
  const waveDone = css.match(/@keyframes railwave\{[\s\S]*?([\d.]+)%\s*\{stroke-dashoffset:0/);
  /* The jet must finish emerging AFTER the wave, with clear separation.
     Compare the moment each is actually FINISHED ON SCREEN, not the keyframe
     percentages: the reveal is a circle sweeping past fixed artwork, so if its
     radius overshoots the drawing it finishes early no matter what the
     keyframe says. That is what happened with R1=1500 -- keyframe 54%, real
     22.4%, i.e. the jet beat the wave.

     The MARGIN is a design choice and has moved: the jet ran at ~1.8x the
     wave's completion time (EMERGE_FRAC 0.54) until 2026-08-15, when the jet
     was sped up 30% by request, putting it at ~1.4x. The threshold below is
     deliberately looser than either, so it catches the ordering being lost or
     inverted -- the actual bug -- without failing every time the pacing is
     retuned. If you want a specific ratio enforced, pin EMERGE_FRAC instead;
     that is the knob, and the generator/CSS agreement check already guards
     it. */
  const jetRealPct = (function(){
    const jetG = fig.slice(fig.indexOf('<g class="jet"'));
    const reach = Math.max(...[...jetG.matchAll(/([\d.]+)\s+([\d.]+)/g)]
      .map((m) => Math.hypot(Number(m[1]) - 600, Number(m[2]) - 240)));
    const r0 = Math.min(...jetStops.map((x) => x.r));
    return Math.min(1, (reach - r0) / (rMax - r0)) * jetDone;
  })();
  ok(`jet finishes later than the wave on screen (wave ${waveDone && waveDone[1]}%, jet ${jetRealPct.toFixed(1)}% of cycle, ratio ${(jetRealPct / Number((waveDone || [0, 1])[1])).toFixed(2)}x)`,
    !!waveDone && jetRealPct > Number(waveDone[1]) * 1.25);

  /* The reveal maximum is bounded on BOTH sides, and the two failures are
     completely different. Too large and the circle outruns the artwork, so
     the emergence finishes early and the tail of the sweep is dead time
     (R1 was 1500 against a 716 extent: done at 22% of the cycle, not 54%).
     Too small and anything past it is clipped FOREVER -- an escapee that
     never appears. So measure what actually has to be uncovered, including
     each particle at full drift, and require R1 to sit just above it. */
  {
    const DRIFT = Number((css.match(/translate\(calc\(var\(--esc-dx\) \* (\d+)px/) || [])[1]);
    const CXc = 600, CYc = 240;
    let reach = 0;
    const jetG2 = fig.slice(fig.indexOf('<g class="jet"'), fig.indexOf('<g class="escs"'));
    [...jetG2.matchAll(/([\d.]+)\s+([\d.]+)/g)].forEach((m) => {
      reach = Math.max(reach, Math.hypot(Number(m[1]) - CXc, Number(m[2]) - CYc));
    });
    [...fig.matchAll(/--esc-dx:([-\d.]+);--esc-dy:([-\d.]+);[^"]*">([\s\S]*?)<\/g>/g)]
      .forEach((g) => {
        [...g[3].matchAll(/([-\d.]+)[ ,]([-\d.]+)/g)].forEach((m) => {
          reach = Math.max(reach, Math.hypot(
            Number(m[1]) + Number(g[1]) * DRIFT - CXc,
            Number(m[2]) + Number(g[2]) * DRIFT - CYc));
        });
      });
    ok(`reveal maximum brackets the drawn extent (r=${rMax} vs reach ${reach.toFixed(0)}, drift ${DRIFT}px)`,
      Number.isFinite(DRIFT) && rMax >= reach && rMax <= reach * 1.25);
  }

  /* The old chirp generator must stay commented: with its SVG gone,
     getElementById('chirpPath') is null and the next line throws, taking out
     every script below it in the same block. */
  const scripts = src.slice(src.lastIndexOf('<script>'));
  ok('chirp generator stays disabled',
    !/^\s*var path=document\.getElementById\('chirpPath'\);/m
      .test(scripts.replace(/\/\*[\s\S]*?\*\//g, '')));
});

/* ---------------- report ---------------- */
console.log('\n' + '-'.repeat(52));
if (failed) {
  console.log(`\x1b[31m${failed} failed\x1b[0m, ${passed} passed`);
  console.log('\nFailures:');
  failures.forEach((f) => console.log('  • ' + f));
  process.exit(1);
} else {
  console.log(`\x1b[32mall ${passed} checks passed\x1b[0m`);
}
