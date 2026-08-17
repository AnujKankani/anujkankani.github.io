# design-4-scan — notes

**This is the CV the site serves.** `AnujKankani-CV.pdf` at the repo root is a
byte-for-byte copy of `cv.pdf` here, and a check in `tools/test.js` compares
them — re-render without re-copying and the site quietly hands out the old one.

**The idea.** Build the page around the 30-second first pass. Page 1 carries the
whole case — who and where, every publication, and the software; pages 2 and 3
are the record behind it. A reader who stops at the foot of page 1 has still
seen what would get this candidate shortlisted.

## What lands in the first three seconds

| fact | how it lands |
|---|---|
| first-authored GW-modeling record | seven titles in one block, own name bold and first in every author line |
| PhD at WVU with McWilliams, May 2027 | standfirst under the name; advisor in the education rail |
| primary developer of gwBOB | Software closes page 1; `PRIMARY / DEVELOPER` in the rail, in the accent |
| three papers in preparation | a line directly under the Publications rule |
| GRPIC/plasma as a second direction | accent research line immediately under the header rule |

## Decisions that carry it

1. **Every section rides one `[58pt rail][content]` grid, and the rail carries
   whatever that section is scanned by.** Education and conferences take years,
   awards take year ranges, publications take the venue tag over the status, and
   software takes the role. That single spine is what makes the pages read as one
   document. Software was the last block still ignoring it and looked bolted on
   until it joined.

2. **Titles are sized, not bolded.** Publication titles are 10.8pt Georgia in
   pure black against a 9–9.6pt body, so the list skims by title while bold means
   exactly one thing — proper nouns that are the claim (own name, institutions,
   award names, package names). Bolding titles too would put roughly a quarter of
   page 1 in bold, which is the same as bolding none of it.

3. **Publications are one merged list in date order, newest first** — not split
   into refereed and submitted groups. That was a deliberate change, and it moved
   the whole burden of the published/submitted distinction onto the rail: refereed
   venue tags take the dark accent, unrefereed ones the muted grey, with
   `SUBMITTED` beneath and `submitted to <journal>` in the meta line. Without the
   colour rule the column skims as seven journal papers including a PRL, which is
   the one misreading that actively damages a CV.

4. **Links are named, not printed.** `Website · GitHub · INSPIRE-HEP` rather than
   raw URLs; the href is live either way, and a printed
   `scholar.google.com/citations?user=…` is a line of tokens that tells a reader
   nothing. Email and the ORCID digits stay spelled out — those are identifiers
   people copy, not places they click.

5. **Work in preparation is stated as topics, not titles.** No title or venue is
   settled, so printing a provisional one would be a claim the record cannot
   support.

## Verified, not assumed

- Fonts genuinely embedded as **Georgia** and **Segoe UI** (`pdffonts`), not a
  silent fallback. Segoe UI Semibold resolves as a real weight, so `font-weight:
  600` is not synthesised.
- **17 live links**, extracted from the PDF bytes rather than trusted from the
  markup: five arXiv abstracts, three DOIs, four software destinations, website,
  GitHub, INSPIRE, ORCID and the `mailto:`. Every one checked for a 200 first.
- The DOIs were **looked up, not constructed**. The obvious guess for the 2025
  paper — `10.1103/PhysRevD.112.124051`, built from volume and article number the
  way every pre-2025 APS DOI is — returns a hard 404; APS moved to opaque
  identifiers that year, and the real one is `10.1103/dtpx-w9nn`. All three were
  confirmed against CrossRef on title, volume and article number.
- Content audited against `CONTENT.md`: 7 publications, 12 conferences, 5
  software, 3 awards, 5 service entries, all contact fields.
- Two errors in the original source PDF were corrected against arXiv — the title
  of the 2025 paper and the article number of the 2024 one.

## Layout as it stands

Three pages. Page 1 is header, education, publications, software. Page 2 is
conferences then awards. Page 3 is involvement and service, with its own running
head so it reads as intentional rather than as spill.

It became three pages when the leading was opened up and Awards and Software were
pulled out of a shared two-up band into full-width sections. That band was worth
losing: it forced both to a half-width measure and left a visible notch where the
shorter column ran out.

## What I'd change with more time

- **The GPA lines.** Conventional on a student CV, usually dropped once you are
  applying for postdocs.
- **`--faint` (`#7b828a`) for the repo URLs** measures fine and reads fine at
  300dpi, but it is the lightest thing on the page and cheap office printers are
  where that kind of thing dies. Worth one real laser print.
- Page 3 carries only involvement and service; it is a clean page rather than a
  full one.

## For anyone editing this

- **`break-inside: avoid` on a large block is a cliff, not a slope.** The old
  awards+software band was ~3in tall; the moment page 1 grew past its budget the
  whole band jumped to page 2 and left page 1 half empty — 2 → 3 pages from about
  25pt of added leading. Budget the space above any tall `avoid` block explicitly
  and re-render after every spacing change.
- **A right-aligned rail with `white-space: nowrap` overflows *into* the content
  column** rather than clipping, and it looks like a rendering bug. Keep rail
  strings genuinely short instead of trusting the column width.
- **Re-copy to `AnujKankani-CV.pdf` after every render.** The suite will catch it,
  but only if the suite is run.
- Page rasters, greyscale proofs and crops are gitignored; regenerate with
  `pdftoppm -png -r 110 cv/design-4-scan/cv.pdf cv/design-4-scan/page`.
