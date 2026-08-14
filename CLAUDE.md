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
4. **Failing a task is an acceptable outcome; a hack is not.** If the real solution isn't reachable, ask for clarification or say plainly that it isn't possible — don't fake it with a stub, a hard-coded value, a disabled check, or a workaround that only makes the symptom go away. Say which part is blocked and why, and finish the parts that aren't.
5. **Disagreeing with a subagent is fine — deadlocks go to the user.** Subagent output is advice, not instruction, and is sometimes wrong. Push back when it's wrong. But if a disagreement persists after one round of back-and-forth, stop and present both positions for the user to decide rather than picking a side.

## What this is

Anuj Kankani's academic personal site (gravitational-wave physics, PhD candidate at WVU), served by GitHub Pages from the `main` branch of `anujkankani.github.io`.

No package manager and no runtime dependencies. Hand-written, self-contained HTML files are the entire site.

Development tooling lives in `tools/` and never ships to the browser: a build step that inlines shared code, and a dependency-free regression suite run under Node from the `website_env` conda env. The suite began as physics-only and now also covers UI state, rendering contracts and layout — every review round has found its bugs in the layer *between* the physics and the screen.

There is one build step, and it is optional-by-default: `tools/build.py` inlines shared CSS/JS into the interactive tool pages so they stay consistent without gaining a runtime dependency. It only touches files containing `<!-- VIZ:CSS -->` / `<!-- VIZ:JS -->` markers; [index.html](index.html) has its own styles and is deliberately outside the system. See [TOOLS.md](TOOLS.md).

## Commands

```bash
python3 -m http.server 8000    # then open http://localhost:8000
python3 tools/build.py         # inline shared tool CSS/JS after editing tools/_shared.*
python3 tools/build.py --check # exit 1 if any tool page is stale

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

- [index.html](index.html) — the whole site. Nav, hero, and eight sections: About me / Research / Publications / BOB / Explainers / Software / Widgets / Contact. Section `id`s are the anchor targets in the nav, so renaming an `id` means updating `.nav-links` — the ids are `about`, `research`, `publications`, `bob`, `explainers`, `software`, `widgets`, `contact`. Note `contact` is on the `<footer>`, not a `<section>`, so grepping `<section id=` finds only seven. The nav order follows document order, so moving a section means editing both. Awards and talks live at the *tail of the Publications section* under a `.sub-head`, so papers come first; there is no separate Recognition section and no nav entry for them. (Random is written but commented out — see Content editing.)
- [swsh-visualizer.html](swsh-visualizer.html) — s = −2 spin-weighted spherical harmonic viewer (2D canvas, custom projection + z-buffer splatting into an offscreen square buffer). `RES` is chosen per resize from the drawn square and the detail tier — 244 / 312 / 332 / 452 — so the cost is independent of display size. The buffer is blitted **letterboxed** into a centred square: the stage box is not square (`width:100%` is definite, so `aspect-ratio` derives the height and `max-height` clamps only that), and stretching it to the box renders the sphere as an ellipse.
- [geodesic-explorer.html](geodesic-explorer.html) — **equatorial Kerr** geodesics (Schwarzschild is the a = 0 case): RK4 orbit integration plus an effective-potential panel, on two canvases.

### Theming

`index.html` supports light and dark; the two tool pages are dark-only by design (they render onto a dark `--bg` and sit inside a dark `.tool-embed` frame in both site themes).

Theme is applied via `data-theme="light"|"dark"` on `<html>`. An inline script in `<head>` sets it *before* first paint from `localStorage.theme`, falling back to `prefers-color-scheme` — keep that script inline and first, or the page flashes. `#themeToggle` flips the attribute and writes back to `localStorage` inside a `try/catch` (sandboxed previews block storage). All colors go through CSS custom properties defined in the `:root` / `:root[data-theme="dark"]` pair; add new colors as variables in both blocks rather than hard-coding hex values.

That inline script also owns `<meta name="theme-color">`, through `window.__applyTheme(t)` — the toggle calls the same function. This must not become a `media="(prefers-color-scheme: …)"` pair, which would keep reporting the *system* colour after the user has explicitly toggled.

### Search and social preview

All three pages carry `description` / Open Graph / `twitter:card` / `canonical` tags and an inline SVG favicon. Two things fail **silently** if changed: `og:image` must be an **absolute** URL (scrapers do not resolve relative paths and report nothing), and the favicon must stay a `data:` URI (a `favicon.ico` would be the first runtime fetch other than the font). Both are covered by the `every page :: social preview and favicon` suite.

The cards in `assets/og-*.jpg` are **generated from the live pages**, not hand-drawn — `tools/og-card.html` and `tools/og-tool.html` render the real widget in a same-origin iframe and crop to a measured element rect. Regeneration commands, and the two headless-Chrome traps involved (`prefers-reduced-motion` is reported as `reduce`, and `--virtual-time-budget` advances the clock without ticking rAF), are in [TOOLS.md](TOOLS.md).

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

Both also honor `prefers-reduced-motion`: the SWSH viewer disables auto-spin. `index.html` used to skip the hero chirp's stroke-dash draw-in; the chirp has since been replaced by a static figure, so the homepage no longer animates anything.

### Physics conventions

Geometrized units, `G = c = M = 1`, throughout the tool pages.

[geodesic-explorer.html](geodesic-explorer.html) is **equatorial Kerr** in Boyer–Lindquist coordinates, following Bardeen, Press & Teukolsky (1972). The spin is along +z by construction and every orbit is confined to θ = π/2, so there is no orbital-plane precession anywhere in the tool. `mu` is the rest-mass flag (`1` massive / `0` photon) rather than a mass, and `L` is angular momentum per unit mass:

```
Delta = r² − 2r + a²           horizon at r₊ = M + √(M² − a²)
Veff(r) = mu − 2mu/r + (L² + a²(mu − E²))/r² − 2(L − aE)²/r³
accel   = −mu/r² + (L² + a²(mu − E²))/r³ − 3(L − aE)²/r⁴   = −½ dVeff/dr
dphi/dtau = [2aE/r + (1 − 2/r)L] / Delta
```

Two consequences worth holding on to. **Veff depends on E as well as L** — the frame-dragging cross-term does not separate — so the plotted curve moves when the energy changes, and the "release from rest" condition `E² = Veff(r₀; E)` is implicit rather than a substitution (`energyAtRest()` is its closed-form root). And the spin slider is **≥ 0**: orbit sense is a separate `S.pro` flag, because `rISCO` is even in `a`, so inferring sense from `sign(a·L)` once drew the wrong ISCO.

The SWSH formula in [swsh-visualizer.html](swsh-visualizer.html) is the standard Goldberg sum with a precomputed factorial table. Treat changes to `swsh()` as a physics change and check against known closed forms before committing. Its coordinate mapping is `(X, Z, −Y)` — the third component is negated so the basis has determinant +1; a mirrored figure reverses the apparent handedness of ±m, which for s = −2 *is* the circular polarisation.

### The hero figure

Since 2026-08-14 the hero carries `.hero-fig`: one black hole bisected, the gravitational-wave description on the left (a single wave leaving along the axis) and the plasma one on the right (a conical accretion flow with particles accelerated at its boundary). It replaced the chirp band.

It is generated by `tools/mkfigure_light.py` (`variant_hero`) and **inlined**, not referenced, so the page still fetches nothing but the font. Two things make it work and are covered by the `index.html :: hero figure` suite:

- **Its colours are CSS custom properties, not hex.** The generator emits a hard-coded light build *and* a themed one (`hero-inline.svg`); only the themed one belongs in the page. Pasting the standalone build back in would leave a cream figure sitting on the dark theme. `--ink` draws the outlines and flips light on a dark page; `--field` fills the hole and is near-black in *both* palettes, which is why the two are separate constants in the generator.
- **viewBox, no fixed width/height**, with `.hero-fig svg{width:100%;height:auto}`. The artwork carries no text, so the "this is an illustration" note and the description for screen readers both live in the SVG's `aria-label`.

Regenerate with `python3 tools/mkfigure_light.py <outdir>` and paste `hero-inline.svg` into the `.hero-fig` div.

The chirp's **markup was removed** (recover it from commit `7b35225` if ever wanted); its **generator is still in the file, commented out**. That generator must stay commented rather than merely inert: with the SVG gone, `getElementById('chirpPath')` returns null and the next line throws, taking out every script below it in the same block (theme toggle, nav, iframe auto-height). The `.wave-wrap` CSS is now dead too and is marked as such.

The chirp was *illustrative only* — hand-tuned, not BOB output. It still appears in the favicon and the `og-home.jpg` social card, which are generated separately — so **the social card no longer matches the page it advertises**. Worth deciding whether the chirp stays the site's mark or the cards get regenerated from the new figure.

## Content editing

Publications, talks and awards are plain HTML blocks meant to be duplicated — `.pub`, `.talk`, `.award`. Several carry HTML comments explaining how (e.g. the awards/talks block inside Research names which column is which). Preserve those comments — they're the editing instructions for the site's owner.

The **Random** section is written but wrapped in an HTML comment, and its nav link removed — it held placeholder cards with dead links. The CSS is still live, so restoring it is a comment-delete plus re-adding the nav link. Instructions are in the comment itself; keep them.

Known placeholders still in [index.html](index.html), not yet filled in: the `mailto:your.email@mail.wvu.edu` address, `scholar.google.com/…user=YOUR_ID`, the all-zeros ORCID, and `CV.pdf` (linked twice but not committed). A `figures/` directory is referenced only from inside the commented-out Random section, and does not exist yet.

**Deployed video IS tracked** (`assets/*.mp4`, ~5.6 MB for four files); the manim masters under `media/` are not. What ships is a web derivative — 30 fps, CRF 26, about 66% smaller than the 1080p60 master and visually identical on slide content. The re-encode command is in `.gitignore` next to the rule. Re-render freely; only re-encode into `assets/` when the deployed version should change, since each one is a new blob in history.

Four videos are referenced: the BOB overview in `#bob`, and three paper explainers in `#explainers`. Posters are tracked too (~36 KB each).

To add an explainer: duplicate a `.exp-item`, point `<source>` and `poster` at the new files, link the arXiv entry. Generate the poster from the render with `ffmpeg -ss <t> -i <render>.mp4 -frames:v 1 -vf scale=1280:-1 -q:v 4 assets/<name>-poster.jpg`, choosing a moment where a slide is fully built rather than mid-transition.
