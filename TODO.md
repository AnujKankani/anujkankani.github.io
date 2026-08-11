# TODO

Working tracker for anujkankani.github.io. Companion to [TOOLS.md](TOOLS.md) (how to build widgets) and [CLAUDE.md](CLAUDE.md) (site conventions).

Conventions: `[ ]` open · `[x]` done · `[~]` in progress · `[?]` blocked on a decision. Keep the newest state at the top of each section; move finished items to [Done](#done) with the date.

---

## Blocking decisions

- [?] **Where does `assets/bob-overview.mp4` live?** Opened 2026-08-11. `*.mp4` is gitignored, so the 2.8 MB render is not in the repo; the BOB section references it three times and 404s at all three until this is settled. Commit it once (permanent in history, another copy per re-render), host it on a GitHub Release (breaks the "only external request is Google Fonts" rule), or keep the section hidden. **Blocks pushing `index.html` with the BOB section visible.**

---

## Infrastructure — tool widgets

- [ ] **3b. `new-tool` scaffold template.** *(next)*
  A `tools/_template.html` with the VIZ markers, embed contract, mobile quality tiers, reduced-motion check and a stub `shouldRun`/`render` already wired — so a new tool starts compliant instead of starting as a copy of the last one. *This is what stops the drift recurring; the runtime alone doesn't.*

- [ ] **6b. Close the `accel`/`Veff` test gap.** *(still open, and now wider)*
  Both close over module-level `mu`/`L`/`aSpin`/`Efix`, so the extractor can't rebind them. `mk(a, E, L, mu)` in the Kerr suite re-derives the formulas in the test, and a source-regex guard (`source Veff matches the tested Kerr form`) checks the tool still matches — so `accel = −½ dVeff/dr` and the a→0 reduction are verified against the *test's* copy, not the shipped code. Refactor to pure `f(r, mu, L, a, E)` so the numerical assertions bind to the real functions. *Deliberately kept out of the step-4 migration and out of the Kerr work — both were already large, and mixing a physics refactor in would have made any regression hard to localise.*

- [ ] **5. `tools/` manifest + static gallery.** *(defer until tool #4)*
  One JSON array — slug, title, blurb, tags, embed height — generating the gallery and the homepage Tools section.
  **This is the resource fix, not a convenience feature.** The homepage currently embeds every tool as a live iframe; at six tools that is six documents, six canvases, and six rAF loops on one mobile page. Target: static cards linking to standalone pages, at most one live embed on the homepage. Gallery cards must be static thumbnails — never a grid of live iframes.

---

## Site content — broken in public

These are live on a page aimed at postdoc hiring committees.

*Line numbers are deliberately omitted below — they rotted within one editing session. Each item names a string to grep for in [index.html](index.html).*

- [ ] **Real contact links.** The footer contact block still ships `mailto:your.email@mail.wvu.edu`, `scholar.google.com/citations?user=YOUR_ID`, and an all-zeros ORCID (`orcid.org/0000-0000-0000-0000`). The page says "I'm on the postdoc market for 2027" — the most important action on the site is a dead link. *Needs the real email, Scholar ID, and ORCID from you; I won't guess these.* The GitHub and arXiv links next to them are real.
- [ ] **Commit `CV.pdf`.** Grep `href="CV.pdf"` — linked twice and 404 at both, the hero's secondary CTA and the footer.
- [ ] **Decide where `bob-overview.mp4` lives.** Deferred 2026-08-11: `*.mp4` is gitignored, so the 2.8 MB render is *not* committed. The BOB section in [index.html](index.html) references it three times — `<source>`, the no-video-support download link, and "open video ↗" in the caption — so all three 404 until this is resolved. The poster JPG *is* tracked, so the section renders a play button that fails rather than an empty box. Options: `git add -f` it once (permanent ~2.8 MB in history, and another copy per re-render), host it on a GitHub Release (breaks the "only external request is Google Fonts" rule), or keep the section hidden until the file ships. **Do not push `index.html` with the BOB section visible and no video.**
- [ ] **Restore the Random section** once there is real content. Cut 2026-08-06 — the markup survives commented-out in [index.html](index.html) with restore instructions; the CSS is still live, so bringing it back is a comment-delete plus re-adding the nav link.
- [ ] **Add `<meta name="description">`, Open Graph tags, and a favicon** to all three pages — currently none have any. Shared links render as bare URLs with no title card.
- [ ] **Fill the three highlight figure slots.** Grep `Add figure &rarr;` — three placeholders naming `figures/bob-waveform.png`, `figures/direct-wave.png`, `figures/boundary-to-bound.png`. `figures/` does not exist yet. These double as OG images once they exist.

---

## Backlog

- [ ] Add a `LICENSE` and a "source on GitHub" link on each tool page — for interactive physics explainers, reuse is most of the value to other researchers.
- [ ] Decide whether tool pages should support light mode, or stay dark-only by design (current behavior; they sit in a dark frame in both site themes).

---

## Done

**2026-08-11**

- [x] **Kerr.** [geodesic-explorer.html](geodesic-explorer.html) is now equatorial Kerr (Bardeen–Press–Teukolsky), with Schwarzschild as the a = 0 case. `Delta`, `Veff`, `accel`, `dphidtau`, `rHorizon`, `rPhoton`, `rISCO`, `circEL`, `bCrit`, `energyAtRest`. Veff depends on E as well as L, so "release from rest" is the implicit condition `E² = Veff(r₀;E)`, solved in closed form.
- [x] **UI rework of the geodesic tool.** Spin slider 0→0.99 with an explicit prograde/retrograde toggle (`rISCO` is even in `a`, so inferring sense from `sign(a·L)` drew the wrong ISCO); presets re-derive their orbit as the spin changes; `Explore!` unlocks all three sliders. Removed the frame-dragging and periapsis-precession presets.
- [x] **Effective-potential panel, rebuilt.** x-axis from the horizon to 2·r_ISCO; a y-zoom rail down the right edge of the panel blending a wide framing and a tight one. The tight end frames the band outside `potRCut()` — the light ring for massive orbits, `min(r_ph, 3(L−aE)/(L+aE))` for photons, since ~32% of the photon range has its barrier peak *inside* the light ring. Went from 9% of the panel height carrying the physics to 86–91%.
- [x] **Reviews and their fixes.** derivation-checker on both widgets; adversarial-reviewer on both. Fixed, among others: a left-handed orientation triad (`(0,0,+1)` labelled `y` where the code stores `−y` — inverts the apparent circular polarisation for s = −2); dropping ℓ silently flipping the sign of m; `Im` at m = 0 rendering an identically-zero field under a "− / +" legend; the on-page note claiming |m| azimuthal lobes where there are 2|m|; a stuck `S.drag` after a cancelled touch pinning the rAF loop on forever.
- [x] **The sphere was an ellipse.** `width:100%` is definite, so `aspect-ratio` derived the height and `max-height` clamped only that — the stage box was never square, and blitting the square buffer across it stretched the sphere 2.3× embedded, 1.5× standalone. Now letterboxed into a centred square. Caught by screenshot, not by tests.
- [x] **`|Y|` field** added alongside `|Y|²` in the SWSH viewer, on the sequential colour ramp (a non-negative field on the diverging ramp renders entirely as "+").
- [x] **Mobile, both platforms.** `Viz.autoHeight()` — the tool measures its own content and posts the height to the host. Fixed heights could not work: content height depends on how control rows wrap, which is not monotonic in width (geodesic: 1076px at 320 wide, 692px at 700), so the bottom control row was clipped at every phone width. Verified end to end on the shipped `index.html` at nine widths, 320→1200: applied height equals content height exactly. Plus 44px touch targets under `pointer: coarse`, and `touch-action: pan-y` on the SWSH stage so a phone can scroll past it.
- [x] **Manim animations.** `bob_overview.py` rendered to 61.2s and embedded in a lazy-loading BOB section on the homepage. `directwave_overview.py` and `bobinsights_overview.py` written but still carry **SCHEMATIC placeholder data** — they need real figure exports before rendering. Palette-exploration scenes (`bg_swatches.py`, `bi_swatches.py`) are gitignored.
- [x] **Suite grew 50 → 243 checks** and past physics: UI state driven through `loadUI`, rendering contracts (the potential axis never inverts and never clips the E² line across ~600k parameter/zoom pairs; triad arms point along the axes they label), layout contracts (auto-height, the zoom rail's CSS specificity, the touch-target floor). Size cap raised 15 → 25 KB.
- [x] **Comment audit across all nine code files.** Fixed false claims (`Viz` "exposes exactly three things"; a documented handle field `running` that is actually `isRunning()`; a cited `fpsToMs` that never existed; `extract.js` claiming to "strip" DOM wiring it in fact evaluates; "BOB in ~30 seconds" for a 61.2s film) and checked every code identifier named in a comment still exists.

**2026-08-06**

- [x] **Decision: adopt the generator** for shared tool code. Rationale in [TOOLS.md](TOOLS.md#the-shared-runtime).
- [x] **Decision: cut the Random section** until there is real content.
- [x] **Cut the Random section.** Commented out rather than deleted (restore instructions inline); `Random` removed from nav. Verified: no live `.random-*` markup, no `href="#"` dead links remaining in the body.
- [x] **1. `prefers-reduced-motion` in the geodesic explorer.** Now starts paused when the query matches. Added `syncPause()` so the button label/aria is driven from state — reset and preset paths previously hard-coded "playing", which would have defeated the fix.
- [x] **2. Reconciled all known drift.** `--panel` → `#111A29`, DPR cap → 2, frame cap → 32 ms; geodesic keeps a 960px `.tool` width with a comment explaining why (two side-by-side panels).
- [x] **3a. Shared runtime + generator.** `tools/_shared.css`, `tools/_shared.js` (`Viz.loop` / `Viz.seg` / `Viz.canvas`), `tools/build.py` with `--check` and `--list`.
  Verified: idempotent across runs; content outside VIZ markers preserved byte-for-byte; edits inside markers correctly detected as stale and clobbered on rebuild; pages without markers skipped untouched.
- [x] **6a. Physics test harness.** `tools/test.js` + `tools/extract.js`, 50 checks, no dependencies, run under Node from `website_env`. Tests exercise the real inlined functions via a `vm` sandbox, not copies.
  Mutation-tested: dropping the `(-1)^m` phase, weakening the `-3L²/r⁴` term, and raising `DPR_CAP` past budget each fail the suite.
  Found and fixed a bug **in the test**, not the tool: the `e^{imφ}` check compared against `|Y|` rather than the signed amplitude, which fails for odd ℓ+m. `swsh()` was correct.
- [x] **Syntax-checked the step-1/2 edits** with `node --check` — all three files parse. This resolves the caveat raised when no JS runtime was available.
- [x] **4. Migrated both tools onto the shared runtime.** Both now carry VIZ markers and use `Viz.loop` / `Viz.DPR_CAP` / `Viz.reducedMotion`; geodesic's two `.seg` groups use `Viz.seg` + `Viz.seg.select`. All hand-rolled `IntersectionObserver` / `visibilitychange` / debounced-resize wiring deleted.
  `Viz.loop` expressed both `shouldRun` variants without contortion, including the geodesic `done`-mid-tick halt — the abstraction holds.
  Found more drift than the original table caught: `.controls` gap, `.head` margin, range min-width and `.row .lab` min-width all differed. Reconciled to the real values; `.row .lab` (96px) and `.tool` (960px) stay as documented per-tool overrides in geodesic.
  Sizes after: swsh 9.8 KB gz, geodesic 9.2 KB gz — both inside the 15 KB budget.
- [x] **Behavioural tests for `Viz.loop`** (7 checks, suite total now 57). Drives the real runtime against a fake rAF/observer/visibility to prove golden rules 2–3 hold (numbered 1–2 at the time; the resource-lightness rule was later inserted as rule 1): halts off-screen, halts when backgrounded, halts when idle, halts when `tick()` ends the animation, resumes correctly, and throws on misuse. *These assert behaviour, not source text — unlike the earlier regex guards.*
