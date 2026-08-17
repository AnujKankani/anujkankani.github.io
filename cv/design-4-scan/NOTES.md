# design-4-scan — notes

**The idea.** Build the page around the 30-second first pass: page 1 carries the
entire case (who, where, publications, awards, software), and page 2 is the tail
(conferences, service, outreach). A reader who stops at the end of page 1 has
seen everything that would get this candidate shortlisted.

## The five facts, and where each one lands in the first three seconds

| fact | how it lands |
|---|---|
| first-authored GW-modeling record | seven titles in a single block, own name bold and first in every author line |
| PhD at WVU with McWilliams, 2027 | standfirst directly under the name; advisor in the education rail |
| three named awards incl. NASA | bottom-left of page 1, award names the only bold in the column |
| primary developer of gwBOB | bottom-right, `gwBOB — Primary Developer` leading the software column |
| GRPIC/plasma as a second direction | accent-coloured research line immediately under the header rule |

## Decisions that carry it

1. **The rail is the scan mechanism, and for publications it carries the venue,
   not the date.** Every row is `[58pt rail][content]`. Education and conferences
   get years; publications get `PRD / PRD / PRE / PRL / PRD / PRD / JOSS` with the
   status underneath. The column answers "where does this person publish?" without
   the reader parsing a single citation string. Full citations stay in the meta line.

2. **Titles are sized, not bolded.** Publication titles are 10.8pt Georgia in
   pure black on a page whose body is 9–9.6pt; that makes the list skim by title
   while leaving bold free to mean one thing only — proper nouns that are the
   claim (own name, institutions, award names, package names). Bolding the titles
   too would have put roughly a quarter of page 1 in bold, which is the same as
   bolding none of it.

3. **Awards and Software share a two-up band at the foot of page 1.** Stacked
   full-width they pushed software onto page 2, and software is one of the five
   facts. Splitting them into two columns with a hairline rule between costs
   ~85pt and keeps both above the fold. Awards take the left (read first) column
   because a physics committee weighs a NASA fellowship above a repo.

4. **Published vs submitted is stated three ways, deliberately.** A `REFEREED / 3`
   vs `SUBMITTED / UNDER REVIEW / 4` group heading, the rail status word, and
   `submitted to <journal>` in the meta line. This is the one place where
   ambiguity is actively dangerous on a CV, so the redundancy is intentional —
   I removed it once during drafting and put it back.

## Verified, not assumed

- Fonts are genuinely embedded as **Georgia** and **Segoe UI** (`pdffonts`), not
  a silent fallback.
- Greyscale proof rendered separately (`grey-1.png`, `grey-2.png`): the accent
  desaturates to a dark grey and every distinction survives, because hierarchy is
  carried by size, weight and case — colour never carries meaning alone.
- Print-resolution crops at 300dpi (`crop-pubs-1.png`, `crop-software-1.png`) to
  check the smallest type actually holds up on paper.
- Content audited entry-by-entry against CONTENT.md: 7 publications, 12
  conferences, 5 software, 3 awards, 5 service, all contact fields.
- Page 1's last ink clears the bottom margin by 9.8pt; page 2 ends 1.37in up.

## What I'd change with more time

- **The notch at bottom-left of page 1.** The awards column runs out about 1.5in
  before the software column does. The hairline rule between them absorbs some of
  it, but the two columns want to be closer in length — either a fourth item on
  the left or tighter software descriptions.
- **Page 2 ends 1.37in short.** I spent page 2's slack on leading and a size step
  up rather than inflating type further; past that point filling it would have
  been padding.
- I'd want one real greyscale laser print before committing to `--faint`
  (`#7b828a`) for the repo URLs. It measures fine and reads fine at 300dpi, but
  it is the lightest thing on the page and cheap office printers are where that
  kind of thing dies.

## For the other designs

- **`break-inside: avoid` on a large block is a cliff, not a slope.** My
  awards+software band is ~3in tall; the moment page 1 grew past its budget the
  whole band jumped to page 2 and left a half-empty page 1. It went 2 → 3 pages
  from ~25pt of added leading. Budget the space above any tall `avoid` block
  explicitly and re-render after every spacing change.
- **A right-aligned rail with `white-space: nowrap` overflows *into* the content
  column rather than clipping**, and it looks like a rendering bug. My first
  render had `104(3), 035302 · 2021` colliding with the author line. Keep rail
  strings genuinely short instead of trusting the column width.
- `text-wrap: balance` works in headless Chrome's print path and is worth using
  on any one-to-two-line strip.
- Georgia and Segoe UI both embed properly through this render command; Segoe UI
  Semibold resolves as a real weight, so `font-weight: 600` is not synthesised.
