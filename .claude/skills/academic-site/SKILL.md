---
name: academic-site
description: Build and maintain a static academic site with embedded interactive physics widgets. Use when adding or changing a self-contained HTML tool, wiring it into a host page, adding inline SVG figures or CSS animation, building a photo slideshow or other image content, adding social-preview metadata, working on responsive/touch/layout behaviour, budgeting what fits above the fold, or verifying rendering. Covers the embed contract, the animation-loop rules, animating inline SVG in CSS and its delay/clip traps, theming inline figures, breakout layout past the reading column, the CSS traps that fail silently, and how to verify by measuring instead of guessing — including the probes that answer a different question than the one you asked.
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

**Set a responsive breakpoint from the measured requirement, not a round
number.** A nav collapsed to its scrollable form at 720px while the desktop
layout actually needed 924px, so the entire **721–919px band was broken**: the
links wrapped onto two lines throughout it, and below ~850px the page also
scrolled sideways with the theme toggle pushed off-screen. 768px — iPad
portrait — sat squarely inside that. Add up what the layout needs (each
child's intrinsic width, the gaps, the container padding) and put the
breakpoint above it. That failure is invisible on a desktop and on a phone; it
lives only in the band between them, which is exactly where nobody looks.

**Give the HOST page a coarse-pointer block too.** Shared component CSS tends
to get one early; the page's own chrome — nav links, a theme toggle, inline
"open full" links — gets forgotten. Those measured 21px and 34px tall, under
even WCAG 2.5.8's 24px floor (the inline-in-a-sentence exemption does not
cover a nav).

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
- **A `margin` shorthand declared later beats your longhand.** `.thing{margin:
  44px 0 0}` resets `margin-left` to 0 even if an earlier rule of equal
  specificity set it deliberately.
- **A stray `*/` silently deletes the rule after it.** Appending prose after a
  comment's closing `*/` leaves loose tokens in the stylesheet, and CSS error
  recovery swallows the block that follows. The change then does *nothing* —
  no error, no visual clue, and every measurement comes back identical to
  before the edit. This is the strongest argument for re-measuring after a CSS
  change rather than reading the diff and assuming.

### `auto-fit` track minimums are floors, not preferences

`grid-template-columns: repeat(auto-fit, minmax(290px, 1fr))` reads like "aim
for 290px." It is not. 290px is a **floor the track will not go below**, so the
grid overflows any container narrower than it — and on a 320px phone, every
column is narrower than it. The symptom is a few pixels of horizontal scroll
that survives every other responsive fix, because nothing else on the page is
doing it.

```css
/* overflows below ~330px viewport */   minmax(290px, 1fr)
/* collapses to the column instead */   minmax(min(290px, 100%), 1fr)
```

One site carried exactly 5px of scroll at 320px from this, sitting in the
backlog as "pre-existing, low priority" until it was measured: `20px` wrap
padding `+ 290px` track `− 305px` client width. The arithmetic pins it
precisely, which is the tell that it is one element and not a vague layout
problem.

**A clip-path does not change computed style.** Probing `getComputedStyle(el)
.opacity` to ask "is this visible?" will report the element as fully painted
while the clip hides it completely — a probe that silently answers a different
question than the one you asked. Hit-test with `document.elementFromPoint()`,
or compare pixels. And when you fix something, re-run the *identical* probe
against the pre-fix build: comparing an opacity probe before to a paint probe
after proves nothing.

**Find the culprit by measurement, not inspection.** Walk every element, flag
any whose `getBoundingClientRect()` right edge exceeds `documentElement.
clientWidth`, and print the numbers. Expect false positives from anything
inside a deliberately scrollable strip (a horizontally scrolling nav) and from
full-bleed children of an `overflow:hidden` ancestor — those report past the
edge but are clipped. The real culprit is the one whose overflow **equals**
`scrollWidth − clientWidth`.

## Search and social preview

Easy to skip entirely, and then every shared link renders as a bare URL. Two
of these fail **silently** — no error, no warning, nothing in devtools:

- **`og:image` must be an absolute URL.** Scrapers do not resolve relative
  paths; they simply report no image.
- **Keep the favicon a `data:` URI**, or it becomes the first runtime fetch
  other than the font. Percent-encode it, spaces included. Simplify the mark
  until it survives 16px — a faithful miniature of a detailed logo turns to
  mush. Cut detail, not size, and render it at 16/32/64 on light *and* dark to
  check.

`theme-color` must be driven by the same function that applies the theme, not
a `media="(prefers-color-scheme: …)"` pair — a media query keeps reporting the
*system* colour after the user has explicitly toggled.

**Generate social cards from the live pages** rather than drawing them: render
the real component in a same-origin iframe and crop to a measured element
rect. A hand-made card drifts the moment the page changes; a generated one
cannot. Commit the generator — an asset whose generator is lost cannot be
regenerated after the next redesign.

## Inline SVG figures that follow the theme

Generate figures from a committed script, then **inline** the SVG rather than
referencing a file, so the page still fetches nothing.

Emit **two builds** from one generator: a standalone one with literal colours,
and a themed one whose colours are the page's CSS custom properties. Only the
themed build belongs in the page. Pasting the standalone build back in leaves
a light figure sitting on a dark theme — so **test that no literal hex
survives** in the inlined copy. That is the failure mode, and it is invisible
until someone loads the other theme.

**Outline colour and "void" colour must be separate tokens.** The outline
should flip light on a dark background. But a shape that means *absence* — a
black hole, a punched-through hole — must stay dark in both themes. Mapping
both to one `--ink` turns a black hole into a white disc.

Strip fixed `width`/`height`, keep the `viewBox`, size with a width plus
`height:auto`. When the artwork carries no text, the `aria-label` is where both
the description and the "this is an illustration, not data" caveat live.

**Rendered height is width ÷ *viewBox* aspect** — not the drawing's aspect.
When a wide figure has to fit above the fold, the fix is to make the *artwork*
wide (flatten it, crop the viewBox to the drawn content) and let width be the
only knob. Reaching for `preserveAspectRatio="slice"` to force a fit silently
crops the drawing; one 2.5:1 figure lost ~45% of itself that way, and nothing
failed — it just looked wrong.

**Separate the box from the art when they want different widths.** A hero
figure whose `border-top` is also the section divider needs a full-bleed *box*
(`width:100vw; margin-left:calc(50% - 50vw)`, safe only under an ancestor
`overflow:hidden`, since `100vw` includes the scrollbar) with the SVG scaled
and centred *inside* it. Styling one element to do both forces a choice
between a short rule and an oversized figure.

**A percentage shrink that helps on desktop hurts on a phone.** Scaling a
figure to 70% to reclaim desktop gutters is right; applied at 390px, where
there are no gutters, the same rule rendered it 64px tall. Gate it on a
breakpoint, and expect that breakpoint to be *unrelated* to the nav's — one is
about horizontal room, the other about a floor on legibility.

## Animating an inline SVG in CSS

CSS keyframes beat rAF for a decorative figure: no JS, no loop to forget to
stop, and it composites off the main thread. Five things bite:

- **A generator that computes per-element timing duplicates constants into the
  CSS.** If particle delays are derived from geometry (so nothing moves before
  the wavefront reaches it), the reveal radii and the cycle length exist in
  *both* the generator and `@keyframes`. Nothing links them. **Assert in the
  test suite that the two copies agree** — drift here produces a subtly wrong
  animation that no one reports as a bug.
- **`animation-delay` gates the FIRST iteration only — it is not a recurring
  gate.** Staggering elements with per-element delays inside a longer repeating
  cycle works perfectly on the first pass and is meaningless from the second,
  unless the short period divides the long one exactly. One figure looked
  correct for 17 seconds and wrong forever after; nobody watching a hero
  animation for one cycle would catch it. **Gate geometrically instead** — put
  the staggered elements under the same growing `clipPath` that reveals the
  thing they must not precede. That is exact on every cycle and has no shared
  constant to drift.
- **`animation-fill-mode:backwards` is mandatory whenever you stagger with
  `animation-delay`.** Without it every element renders in its base state
  during its delay — which is exactly the "ahead of the wavefront" artefact the
  delay was added to prevent.
- **Path-length dashes must be measured in JS.** `stroke-dasharray` needs the
  path's real `getTotalLength()`; set it as a custom property once at init.
- **`animation-play-state` does not inherit to elements carrying their own
  animation.** Pausing a subtree needs a descendant selector
  (`.fig.is-paused *`), not the container alone.
- **Pause it off-screen.** An IntersectionObserver toggling one class is the
  whole implementation, and it is not optional on a page that also runs canvas
  widgets.

Under `prefers-reduced-motion`, set `animation:none` **and** pin every animated
element in its *finished* state (dashoffset 0, opacity 1). Killing the
animation alone leaves the figure stuck in its initial state — an invisible
jet and an undrawn wave, i.e. a blank figure.

**A hold phase reads better than a loop.** Running the build-up over the first
~half of the cycle, then holding the finished frame with only the small motion
continuing, gives a reader time to actually look at it.

## Photo slideshows in a fixed slot

**Match the frame to the photographs, not the other way round.** Measure the
sources first. A set of portraits sitting at 0.63–0.67 put into a 3:4 (0.750)
frame loses 12–16% of its height, and what goes is the top and bottom — heads,
badges, feet. 2:3 fitted the same set with almost no crop. One measurement
before choosing the frame saves re-cropping everything afterwards.

**A landscape photograph needs a landscape slide.** Forcing a wide shot into a
portrait box throws away the subject: a blackboard shot became two people and
no blackboard, a room shot became a person and no room. If the set is mixed,
run a grid where a wide item spans the columns a portrait pair would occupy,
and pick its aspect as `(2·col + gap) / (portraitRatio · col)` so it is exactly
as tall as the portraits — then the row height never changes between slides and
nothing jumps mid-fade.

**Size by one dimension plus `aspect-ratio`, never two.** `width:100%` *and*
`height:100%` makes the browser ignore `aspect-ratio`; with an auto row height
the result is circular and resolves to something arbitrary. One case rendered
at roughly 3:8 and ran 490px tall inside a 230px slot.

**Overlap for the cross-fade using grid, not absolute positioning.** Place
every slide in the same row and column; they stack, and the row height still
comes from the items themselves, so no ancestor needs a fixed height and
nothing can escape its box. Absolute positioning needs a positioned ancestor,
and forgetting it is silent — the slides resolve against a distant ancestor and
paint across the whole page.

**Drive it from two custom properties.** `--n` (how many) on the container and
`--i` (which one) per item gives duration `calc(var(--n) * S)` and delay
`calc(var(--i) * S)`, so adding a slide is one markup line. The part that
*cannot* be derived is the keyframe percentages — a slide's window is 100/n
percent and CSS cannot compute a keyframe offset from a variable. Assert that
relationship in a test, because getting it wrong does not look broken; it looks
like one image lingering under the next.

**Captions and credits ride the same animation as the image.** Same `--i`, same
keyframes. On separate timings the wrong caption sits under the wrong picture,
which is worse than none. Reserve the caption's height whether or not the
current slide has one, or the images shift as it advances. And scope a caption
to what it describes: a full-width line under a *pair* of images reads as
describing both.

**Pick the no-animation fallback by class, not position.** `nth-of-type` works
until slides stop coming in uniform groups — one wide slide among pairs, or a
caption that only some slides have — and then it silently pins the wrong thing.

**Watch the payload.** Photographs are usually the heaviest thing a page fetches
on load, and unlike video they are not lazy. Seven at JPEG quality 82 came to
345 KB against a 28 KB gzipped page; quality 76 brought that to 233 KB with no
visible difference at a few hundred CSS pixels. Put the quality in the generator
with a note that it is the lever, so the next person lowers it rather than
raising the budget.

## Budget the first screen, then size type to the budget

If a figure must share the first screen with the header, treat "nav + hero ≤
viewport height" as a *measured constraint*, not an aesthetic. Build a harness
that iterates the viewport matrix in iframes and prints, per viewport: figure
box, nav+hero height, fits/does not, horizontal scroll, and whether the SVG's
`getBBox()` exceeds its viewBox. Then scale the type scale and the figure width
until every row fits. Eyeballing one 1440px screenshot will pass a layout that
fails at 1280×720, which is where the shortest common laptop viewport lives.

## The reading column also caps everything else

A `max-width` on the content column exists for prose — it holds body text near
60 characters a line, which is right. But it silently caps figures, embedded
widgets and media grids too, and those have no such limit. Measure before
deciding: one site used **56% of a 1920px screen and 42% of a 2560px one**,
with line length already capped so the extra width bought the text nothing.

The fix is a breakout class on the non-prose blocks, not a wider column:

```css
@media (min-width:1340px){
  .wrap > .bleed{
    --w:min(calc(var(--maxw-wide) - 56px), calc(100vw - 80px));
    width:var(--w);
    margin-left:calc((100% - var(--w)) / 2);
  }
}
```

- **Child combinator, not a bare class.** Each of those blocks also carried a
  component rule with a `margin` *shorthand* declared later at equal
  specificity, which reset `margin-left` to 0 — so they widened to the *right*,
  off the page, instead of centring.
- **`100vw` includes the scrollbar.** Widening to exactly `100vw` overflows
  horizontally on desktop. Subtract an allowance.

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

### Headless Chrome also lies in three ways that stop animation

- **`prefers-reduced-motion` is version-dependent — probe it, never assume.**
  One Chrome build reported `reduce`, so anything honouring it (auto-play,
  auto-spin) started *stopped* and an unattended capture showed a motionless
  scene; a later build on the same machine reported `no-preference`. Print
  `matchMedia('(prefers-reduced-motion: reduce)').matches` in the harness
  rather than trusting a note like this one. Use
  `--force-prefers-reduced-motion` to test the reduce path deliberately.
- **`--virtual-time-budget` advances the clock without ticking rAF.** A frame
  counter measured **6 frames in 20 s of virtual time**; `--headless=new` did
  not help. Animations simply do not progress.
- **Without `--window-size` the viewport is 800×600**, not your screen. A
  layout measured at an unstated width is a layout measured at 800px.
- **A CSS `transition` never advances under virtual time**, so `getComputedStyle`
  reports the START value indefinitely. Change a padding on an element with
  `transition: all .18s` and read it back: you get the old number, forever. This
  reads exactly like "my rule didn't apply" and sent me hunting a specificity
  bug that did not exist. **Inject
  `*{transition:none!important;animation-duration:0s!important}` before
  measuring anything you just changed.**

So **do not wait for an animation to reach a state — drive it there.** If the
page's step function is a top-level global, call it in a loop and then render
once. That is exact, reproduces byte-for-byte between runs, and removes timing
from the problem entirely.

### Two things that silently invalidate a measurement

**Wait for `document.fonts.ready`.** Fallback metrics are narrower than the
webfont — a nav measured 60px narrower before the font landed, which made it
look like it fitted at a width where it does not, and would have set the
breakpoint too low. Every width-related harness needs this.

**Headless Chrome reports `pointer: fine`**, so coarse-pointer rules never
apply and measuring tells you nothing about them. Read the block out of
`document.styleSheets` (`rule.type === 4`, match `conditionText`) and apply its
declarations to the matched elements. That tests the rule instead of trusting
that it exists.

Apply them with **`setProperty` per declaration**, not
`el.style.cssText += cr.style.cssText`. The append form silently drops longhand
declarations, so a correct rule measures as having no effect:

```js
for (let i = 0; i < cr.style.length; i++) {
  const p = cr.style[i];
  el.style.setProperty(p, cr.style.getPropertyValue(p), cr.style.getPropertyPriority(p));
}
```

**Touch-target sizing has two traps of its own.** Vertical padding on an
`inline` element overflows its line box instead of growing it, so a link needs
`inline-block` before padding does anything — the CSS looks fixed and the hit
area is unchanged. And a `padding` **shorthand** declared later in the sheet
beats a longhand inside a media query, because a media query adds no
specificity; the media-query rule needs a more specific selector to win.

**A CSS animation created while the element is `display:none` never starts.**
`getAnimations()` reports `playState: "running"` with `currentTime` pinned at
0 — so probing it *looks* like a live animation that is frozen, and you will
debug the keyframes instead of the visibility. If a harness hides a variant to
compare it against another, the hidden one is not animating and never was.

### Phantom failures: verify the harness before the code

More time went into non-bugs here than into bugs. Before believing a
measurement, confirm: the local server is still up (a dead server renders a
blank page that reads as "the animation froze"); you are loading the real file
and not a stale scratch copy; the iframe under test is actually on screen
(IntersectionObserver never fires inside an off-screen iframe, so anything
gated on visibility stays paused); a static `<iframe>` in markup can finish
loading *before* an `onload` assigned later in the script; and Chrome caches
harness pages between runs. **When a result is surprising, re-check the
apparatus first.**

### What cannot be tested from a Linux/Chrome box

**iOS Safari.** It is WebKit; local Chrome is Blink. Android behaviour is
genuinely verifiable, iPhone behaviour is not — say so plainly rather than
implying a device sweep covered it. Check statically instead:

- **`playsinline` on every `<video>`**, or iOS takes playback fullscreen.
- **`-webkit-` prefixes.** Unprefixed `backdrop-filter` only shipped in
  Safari 18, so it is a silent no-op on iOS 17 and earlier.
- **No `vh` height surviving into an embedded context**, since iOS's URL-bar
  viewport would feed back into iframe sizing.
- Vertical range inputs: `writing-mode` is the modern path, but ship the
  `-webkit-appearance: slider-vertical` and `orient` fallbacks alongside it.
- CSS animation of **SVG geometry properties** (`r`, `cx` as CSS properties) is
  solid in Blink and unverified in WebKit. Prefer effects that degrade to a
  sensible static frame if the animation no-ops.

### Measuring overflow correctly

Use `documentElement.scrollWidth > documentElement.clientWidth`. Both
`body.scrollWidth` and a sweep of `getBoundingClientRect()` yield false
positives — in particular **SVG children report geometry outside the `viewBox`
that the browser actually clips**, so a correctly-clipped figure looks like a
150px overflow. Skip anything with an `ownerSVGElement`.

`getBBox()` on an `<svg>` gives real content bounds, which is how you find
wasted space inside a figure. But the slack is `bbox.y - viewBox.y`, **not**
`bbox.y` — assuming a zero origin reports phantom whitespace on a cropped box,
and I nearly acted on that number.

Write throwaway measurement harnesses rather than guessing. Useful ones:

- element-overflow probe: list everything whose `right > viewport`
- height probe: content height at each device width
- width probe: content width and % of screen used across real viewport sizes
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
- **Never pin an exact `class="…"` string.** A check anchored on
  `class="hero-fig"` stopped matching the moment a second class was added, and
  every assertion in that suite then passed vacuously against an empty match.
  Match the attribute loosely (`class="hero-fig[^"]*"`).
- **A test encodes an assumption, and assumptions expire.** One asserted a
  figure's viewBox was cropped tight to its artwork; the crop was later
  reverted *by design* and the test was simply wrong. Assert the contract
  ("stays a wide band") rather than the current value.
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
- **Removing an element can kill unrelated JavaScript.** If a generator for
  that element sits near the top of a *shared* `<script>` block, its
  `getElementById(...)` now returns null and the next line throws — taking out
  every script below it in the same block (theme toggle, nav, iframe sizing).
  Comment the generator out in the same edit: inert is not enough, and the
  page will look fine until you try the theme toggle.
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
