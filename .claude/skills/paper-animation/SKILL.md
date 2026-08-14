---
name: paper-animation
description: Write Manim explainer animations for a research paper, and draw physics illustrations generally. Use when building or editing a paper-overview animation - reading the source paper, pulling equations out of a two-column PDF, choosing a legible palette, avoiding Manim's axis and layout traps, and verifying each beat before a full render - or when drawing any figure that depicts a physical system, where the geometry itself makes a claim. Not tied to any one paper or field.
---

# Manim animations for papers

For turning a paper into a ~60–120 s explainer. The traps below are all
things that shipped wrong at least once and were caught by a check, a
screenshot, or the author.

## Before writing any code

1. **Read the paper.** Extract the actual results and the actual numbers.
   Everything spoken on screen should be traceable to a line in the paper.
2. **Pick the narrative thread.** A 19-page paper has more results than a
   two-minute film can carry. Choose the spine, then cut to it.
3. **Write the beat list into the module docstring**, with the numbers and
   equation references you are going to use. It becomes the provenance record.

## Getting equations out of a PDF

Linear text extraction **scrambles maths in two-column papers**. Fractions
interleave with the neighbouring column, `±` and `√` often fail to map, and
you will confidently transcribe a wrong equation.

Reconstruct from word geometry instead:

```python
words = page.extract_words()
tgt = [w for w in words if w['text'] == '(28)']       # the equation number
band = [w for w in words if abs(w['top']-tgt[0]['top']) < 26 and w['x0'] < 300]
for w in sorted(band, key=lambda w: (round(w['top']/6), w['x0'])):
    print(w['x0'], w['top'], w['text'])
```

Grouping by `top` recovers numerator / main line / denominator; `x0` recovers
left-to-right order. Details this catches: which denominator carries absolute
value bars, whether a leading sign is `±` or fixed, and where a subscript
belongs.

**Absence of a glyph in the extraction is not evidence it is absent from the
paper.** If `±` never appears anywhere in an 8-page physics paper, the
extractor is dropping it.

State in a comment which equation number you transcribed and how you read it,
so a reviewer can check without redoing the work.

## Never invent data

If you do not have the paper's data export, say so **on screen**:

```python
SHOW_PLACEHOLDER_BANNER = True   # a chip along the bottom edge
```

- Real numbers (medians, percentages, counts) can be quoted directly — they
  come from the text.
- Curves and scatter points drawn from hand-tuned functions are **stand-ins**.
  Label them as such and record in the docstring exactly which figures need
  replacing.
- Drop the banner in the same change that lands real data, never before.

If the author supplies a figure, **fit to anchors read off it** and say so —
that is a different and stronger claim than "hand-tuned", and worth recording
precisely. Verify the fit numerically before drawing:

```
target   achieved
1e0      1e-0.04
1e-6     1e-6.00
```

Structure matters more than scale. A family of curves that share one knee
descends together; if each member should also descend *earlier*, the knee has
to depend on the index. Getting the scale right on the wrong structure still
looks wrong.

## Palette

Measure contrast; do not trust your eye on a saturated background.

```python
def ratio(a, b):   # WCAG; >= 4.5 for body text
    ...
```

**Hue separation matters as much as the ratio.** A rose accent at 4.98:1 read
as mud on a caramel ground because it sat 11° away in hue — lightness alone
was carrying the distinction. Push data-series accents to cool or clearly
distinct hues, and check each pair against the ground *and* each other.

Record the measured numbers in a comment next to the palette so the next
change can be checked against them.

## Manim traps

### Axes are drawn at zero

Manim puts the x-axis at `y = 0` and the y-axis at `x = 0`, clamping to the
nearer end when zero is outside the range.

- **All-negative `y_range` (e.g. log-mismatch) puts the x-axis along the
  TOP**, floating above the data. Plot `log10(value) + offset` so the range is
  positive, and label the ticks with the true exponents.
- **A range straddling zero puts the axis through the middle of the data.**
  For a time axis running from negative to positive, plot `t + offset` so the
  y-axis sits at the left edge, and add a dashed marker at the meaningful
  `t = 0` instead.
- A y-range straddling zero is *correct* for an oscillating waveform. Say so
  in a comment, so the next reader does not "fix" it.

### Curves escaping the box

`ax.plot` will happily draw outside the axes. Compute the data's min and max
over the plotted range and assert it fits `y_range` before rendering.

### Layout collisions

Assert clearances instead of hand-tuning buffers, which silently break when a
font metric shifts:

```python
clearance = above.get_bottom()[1] - mob.get_top()[1]
assert clearance >= gap, f"layout collision: {clearance:.2f} < {gap}"
```

Have the same helper push captions off any persistent bottom banner. When the
assert fires it usually means the *figure* is too tall, not that the gap is
too big.

### Text alignment

- A multi-line `Text` is **left-aligned inside its own box**. Centring the box
  still leaves ragged lines under a centred equation. Build the lines
  separately and `arrange(DOWN)`, which centres them.
- Two columns with **different row counts** cannot both be centred on the same
  y — their headings end up at different heights. `align_to(other, UP)`.
- Centre a payoff line on the screen (`set_x(0)`), not on an asymmetric group.

### Label collisions

Curves that converge cannot be labelled at their common end — the labels
stack. Either label where the curves are separated, or place them outside the
plot and let colour do the attribution. Check by rendering, not by reasoning.

### Name collisions

`from manim import *` brings in `TAU = 2π`. A physics damping time called
`TAU` silently rescales anything using the real one. Prefix or rename
(`TAU_D`), and grep for other collisions (`X`, `Y`, `Z`, `DOWN`, `LEFT`).

## Workflow

1. `-ql` full render first. It catches layout asserts and LaTeX errors in
   ~1 minute rather than ~6.
2. **Render individual beats as stills.** Subclass the scene, run one beat,
   and swallow the closing `FadeOut` so the still shows the finished slide:

   ```python
   class OneBeat(TheScene):
       def construct(self):
           self.camera.background_color = BG
           self.beat_of_interest()
       def play(self, *a, **k):
           if a and isinstance(a[0], FadeOut):
               return
           return super().play(*a, **k)
   ```

   Then `manim -ql -s`. This is the fastest way to check every slide.
3. `-qh` for the final. Extract frames with `ffmpeg -ss <t> -frames:v 1` to
   confirm a fix survived into the actual film.
4. Keep the beat-still harness in a scratch directory, not the repo.

## Pacing and honesty

- Hold at the end of each beat (~2.5 s), longer on the densest figure.
- **Record the measured duration in the docstring, not the intended one.**
  "~30 seconds" sat above a 61 s film for weeks. Check with `ffprobe`.
- Fixed RNG seed for any scatter, so the figure is reproducible run to run.
- Rendered video does not belong in git — every re-render adds a full copy.
  Gitignore it and keep the source, which reproduces it.

## Drawing physics: the shape carries the claim

Applies to any physics illustration, animated or static. Each of these shipped
wrong first and was caught by looking at the render, not by reasoning.

- **Symmetry that the physics does not have will draw itself.** A bipolar jet
  is *collinear*: both lobes rotate by the same angle about the source.
  Rotating them by opposite angles splays them into a V, and four of those
  read as a butterfly. Likewise a rotating magnetosphere winds **one** spiral —
  alternating the sweep direction of field lines both tangles them and depicts
  a field no rotating object can produce.
- **Direction of travel lives in the trail, and one reversal flips the
  meaning.** The same blob with the same tail reads as *accretion* or as a
  *jet* depending only on which end the head is. Check it deliberately.
- **Taper the trail.** A uniform-width stroke with a dot on the end reads as a
  lollipop, not as motion.
- **Structure beats scale.** A family of curves sharing one knee looks wrong
  even at the right magnitudes; if each member should also turn over earlier,
  the knee has to depend on the index.
- **Beware accidental faces.** Two similar dark discs side by side, at the same
  height, with anything vertical between them, read as eyes and a nose. Unequal
  sizes, contact, or a vertical offset breaks it. This is very hard to unsee
  once noticed and very easy to miss while building — ask someone.
- **Emergence has to be constructed.** For a wave to look like it *leaves* a
  body rather than wrapping around it, pin its envelope to zero at that body's
  edge — and key that taper to the **edge**, not to the end of the path. Keyed
  to the path, the whole taper happens hidden behind the body and nothing
  changes on screen.
- **Detail must survive the smallest size it ships at.** Islands 8px wide on a
  1200px canvas vanish; a mark that reads at 64px can be mush at 16px. Render
  at the real size and look.

### Worked example: a reconnecting current sheet

Kept because it is the clearest case of "structure is the claim", and because
the naive drawing — a wavy ribbon with evenly spaced beads on it — is wrong in
five separate ways. What a tearing-unstable layer actually looks like in PIC
and MHD reconnection runs:

- the layer is **only thin between islands**. It bulges wherever a plasmoid
  sits, so the outline is a string of beads of very different sizes, not a
  tube of constant width. Build the thickness as a thin baseline plus a bump
  at each island and the rest falls out of the construction;
- islands are **hierarchical, not monotonic** — small secondary ones sit
  between large ones, because they form, merge and get swept up continuously.
  A smooth ramp of sizes reads as decoration;
- between every adjacent pair sits an **X-point**, where the layer pinches
  thinnest and the field reconnects. Do not draw these; let them emerge from
  the thickness function;
- plasmoids are **closed loops around an O-point**, so they read as nested
  rings, not flat discs;
- islands are advected **both ways** from the centre and grow toward the
  outflow ends, where the largest are ejected;
- the sheet is **finite**, terminating in an outflow exhaust. End it at the
  outermost island, not at a fixed span, or a bare spike of layer sticks out
  past the last plasmoid like a spear tip.

## Physics-claim discipline

- Do not invent a derivation route. If the paper resums a series, do not
  animate a contour integral.
- Sign and branch conventions are easy to get half-right. A spectrum with
  `±` has *both* branches; drawing only one can invert the physical meaning
  (for example the apparent handedness of a mode). When a quantity is
  conventionally quoted with a particular sign, say which convention is drawn.
- If a claim on screen is stronger than the paper's, weaken it. "Nothing to
  fit" is wrong when one parameter is fitted; "almost nothing to fit" is not.
- Never write "verified" in a comment for something you have not verified.
