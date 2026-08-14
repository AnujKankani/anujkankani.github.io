# TOOLS.md — how to build a visualization tool for this site

Guidelines for adding interactive physics widgets to anujkankani.github.io. Read this before writing a new tool. [CLAUDE.md](CLAUDE.md) covers the site as a whole; this file covers the `*-visualizer.html` / `*-explorer.html` family specifically.

Reference implementations: [swsh-visualizer.html](swsh-visualizer.html) and [geodesic-explorer.html](geodesic-explorer.html). When this document and those files disagree, this document wins — the files predate it and have known drift (see [Known drift](#known-drift)).

## The three constraints

Everything below follows from these. If a proposed change violates one, it's the wrong change.

1. **It runs on a website.** Static hosting, GitHub Pages, no server. No backend, no API calls, no server-side rendering, no runtime data fetches.
2. **The visitor installs nothing.** These are widgets, not notebooks. No download step, no Python, no build tooling on the visitor's side. It works when they click a link, in whatever browser they already have.
3. **It is resource light.** The audience is on laptops and phones, and multiple tools may be alive on one page. Assume a mid-range Android on a warm battery, not a workstation.

Constraint 3 is the binding one and the easiest to violate accidentally. Payload is not the problem — the existing tools are 14–19 KB gzipped, and twenty of those still wouldn't matter. **The problem is CPU: unbounded animation loops, oversized canvases, and per-frame allocation.**

## Golden rules

Non-negotiable. A tool that breaks one of these doesn't ship.

1. **Resource-lightness is a top priority, not an optimization pass.** It ranks alongside correctness, above features and visual polish. The audience is on phones and laptops, and several tools may be alive on one page. When a feature and the frame budget conflict, the feature loses — cut it, simplify it, or make it opt-in. Rules 2–6 are the specific, checkable consequences of this one; when a situation isn't covered by them, this rule decides.
2. **Never animate off-screen.** Every rAF loop is gated on `inView` (via `IntersectionObserver`) *and* `!tabHidden` (via `visibilitychange`). A tool that keeps running when scrolled past is a battery bug, and it is the single most likely way to make a multi-tool page unusable.
3. **Never animate when nothing is changing.** Idle means stopped, not "rendering the same frame at 60 fps." Static state after a control change → one `render()`, then halt.
4. **Stop through `updateRun()`, never `startLoop()`/`stopLoop()` directly** (outside of drag start). `updateRun()` re-evaluates `shouldRun()` and renders one final frame when halting, so the static view stays correct. Calling the primitives directly is how a loop leaks.
5. **Cap the frame rate and the device pixel ratio.** Physics widgets read fine at ~30 fps. Uncapped DPR on a 3× phone screen is a 9× fill-rate bill for no visible gain.
6. **Allocate nothing in the render loop.** Buffers, typed arrays, and scratch vectors are allocated once in `resize()` or at module scope and reused. No `new`, no array literals, no closures per frame.
7. **Honor `prefers-reduced-motion`.** Auto-spin, auto-play, and draw-in animations start disabled when it's set. The tool must still be fully usable and show a correct static frame.
8. **Every deployed `.html` file is self-contained.** Inline `<style>`, inline `<script>`, zero runtime fetches beyond the Google Fonts link. This is what makes each tool independently shareable and iframe-able.
9. **The physics is correct or the tool doesn't exist.** No fudged constants to make a picture look nicer. If a formula is approximated or a regime is outside its validity, say so in the `.note`. See [Physics rules](#physics-rules).

## Anatomy of a tool

Every tool follows the same skeleton. Copy it; don't reinvent it.

```
<head>   charset, viewport, <title>, font preconnect + link, inline <style>
<body>
  <script>  embed detection — must be the first thing in <body>
  .tool
    .head       .kicker / <h1> / .sub      ← hidden when embedded
    .stage or .panels                      ← canvas host(s)
    .controls   .row > .lab + .seg/input   ← interaction
    .note                                  ← the physics explainer, hidden when embedded
  <script>  math → state → render → loop → controls → observers → init
```

Script order in the tail matters and is the same in both existing tools: pure math functions first, then state, then render, then the loop, then control wiring, then observers, then a bare init call (`resize()`, `reset()`, …) as the last statement.

### The embed contract

Tools are consumed two ways: standalone (their own page) and embedded in an `<iframe>` on the site. One file serves both.

```js
if(location.search.indexOf('embed')>-1)document.body.classList.add('embed');
```

This is the first script in `<body>` — before paint, or the standalone header flashes. Then `body.embed` CSS hides `.head` and `.note` (the host page supplies the title and caption), drops the background/border, and shrinks the canvas panels.

**Always test both modes.** Load `tool.html` and `tool.html?embed=1`.

**Height is automatic — do not hand-tune it.** Call `Viz.autoHeight()` at the end of the tool's init. Embedded, it measures the tool's own content and posts the height to the host, which sizes the iframe; standalone it does nothing. The host's CSS height is the no-JS floor only.

This exists because fixed heights cannot work. Content height is set by how the control rows *wrap*, and that is not monotonic in viewport width — the geodesic tool measures 1076px tall at 320px wide, 931px at 430, 866px at 600 and 692px at 700. Every fixed number clipped at some width; before this, the geodesic tool lost its bottom control row on every phone width tested.

Two rules keep it honest:

- **Panel heights in `body.embed` must be fixed px, never `vh`.** A `vh` panel makes the frame height feed back into the measurement.
- Measurement uses the **body box**, not `documentElement.scrollHeight`, which is clamped to at least the viewport — inside an iframe that is the frame's own height, so the reported height would only ever grow.

### The loop

Both existing tools implement this identically. The shape:

```js
function shouldRun(){ return inView && !tabHidden && /* tool-specific: is anything moving? */; }
function loop(ts){
  if(!running) return;
  if(ts-lastT < FRAME_MS){ raf=requestAnimationFrame(loop); return; }  // fps cap
  lastT=ts;
  /* advance state */ render();
  raf=requestAnimationFrame(loop);
}
function startLoop(){ if(running)return; running=true; lastT=0; raf=requestAnimationFrame(loop); }
function stopLoop(){ running=false; if(raf)cancelAnimationFrame(raf); raf=0; }
function updateRun(){ if(shouldRun()) startLoop(); else { stopLoop(); render(); } }
```

`shouldRun()` is the only part a tool customizes. Examples in the current code:
- SWSH: `inView && !tabHidden && (S.spin || S.drag)` — runs only while spinning or being dragged.
- Geodesic: `inView && !tabHidden && !S.paused && !done` — runs until the integration finishes.

Wire the observers the same way every time:

```js
if('IntersectionObserver' in window){
  new IntersectionObserver(function(es){inView=es[0].isIntersecting;updateRun();},{threshold:0.02})
    .observe(/* the canvas host element */);
}
document.addEventListener('visibilitychange',function(){tabHidden=document.hidden;updateRun();});
var rt; window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(resize,150);});
```

Resize is debounced at 150 ms — mobile browsers fire it continuously during scroll as the URL bar collapses.

## Performance budget

Concrete numbers, not vibes. A new tool should hold to these.

| Knob | Rule | Why |
|---|---|---|
| Frame cap | 28–32 ms (~30–34 fps) | Physics reads fine; halves CPU vs. 60 |
| DPR cap | `Math.min(devicePixelRatio||1, 2)` | 3× phone screens buy nothing here |
| Mobile tier | Reduce mesh/resolution below 420 px width | Small screen, weakest CPU |
| Render target | Fixed-size offscreen buffer where possible | Cost independent of display size |
| Per-frame allocation | Zero | GC pauses show up as jank |
| Gzipped size | Keep under 25 KB | Not the bottleneck; the cap catches order-of-magnitude bloat, not growth in a tool that does more |

Use `420px` as the mobile breakpoint in JS (matching the existing tools) and the site's `600px`/`720px` breakpoints in CSS.

The pattern to copy is SWSH's: it scales *both* the mesh (`Nt`/`Np`) and the raster target (`RES`) by width and a quality toggle, and splats into a fixed offscreen buffer with a reused `Float32Array` z-buffer — so a big desktop canvas costs the same as a small one, and only the upscale changes.

**Rough check before shipping:** load the tool on a phone (or DevTools mobile emulation with 4× CPU throttle), scroll it off-screen, and confirm in the Performance panel that the main thread goes quiet. If it doesn't, rule 2 is broken.

## Touch

Handled in `tools/_shared.css` under `@media (pointer: coarse)` — keyed on the pointer, not a width breakpoint, because a narrow laptop window still has a mouse and a large tablet still has fingers. Buttons get a 44px minimum height (Apple HIG asks 44pt, Material 48dp; the default 13px/6px buttons come out ~31px) and `.row` sliders a 44px hit area.

Two things to know before adding a control:

- The height bump is scoped to **`.row input[type=range]`** deliberately. A range positioned absolutely with both `top` and `bottom` — the geodesic zoom rail — would be over-constrained by a `height` and collapse to 44px at the top. If you position a slider that way, give it `height:auto` in your own coarse-pointer block.
- **`touch-action: none` on a drag surface stops the page scrolling past it.** The SWSH stage is ~440px of a ~660px iframe; with `none`, a phone user swiping over the sphere is stuck. It uses `pan-y` on coarse pointers: vertical swipes scroll the page, horizontal drags still rotate. Any large drag target needs the same treatment.

## Physics rules

These are research artifacts published under your name. Treat errors here as more serious than visual bugs.

- **Geometrized units, `G = c = M = 1`, throughout.** State the convention in the `.note` (e.g. "distances in units of the mass M, horizon at r = 2M").
- **Label the regime.** Which spacetime, which approximation, what's held fixed. Schwarzschild is not Kerr; equatorial is not generic.
- **Landmark values must be exact, not eyeballed:** ISCO at r = 6M, photon sphere at r = 3M, horizon at r = 2M, critical impact parameter b = 3√3 M ≈ 5.196M. If a rendered feature lands somewhere else, the integrator is wrong — not the label.
- **Integrators:** RK4 with a fixed step is the current standard (see [geodesic-explorer.html](geodesic-explorer.html)). Substep per frame (`STEPS` there) rather than taking one huge step, and keep the state vector allocation-free.
- **Verified math gets a comment saying so**, as `swsh()` does. Changing a function marked verified is a physics change: check it against known closed forms before committing, and say in the commit message what you checked against.
- **Decorative ≠ physical.** The homepage hero chirp is hand-tuned illustration, not model output, and is labeled as such. Never let a decorative curve be mistaken for a result.

## Accessibility and interaction

- Segmented buttons are `<button>` elements in a `.seg` with `data-*` payloads and `aria-pressed` reflecting state. Toggles use `aria-pressed` too.
- Sliders are `<input type=range>` with a visible numeric readout that updates on `input`.
- Canvases are decorative-with-a-caption: the `.note` and `.sub` carry the real content. Give iframes a descriptive `title`.
- Drag surfaces need `touch-action:none` and both mouse and touch handlers; `touchmove` must `preventDefault()` with `{passive:false}` or the page scrolls under the finger.
- Never rely on color alone — the geodesic legend pairs every color with a text label. Assume some visitors won't distinguish the indigo/magenta pair.

## Adding a tool to the site

**Current state, and its limit:** the homepage embeds each tool as a live `<iframe>` in the `#widgets` section. Heights are no longer hand-tuned — each tool reports its own via `Viz.autoHeight()`, and the `.tool-embed iframe` CSS in [index.html](index.html) is only the no-JS floor.

This does not scale, and it's the main open infrastructure risk. Every tool added this way is another live document, canvas, and rAF loop on a single mobile page. **Target state: a `tools/` gallery of static cards linking to standalone pages, with at most one live embed on the homepage.** Prefer adding new tools as gallery entries rather than extending the inline-embed pattern.

Until the gallery exists, if you must embed inline: set the height for both desktop and mobile, and verify on a real phone that the section doesn't clip.

## The shared runtime

**Decided: the generator is adopted.** Shared code lives in `tools/_shared.css` and `tools/_shared.js` and is inlined into each tool page by `tools/build.py`.

```bash
python3 tools/build.py           # rewrite tool pages in place
python3 tools/build.py --check   # exit 1 if any page is stale (run before pushing)
python3 tools/build.py --list    # show which pages have markers
```

**Edit `tools/_shared.*`, never the inlined copy.** A tool page opts in by containing marker pairs; everything outside them is left byte-for-byte untouched, so your physics and tool-specific styles are never at risk:

```html
<!-- VIZ:CSS -->  ...generated, do not edit...  <!-- /VIZ:CSS -->
<!-- VIZ:JS -->   ...generated, do not edit...  <!-- /VIZ:JS -->
```

Anything you write between those markers **will be overwritten** on the next build. `--check` catches that before it surprises you.

This preserves golden rule 8 exactly: inlining happens at build time, so the visitor still gets one self-contained file with zero runtime fetches. The rule is about what the browser fetches, not about whether a generator exists.

### The API

`window.Viz` exposes four functions. Resist growing it — a large shared surface recreates the framework this design avoids.

**`Viz.loop({shouldRun, tick, render, observe, resize, fps})`** — the only supported way to animate. Owns `running`/`raf`/`lastT`/`inView`/`tabHidden`, the `IntersectionObserver`, the `visibilitychange` handler and the debounced resize, so golden rules 2–5 are structural rather than remembered. Returns a handle; call `handle.update()` after any state change that could alter `shouldRun()`.

```js
var anim = Viz.loop({
  observe: document.getElementById('stage'),
  shouldRun: function(){ return S.spin || S.drag; },   // visibility applied on top
  tick: function(dt){ S.az += 0.010; },
  render: render,
  resize: resize
});
anim.update();   // after any control change
```

Note `shouldRun` only answers "is anything moving?" — the runtime ANDs in visibility itself, so a tool cannot forget it. `tick` may end the animation (set a `done` flag); the loop re-checks after every tick and halts with a final `render()`.

**`Viz.seg(el, cb)`** — segmented button group. Sets `aria-pressed` on the winner, clears the rest, calls `cb(button, dataset)`. `Viz.seg.select(el, predicate)` sets state programmatically without firing the callback. Replaces a block that was hand-written four times across the first two tools.

**`Viz.canvas(cv, ctx)`** — DPR-capped backing-store sizing; returns `{w, h, dpr}` in CSS pixels and sets the transform so drawing code works in CSS pixels. Call it from `resize()` rather than caching a DPR: `devicePixelRatio` changes on browser zoom and when a window moves between monitors, and both fire `resize`.

**`Viz.autoHeight()`** — call once at the end of a tool's init. When the page is embedded it measures its own content and posts the height to the host, which sizes the iframe to match; standalone it does nothing. Fixed iframe heights cannot work: content height depends on how the control rows wrap, and that is not monotonic in viewport width (the geodesic tool is 1076px tall at 320px wide but 692px at 700px). The host's CSS height remains the no-JS floor.

Also exported: `Viz.FRAME_MS`, `Viz.DPR_CAP`, `Viz.MOBILE_W`, `Viz.reducedMotion`, `Viz.isMobile(w)`.

## Physics tests

```bash
$WEBSITE_NODE tools/test.js         # all suites
$WEBSITE_NODE tools/test.js swsh    # filter by substring
```

where `WEBSITE_NODE=/home/anuj/anaconda3/envs/website_env/bin/node` (conda env `website_env`). No npm packages — the harness is dependency-free.

`tools/extract.js` pulls the inline `<script>` bodies out of a tool page and evaluates them in a `vm` sandbox with minimal DOM stubs, so the tests exercise **the actual functions inlined in the page**, not copies. A sign error introduced while refactoring a renderer fails here.

Coverage runs wider than physics now — the recurring lesson has been that the bugs live in the layer *between* the physics and the screen, so the suite grew to cover that layer too. Twelve suites:

- **Physics** — `₋₂Y_lm` closed forms for (2,±2), (2,0), the `e^{imφ}` azimuthal law, Condon–Shortley phase, orthonormality across ℓ, nodal-circle and azimuthal-lobe counts; Schwarzschild landmarks (ISCO r=6M and L²=12, photon sphere r=3M, b_crit=3√3M, horizon Veff=0, Newtonian limit); Kerr landmarks and dynamics, with `accel = −½ dVeff/dr` and the a→0 Schwarzschild reduction checked numerically.
- **UI state** — presets drive the real controls through `loadUI`, and on-screen claims are checked against actual behaviour.
- **Rendering contracts** — the potential panel's y-axis never inverts and never clips the E² line, across ~600k (parameter, zoom) pairs; the triad arms point along the axes they label.
- **Layout** — the embed auto-height contract, and the CSS rules whose failure is silent (the vertical zoom rail's specificity, the touch-target floor).
- **Golden rule 1** — gzipped page budget and no allocation in the hot path.

Run it to see the current count; it is printed at the end.

**Add a test whenever you add physics.** The suite is mutation-tested — dropping the `(-1)^m` phase, weakening the `-3L²/r⁴` relativistic term, or raising `DPR_CAP` past budget each fail it.

**Known gap:** `Veff`/`accel` in [geodesic-explorer.html](geodesic-explorer.html) close over module-level `mu`/`L`, which the extractor cannot rebind. The landmark tests therefore re-derive those formulas, and a source-regex guard checks the tool's own definitions still match. A numerical mutation to `accel` is caught by that guard, not by the physics assertions. Refactoring these into pure `f(r, mu, L)` functions during the step-4 migration would close it.

## Known drift — resolved

The two existing tools had diverged through copy-paste. All reconciled:

| | Was | Now |
|---|---|---|
| `--panel` | `#111A29` / `#0d1626` | `#111A29` — it backs `.seg` buttons, shared chrome that must match |
| `.tool` max-width | 860px / 960px | 860px shared default; geodesic keeps 960px with a comment (two side-by-side panels) |
| DPR cap | 1.5 / 2 | **2** (`Viz.DPR_CAP`) |
| Frame cap | 32 ms / 28 ms | **32 ms** (`Viz.FRAME_MS`) |
| `prefers-reduced-motion` | honored / **not honored** | honored in both — geodesic now starts paused |

Once both tools are migrated onto the shared runtime these can no longer drift, since the values live in `tools/_shared.js`.

## Pre-ship checklist

- [ ] **Resource cost justified** — if the tool is heavier than the two existing ones, say why in the PR/commit, or cut back until it isn't
- [ ] Works standalone **and** at `?embed=1`
- [ ] Loop halts when scrolled off-screen and when the tab is backgrounded
- [ ] Idle state does not animate
- [ ] Frame rate and DPR capped; mobile tier reduces resolution
- [ ] No allocation in the render loop
- [ ] `prefers-reduced-motion` respected, static frame correct
- [ ] Landmark physics values land exactly where labeled
- [ ] Units and regime stated in the `.note`
- [ ] Controls have `aria-pressed` / visible readouts; drag works on touch
- [ ] Readable at 360 px wide
- [ ] No new runtime fetches
- [ ] `tools/build.py --check` clean and `tools/test.js` passing
- [ ] New physics has a test in [tools/test.js](tools/test.js)
