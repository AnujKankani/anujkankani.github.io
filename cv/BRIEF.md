# CV design brief — shared constraints

Five parallel explorations of the same CV. You are one of them. Read this, read
[CONTENT.md](CONTENT.md), then build **your** design in **your** directory only.

## Who this is for

Anuj Kankani, PhD candidate in gravitational-wave physics at West Virginia
University, going on the **academic job market** (postdoc applications in
gravitational-wave / numerical-relativity / plasma-astrophysics groups). The
readers are physics faculty on a search committee who will spend 30–90 seconds
on the first pass.

The goal, in the site owner's words: *"remain professional for the academic job
market but make it a better design."* Both halves are load-bearing. A CV that
looks like a design portfolio piece will read as a red flag; a CV that looks
like every other `article`-class LaTeX default is the thing being replaced.

## Hard constraints

- **Everything you write goes in your own directory, and nowhere else.** Do not
  create, edit, move or delete a single file outside it — not in the repo root,
  not in `/tmp`, not in the home directory, not in `cv/` itself, and not in
  another design's directory. This is a standing rule in this repo and it is
  not negotiable.
- **Do not run `git add`, `git commit`, `git push`, or `git rm`.** Ever.
- **Do not delete anything**, including your own earlier attempts. Overwrite
  your own files freely; remove nothing.
- **HTML + CSS, printed to PDF.** Not LaTeX, even though LaTeX is installed.
  All five designs must be in the same technology so they can be compared side
  by side and so the winner can be iterated on afterwards.
- **US Letter, 8.5 × 11in.** Use `@page { size: letter; margin: ... }`.
- **Self-contained single file.** No external CSS, no JS, no fetched images. If
  you want a graphic, inline it as SVG. Web fonts do not embed reliably through
  headless print — **use system font stacks only** (e.g. `Georgia, 'Times New
  Roman', serif` / `-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif` /
  `ui-monospace, 'SF Mono', Consolas, monospace`). If you use a font that isn't
  actually installed, the PDF will silently fall back and your design is a lie —
  verify against the rendered PDF, not the browser.
- **2–3 pages.** The source CV is 3. Two is better if it doesn't cramp.
- **Print-safe colour.** Assume it may be printed in greyscale by someone on a
  committee. Nothing should become illegible or lose meaning when desaturated.
  Colour may carry emphasis; it must not be the only thing carrying it.
- **No page-break orphans.** No section heading stranded at the foot of a page,
  no publication split across a page break. Use `break-inside: avoid;` and
  check the actual PDF.
- **Content is fixed.** See CONTENT.md. Every entry must appear. You may change
  section names, order, and grouping if your design argues for it, and you may
  make the visual hierarchy say things the plain list doesn't — but you may not
  invent, drop, or embellish a fact.

## Build and verify

A static server is already running at `http://localhost:8000` from the repo
root. Write `cv.html` in your directory, then render:

```bash
CHROME="/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"
UNC='\\wsl.localhost\Ubuntu\home\anuj\website\anujkankani.github.io\cv\<YOUR-DIR>'
"$CHROME" --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$UNC\\cv.pdf" \
  "http://localhost:8000/cv/<YOUR-DIR>/cv.html"
```

That is verified to work. Substitute your directory name in both places.

**You must look at what you produced.** A PDF that renders wrong is the whole
failure mode here, and it is invisible from the HTML. Check at minimum:

```bash
pdfinfo cv/<YOUR-DIR>/cv.pdf                    # page count and page size
pdftotext cv/<YOUR-DIR>/cv.pdf - | head -60     # text order and completeness
```

and rasterise a page to actually *see* it:

```bash
pdftoppm -png -r 80 -f 1 -l 3 cv/<YOUR-DIR>/cv.pdf cv/<YOUR-DIR>/page
```

then Read the resulting `page-1.png` etc. as images. Iterate until the PDF —
not the HTML — is right. If `pdfinfo`/`pdftoppm` are missing, say so in your
report rather than skipping the check.

Headless Chrome traps that have bitten this repo before: the default viewport
is 800×600 if you don't pass `--window-size`; `--virtual-time-budget` advances
the clock but does not tick rAF or CSS animations; and Chrome clamps window
width to ~504px. None should matter for a print render, but don't be surprised.

## Deliverables in your directory

1. `cv.html` — the design, self-contained.
2. `cv.pdf` — the rendered output.
3. `page-1.png`, `page-2.png`, … — rasterised pages, so the comparison can be
   made visually without re-rendering.
4. `NOTES.md` — **short**. What the design idea is in two sentences, the three
   or four specific decisions that carry it, what you'd change with more time,
   and anything you found that the other designs should know. Do not pad it.

## What "better design" can mean

You do not have to use all of these, and you should not use all of them. Pick a
thesis and commit to it.

Typography and rhythm · information hierarchy (what a 30-second reader sees
first) · handling of the 7 publications, which are the centre of gravity ·
making "submitted" vs published legible without burying the published ones ·
the software contributions, which are unusual for a physics CV and are an asset
· whitespace and margin discipline · a restrained accent colour · the contact
block, currently absent entirely · how the 12 conference entries are kept from
swamping the page.

Two things worth knowing about this candidate's profile: the publication list is
strong and first-authored, and the software work plus the GRPIC/plasma direction
alongside waveform modeling is what makes the profile distinctive rather than
generic. A design that flattens everything into one uniform list throws that
away.
