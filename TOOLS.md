# TOOLS.md — how to build a visualization tool for this site

Guidelines for adding interactive physics widgets to anujkankani.github.io. Read this before writing a new tool. [CLAUDE.md](CLAUDE.md) covers the site as a whole; this file covers the `*-visualizer.html` / `*-explorer.html` family specifically.

Reference implementations: [swsh-visualizer.html](swsh-visualizer.html) and [geodesic-explorer.html](geodesic-explorer.html). Their old copy-paste drift was reconciled on 2026-08-06 (see [Known drift](#known-drift--resolved)) and both now sit on the shared runtime, so they are worth reading as examples. Where this document and a tool still disagree, treat it as a bug in one of them and check which — `tools/test.js` is the tie-breaker, because it tests the shipped code.

## The three constraints

Everything below follows from these. If a proposed change violates one, it's the wrong change.

1. **It runs on a website.** Static hosting, GitHub Pages, no server. No backend, no API calls, no server-side rendering, no runtime data fetches.
2. **The visitor installs nothing.** These are widgets, not notebooks. No download step, no Python, no build tooling on the visitor's side. It works when they click a link, in whatever browser they already have.
3. **It is resource light.** The audience is on laptops and phones, and multiple tools may be alive on one page. Assume a mid-range Android on a warm battery, not a workstation.

Constraint 3 is the binding one and the easiest to violate accidentally. Payload is not the problem — the existing tools are 15–20 KB gzipped, and twenty of those still wouldn't matter. **The problem is CPU: unbounded animation loops, oversized canvases, and per-frame allocation.**

## Golden rules

Non-negotiable. A tool that breaks one of these doesn't ship.

1. **Resource-lightness is a top priority, not an optimization pass.** It ranks alongside correctness, above features and visual polish. The audience is on phones and laptops, and several tools may be alive on one page. When a feature and the frame budget conflict, the feature loses — cut it, simplify it, or make it opt-in. Rules 2–6 are the specific, checkable consequences of this one; when a situation isn't covered by them, this rule decides.
2. **Never animate off-screen.** Every rAF loop is gated on `inView` (via `IntersectionObserver`) *and* `!tabHidden` (via `visibilitychange`). A tool that keeps running when scrolled past is a battery bug, and it is the single most likely way to make a multi-tool page unusable. **`Viz.loop` owns this** — a tool does not wire the observers itself and its `shouldRun()` must not test visibility, or it duplicates the runtime's job. `Viz.loop`'s `start()` enforces it too, so calling the handle's `start()` directly is safe.
3. **Never animate when nothing is changing.** Idle means stopped, not "rendering the same frame at 60 fps." Static state after a control change → one `render()`, then halt.
4. **Change run state through `update()` on the loop handle**, wrapped as `updateRun()` by convention. It re-evaluates `shouldRun()` and renders one final frame when halting, so the static view stays correct. `start()` and `stop()` exist on the handle for the drag case; reaching for them elsewhere is how a loop leaks. Call `updateRun()` after *any* state change that could alter `shouldRun()`.
5. **Cap the frame rate and the device pixel ratio.** Physics widgets read fine at ~30 fps. Uncapped DPR on a 3× phone screen is a 9× fill-rate bill for no visible gain.
6. **Allocate nothing in the render loop.** Buffers, typed arrays, and scratch vectors are allocated once in `resize()` or at module scope and reused. No `new`, no array literals, no closures per frame.
7. **Honor `prefers-reduced-motion`.** Auto-spin, auto-play, and draw-in animations start disabled when it's set. The tool must still be fully usable and show a correct static frame.
8. **Every deployed `.html` file is self-contained.** Inline `<style>`, inline `<script>`, zero runtime fetches beyond the Google Fonts link. This is what makes each tool independently shareable and iframe-able.
9. **The physics is correct or the tool doesn't exist.** No fudged constants to make a picture look nicer. If a formula is approximated or a regime is outside its validity, say so in the `.note`. See [Physics rules](#physics-rules).

## Start from the template

```bash
cp tools/_template.html mytool-visualizer.html    # the suffix matters, see below
```

`tools/_template.html` carries the VIZ markers, the embed contract, `Viz.loop`
with stub `shouldRun`/`tick`/`render`, a mobile quality tier, `Viz.autoHeight()`,
the source/licence line and the full social-preview head. Fill in every `TODO:`
marker — `grep -n 'TODO:' mytool-visualizer.html` must come back empty, and a
check in `tools/test.js` fails if a deployed page still carries one.

Its VIZ blocks are **empty on purpose**: `python3 tools/build.py` fills them,
and leaving them empty means a forgotten build is obvious rather than subtle.
The template is not matched by build.py's globs, so it never goes stale itself.

**Name the copy `*-visualizer.html` or `*-explorer.html`.** Those are
`TOOL_GLOBS` in `tools/build.py`, and a page named anything else is skipped
**in silence** — the VIZ blocks stay empty, the page loads with no shared CSS
or runtime, and `build.py --check` still reports "up to date" because it never
looked at the file. If you want another name, add its glob first. After
building, confirm `build.py` names your file in its output.

Copying a sibling tool instead is how the DPR caps, palettes and frame caps
drifted between the first two tools in the same week. The template is the
common ancestor that stops that recurring.

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
  <script>  math → state → render → Viz.loop → controls → init
```

Script order in the tail matters and is the same in both existing tools: pure math functions first, then state, then render, then the `Viz.loop` call, then control wiring, then init (`resize()`, `reset()`, `updateRun()`, `Viz.autoHeight()`) as the last statements. **No observer wiring** — the runtime owns the `IntersectionObserver`, the `visibilitychange` handler and the debounced resize.

Write the physics as **pure functions of an explicit state** — `f(r, mu, L, a, E)`, not `f(r)` reading module-level globals. A closed-over function can only ever be tested at whatever state the UI happens to be in; see [Physics tests](#physics-tests).

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

**Do not hand-roll it.** `Viz.loop` in [tools/_shared.js](tools/_shared.js) owns
`running` / `raf` / `lastT` / `inView` / `tabHidden`, the `IntersectionObserver`,
the `visibilitychange` handler and the debounced resize. A tool supplies the
parts that are actually tool-specific:

```js
function shouldRun(){ return S.spin || S.drag; }   // "is anything moving?"

var anim = Viz.loop({
  shouldRun: shouldRun,      // visibility is ANDed in by the runtime
  tick: function(dt){ /* advance state; omit if render-only */ },
  render: render,            // required
  observe: stage,            // element whose visibility gates the loop
  resize: resize             // debounced; must leave a correct frame
});
function updateRun(){ anim.update(); }
```

**`shouldRun()` must not test `inView` or `tabHidden`.** The runtime ANDs those
in itself, so a tool cannot forget them — and repeating them here is the one
way to get the gating wrong in a direction the tests do not catch. Compare the
two shipped tools:

- SWSH: `S.spin || S.drag` — runs only while spinning or being dragged.
- Geodesic: `!S.paused && !done` — runs until the integration finishes.

The handle is `{ update, start, stop, isRunning(), destroy }`. Call
`update()` after any state change that could alter `shouldRun()`; it renders one
final frame when halting so the static view stays correct. `start()` honours the
visibility gate on its own, so the drag-start shortcut is safe. `destroy()`
disconnects the observer and removes both listeners.

Two contracts that are easy to break silently:

- **`resize()` must leave a correct frame.** The runtime calls it on a debounced
  window resize and does *not* render afterwards. It used to call `update()`
  there, which painted the same frame a second time whenever the loop was idle.
- **A drag that never ends pins the loop.** `shouldRun` in SWSH is
  `S.spin || S.drag` while `tick` is `if(S.spin && !S.drag)`, so a touch the
  system cancels leaves the loop running forever on a motionless sphere. Wire
  the release handler to `touchcancel`, `pointercancel` and window `blur` as
  well as `mouseup`/`touchend`.

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
- **`touch-action: none` on a drag surface stops the page scrolling past it.** The SWSH stage is ~440px of a ~660px iframe; with `none`, a phone user swiping over the sphere is stuck. It uses `pan-y` on coarse pointers: vertical swipes scroll the page, horizontal drags still rotate. Any large drag target needs the same treatment. A tool with **no** drag handlers needs no `touch-action` at all — the geodesic explorer has none, and that is correct, not an omission.

### Verifying touch behaviour

Headless Chrome reports `pointer: fine`, so the coarse-pointer rules never apply and measuring the page tells you nothing about them. Read the block out of the stylesheet and apply it yourself:

```js
[].slice.call(document.styleSheets).forEach(function (ss) {
  [].slice.call(ss.cssRules).forEach(function (r) {
    if (r.type === 4 && /pointer:\s*coarse/.test(r.conditionText || '')) {
      [].slice.call(r.cssRules).forEach(function (sub) {
        document.querySelectorAll(sub.selectorText).forEach(function (el) {
          el.style.cssText += ';' + sub.style.cssText;
        });
      });
    }
  });
});
```

That tests the rule rather than trusting that it exists. Then measure.

**Always wait for `document.fonts.ready` before measuring anything width-related.** Fallback font metrics are narrower than the webfont — a nav measured 60px narrower pre-webfont, which made it look like it fitted at a width where it did not, and would have set a responsive breakpoint too low. This applies to every measurement harness in this document.

**`backdrop-filter` needs the `-webkit-` prefix.** Unprefixed only shipped in Safari 18; on iOS 17 and earlier it is silently a no-op. Ship both declarations.

**iOS Safari cannot be tested from here.** It is WebKit and the local Chrome is Blink, so Android behaviour is genuinely verifiable and iPhone behaviour is not. For iOS, check statically instead: `playsinline` on every `<video>`, the `-webkit-` prefixes, and that no `vh` height survives into embed mode.

## Generated assets

Everything the browser fetches that is not hand-written is **generated by a
committed script and the output committed alongside it**, so an asset can be
regenerated rather than redrawn:

| generator | emits | notes |
|---|---|---|
| `tools/mkfigure_light.py` | the inline hero SVG | paste `hero-inline.svg` into `index.html` |
| `tools/mkphotos.py` | `assets/photo-*.jpg` | crops from the untracked `anuj_photos/`; `--check` verifies they are current |
| `tools/mkfav.js` | the favicon data URI | paste into all three pages |
| `tools/og-card.html`, `og-tool.html` | `assets/og-*.jpg` | rendered from the live pages |

The originals stay out of git — same rule as the video masters. What ships is
the derivative, and the recipe that produced it lives next to it in the
generator, including per-image crop anchors and any zoom.

## Source and licence

The code is MIT licensed ([LICENSE](LICENSE)); the site's prose, the explainer
videos and the manim sources are not, and the licence says so. Every standalone
tool ends with a `.srcline` linking its own file and the licence:

```html
<p class="srcline">Source: <a href="…/blob/main/mytool.html">mytool.html</a> ·
<a href="…/blob/main/LICENSE">MIT licensed</a> — self-contained, no
dependencies; save the page and it still runs.</p>
```

It is hidden under `body.embed` — the host page's "open full ↗" already leads
to the standalone page, which carries it. The rule lives in `tools/_shared.css`
so every tool gets it from the build. Being inline in a sentence, WCAG 2.5.8's
inline-in-text exemption applies and it needs no coarse-pointer sizing.

## Physics rules

These are research artifacts published under your name. Treat errors here as more serious than visual bugs.

- **Geometrized units, `G = c = M = 1`, throughout.** State the convention in the `.note` (e.g. "distances in units of the mass M, horizon at r = 2M").
- **Label the regime.** Which spacetime, which approximation, what's held fixed. Schwarzschild is not Kerr; equatorial is not generic.
- **Landmark values must be exact, not eyeballed:** ISCO at r = 6M, photon sphere at r = 3M, horizon at r = 2M, critical impact parameter b = 3√3 M ≈ 5.196M. If a rendered feature lands somewhere else, the integrator is wrong — not the label.
- **Integrators:** RK4 with a fixed step is the current standard (see [geodesic-explorer.html](geodesic-explorer.html)). Take several small substeps per frame rather than one huge step — `step()` there runs 18 for photons and 40 for massive particles — and keep the state vector allocation-free.
- **Verified math gets a comment saying so**, as `swsh()` does. Changing a function marked verified is a physics change: check it against known closed forms before committing, and say in the commit message what you checked against.
- **Decorative ≠ physical.** The chirp mark (removed from the homepage 2026-08-14, still used by the favicon and the social card) is hand-tuned illustration, not model output. Never let a decorative curve be mistaken for a result.

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

**Closed 2026-08-15 — and worth knowing how it failed.** `Veff`/`accel` used to close over module-level `mu`/`L`/`aSpin`/`Efix`, so the extractor could not rebind them and the suite re-derived the formulas locally, guarding the shipped code with a source regex. The cost was invisible until measured: with `geodesic-explorer.html` **deleted from the tree**, the `Schwarzschild landmarks` suite still reported *"all 14 checks passed"*, and two of those were tautologies (`Math.sqrt(12)**2 === 12`). The physics is now pure `f(r, mu, L, a, E)` with one-arg wrappers, and all four suites bind the shipped functions.

**The lesson generalises: a check that cannot fail is worse than no check**, because it reads as coverage. Two ways to find them — delete the file under test and see what still passes, and mutate the shipped code rather than the test's copy. A `source X matches the expected form` regex is a stopgap for code you cannot call; treat every one as a TODO against the signature.

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

## Social preview cards and the favicon

Every page carries `description` / Open Graph / `twitter:card` tags and an inline
SVG favicon. Two rules that fail *silently* if broken:

- **`og:image` must be an absolute URL.** Scrapers do not resolve relative
  paths; a relative one yields a card with no image and no error anywhere.
- **Keep the favicon a `data:` URI.** A `favicon.ico` file would be the first
  runtime fetch other than the font.

The three cards in `assets/og-*.jpg` are generated, not hand-drawn, so they
cannot drift from the pages they advertise. With `python3 -m http.server 8000`
running:

```bash
CHROME="/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"
shoot(){ "$CHROME" --headless --disable-gpu --hide-scrollbars \
  --screenshot="C:\\Users\\Public\\c.png" --window-size=1200,630 \
  --virtual-time-budget=9000 "$1" && \
  ffmpeg -y -v error -i /mnt/c/Users/Public/c.png -q:v 3 "$2"; }

shoot "http://localhost:8000/tools/og-card.html"            assets/og-home.jpg
shoot "http://localhost:8000/tools/og-tool.html?tool=swsh"  assets/og-swsh.jpg
shoot "http://localhost:8000/tools/og-tool.html?tool=geo"   assets/og-geodesic.jpg
```

`tools/og-tool.html` loads the **real widget** in a same-origin iframe and
crops to a measured element rect, so a card can never show a stale render or a
half-clipped control row. Three things it has to work around, the first two of
which cost an afternoon once:

- Headless Chrome's `prefers-reduced-motion` **is version-dependent — probe
  it, never assume it.** When these cards were built it reported `reduce`, so
  the geodesic tool started paused and the card showed a motionless particle
  with no trail. Re-measured 2026-08-15 on the Chrome here: default is
  `no-preference`, and `--force-prefers-reduced-motion` is what forces
  `reduce`. Both directions matter, so check before blaming your own code.
- `--virtual-time-budget` advances the clock without ticking rAF — 20 s of
  virtual time fired **6 frames**. So the trail is built by calling the tool's
  own `step()` in a loop and then `render()`, which is exact rather than
  timing-dependent, and reproduces byte-for-byte on re-run.
- Without an explicit `--window-size`, headless Chrome's viewport is
  **800×600**. Every capture and every layout measurement here passes one.

The favicon is the chirp mark with the cycle count cut until it survives
16 px. **The chirp is no longer drawn on the homepage** — it was replaced by
the split black-hole figure on 2026-08-14 — so the favicon and `og-home.jpg`
now advertise a figure the page does not contain. Open item in
[TODO.md](TODO.md): keep the chirp as the site's mark, or re-shoot the card
from the new hero.
Regenerate with `node tools/mkfav.js <outdir>`, then paste the contents of
`favicon-uri.txt` into the `<link rel="icon">` of all three pages.

## Pre-ship checklist

- [ ] **Resource cost justified** — if the tool is heavier than the two existing ones, say why in the PR/commit, or cut back until it isn't
- [ ] Works standalone **and** at `?embed=1`
- [ ] Loop halts when scrolled off-screen and when the tab is backgrounded (`start()` enforces this too, so calling it directly is safe)
- [ ] `resize()` leaves a correct frame — the runtime does not render after it
- [ ] Idle state does not animate
- [ ] Frame rate and DPR capped; mobile tier reduces resolution
- [ ] No allocation in the render loop — including array literals passed as *arguments* (`setLineDash([4,5])`) and canvas factory calls (`createRadialGradient`), both of which the guard was once blind to. Cache on change; the guard understands an `if (key !== cached) { ... }` block.
- [ ] `prefers-reduced-motion` respected, static frame correct
- [ ] Landmark physics values land exactly where labeled
- [ ] Units and regime stated in the `.note`
- [ ] Controls have `aria-pressed` / visible readouts; drag works on touch
- [ ] Readable at 360 px wide
- [ ] Coarse-pointer rules verified by applying them, not by assuming (see [Touch](#touch))
- [ ] Measured with `document.fonts.ready` resolved
- [ ] No new runtime fetches
- [ ] `description`, Open Graph and favicon tags present; `og:image` **absolute** and the file committed
- [ ] Source + MIT line present (`.srcline`), and hidden in embed mode
- [ ] No `TODO:` markers left from the template
- [ ] `tools/build.py --check` clean and `tools/test.js` passing
- [ ] New physics has a test in [tools/test.js](tools/test.js)
