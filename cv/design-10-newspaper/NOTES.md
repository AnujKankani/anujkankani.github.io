# Design 10 — *The Ringdown Register*

## The idea

The CV is set as the front page of a late-19th-century broadsheet: ornate
blackletter nameplate, folio line, stacked headline decks, hairline column
rules, a drop cap, narrow justified columns, and a standing rail of "office"
matter. Page One is the full front-page performance; Pages Two and Three are
quieter "inside pages" carrying the long lists in the same idiom but plainer.

## The four decisions that carry it

1. **A paper's stacked decks are a CV entry's three levels of specificity.**
   The period's signature move — main headline, then progressively smaller
   subheads separated by short centred rules, each restating the story with
   more detail — maps exactly onto *title → venue → authors → identifier*.
   Every publication is set that way, which is why the form is not just a
   costume here: the headline *is* the paper title, and his titles are
   declarative sentences that read as headlines unaltered.

2. **Published and submitted work are in different registers, not just
   different lists.** The three refereed papers are Page One news: **bold**
   Bodoni caps, in the main well, under a section rule reading PUBLISHED AND
   REFEREED. The four submitted papers are Page Two *announcements*: enclosed
   in a hairline box labelled ANNOUNCEMENTS, set in Bodoni **regular**, each
   carrying a boxed `SUBMITTED — UNDER REVIEW` tag, and preceded by a standing
   note that says in plain English that they have not completed refereeing.
   Four separate signals; a reader cannot conflate the two groups.

3. **The rail is where a paper prints its own address — so that is where the
   contact block goes.** Column four is a boxed masthead (name, department,
   email, site, ORCID, GitHub, Scholar), then Terms of Study (education),
   then Honours Conferred. It is repeated at the foot of Page Three as
   TERMS OF CORRESPONDENCE, which is both period-correct and practically
   useful on the last page of a CV.

4. **Hand-composed fixed-height sheets, not reflowed pages.** Each `.sheet` is
   `7.62 × 10.24in` and every block is placed inside it. There is no automatic
   pagination anywhere, so there are no page-break orphans, no story split
   across a break, and no column-balance surprises — the failure mode is
   overflow, which is visible in the PDF rather than silent. (I deliberately
   did *not* add `overflow:hidden` as a guard: that would drop facts
   invisibly, which on a CV is much worse than an ugly overlap.)

## Fonts — what actually embedded

Probed against `pdffonts`, not the browser. All present on Windows and all
genuinely embedded in `cv.pdf`:

| role | face | embedded as |
|---|---|---|
| nameplate | **Old English Text MT** | `OldEnglishTextMT`, CID TrueType |
| banner headline | **Bodoni MT Condensed Bold** | `BodoniMTCondensed-Bold` |
| story headlines, folio numerals | **Bodoni MT** / **Bodoni MT Bold** | both |
| kickers, section and standing heads | **Engravers MT** | Type 3 (outlined) — extracts to text correctly |
| body, decks, small caps | **Times New Roman** reg./bold/italic | all three |

Blackletter *does* embed, so the nameplate is real and the fallback plan
(heavy engraved serif in caps) was not needed. Engravers MT comes through as
a Type 3 font rather than TrueType — cosmetically identical, and `pdftotext`
still recovers the text, so section headings remain selectable.

## The trap worth passing on to the other designs

**`hyphens: auto` silently does nothing in this headless-Chrome print path.**
I probed it directly (`hyphprobe.html` / `.pdf`): boxes set to `hyphens:auto`
and `hyphens:none` render *identically*, and `antidisestablishmentarianism`
overflows a 1.5in column rather than breaking. The hyphenation dictionary is a
downloadable Chrome component that isn't present in headless. Nothing warns
you; you just get loose justification and rivers.

The fix that works is `&shy;`, which I verified in the same probe. `_shy.py`
carries a 150-word hyphenation dictionary and inserts soft hyphens into text
nodes only (never inside tags or entities), with a three-letter minimum
fragment so no line ends on a two-letter stub. 259 soft hyphens across the
justified blocks; the difference in the 1.6in lead columns is large.

Any design here using `text-align: justify` in a narrow measure has this
problem right now and probably doesn't know it.

## Honesty

The newspaper form invites fabrication, so the checks were explicit:

- **No quotations, no correspondents, no reporting, no assessments.** The only
  prose I wrote is the lead-story précis and the section standfirsts, and each
  sentence restates a fact from `CONTENT.md`.
- Three things I caught in my own draft and removed: a banner reading
  "…BLACK-HOLE MERGERS BY WAVEFORM AND BY PLASMA" (the plasma work is on
  *jets*, not mergers — now "BLACK HOLES"); a lead sentence claiming the
  waveform/plasma combination is "uncommon" (an assessment `CONTENT.md` does
  not make); and a deck labelling the 2021 *Phys. Rev. E* paper
  "Undergraduate work" (an inference from the dates, not a stated fact).
- The one undated entry — the Center for Gravitational Waves and Cosmology
  Symposium — prints an em dash in the year column and the words
  **YEAR NOT STATED** rather than a guess.
- The masthead is invented and signals the field (*ringdown*); it imitates no
  real publication, and there is no ISSN. The dateline is today's real date.
  Volume number, price line and ornaments are costume, and the **colophon on
  Page Three says so explicitly**, along with the statement that the document
  is a CV and not a newspaper.
- **Verified by extraction, not by eye**: `pdftotext cv.pdf` was checked
  against 101 discrete facts from `CONTENT.md` — every email, URL, ORCID,
  volume/article number, arXiv ID, author list, GPA, date range, award,
  conference, talk title and service item. **101 checked, 0 missing.**

## Ink

Pure black on `#fcfbf7` (about 1.5% grey) — a warm paper tone visible on
screen and effectively free to print. There is no colour anywhere in the
document: no hue carries meaning, so nothing can be lost. `greyscale-*.png`
are `pdftoppm -gray` proofs and are indistinguishable from the colour
rasters, which is the point.

## What I'd change with more time

- **Story 2 on Page One runs a few lines longer** than its neighbours because
  "Testing the Boundary-to-Bound Correspondence with Numerical Relativity"
  wraps to five lines of Bodoni caps. A real compositor would have set that
  one headline a point smaller. The column rules still end level, so it reads
  as intentional, but it isn't.
- **Software sits on Page Three**, below the fold of the fold. It is his most
  distinctive asset and deck 2 of the banner does name all five roles, but a
  version that promoted the software into the Page One well — perhaps in place
  of the third (undergraduate) refereed paper — would sell the profile harder.
- The 2:1 split of engagements into two columns of six is arbitrary; grouping
  by year with year-heads spanning both columns would be more period and
  easier to scan.

## Honest read on how this would land

It is the highest-variance design of the set. The typography is genuinely
good and the mapping is not arbitrary — decks really are the right shape for
bibliographic data, and the published/submitted split is *clearer* here than
in a conventional list, which is the argument for the whole thing. A committee
member who enjoys it will remember this CV out of two hundred.

But it asks to be enjoyed, and thirty seconds is not much time to decide
whether a candidate is being charming or unserious. Reading it top-to-bottom,
the facts are all there and findable — "does he have Phys. Rev. D papers?" is
answered by two headlines in the bottom-left of Page One in about three
seconds — so it does not fail on function. The risk is entirely tonal, and it
is real: for a theory postdoc search this may read as a candidate spending
effort on the wrong thing. My honest recommendation is that this is a superb
*website* CV or a portfolio piece, and a gamble as the PDF attached to an
application — worth taking only if the candidate is comfortable being
memorable at the cost of being safe.

## Files

`cv.html` · `cv.pdf` (3pp) · `page-1..3.png` (110dpi) ·
`greyscale-1..3.png` (desaturated proof) · `NOTES.md`

Working files kept per the no-deletion rule: `probe.html/.pdf/-1.png` (the
font-embedding probe), `hyphprobe.html/.pdf/-1.png` (the hyphenation probe),
`_shy.py` (the soft-hyphen pass), `zoom-*.png` (print-resolution crops),
`_head.part` / `_p23.part` / `_tail.part` / `_txt*.txt` / `_final.txt`
(intermediates).
