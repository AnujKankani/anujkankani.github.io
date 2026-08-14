---
name: academic-site
description: Build and maintain a static academic site with embedded interactive physics widgets. Use when adding or changing a self-contained HTML tool, wiring it into a host page, working on responsive/touch behaviour, or verifying rendering. Covers the embed contract, the animation-loop rules, the CSS traps that fail silently, and how to verify visually instead of guessing.
---

# Academic site with interactive widgets

For a static, dependency-free personal/research site that hosts interactive
physics tools. Everything here was learned by shipping bugs; the checks exist
because something silently broke without them.

## Non-negotiables

1. **Every deployed `.html` is self-contained.** Inline `<style>`, inline
   `<script>`, zero runtime fetches. This is what makes a tool independently
   shareable, iframe-able, and saveable offline.
2. **A build step is fine; a runtime dependency is not.** Inlining shared
   CSS/JS at build time keeps one source of truth without the visitor
   fetching anything. The rule is about what the browser downloads.
3. **Resource-lightness ranks with correctness.** Assume a mid-range phone
   with several widgets alive on one page. When a feature and the frame
   budget conflict, the feature loses.
4. **The physics is right or the tool doesn't ship.** No fudged constants to
   make a picture look nicer. If a formula is approximate, say so on the page.

## The embed contract

One file serves both standalone and embedded use:

```js
if(location.search.indexOf('embed')>-1)document.body.classList.add('embed');
```

First script in `<body>`, before paint, or the standalone header flashes.
`body.embed` then hides the tool's own heading/footnote and shrinks panels.
**Always test both modes.**

### Iframe height must be automatic

Do not hand-tune iframe heights. Content height depends on how control rows
*wrap*, and that is **not monotonic in viewport width** — one tool measured
1076px tall at 320px wide, 931px at 430, 866px at 600, 692px at 700. Every
fixed number clips at some width.

Have the embedded page measure itself and post the height to the host:

```js
window.parent.postMessage({type:'viz-height', h: h}, location.origin);
```

Host validates `e.origin`, matches the frame by `contentWindow === e.source`,
bounds the value, and sets `style.height`. Keep the CSS height as the no-JS
floor.

Two rules that make it work, both silent failures if broken:

- **Measure the body box, never `documentElement.scrollHeight`.** The latter
  is clamped to at least the viewport, which inside an iframe *is* the
  frame's own height. Including it makes the reported height a ratchet: it
  grows past the floor but never shrinks, so frames sit oversized with dead
  space and everything looks fine at a glance.
- **Embed panel heights must be fixed px, never `vh`.** A `vh` panel feeds
  the frame height back into the measurement.

## Animation loop rules

Route every rAF loop through one shared runtime that owns
`running`/`raf`/`inView`/`tabHidden`, the `IntersectionObserver`, the
`visibilitychange` handler and the debounced resize. A tool supplies
`shouldRun()` — "is anything moving?" — and the runtime ANDs in visibility
itself so a tool cannot forget it.

- Never start a loop directly; call the update path, which re-evaluates
  `shouldRun()` and renders one final frame when halting.
- **Allocate nothing per frame.** No `new`, no array literals, no closures,
  no returned tuples. Hoist buffers and scratch objects to module scope.
- Honour `prefers-reduced-motion`: auto-spin and draw-ins start disabled.

### The stuck-drag bug

If `shouldRun` is `spin || drag` while `tick` is `if (spin && !drag)`, a drag
that never ends leaves the loop running forever on a motionless scene — worst
of both. Wire release to `touchcancel`, `pointercancel` and window `blur`, not
just `mouseup`/`touchend`.

## Mobile and touch

Key off `pointer: coarse`, **not a width breakpoint** — a narrow laptop
window still has a mouse, a large tablet still has fingers.

- 44px minimum touch targets (Apple HIG 44pt, Material 48dp). Default small
  buttons come out ~31px.
- **Scope any height bump to the sliders you mean.** A range positioned
  absolutely with both `top` and `bottom` is over-constrained by a `height`
  and collapses. Give such controls `height:auto` in their own block.
- **`touch-action: none` on a large drag surface strands phone users** — they
  cannot scroll past it. Use `pan-y` on coarse pointers: vertical swipes
  scroll, horizontal drags still interact.
- Clear `-webkit-tap-highlight-color` on a dark UI that shows its own
  pressed state.

## CSS traps that fail silently

- **Specificity beats intent.** A later generic rule like
  `input[type=range]{min-width:150px}` (0,1,1) overrides an earlier
  `.my-slider` (0,1,0). Scope your selector high enough, and test it.
- **`aspect-ratio` does not give you a square box.** With `width:100%`
  definite, the height is derived from the ratio and then `max-height` clamps
  *only the height* — the width never shrinks back. Blitting a square buffer
  across such a box stretches it. Letterbox into `min(W,H)` centred instead.
- Multi-line text is left-aligned inside its own box; centring the box still
  leaves ragged lines under a centred figure.

## Verification: measure, do not eyeball

The bugs that matter most here are invisible to unit tests — a stretched
sphere, a collapsed slider, a clipped iframe. Screenshot headlessly:

```bash
CHROME="/path/to/chrome"
"$CHROME" --headless --disable-gpu --hide-scrollbars \
  --screenshot=out.png --window-size=1024,625 \
  --virtual-time-budget=9000 "http://localhost:8000/tool.html?embed=1"
```

**The trap that will cost you an hour: Chrome clamps its window to a minimum
width of ~504px.** `--window-size=390,...` silently renders a 504px-wide page
and crops the image to 390. That looks exactly like horizontal overflow and
is not. To measure narrow viewports honestly, load the page in an `<iframe>`
of the target width from a scratch harness page and read
`getBoundingClientRect()` / `scrollWidth` inside it.

Write throwaway measurement harnesses rather than guessing. Useful ones:

- element-overflow probe: list everything whose `right > viewport`
- height probe: content height at each device width
- end-to-end probe: load the *shipped* host page, scroll lazy iframes into
  view, compare applied height to content height

Delete them afterwards; keep them out of the repo.

## Testing

- Exercise the **actual functions inlined in the page** (evaluate the inline
  `<script>` in a sandbox), not copies. A sign error introduced while
  refactoring then fails the suite.
- **Assert properties, not expressions.** A regex pinning
  `yMin=0.25*E2` pins a formula; what you care about is "the axis never
  inverts" and "the reference line stays in frame". Scan the parameter space.
- **Mutation-test every new check.** Reintroduce the bug and confirm the test
  fails. Several checks that looked fine caught nothing.
- **A regex over a whole file will match your own comments.** Three tests
  passed against prose in the comment above the code they meant to check.
  Match against the extracted rule/function body.
- Guard the invisible contracts too: CSS specificity, touch-target floor,
  the auto-height mechanism.

## Content and docs hygiene

- **Line numbers in docs rot within one editing session** — references drifted
  by ~90 lines in a day. Name a string to grep for instead.
- Placeholder contact links, a missing CV, and dead figure slots are the most
  damaging thing on a page aimed at hiring committees. Track them explicitly
  and never let a "just ship it" pass bury them.
- Content blocks meant to be duplicated (publications, talks, awards) should
  carry an HTML comment explaining how. Preserve those comments.
- Cutting a section: comment it out with restore instructions rather than
  deleting, and remove its nav link in the same change. Delete the CSS only
  once nothing references it.
- After any nav or section change, verify **every anchor resolves to a real
  `id`** — programmatically, not by clicking.

## Publishing

A private repo does **not** mean a private site. GitHub Pages serves to the
whole internet; on the free tier the repo must be public to publish at all,
and access-controlled Pages is an Enterprise feature. Preview locally
(`python3 -m http.server`) and decide about placeholder content *before*
enabling Pages.

Large binaries (video) in git are permanent — every re-render adds another
full copy. Decide hosting before committing one.
