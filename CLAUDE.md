# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Golden rules

These override anything else in this file.

1. **Never `git push`, `git pull`, or `git commit` without explicit permission.** Stage and describe the change, then wait to be asked. This includes amending, rebasing, and anything else that rewrites or publishes history.
2. **Never delete a file without explicit permission.** Ask first, and say what would be lost. Overwriting a file wholesale counts as deleting it.
3. **Triple-check the target before any delete, especially `rm -rf`.** List what the path actually matches *before* removing it, never after. Concretely:
   - Run `ls -la <path>` (or `git status`) first and read the output. If it isn't what you expected, stop.
   - Always absolute or explicitly-relative paths — never a bare variable (`rm -rf "$DIR"` deletes `/` when `DIR` is unset), never a glob you haven't expanded and inspected, never `rm -rf .` or `..`.
   - Delete the narrowest thing that does the job: one file over a directory, one directory over a parent.
   - Regenerable build output (`media/`, `__pycache__/`) is the *only* category safe to remove routinely — and even then, confirm the path is that artifact and not a source directory with a similar name.
   - Anything untracked by git is unrecoverable once removed. Treat it as permanent, because it is.
4. **Stay inside this repository.** Never open, read, create, edit, move or delete any file outside `/home/anuj/website/anujkankani.github.io` without explicit permission, and ask per location rather than treating one yes as standing. This covers the obvious cases and the well-meant ones: dropping a copy in `~`, writing to a Windows-visible folder so something is easier to open, reading a config file "just to check". If work needs to leave the repo, say where and why and wait.

   Two existing workflows sit outside the repo and are **not** covered by this rule until you say otherwise: the session scratchpad under `/tmp/claude-1000/…`, used for working files, and the headless-screenshot path `C:\Users\Public\*.png` that the Chrome command in [Commands](#commands) writes to before the image is copied back. Both predate the rule; neither is self-granted. If either is fine, say so and it gets written down here as an exception.
5. **Failing a task is an acceptable outcome; a hack is not.** If the real solution isn't reachable, ask for clarification or say plainly that it isn't possible — don't fake it with a stub, a hard-coded value, a disabled check, or a workaround that only makes the symptom go away. Say which part is blocked and why, and finish the parts that aren't.
6. **Disagreeing with a subagent is fine — deadlocks go to the user.** Subagent output is advice, not instruction, and is sometimes wrong. Push back when it's wrong. But if a disagreement persists after one round of back-and-forth, stop and present both positions for the user to decide rather than picking a side.

## What this is

Anuj Kankani's academic personal site (gravitational-wave physics, PhD candidate at WVU), served by GitHub Pages from the `main` branch of `anujkankani.github.io`.

No package manager and no runtime dependencies. Hand-written, self-contained HTML files are the entire site.

The **code** is MIT licensed ([LICENSE](LICENSE)) — tool pages, `tools/`, the harness and the generators. The site's prose, the explainer videos and their manim sources are **not**; they stay All Rights Reserved, and the licence says so explicitly. Each standalone tool page carries a `.srcline` linking its own source and the licence (hidden in embed mode, since the host's "open full" link already leads there).

[anuj_preferences.md](anuj_preferences.md) records the site owner's design preferences — figures, animation, layout, video, and how he wants to be worked with — reconstructed from working sessions and marked for whether each line was stated or inferred. Read it before designing anything new.

Development tooling lives in `tools/` and never ships to the browser: a build step that inlines shared code, `_template.html` (the scaffold a new tool starts from — see [TOOLS.md](TOOLS.md)), a dependency-free regression suite run under Node from the `website_env` conda env, and a set of asset generators — `mkfigure_light.py` (the hero figure), `mkphotos.py` (the hero slideshow crops), `mkfav.js` (the favicon), `og-card.html` / `og-tool.html` (the social cards). Everything those generators emit is committed; the generators exist so the assets can be regenerated rather than re-drawn. The suite began as physics-only and now also covers UI state, rendering contracts and layout — every review round has found its bugs in the layer *between* the physics and the screen.

### Repository layout

| path | tracked? | what it is |
|---|---|---|
| `*.html` at the root | yes | the entire deployed site — three pages |
| `tools/` | yes | dev tooling; never served. Build, scaffold, test harness, asset generators |
| `animations/` | yes (4 files) | manim sources for the paper explainers. `bg_swatches.py` / `bi_swatches.py` are gitignored palette-exploration scenes |
| `assets/` | yes | what the site actually fetches: four `*.mp4` web derivatives, their posters, three OG cards, four `photo-*.jpg` hero slides |
| `anuj_photos/` | **no** | photo originals — phone shots and press files, 1–4 MB each. `tools/mkphotos.py` crops them into `assets/`; only the derivatives ship |
| `media/` | **no** | manim render output. Regenerable; gitignored so renders never bloat the clone |
| `papers/` | **no** | reference PDFs used while building the animations. Gitignored deliberately — several are other authors' published papers |

[README.md](README.md) is the repo's front door — what the tools are, how to run them locally, and the reuse terms. It is the one doc aimed at a visitor rather than at whoever is editing the site, so keep it short and keep its claims true; it went a whole session saying no licence was attached after one had been.

Anything else at the root is either a doc or a scratch file. `_fit.html` is a working harness, not site content.

There is one build step, and it is optional-by-default: `tools/build.py` inlines shared CSS/JS into the interactive tool pages so they stay consistent without gaining a runtime dependency. It only touches files containing `<!-- VIZ:CSS -->` / `<!-- VIZ:JS -->` markers **and** matching `TOOL_GLOBS` (`*-visualizer.html`, `*-explorer.html`) at the repo root; [index.html](index.html) has its own styles and is deliberately outside the system. The glob is a trap worth knowing: a tool page named anything else is skipped *in silence*, its VIZ blocks stay empty, and `--check` still says "up to date" because it never looked. `tools/_template.html` is deliberately outside the globs for the same reason — so it cannot go stale. See [TOOLS.md](TOOLS.md).

## Commands

```bash
python3 -m http.server 8000    # then open http://localhost:8000
cp tools/_template.html mytool-visualizer.html   # new tool; the suffix is required (TOOL_GLOBS)
python3 tools/build.py         # inline shared tool CSS/JS after editing tools/_shared.*
python3 tools/build.py --check # exit 1 if any tool page is stale
python3 tools/mkphotos.py      # re-crop hero slideshow photos from anuj_photos/

# The CV the site serves is a COPY of the design's output, so re-render and
# re-publish are two steps. A check byte-compares them, because forgetting the
# second one leaves the site handing out a stale PDF with no visible symptom:
#   chrome --headless --print-to-pdf=<unc>\\cv.pdf localhost:8000/cv/design-4-scan/cv.html
cp cv/design-4-scan/cv.pdf AnujKankani-CV.pdf

# Node lives in the conda env `website_env` and is NOT on the default PATH:
NODE=/home/anuj/anaconda3/envs/website_env/bin/node
$NODE tools/test.js            # physics, UI, rendering and layout tests
$NODE tools/test.js swsh       # filter suites by substring
$NODE --check <file>           # JS syntax check
```

There is no `npm install` — the harness has no dependencies.

A local server is needed rather than `file://` because the tool pages are loaded into `index.html` through `<iframe>` and read `location.search`.

Deploy = commit to `main` and push. An empty `.nojekyll` at the repo root disables GitHub Pages' default Jekyll pass — the site is plain static HTML that Jekyll can only interfere with, most sharply by skipping paths beginning with `_` (`tools/_shared.css`, `tools/_shared.js`). Keep that file.

There is no CI, so verify before pushing — and run `tools/build.py --check` first if you touched `tools/_shared.*`.

**Visual checks are possible here.** Chrome is reachable from WSL and can screenshot headlessly, which is the only way to catch rendering bugs the test suite cannot see (a stretched sphere, a collapsed slider, a clipped iframe):

```bash
CHROME="/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"
"$CHROME" --headless --disable-gpu --hide-scrollbars \
  --screenshot="C:\\Users\\Public\\out.png" --window-size=1024,625 \
  --virtual-time-budget=9000 "http://localhost:8000/swsh-visualizer.html?embed=1"
```

One trap: **Chrome clamps its window to a minimum width of ~504px**, so `--window-size=390,...` silently renders a 504px-wide page and crops the screenshot to 390. That looks exactly like horizontal overflow and is not. To measure narrow viewports honestly, load the page in an `<iframe>` of the target width from a scratch harness page and read `getBoundingClientRect()` inside it.

## Architecture

Each deployed `.html` file is fully self-contained: inline `<style>`, inline `<script>`, no imports, no fetched assets. The only external request anywhere is the Google Fonts link. Deliberately keep it that way — do not introduce a bundler, framework, or CSS/JS files that the pages would have to fetch *at runtime*.

`tools/build.py` is compatible with this: it inlines shared source at build time and the committed output stays dependency-free. The rule is about what the visitor's browser fetches, not about whether a generator exists.

- [index.html](index.html) — the whole site. Nav, hero, and eight sections: About me / Research / Publications / BOB / Explainers / Software / Widgets / Contact. Section `id`s are the anchor targets in the nav, so renaming an `id` means updating `.nav-links` — the ids are `about`, `research`, `publications`, `bob`, `explainers`, `software`, `widgets`, `contact`. Note `contact` is on the `<footer>`, not a `<section>`. Grepping `<section id=` returns **eight** matches: seven live sections plus `random`, which is commented out — so the count matches neither the nav (eight entries) nor the live sections (seven). Check what you matched before trusting it. The nav order follows document order, so moving a section means editing both. Awards and talks live at the *tail of the Publications section* under a `.sub-head`, so papers come first; there is no separate Recognition section and no nav entry for them. (Random is written but commented out — see Content editing.)
- [swsh-visualizer.html](swsh-visualizer.html) — s = −2 spin-weighted spherical harmonic viewer (2D canvas, custom projection + z-buffer splatting into an offscreen square buffer). `RES` is chosen per resize from the drawn square and the detail tier — 244 / 312 / 332 / 452 — so the cost is independent of display size. The buffer is blitted **letterboxed** into a centred square: the stage box is not square (`width:100%` is definite, so `aspect-ratio` derives the height and `max-height` clamps only that), and stretching it to the box renders the sphere as an ellipse.
- [geodesic-explorer.html](geodesic-explorer.html) — **equatorial Kerr** geodesics (Schwarzschild is the a = 0 case): RK4 orbit integration plus an effective-potential panel, on two canvases.

### Theming

`index.html` supports light and dark; the two tool pages are dark-only by design (they render onto a dark `--bg` and sit inside a dark `.tool-embed` frame in both site themes).

Theme is applied via `data-theme="light"|"dark"` on `<html>`. An inline script in `<head>` sets it *before* first paint from `localStorage.theme`, falling back to `prefers-color-scheme` — keep that script inline and first, or the page flashes. `#themeToggle` flips the attribute and writes back to `localStorage` inside a `try/catch` (sandboxed previews block storage). All colors go through CSS custom properties defined in the `:root` / `:root[data-theme="dark"]` pair; add new colors as variables in both blocks rather than hard-coding hex values.

That inline script also owns `<meta name="theme-color">`, through `window.__applyTheme(t)` — the toggle calls the same function. This must not become a `media="(prefers-color-scheme: …)"` pair, which would keep reporting the *system* colour after the user has explicitly toggled.

### Search and social preview

All three pages carry `description` / Open Graph / `twitter:card` / `canonical` tags and an inline SVG favicon. Two things fail **silently** if changed: `og:image` must be an **absolute** URL (scrapers do not resolve relative paths and report nothing), and the favicon must stay a `data:` URI (a `favicon.ico` would be the first runtime fetch other than the font). Both are covered by the `every page :: social preview and favicon` suite.

The cards in `assets/og-*.jpg` are **generated from the live pages**, not hand-drawn — `tools/og-card.html` and `tools/og-tool.html` render the real widget in a same-origin iframe and crop to a measured element rect. Regeneration commands, and the headless-Chrome traps involved (`--virtual-time-budget` advances the clock without ticking rAF; the default viewport is 800×600; and `prefers-reduced-motion` **must be probed, not assumed** — it reported `reduce` when the cards were built and reports `no-preference` as of 2026-08-15), are in [TOOLS.md](TOOLS.md).

### The embed contract between the site and the tool pages

`index.html` embeds each tool as `<iframe src="tool.html?embed=1" loading="lazy">`. Each tool page has a one-line script right after `<body>`:

```js
if(location.search.indexOf('embed')>-1)document.body.classList.add('embed');
```

The `body.embed` CSS rules strip the tool's own heading and footnote (the site supplies the title in `.tool-cap`), remove the background and border, and shrink the canvas panels. Standalone (no query string), the same file renders as a full page with its own header. When changing a tool's layout, check both modes.

**Iframe height is automatic.** Each tool calls `Viz.autoHeight()` at the end of its init; embedded, it measures its own content and posts the height to `index.html`, whose listener sizes the matching iframe. Do not hand-tune iframe heights to fit content — content height depends on how the control rows wrap, and that is *not* monotonic in viewport width (the geodesic tool is 1076px tall at 320px wide but 692px at 700px), so every fixed number clips at some width. The `.tool-embed iframe` heights in `index.html` are the no-JS floor only; keep them generous.

Two constraints that make this work, and would break it silently:

- Measure the **body box**, never `documentElement.scrollHeight` — the latter is clamped to at least the viewport, which inside an iframe is the frame's own height, so the reported height becomes a ratchet that grows but never shrinks.
- Embed panel heights must be **fixed px** (they are: `body.embed .panel.orbit{height:360px}` and friends). A panel sized in `vh` would feed the frame height back into the measurement.

### Animation loop pattern (both tool pages)

Both tools drive the shared `Viz.loop()` from `tools/_shared.js`, which owns `running`/`raf`/`lastT`/`inView`/`tabHidden`, the `IntersectionObserver`, the `visibilitychange` handler and the debounced resize. A tool supplies `shouldRun()` — "is anything moving?" — and the runtime ANDs visibility in itself, so a tool cannot forget it. The rAF loop must not run when the iframe is offscreen or the tab is hidden; this matters because two canvas tools are embedded on one page. After mutating any state that could change `shouldRun()`, call `updateRun()` (which is `anim.update()`) rather than starting a loop directly; it also does a single `render()` when stopping so the static frame stays correct.

A live example of why: in the SWSH viewer `shouldRun` is `S.spin || S.drag` while `tick` is `if(S.spin && !S.drag)`. A drag that never ends — a touch the system cancels — leaves the loop running forever on a motionless sphere, so `up()` is wired to `touchcancel`, `pointercancel` and window `blur` as well as `mouseup`/`touchend`.

Two guarantees live in `Viz.loop` rather than in the tools. `start()` refuses while off-screen or backgrounded — it is public, and swsh calls it directly on drag start, so checking only `running`/`destroyed` left a hole in rule 2. And the debounced resize path calls `opts.resize()` then re-evaluates the run state **without rendering again**: the contract is that `resize()` leaves a correct frame, which is what both tools do. It used to call `update()` there, painting the same frame twice (three times in swsh, whose `resize()` also called `updateRun()`).

Both also honor `prefers-reduced-motion`: the SWSH viewer disables auto-spin. `index.html` honors it too, but by a different mechanism — its hero figure is animated in **CSS**, not rAF, so the query is a media block that sets `animation:none` and pins each element in its finished state (see The hero figure).

### Physics conventions

Geometrized units, `G = c = M = 1`, throughout the tool pages.

[geodesic-explorer.html](geodesic-explorer.html) is **equatorial Kerr** in Boyer–Lindquist coordinates, following Bardeen, Press & Teukolsky (1972). The spin is along +z by construction and every orbit is confined to θ = π/2, so there is no orbital-plane precession anywhere in the tool. `mu` is the rest-mass flag (`1` massive / `0` photon) rather than a mass, and `L` is angular momentum per unit mass:

```
Delta = r² − 2r + a²           horizon at r₊ = M + √(M² − a²)
Veff(r) = mu − 2mu/r + (L² + a²(mu − E²))/r² − 2(L − aE)²/r³
accel   = −mu/r² + (L² + a²(mu − E²))/r³ − 3(L − aE)²/r⁴   = −½ dVeff/dr
dphi/dtau = [2aE/r + (1 − 2/r)L] / Delta
```

Canvas sizing in both tools goes through `Viz.canvas`, which re-reads `devicePixelRatio` on every call — a DPR captured once at load leaves the backing store wrong after a browser zoom or a move between monitors, both of which fire resize. The physics is written as **pure functions of an explicit state** — `veffOf(r, mu, L, a, E)`, `accelOf(...)`, `dphidtauOf(r, L, a, E)`, `deltaOf(r, a)` — with one-arg `Veff(r)` / `accel(r)` / `dphidtau(r)` wrappers that supply the current module state and are what the rest of the file calls. (A `Delta(r)` wrapper existed too and was removed — it was the only one with no caller in the page; `dphidtauOf` calls `deltaOf` directly.) Keep new physics in that shape: the closed-over version could only be tested at whatever state the UI happened to be in, so the suite carried its own reimplementation and checked the shipped code with a source regex. A check drives the live UI through several states and asserts the wrappers forward faithfully, since that is the seam the split introduces.

Two consequences worth holding on to. **Veff depends on E as well as L** — the frame-dragging cross-term does not separate — so the plotted curve moves when the energy changes, and the "release from rest" condition `E² = Veff(r₀; E)` is implicit rather than a substitution (`energyAtRest()` is its closed-form root). And the spin slider is **≥ 0**: orbit sense is a separate `S.pro` flag, because `rISCO` is even in `a`, so inferring sense from `sign(a·L)` once drew the wrong ISCO.

The SWSH formula in [swsh-visualizer.html](swsh-visualizer.html) is the standard Goldberg sum with a precomputed factorial table. Treat changes to `swsh()` as a physics change and check against known closed forms before committing. Its coordinate mapping is `(X, Z, −Y)` — the third component is negated so the basis has determinant +1; a mirrored figure reverses the apparent handedness of ±m, which for s = −2 *is* the circular polarisation.

### The hero slideshow

The column right of the name runs a four-**scene** cross-fade on an 18 s cycle
(4 × 4.5 s). A scene is either two portraits side by side, or one landscape
photograph spanning both columns. The two landscapes lead the cycle. `tools/mkphotos.py` crops originals from the
gitignored `anuj_photos/` into `assets/photo-*.jpg`; ~233 KB for six, at JPEG
quality **76** rather than the usual 82 — at 82 a seven-photo set reached
345 KB, more than ten times the gzipped page, and all of it is fetched on load
while the videos below are lazy. Drop the quality again before adding many
more.

The layout is a CSS grid with every item placed in row 1, so slides overlap and
cross-fade in place while the row height comes from the items themselves. Row 2
is the credit line. `--ns` is the scene count, `--s` the scene each item belongs
to, and pictures and credits share one animation keyed on `--s` — which is what
keeps a credit on screen exactly while its own photograph is.

Six things are load-bearing:

- **Portraits are 2:3, not 3:4.** Every portrait original sits between 0.630
  and 0.751, three of them at 0.63–0.67, so a 3:4 frame cut 12–16% off their
  height and was clipping heads and badges. Match the frame to what the
  photographs actually are.
- **Landscape photographs get a landscape slide.** Two of the six are natively
  wide (1.50 and 1.33). Forcing them into a portrait box threw away the
  subject — the blackboard in one, the room in the other — and needed a hard
  anchor to keep any of it. They now span both columns at `aspect-ratio:1.388`,
  which is `(2·col + gap) / (1.5·col)`: exactly as tall as the portraits beside
  them, so the row height never changes between scenes.
- **Size by one dimension plus a ratio, never two.** `width:100%` *and*
  `height:100%` makes the browser ignore `aspect-ratio`, and with an auto row
  height the pictures resolved to about 3:8 and ran 490px tall.
- **Credits are scoped to what they credit.** A wide slide takes the full
  width; a pair where only one photograph is credited takes just that column,
  because a full-width line under two pictures reads as crediting both. Two
  lines are reserved either way so nothing shifts.
- **The keyframe percentages are not derived from `--ns`.** A scene's window is
  100/ns percent and CSS cannot compute a keyframe offset from a variable, so
  adding a scene means editing `@keyframes slidefade` by hand. A check asserts
  the last stop equals 100/`--ns`.
- **The no-animation fallback pins scene 0 by CLASS (`.s0`), not position.**
  Scenes hold different numbers of items, so counting elements was wrong the
  moment a single wide slide appeared.

It sits in a flex row (`.hero-top`) beside `.hero-copy` — an earlier absolutely
positioned version centred on `.wrap`, which contains the *figure* too, and hung
115px past the divider. Hidden at ≤900px, a third breakpoint independent of the
nav's 1007px and the figure's 700px. The slideshow costs the first screen about
78px (nav + hero 602 → 680 at 1440×900); still inside budget everywhere, worst
case 640 of 720 at 1280×720.

**Credits.** Some photographs carry an on-page credit line; which ones, and the
exact wording, live in the `CREDIT` map in `tools/mkphotos.py` next to the crop
recipe. That map is now the *only* place photographers are named — [LICENSE](LICENSE)
describes the carve-out for third-party photographs but deliberately names no
one, pointing at the on-page credit lines instead. Add a photograph to `CREDIT`
and the credit follows it into the slideshow; nothing else needs editing.

### The hero figure

Since 2026-08-14 the hero carries `.hero-fig`: one black hole bisected, the gravitational-wave description on the left (a single wave leaving along the axis) and the plasma one on the right (a conical accretion flow with particles accelerated at its boundary). It replaced the chirp band.

It is generated by `tools/mkfigure_light.py` (`variant_hero`) and **inlined**, not referenced, so the page still fetches nothing but the font. Two things make it work and are covered by the `index.html :: hero figure` suite:

- **Its colours are CSS custom properties, not hex.** The generator emits a hard-coded light build *and* a themed one (`hero-inline.svg`); only the themed one belongs in the page. Pasting the standalone build back in would leave a cream figure sitting on the dark theme. `--ink` draws the outlines and flips light on a dark page; `--field` fills the hole and is near-black in *both* palettes, which is why the two are separate constants in the generator.
- **viewBox, no fixed width/height.** Rendered height is width ÷ *viewBox* aspect, so width is the only size knob — never add a height, and never reach for `preserveAspectRatio="slice"` to make it fit (an earlier version did, and threw away ~45% of the drawing). The artwork carries no text, so the "this is an illustration" note and the description for screen readers both live in the SVG's `aria-label`.

Regenerate with `python3 tools/mkfigure_light.py <outdir>` and paste `hero-inline.svg` into the `.hero-fig` div.

**Sizing, as of 2026-08-15.** The `.hero-fig` *box* is full-bleed (`width:100vw; margin-left:calc(50% - 50vw)`) so its `border-top` reads as the rule dividing the hero text from the figure; the *SVG inside it* is `width:70%; margin:0 auto`. The two are deliberately separate. Full-bleed is only safe because `.hero` sets `overflow:hidden` — `100vw` includes the scrollbar, so without it the page scrolls sideways by ~15px. The 70% reverts to 100% under `max-width:700px`: the shrink exists to reclaim desktop gutters, and a phone has none, where 70% renders the figure only ~64px tall.

The whole header is sized to a budget: **nav + hero must fit the first screen without scrolling.** At 1440×900 that is nav 61 + hero text 287 + figure block 254 (a 235px SVG plus its rule and padding) = 602px of a 900px viewport. The hero type scale (`h1` `clamp(26px,4.2vw,46px)`, thesis `clamp(15px,1.7vw,17px)`) and the figure's 70% are both set from that budget, not from taste — re-measure across the viewport matrix before enlarging either. The artwork is a wide format (~4.3:1) precisely so a full-width figure costs little height; the generator flattens the cone and the wave and crops the viewBox to the drawn content to get there.

**The figure is animated, in CSS.** `.figanim` on the same div drives a **17 s** cycle: the wave draws in by `stroke-dashoffset` (`railwave`), the jet is revealed by a growing `clipPath` circle (`jetgrow`, r 80 → 740 over the first 41.5% of the cycle) and faded in (`jetfade`), and the boundary particles drift outward on their own 3 s loop (`railesc`) inside a 17 s envelope (`escenv`). Four things here are load-bearing:

- **What keeps particles behind the jet front is the shared clip, not the delays.** `<g class="escs">` carries the same `clip-path="url(#hjet)"` as the jet, so the growing reveal circle gates the particles geometrically on every cycle. This is load-bearing: `animation-delay` applies to an animation's **first iteration only**, and the particle drift loop (3 s) does not divide the cycle (17 s), so from cycle 2 the delays mean nothing. Measured before the fix on 2026-08-15: 3 of 5 particles painted ahead of the front at t = 17.3 s, all 5 by t = 34.4 s. `--esc-delay` is now a refinement — it starts each particle's drift as the front arrives — not the gate.
- **The generator and the CSS share constants that are duplicated, not imported.** `REVEAL_R0/REVEAL_R1` and `EMERGE_FRAC × CYCLE_S` in `tools/mkfigure_light.py` set each `--esc-delay` from that particle's distance. The same numbers appear in `@keyframes jetgrow`. The suite asserts all three agree **and** re-derives every baked `--esc-delay` from the pasted SVG's own particle coordinates — because the generator and the CSS can agree perfectly while `index.html` carries a stale paste, which is the drift that actually happens.
- **`REVEAL_R1` is the *measured* extent of the artwork (740), not a round number.** It was 1500, which outran the drawing: the reveal stopped uncovering anything at 22.4% of the cycle instead of at `EMERGE_FRAC`, the tail of the sweep was dead time, and the jet finished *before* the wave. Too small is a different and worse failure — anything past `R1` is clipped forever — so a check brackets it on both sides against the drawn extent, escapee drift included.
- **Pacing lives in `EMERGE_FRAC`, and it has moved.** 0.54 originally, 0.415 since 2026-08-15 when the jet was sped up 30% by request. The jet cone now completes at ~38% of the cycle against the wave's 27%, i.e. ~1.4× the wave's time, down from ~1.8×. The test asserts only that the jet finishes clearly *after* the wave (>1.25×) — the ordering is the invariant, the ratio is a design choice. Change `EMERGE_FRAC` in the generator, the matching `@keyframes jetgrow` percentage, then **regenerate and re-paste the figure**: the particle delays are derived from it.
- **`animation-fill-mode:backwards` on `.esc` is required**, not stylistic: without it a particle renders in its base opaque state *during* its delay, which is exactly the artefact the delay exists to prevent.
- **`--len` is measured in JS**, not by the generator — an IIFE reads `getTotalLength()` off `.gw-wave` and sets the custom property, because the dash length has to be the path's real length.
- **It pauses off-screen.** An IntersectionObserver toggles `.is-paused`, and `.figanim.is-paused *{animation-play-state:paused}` reaches the descendants because play-state does not inherit to elements carrying their own animation.

The 85% → 92% band in every keyframe is a deliberate **hold**: the wave and jet sit finished while only the particles keep moving, before everything fades and restarts.

Scroll-rail copies of this figure in the page gutters were built and then **removed** on 2026-08-15 (animated, then static, then dark-mode-only, then cut). `variant_rail()` and `RAIL_LABEL` survive in the generator but nothing on the site uses them. A check asserts no rail markup, CSS or JS comes back by accident — note it is a *string* guard, and the first version grepped only `scroll-rail`, which is why `--rail-shift` and `.is-hidden` survived the removal for a day. It now covers all three.

The chirp's **markup was removed** (recover it from commit `7b35225` if ever wanted); its **generator is still in the file, commented out**. That generator must stay commented rather than merely inert: with the SVG gone, `getElementById('chirpPath')` returns null and the next line throws, taking out every script below it in the same block (theme toggle, nav, iframe auto-height). The `.wave-wrap` CSS is now dead too and is marked as such.

The chirp was *illustrative only* — hand-tuned, not BOB output. It still appears in the favicon and the `og-home.jpg` social card, which are generated separately — so **the social card no longer matches the page it advertises**. Worth deciding whether the chirp stays the site's mark or the cards get regenerated from the new figure.

### Responsive and touch

Five rules here were each a shipped bug; changing any of them back reintroduces it.

**The nav's scrollable breakpoint is `max-width:1007px`, and it is a measured number, not a round one.** The desktop nav needs 1008px: brand 98 + links 690 + **three** 34px controls + their 8px cluster gaps + a 20px gap + the wrap's 56px padding. The number is a function of what is in the bar and has moved twice: 924px with one toggle, 966px when the type toggle arrived, 1008px with the newspaper link. At the `.nav-right` gap of 20px the third control needed 1020px — four pixels past iPad landscape — which is why `.nav-tools` tightens the gap *between* the icons to 8px while leaving 20px to the links. It used to be 720px, which left the whole **721–919px** band broken — the links wrapped onto two lines throughout it, and below ~850px the nav also pushed the page into horizontal scroll with the theme toggle off-screen. 768px (iPad portrait) sat squarely inside that. Below the breakpoint the links get `white-space:nowrap` and the strip scrolls horizontally; both halves are required.

**The slideshow stacks below 900px rather than disappearing.** It was `display:none` there, which meant every photograph was invisible on phones — where most visitors are. The row becomes a column, the band goes full width capped at 380px, and the hero grows from ~530 to ~840px at 390×844. That still fits an iPhone 13 but not an iPhone SE, so on mobile the fold budget is a soft target rather than the hard constraint it is on desktop.

**Touch targets key off `pointer: coarse`, never a width breakpoint** — a narrow desktop window still has a mouse. Both tool pages get this from `tools/_shared.css`; `index.html` has its own block (nav links, theme toggle, widget "open full" links, the hero CTAs, and the standalone arXiv links under each publication and explainer), added after they measured 16–34px at 390px, under even WCAG 2.5.8's 24px floor. Two things make that block work: those arXiv links need `display:inline-block` before padding grows the hit area at all, and the CTA rule must be `.cta-row .btn` because the base `.btn` uses a `padding` shorthand declared later — a media query adds no specificity. Everything now measures ≥44px.

The SWSH stage also takes a **per-gesture axis lock**: a drag accumulates raw movement until it clears 6px, picks horizontal or vertical from the dominant component, and ignores the other axis for the rest of the gesture. `touch-action: pan-y` alone is not enough — the browser only hands a vertical swipe back to the page after the first few `touchmove`s have already been delivered, and those were tilting the sphere before `pointercancel` arrived. Reasoned, not device-verified.

**The hero figure's 70% width stops at `max-width:700px`.** It is a second, independent breakpoint from the nav's 1007px and they are not interchangeable — one is about how much horizontal room the nav needs, the other about when shrinking an already-small figure starts hurting. See The hero figure.

**`backdrop-filter` needs the `-webkit-` prefix.** Unprefixed only shipped in Safari 18, so on iOS 17 and earlier the sticky nav's blur is silently a no-op. Both declarations are present in `index.html` and `swsh-visualizer.html`.

**An `auto-fit` track minimum is a floor, not a preference.** `repeat(auto-fit, minmax(290px, 1fr))` will not let a track go below 290px, so it overflows any container narrower than that — which at 320px is every column on the page. That was the site's last horizontal scroll: `.exp-grid` overflowing by exactly `20 + 290 − 305 = 5px`. Write `minmax(min(290px,100%),1fr)` so the track can yield to the column.

Verified across ten device viewports (iPhone SE/13/14 Pro Max, Pixel 5, Galaxy S8/A, both landscapes, both iPad orientations) plus 320px: no horizontal scroll anywhere, nav on-screen, and every widget iframe sized exactly to its content.

**Two measurement traps** when checking any of this:

- **Wait for `document.fonts.ready` before measuring.** Fallback metrics are narrower — the nav measured 60px narrower pre-webfont, which made it look like it fitted at 860px when it does not. Getting this wrong sets the breakpoint too low.
- Headless Chrome reports `pointer: fine`, so the coarse-pointer rules never apply. To test them, read the `@media (pointer: coarse)` block out of `document.styleSheets` and apply its declarations to the matched elements — that tests the rule instead of trusting it exists.

**iOS Safari cannot be tested here.** It is WebKit; the local Chrome is Blink, so Android behaviour is genuinely verifiable and iPhone behaviour is not. What is checked for iOS is static: `playsinline` on every `<video>` (without it iOS takes video fullscreen), the `-webkit-` prefixes, and that the tool pages' `vh` heights are overridden by fixed px in embed mode so the URL-bar viewport quirk cannot feed back into iframe sizing. Rendering of the inline SVG hero, its CSS animation (in particular `@keyframes jetgrow`, which animates the SVG geometry property `r` as a CSS property — verified in Blink, *unverified* in WebKit; if it no-ops there the jet will simply appear whole rather than grow, which degrades acceptably), and the vertical zoom rail's `writing-mode` path remain unverified on a real device.

## Content editing

Publications, talks and awards are plain HTML blocks meant to be duplicated — `.pub`, `.talk`, `.award`. Several carry HTML comments explaining how (e.g. the awards/talks block inside Research names which column is which). Preserve those comments — they're the editing instructions for the site's owner.

The **Random** section is written but wrapped in an HTML comment, and its nav link removed — it held placeholder cards with dead links. The CSS is still live, so restoring it is a comment-delete plus re-adding the nav link. Instructions are in the comment itself; keep them.

Placeholders that used to sit in [index.html](index.html) are now filled: the ORCID, the author profile link (Google Scholar was replaced by INSPIRE-HEP) and `CV.pdf`, which 404'd for months while being linked twice and is now `AnujKankani-CV.pdf` — named for what lands in a visitor's Downloads folder, not for what it is called in `cv/`. A `figures/` directory is referenced only from inside the commented-out Random section, and does not exist yet.

**Deployed video IS tracked** (`assets/*.mp4`, ~5.6 MB for four files); the manim masters under `media/` are not. What ships is a web derivative — 30 fps, CRF 26, about 66% smaller than the 1080p60 master and visually identical on slide content. The re-encode command is in `.gitignore` next to the rule. Re-render freely; only re-encode into `assets/` when the deployed version should change, since each one is a new blob in history.

Four videos are referenced: the BOB overview in `#bob`, and three paper explainers in `#explainers`. Posters are tracked too (~36 KB each).

To add an explainer: duplicate a `.exp-item`, point `<source>` and `poster` at the new files, link the arXiv entry. Generate the poster from the render with `ffmpeg -ss <t> -i <render>.mp4 -frames:v 1 -vf scale=1280:-1 -q:v 4 assets/<name>-poster.jpg`, choosing a moment where a slide is fully built rather than mid-transition.
