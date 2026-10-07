#!/usr/bin/env python3
"""Build the private CV variant by injecting the In Preparation section.

Two CVs exist and must never drift apart in the 95% they share:

  cv/design-4-scan/cv.html      PUBLIC. Tracked, served by GitHub Pages, and
                                rendered to AnujKankani-CV.pdf. Carries NO
                                in-preparation work.
  cv/design-4-scan/_inprep.html PRIVATE fragment: just the <section>. Ignored
                                by the cv/design-4-scan/* rule in .gitignore.

Rather than keep two near-identical pages, the public file is the single
source for everything shared, and this script splices the fragment into a
throwaway copy. Edit shared content in cv.html; edit papers in _inprep.html.

The public HTML is itself published, so hiding the section with CSS would not
do: the titles would still be in the source anyone can view. The content has
to be absent from the tracked file, which is why this is a build step and not
a stylesheet rule.

Usage:  python3 tools/mkcv.py          # writes cv-inprep.html
        python3 tools/mkcv.py --check  # exit 1 if it is missing or stale
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DESIGN = ROOT / "cv" / "design-4-scan"
PUBLIC = DESIGN / "cv.html"
FRAGMENT = DESIGN / "_inprep.html"
PRIVATE = DESIGN / "cv-inprep.html"

# The fragment goes where the section sat when it was part of the page:
# directly under Publications, above Software.
ANCHOR = "<!-- ----------------------------- SOFTWARE"

# The two builds need their forced page breaks in DIFFERENT places, because
# In Preparation is about a third of a page.
#
#   public   p1 = header + education + publications + software   (909 of 968px)
#   private  p1 = header + education + publications + in-prep    (834 of 968px)
#
# In the private build software no longer fits on page 1, so both breaks move
# up one section. Using the public positions there would push software off the
# page anyway and strand the same whitespace this was meant to remove; using
# the private positions in the public file is what stranded it to begin with.
# Section banners are the anchors -- they survive content growth, line numbers
# do not.
BREAK = re.compile(
    r'<!-- =+ PAGE \d =+ -->\n<div class="pagebreak"></div>\n\n'
    r'<div class="contheader">\n.*?\n</div>\n\n', re.S)
MOVE_TO = ("<!-- ----------------------------- SOFTWARE",
           "<!-- ------------------------------ AWARDS")


def build() -> str:
    public = PUBLIC.read_text(encoding="utf-8")
    fragment = FRAGMENT.read_text(encoding="utf-8")
    if "IN PREPARATION" in public:
        sys.exit("cv.html already contains an In Preparation section -- the "
                 "public CV is supposed to carry none. Refusing to inject a "
                 "second one.")
    if public.count(ANCHOR) != 1:
        sys.exit(f"expected exactly one {ANCHOR!r} in cv.html")
    i = public.index(ANCHOR)
    page = public[:i] + fragment + public[i:]

    blocks = BREAK.findall(page)
    if len(blocks) != len(MOVE_TO):
        sys.exit(f"expected {len(MOVE_TO)} forced page breaks in cv.html, "
                 f"found {len(blocks)}")
    for span in reversed([m.span() for m in BREAK.finditer(page)]):
        page = page[:span[0]] + page[span[1]:]
    for block, anchor in zip(blocks, MOVE_TO):
        if page.count(anchor) != 1:
            sys.exit(f"expected exactly one {anchor!r} to anchor a page break")
        j = page.index(anchor)
        page = page[:j] + block + page[j:]
    return page


def main() -> None:
    check = "--check" in sys.argv
    want = build()
    if check:
        if not PRIVATE.exists():
            sys.exit(f"{PRIVATE.relative_to(ROOT)} is missing -- run tools/mkcv.py")
        if PRIVATE.read_text(encoding="utf-8") != want:
            sys.exit(f"{PRIVATE.relative_to(ROOT)} is stale -- run tools/mkcv.py")
        print(f"up to date  [{PRIVATE.relative_to(ROOT)}]")
        return
    PRIVATE.write_text(want, encoding="utf-8")
    n = FRAGMENT.read_text(encoding="utf-8").count('class="row pub"')
    print(f"wrote {PRIVATE.relative_to(ROOT)} ({n} in-preparation entries)")


if __name__ == "__main__":
    main()
