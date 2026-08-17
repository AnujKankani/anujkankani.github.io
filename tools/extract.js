/* Extract <script> contents from a tool page so its functions can be
   exercised headlessly by tools/test.js.

   The tools are written as inline ES5 with no module system, so this
   pulls the script text out and evaluates ALL of it -- DOM wiring
   included -- in a vm sandbox with document/window/Viz stubs. Nothing is
   stripped: the wiring is what loadUI() then drives.

   Two entry points:
     loadTool(file, names)  -- pull out named globals (pure functions).
       const {swsh} = loadTool('swsh-visualizer.html', ['swsh']);
       Tolerant: evaluation errors are swallowed, since hoisted function
       declarations are already defined by the time wiring runs.

     loadUI(file)  -- return the whole sandbox so a test can click presets
       and move sliders. Strict: a script error throws, because a test
       that silently exercises nothing is worse than a failing one.
*/
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

/* Browser stubs. These are NOT just "enough to not throw": loadUI drives
   the real controls through them, so the ones that carry state -- the
   range inputs especially -- have to behave like the real element or the
   tests pass against a fiction. See makeRange below. */
function makeSandbox(opts) {
  opts = opts || {};
  const noop = function () {};

  /* A real <input type=range> stub. HTML sanitises `value` on assignment:
     it is snapped to min + n*step and clamped into [min, max]. That
     behaviour is load-bearing for this project -- two separate preset bugs
     came from assigning a value while stale bounds were still on the
     element -- so the tests must model it rather than accept anything. */
  function makeRange(id) {
    const st = { id, _min: 0, _max: 100, _step: 1, _value: 0,
                 disabled: false, textContent: '', listeners: {} };
    return new Proxy(st, {
      get(t, k) {
        if (k === 'min') return t._min;
        if (k === 'max') return t._max;
        if (k === 'step') return t._step;
        if (k === 'value') return String(t._value);
        if (k === 'addEventListener') {
          return (ev, fn) => { (t.listeners[ev] = t.listeners[ev] || []).push(fn); };
        }
        if (k === 'dispatch') {
          return (ev) => (t.listeners[ev] || []).forEach((fn) => fn.call(proxyOf(t)));
        }
        if (k === 'style' || k === 'dataset' || k === 'classList') return t;
        if (k === 'children') return [];
        if (k in t) return t[k];
        return typeof k === 'string' ? noop : undefined;
      },
      set(t, k, v) {
        if (k === 'min') { t._min = parseFloat(v); sanitize(t); return true; }
        if (k === 'max') { t._max = parseFloat(v); sanitize(t); return true; }
        if (k === 'step') { t._step = parseFloat(v); return true; }
        if (k === 'value') {
          const n = parseFloat(v);
          t._value = Number.isFinite(n) ? n : t._min;   // undefined -> min
          sanitize(t);
          return true;
        }
        t[k] = v; return true;
      }
    });
    function sanitize(t) {
      if (t._step > 0) {
        const n = Math.round((t._value - t._min) / t._step);
        t._value = t._min + n * t._step;
      }
      if (t._value < t._min) t._value = t._min;
      if (t._value > t._max) t._value = t._max;
    }
  }
  const proxied = new WeakMap();
  function proxyOf(t) { return proxied.get(t) || t; }

  const generic = new Proxy({}, {
    get(t, k) {
      if (k === 'style' || k === 'dataset' || k === 'classList') return generic;
      if (k === 'children') return [];
      if (k === 'textContent' || k === 'value') return '';
      if (k === 'clientWidth' || k === 'clientHeight') return 400;
      if (k === 'getContext') return () => ctx2d;
      return typeof k === 'string' ? noop : undefined;
    },
    set() { return true; }
  });
  const gradient = { addColorStop: noop };
  const ctx2d = new Proxy({}, {
    get(t, k) {
      if (k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => gradient;
      if (k === 'measureText') return () => ({ width: 10 });
      return noop;
    },
    set() { return true; }
  });

  /* Elements the tools address by id get real, stateful stubs. */
  const els = {};
  ['slL', 'slR', 'slA', 'slY'].forEach((id) => { els[id] = makeRange(id); });
  ['valL', 'valR', 'valA', 'valY', 'labY', 'legH', 'legP', 'legI', 'legSense', 'status', 'rread',
   'lab1', 'lab2', 'labA', 'pauseBtn', 'guidesBtn', 'resetBtn',
   'typeSeg', 'presetSeg', 'senseSeg', 'orbitCv', 'potCv']
    .forEach((id) => { els[id] = { id, textContent: '', style: {}, children: [],
                                   getContext: () => ctx2d,
                                   addEventListener: noop,
                                   setAttribute: noop, clientWidth: 400,
                                   clientHeight: 300 }; });

  const document = {
    getElementById: (id) => els[id] || generic,
    querySelector: () => generic,
    querySelectorAll: () => [],
    createElement: () => generic,
    addEventListener: noop,
    documentElement: generic,
    body: generic,
    hidden: false
  };
  const window = {
    matchMedia: () => ({ matches: false, addListener: noop }),
    devicePixelRatio: 1,
    innerWidth: 900,
    addEventListener: noop,
    requestAnimationFrame: noop,
    cancelAnimationFrame: noop,
    location: { search: '' }
  };
  /* The tool pages call Viz.* at module scope. Without a stub the script
     throws there and EVERYTHING after it -- presets, handlers, the load-time
     init -- silently never runs. That hid two shipped bugs. */
  const Viz = {
    FRAME_MS: 32, DPR_CAP: 2, MOBILE_W: 420, reducedMotion: false,
    isMobile: () => false,
    loop: () => ({ update: noop, start: noop, stop: noop,
                   isRunning: () => false, destroy: noop }),
    seg: (el, cb) => { if (el) el._segCb = cb; },
    canvas: (cv, ctx) => ({ w: 400, h: 300, dpr: 1 }),
    autoHeight: noop
  };
  Viz.seg.select = (el, pred) => null;

  const sandbox = {
    document, window, Math, JSON, console, Viz,
    location: window.location,
    Float32Array, Uint8ClampedArray, Uint8Array, Array, Object, String, Number,
    isFinite, parseFloat, parseInt,
    setTimeout: noop, clearTimeout: noop,
    IntersectionObserver: function () { return { observe: noop }; }
  };
  sandbox.window.document = document;
  sandbox.globalThis = sandbox;
  sandbox._els = els;          // exposed so tests can read slider state
  return sandbox;
}

/* Seed the range stubs from the page's own <input type=range> attributes,
   so the sandbox starts in the same state a browser would. Without this the
   stubs start at a default range and the markup's value is clamped away --
   a harness artefact that looks exactly like a page bug. */
function seedRangesFromMarkup(file, sandbox) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const re = /<input[^>]*type="range"[^>]*>/g;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const get = (a) => {
      const r = new RegExp(a + '="([^"]*)"').exec(tag);
      return r ? r[1] : null;
    };
    const id = get('id');
    if (!id || !sandbox._els[id]) continue;
    const el = sandbox._els[id];
    if (get('min') !== null) el.min = get('min');
    if (get('max') !== null) el.max = get('max');
    if (get('step') !== null) el.step = get('step');
    if (get('value') !== null) el.value = get('value');
  }
}

/* Pull inline <script> bodies out of a page.

   Skips two kinds that are not executable JavaScript:
     src=          external, nothing inline to run
     type=...      anything with a type that is not a JS MIME type -- in
                   practice application/ld+json, which is structured data for
                   search engines. Evaluating it throws "Unexpected token ':'"
                   on the first key, and because loadUI is strict that took
                   down every suite downstream of it. A <script> tag is not
                   automatically a script. */
const JS_TYPE = /^(text\/javascript|application\/javascript|module|)$/i;

function scriptsOf(file) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const out = [];
  const re = /<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    const type = (m[1].match(/\stype\s*=\s*["']([^"']*)["']/i) || ['', ''])[1].trim();
    if (!JS_TYPE.test(type)) continue;
    out.push(m[2]);
  }
  return out;
}

/* Evaluate a tool page's scripts and return the requested globals.
   DOM-wiring errors are swallowed: we only need the math to survive. */
function loadTool(file, names) {
  const sandbox = makeSandbox();
  seedRangesFromMarkup(file, sandbox);
  const ctx = vm.createContext(sandbox);
  for (const src of scriptsOf(file)) {
    try {
      vm.runInContext(src, ctx, { filename: file, timeout: 5000 });
    } catch (e) {
      /* Expected: control wiring touches DOM APIs the stub doesn't
         fully model. The function declarations are hoisted and
         evaluated before that point, so the math is already defined. */
    }
  }
  const got = {};
  for (const n of names) {
    if (typeof sandbox[n] === 'undefined') {
      throw new Error(`extract: '${n}' not found in ${file}`);
    }
    got[n] = sandbox[n];
  }
  return got;
}

/* Load a tool page AND return its sandbox, so tests can drive the real UI
   (click presets, move sliders) instead of asserting on source text. */
function loadUI(file) {
  const sandbox = makeSandbox();
  seedRangesFromMarkup(file, sandbox);
  const ctx = vm.createContext(sandbox);
  for (const src of scriptsOf(file)) {
    try { vm.runInContext(src, ctx, { filename: file, timeout: 5000 }); }
    catch (e) { throw new Error('page script failed: ' + e.message); }
  }
  return {
    sb: sandbox,
    els: sandbox._els,
    /* Click a preset exactly as Viz.seg would: the page registered its
       callback on the presetSeg element. */
    preset(name) {
      const cb = sandbox._els.presetSeg._segCb;
      if (!cb) throw new Error('no preset handler registered');
      cb({ dataset: { p: name } }, { p: name });
      return this.state();
    },
    state() {
      return {
        a: sandbox.aSpin,
        pro: sandbox.S.pro,
        type: sandbox.S.type,
        L: sandbox.L,
        r0: sandbox.S.r0,
        E2: sandbox.E2,
        outcome: sandbox.outcome,
        slR: parseFloat(sandbox._els.slR.value),
        slL: parseFloat(sandbox._els.slL.value)
      };
    }
  };
}

module.exports = { loadTool, loadUI, scriptsOf, makeSandbox, ROOT };
