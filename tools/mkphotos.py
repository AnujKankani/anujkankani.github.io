#!/usr/bin/env python3
"""Web derivatives for the hero slideshow photos.

The originals live in anuj_photos/, which is NOT tracked -- they are phone
shots and full-resolution press files, 1-4 MB each, and the site has no use
for that. This emits small, uniformly-cropped copies into assets/, which IS
tracked, exactly like the video pipeline: masters out, derivatives in.

Every photo is cropped to the SAME 3:4 portrait box, because the slideshow
cross-fades them in one fixed frame and a mid-fade aspect change reads as the
layout jumping. The crop offsets below are hand-picked per photo -- centre
cropping put a face half out of frame on two of them.

Usage:  python3 tools/mkphotos.py            # write assets/photo-*.jpg
        python3 tools/mkphotos.py --check    # verify outputs are current
"""

import os
import sys
import hashlib
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "anuj_photos")
OUT = os.path.join(ROOT, "assets")

# Portrait slides are 2:3, NOT 3:4. Every portrait original here sits between
# 0.630 and 0.751 -- three of the four are 0.63-0.67 -- so a 3:4 (0.750) frame
# cut 12-16% off their height and was clipping heads and badges. 2:3 (0.667)
# is what these photographs actually are, and three of them now need almost no
# crop at all. Displayed ~172x258 CSS px; 2x for retina gives 360x540.
W, H = 360, 540
# WIDE slides span both columns (172 + 14 gap + 172 = 358 CSS px) at the same
# height as a portrait beside them (258), so the aspect is 358/258 = 1.388.
# Keeping these as genuine landscape crops is the point -- forcing a room shot
# or a blackboard into a portrait box is what threw the subject away.
WIDE = (720, 519)
# 76, not the usual 82. Seven photographs at 82 came to 345 KB, which is more
# than ten times the whole gzipped page and all of it fetched before anything
# below the fold. At 76 the set is ~295 KB and the difference is not visible at
# 172-358 CSS px. If more photographs are added, drop this again rather than
# letting the hero quietly become the heaviest thing on the site.
QUALITY = 76

# (source, output slug, focus, pre_box, size)
#   focus   horizontal/vertical anchor for the fit. 0.0 = left/top,
#           0.5 = centre, 1.0 = right/bottom. Chosen by eye.
#   pre_box optional (l, t, r, b) in 0..1 of the ORIGINAL, applied before the
#           fit. This is the zoom knob: a subject that occupies a small part of
#           a wide frame comes out unreadably small at 172px display if you
#           only ever anchor the crop.
#   size    output pixels; omit for the portrait default (W, H).
PHOTOS = [
    # Anuj mid-talk, SCEECS. Native 4:3 and shown WIDE, so it barely crops:
    # anchored slightly low to drop ceiling while keeping him and the screen.
    ("anuj_seecs.jpeg", "photo-talk", (0.5, 0.58), None, WIDE),
    # Already 3:4, so the anchor does nothing -- listed for symmetry.
    ("anuj_mountain.jpg", "photo-mountain", (0.5, 0.5), None, None),
    # Taller than 3:4; anchor high so both faces survive the crop rather than
    # the statue's shoes.
    ("anuj_ias.png", "photo-ias", (0.5, 0.28), None, None),
    # Ghibli illustration, 2:3. Anchor high-centre to keep the figure and the
    # beam tube running off to the left.
    ("anuj_ghibli_ligo.jpg", "photo-ligo", (0.5, 0.42), None, None),
    # (c) Institute for Advanced Study, photographed by Maria O'Leary. These
    # carry a credit line on the page (CREDIT below); see LICENSE,
    # THIRD-PARTY MATERIAL. Both are low-resolution copies from the IAS site --
    # 424x673 and 480x320 -- so they are at the edge of what 360x480 can use.
    # Ask IAS for the originals if these ever need to be bigger.
    ("anuj_photo.jpg", "photo-portrait", (0.5, 0.30), None, None),
    # Native 3:2, so it is WIDE too. As a portrait crop it lost most of the
    # blackboard -- which is the point of the photograph -- and needed a hard
    # right anchor to keep any at all. At full width it barely crops and holds
    # both people and the equations.
    ("anuj_chalk.jpg", "photo-chalk", (0.5, 0.5), None, WIDE),
]

# Photos needing an on-page credit line, by slug. Anything absent shows a
# blank line -- the space is reserved either way so the frame does not shift
# as the slideshow advances.
CREDIT = {
    "photo-portrait": "Photo: Maria O'Leary / Institute for Advanced Study",
    "photo-chalk": "Photo: Maria O'Leary / Institute for Advanced Study",
    "photo-talk": "Photo: James Beattie",
}


def render(src_path):
    """Crop to 3:4 about the given anchor, resize, strip metadata."""
    im = Image.open(src_path)
    im = ImageOps.exif_transpose(im)          # honour phone orientation
    if im.mode != "RGB":
        im = im.convert("RGB")
    return im


def crop_to(im, focus, pre=None, size=None):
    if pre:
        l, t, r, b = pre
        im = im.crop((round(l * im.width), round(t * im.height),
                      round(r * im.width), round(b * im.height)))
    fx, fy = focus
    ow, oh = size or (W, H)
    want = ow / oh
    have = im.width / im.height
    if have > want:                            # too wide: trim the sides
        new_w = round(im.height * want)
        left = round((im.width - new_w) * fx)
        box = (left, 0, left + new_w, im.height)
    else:                                      # too tall: trim top/bottom
        new_h = round(im.width / want)
        top = round((im.height - new_h) * fy)
        box = (0, top, im.width, top + new_h)
    return im.crop(box).resize((ow, oh), Image.LANCZOS)


def build():
    out = []
    for name, slug, focus, pre, size in PHOTOS:
        src = os.path.join(SRC, name)
        if not os.path.exists(src):
            print("  MISSING  %s (skipped)" % name)
            continue
        im = crop_to(render(src), focus, pre, size)
        dst = os.path.join(OUT, slug + ".jpg")
        # optimize+progressive: smaller file, and a progressive JPEG shows
        # something before it has fully arrived.
        im.save(dst, "JPEG", quality=QUALITY, optimize=True, progressive=True)
        out.append((slug, os.path.getsize(dst)))
    return out


def main():
    check = "--check" in sys.argv
    before = {}
    if check:
        for _, slug, _, _, _ in PHOTOS:
            p = os.path.join(OUT, slug + ".jpg")
            before[slug] = hashlib.sha256(open(p, "rb").read()).hexdigest() if os.path.exists(p) else None
    written = build()
    if check:
        stale = []
        for slug, _ in written:
            p = os.path.join(OUT, slug + ".jpg")
            now = hashlib.sha256(open(p, "rb").read()).hexdigest()
            if before.get(slug) != now:
                stale.append(slug)
        if stale:
            print("STALE  " + ", ".join(stale))
            sys.exit(1)
        print("up to date  (%d photos)" % len(written))
        return
    for slug, size in written:
        mark = "  (credited)" if slug in CREDIT else ""
        print("  %-16s %5.1f KB%s" % (slug + ".jpg", size / 1024, mark))
    print("  total %.1f KB" % (sum(s for _, s in written) / 1024))


if __name__ == "__main__":
    main()
