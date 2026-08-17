---
name: physics-widget
description: Build an interactive browser physics widget - orbit integrators, field/mode visualisers, potential plots. Use when writing or reviewing the widget itself: getting the physics right, validating against closed forms, keeping on-screen claims true across the whole control range, canvas rendering, control/state handling, touch and drag handling, the frame budget, and how to test any of it - including writing physics as pure functions so the tests can bind to the shipped code, and finding checks that cannot fail. For the host page and embedding, see the academic-site skill.
---

# Interactive physics widgets

For a self-contained HTML widget that computes real physics in the browser.
Every rule below exists because the corresponding bug shipped.

## The three constraints

1. It runs on static hosting — no backend, no runtime data fetches.
2. The visitor installs nothing.
3. It is resource light. Assume a mid-range phone with several widgets alive
   on one page.

Constraint 3 is the binding one. Payload is rarely the problem; **CPU is**:
unbounded loops, oversized canvases, per-frame allocation.

## Physics first

**Verify against published closed forms before shipping.** Not "it looks
right" — numbers.

- Check **landmark values** the literature agrees on. For a black-hole orbit
  tool: ISCO at 6M, photon sphere at 3M, critical impact parameter 3√3 M,
  effective potential vanishing at the horizon.
- Check **limits**. A rotating-case implementation must reduce *exactly* to
  the non-rotating one when the spin goes to zero. Assert it numerically
  across a radius grid, not at one point.
- Check **internal identities**. If acceleration should equal −½ dV/dr,
  differentiate the potential numerically and compare across the parameter
  space.

### Sign and branch conventions will bite

- A quantity even in a parameter cannot tell you that parameter's sign. An
  ISCO radius that depends on |a| cannot be used to infer prograde vs
  retrograde from `sign(a·L)`; carry orbit sense as its own explicit flag and
  restrict the slider to one sign.
- **A coordinate mapping with determinant −1 mirrors the figure.** That is
  not cosmetic when the sign of a mode index encodes a physical handedness —
  a mirrored render reverses the apparent circular polarisation. Check the
  determinant, and make any presentation-layer axes/triad use the *same*
  mapping as the geometry.
- A spectrum written with `±` has both branches. Drawing one and labelling it
  as "the" answer misrepresents it.

### Never fabricate a state

If a requested configuration is unphysical, **reject it and say so**. A
square root clamped to zero — `Math.sqrt(v > 0 ? v : 0)` — silently invents a
trajectory whose direction comes from roundoff. One tool fabricated
geodesics for 6% of its photon parameter grid this way.

Related: when a condition is *implicit* (a released-from-rest energy that
appears on both sides because the potential depends on energy), solve it
properly rather than substituting and hoping.

### Guard the singular points

`cot(θ/2)` diverges at 0, `sin^{2ℓ}(θ/2)` vanishes there, and the product is
`0·∞ = NaN`. Clamp inside the function itself, not only at the call site, so
a future caller is safe. Then test the poles explicitly.

## On-screen text is a physics claim

This is the most common bug class, and unit tests do not catch it. **Every
label, legend, status line and footnote must hold for every reachable
combination of controls — not just the defaults.**

Real examples, all shipped, all false outside the default view:

- a status reading "unbound — escaped" on what is only a *viewport* cutoff.
  Most released orbits are bound; the correct test gates on the energy.
- "too low to clear the potential barrier" for a case where, at that angular
  momentum, no barrier exists at all.
- a node-count rule quoted in its scalar form for a spin-weighted field,
  where the spin weight sets a floor.
- "m sets the number of azimuthal lobes" when the count is 2|m|.
- a "− / +" legend on a field that is identically zero in that mode.

**A legend entry is a claim that a marker is on screen.** It has to be gated
by the same condition as the drawing, and the two drift apart the moment one
gains a branch the other does not. One tool gated its ISCO circle, its shaded
band and its potential marker on `type !== 'photon'` but left the legend
unconditional, so photon mode showed a coloured swatch and "ISCO 6.00M" for a
marker on neither canvas — and the ISCO is not a meaningful quantity for a
null geodesic in the first place, so the entry was wrong twice over. The same
gap hid behind a "guides" toggle: turn the guides off and the legend kept
advertising what had just been erased.

Mirror the drawing conditions into the legend explicitly, and assert them —
the visibility is set from state that a static suite cannot drive, so pin the
gating expressions as source contracts and drive the real UI through the modes
in a browser harness to confirm.

Practice: when adding any sentence to the page, ask which slider makes it
false, then either fix the sentence, restrict the control, or add the caveat.
Write a test that counts the real quantity and compares it to the copy.

Say which regime you are in — which spacetime, which approximation, what is
held fixed. "Equatorial" is not "generic"; a hand-tuned illustrative curve is
not model output and must not be described as one.

## Controls and state

- **HTML sanitises a range's `value` on assignment**: it snaps to
  `min + n·step` and clamps into `[min, max]`. So the *order* matters —
  assigning a value while stale bounds are still on the element silently
  clamps it. Two separate preset bugs came from exactly this. Set bounds
  first, then the value.
- Clamp **magnitude and keep sign**. Reducing a mode index bound with
  `if (Math.abs(m) > L) m = L` turns −8 into +2 — silently the opposite
  physical state.
- Route state changes through one path that syncs the control, its readout,
  its `aria-pressed`, and the render. Anything that sets state directly will
  eventually disagree with what is drawn.
- If a control combination is degenerate, **disable it** rather than drawing
  a lie — and if it is currently selected, move off it.
- Presets: decide per preset whether it *derives* its state from a live
  control or holds values fixed. In preset mode lock the controls the preset
  owns and say so on the page.
- Any control that only changes the *view* (a zoom, a guide toggle) should
  never re-run the physics and never be locked.

## Rendering

- **Fixed-cost offscreen buffer.** Render into a modest square buffer and
  blit once; cost then depends on the buffer, not the display. Tier the
  buffer size by the drawn size and a quality toggle, not by the raw canvas
  width.
- **Blit square buffers letterboxed** into `min(W,H)`, centred. A container
  using `aspect-ratio` with `max-height` is *not* square (see the
  academic-site skill), and stretching turns a sphere into an ellipse.
- Recompute device-pixel-ratio on every resize — it changes with browser zoom
  and when a window moves between monitors. A DPR cached at load goes stale.
- Cap DPR (2 is plenty) and the frame rate (~30 fps reads fine for physics).

### Framing a plot whose function diverges

A potential that dives to −∞ near a boundary will flatten everything else if
you let it set the scale. Choose the axis from the band that carries the
physics, and:

- keep the **reference line** (an energy level, a threshold) inside the frame
  at every setting — if it can leave, the intersections readers care about
  vanish;
- if you expose a zoom, make the span **monotone** in the control, or
  dragging "in" will sometimes zoom out;
- verify by scanning the parameter space that the axis never inverts.

**Two allocation shapes that hide from a regex guard.** An array literal passed
straight as an argument — `ctx.setLineDash([4,5])` — and any canvas factory
call — `createRadialGradient`, `createPattern`, `createImageData`. A guard
matching `= [` and `return [` sees neither, so a loop can allocate six objects
a frame under a green check. Cache both on change, and make the guard
understand `if (key !== cached) { ... }` so caching is not itself flagged.

**`Array.shift()` in a trail buffer is O(n).** Trimming one vertex per push
over a 2600-element array, 40× a frame, is a memmove per push. Trim in chunks,
or use a ring buffer.

## Frame budget

| knob | rule |
|---|---|
| frame cap | ~30 fps |
| DPR cap | `min(devicePixelRatio, 2)` |
| mobile tier | drop mesh/resolution below ~420px |
| render target | fixed-size offscreen buffer |
| per-frame allocation | zero |
| gzipped page | keep it small; the cap catches order-of-magnitude bloat |

**Zero allocation means zero.** No `new`, no array literals, no closures, no
`.map`, and no returning a fresh tuple from a helper called every frame. Hoist
tables and scratch objects to module scope. Note that a naive "no allocation"
test that only matches typed-array constructors will miss all of that.

## Write the physics as pure functions of an explicit state

`Veff(r)` reading module-level `mu`, `L`, `aSpin`, `Efix` is the natural way to
write a widget and the wrong one. A test can then only probe it at whatever
state the UI happens to be in, so sweeping `(a, E, L)` from outside is
impossible — and what happens next is predictable: the suite grows its **own
reimplementation** of the formula to sweep, and guards the shipped code with a
source regex to stop the two drifting.

That arrangement tests the *text* of the shipped function and the *arithmetic*
of a copy. A sign error introduced in the real code passes, as long as the
regex still matches.

```js
function veffOf(r, m, Lz, a, E){ … }        // pure: the test binds to this
function Veff(r){ return veffOf(r, mu, L, aSpin, Efix); }   // what the tool calls
```

Keep the one-argument wrappers so no call site changes — the refactor is then
mechanical and low-risk. **Test the seam the split introduces**: drive the live
UI through several states and assert the wrapper equals the pure form at the
current state. That is now the only way the two can disagree, and it is a
one-line comparison.

The payoff is concrete. After rebinding, mutating the shipped `−3(L−aE)²/r⁴`
term failed `accel = −½ dVeff/dr`, and dropping the shipped frame-dragging term
failed the release-from-rest identity. Neither mutation could have failed the
old suite.

## Testing

- Exercise the **actual functions inlined in the page**, not copies. Pull the
  inline `<script>` out and evaluate it in a sandbox with DOM stubs. If a
  function cannot be probed at an arbitrary state, that is a signature problem,
  not a testing problem — see above.
- Stub the controls **faithfully**. A range stub that accepts any value hides
  precisely the clamp/step bugs described above.
- **Drive the real UI** — click presets, move sliders — rather than asserting
  on source text. A suite that only tested the maths was structurally unable
  to catch a preset that produced the wrong orbit.
- **Assert properties over the parameter space**, not expressions. "The axis
  never inverts", "the reference line is always in frame", "the barrier peak
  is never cut off" — scanned over ~10⁵–10⁶ configurations — beat any regex
  pinning a formula.
- **Test the claims**: count the nodes/lobes/crossings the copy promises and
  compare.
- **Mutation-test every check.** Reintroduce the bug; confirm the test fails.
- A regex over a whole file **will match your own comments**. Match against
  the extracted function or rule body.
- **A source regex is a stopgap, not a test.** It is what you write when the
  code cannot be called; the fix is to make the code callable. Treat every
  `source X matches the expected form` check as a TODO against the signature.

### Capturing a widget as a still

Headless Chrome will not animate one for you. It reports
`prefers-reduced-motion: reduce`, so a tool that honours it starts **paused**;
and `--virtual-time-budget` advances the clock without ticking rAF (measured:
6 frames in 20 s of virtual time), so nothing progresses even once running.

Drive the state rather than waiting for it: if `step()` and `render()` are
top-level globals, call `step()` in a loop and `render()` once. The capture is
then exact and identical run to run. Worth keeping those two as plain
top-level functions rather than burying them in a closure — it makes the tool
scriptable from the outside for exactly this.

## Accessibility and input

**Lock a drag to one axis, once per gesture.** `touch-action: pan-y` is not
enough on its own: the browser only decides a swipe belongs to the page after
the first few `touchmove`s, and those have already reached your handler. The
opening pixels of a scroll then rotate the scene, and the change survives the
`pointercancel` that follows. Accumulate raw movement until it clears a small
threshold (~6px), pick the dominant axis, and ignore the other one until the
gesture ends. Make the ignored axis reachable another way — a view button —
so nothing is actually lost.

**Test a lock with a DIAGONAL gesture.** A purely vertical drag has zero
horizontal movement, so it passes whether or not the lock exists: the first
version of this check survived deleting the feature it tested. Real gestures
drift, and the drift is the bug.


- `aria-pressed` on every segmented control, kept in sync from state.
- Labels on sliders; `role="group"` with a label on button groups.
- Colour is not the only channel — check contrast, and remember that on a
  saturated background hue separation matters as much as luminance.
- Release drags on `touchcancel`, `pointercancel` and window `blur`, or a
  cancelled gesture leaves the loop running forever on a frozen scene.
- Honour `prefers-reduced-motion`: auto-spin off, still fully usable.

## When you cannot verify something

Say so. A widget that admits "this regime is outside the model's validity" is
worth more than one that quietly draws something wrong — and a comment
claiming a result was "verified" when it was not is worse than no comment.
