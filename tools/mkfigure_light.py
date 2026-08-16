#!/usr/bin/env python3
"""Decorative site figures -- light ground, no text.

Everything here is an ILLUSTRATION, not a diagram and not simulation output.
Nothing is quantitative and no label claims otherwise -- the honesty lives in
the page's caption / alt text, not in the artwork.

Outputs:
  light-hero      the deployed hero band. One black hole bisected: a single
                  gravitational wave leaving on the left, a conical accretion
                  flow with particles accelerated at its boundary on the right.
  hero-inline     the same figure with its colours swapped for the site's CSS
                  custom properties. THIS is the build that goes in the page;
                  see themed().
  light-riso      standalone binary-with-jets figure, flat overlapping inks.
  light-cartoon   the same, thick outlines and flat fills.
  light-rail      the hero artwork rotated for the scroll rails, plus a themed
  rail-inline     rail-inline.svg alongside it.

Only light-hero/hero-inline is used by the site. The riso/cartoon pair were
built as alternatives and kept; the rail pair fed gutter figures that were
removed on 2026-08-15 (see variant_rail).

Usage:  python3 tools/mkfigure_light.py <outdir>
"""

import math
import os
import sys

W, H = 1200, 720
CX, CY = 600, 336

# Light palette, from index.html's :root block.
PAPER = "#FAF9F6"
INK   = "#15171C"
INDIGO = "#3B3F9E"
MAGENTA = "#B5348A"
AMBER = "#E9A23B"
# The hole's interior. Kept distinct from INK (which draws the outlines)
# because the two must diverge in the themed build: outlines flip to a light
# colour on a dark page, the void must not.
VOID = "#0C1622"


def polyline(pts, close=False):
    return "M" + "L".join(f"{x:.2f} {y:.2f}" for x, y in pts) + ("Z" if close else "")


def cone(cx, cy, up, length, w_base, w_top, curve=0.62, n=44):
    """A jet lobe: narrow at the hole, opening gently along its length.

    An earlier version flared with a rounded cap and read as a butterfly wing
    rather than a jet. Width now grows as a soft power law and the top stays
    narrow, which is what makes the silhouette read as collimated.
    """
    s = -1 if up else 1
    left, right = [], []
    for i in range(n + 1):
        t = i / n
        w = w_base + (w_top - w_base) * (t ** curve)
        y = cy + s * (10 + length * t)
        left.append((cx - w, y))
        right.append((cx + w, y))
    ytop = left[-1][1]
    # Dome the wide end. A flat top made the lobe look sawn off rather than
    # like something still streaming outward.
    cap = f"Q{cx:.1f} {ytop + s * w_top * 0.95:.1f} {cx + w_top:.1f} {ytop:.1f}"
    # Drop the first reversed point: the cap already ends there. Splicing with
    # polyline()[1:] left a bare coordinate pair after the Q, which the path
    # parser folded into a following curve and mangled the outline.
    rev = right[::-1][1:]
    return (polyline(left) + cap + "L"
            + "L".join(f"{x:.2f} {y:.2f}" for x, y in rev) + "Z")


# ------------------------------------------------------------------- kinetics
#
# What distinguishes a KINETIC treatment from a fluid one, visually: the plasma
# is made of individual particles, and each one spirals around the magnetic
# field rather than flowing along it. So the jet interior carries helical
# trajectories with discrete particles riding them.
#
# Two details that are physically real and happen to help the drawing:
#   * the gyroradius grows as the field weakens, so the helix WIDENS along the
#     jet exactly as the funnel opens;
#   * a helix seen side-on is only half visible -- the far side of each turn
#     passes behind the axis. Breaking the line there is what makes it read as
#     a spiral instead of a flat zigzag.


def helix_runs(cx, cy, up, length, w_base, w_top, curve=0.68,
               turns=4.6, phase=0.0, amp=0.78, n=240):
    """Split a projected helix into front-facing and rear-facing runs."""
    s = -1 if up else 1
    runs, cur, cur_front = [], [], None
    for i in range(n + 1):
        t = i / n
        w = (w_base + (w_top - w_base) * (t ** curve)) * amp
        a = 2 * math.pi * turns * t + phase
        p = (cx + w * math.sin(a), cy + s * (10 + length * t))
        front = math.cos(a) > 0
        if front != cur_front and cur:
            runs.append((cur_front, cur + [p]))
            cur = []
        cur_front = front
        cur.append(p)
    if cur:
        runs.append((cur_front, cur))
    return runs


def helix_particles(cx, cy, up, length, w_base, w_top, curve=0.68,
                    turns=4.6, phase=0.0, amp=0.78, count=5):
    """A handful of particles sitting on the helix, largest where the field is
    weakest and the orbit widest."""
    s = -1 if up else 1
    out = []
    for i in range(count):
        t = (i + 0.62) / (count + 0.25)
        w = (w_base + (w_top - w_base) * (t ** curve)) * amp
        a = 2 * math.pi * turns * t + phase
        out.append((cx + w * math.sin(a), cy + s * (10 + length * t),
                    5.4 + 4.4 * t, math.cos(a) > 0))
    return out


def escapees(xc, cy, up, length, w_base, w_top, curve, picks):
    """Particles that have broken out of their gyration and left the jet.

    Direction is mostly ALONG the jet with an outward tilt, not sideways: a
    relativistic particle that escapes is beamed, so it leaves in a narrow cone
    about the field rather than spraying out perpendicular.

    Returns (head_x, head_y, angle, radius, travel) per escapee.
    """
    s = -1 if up else 1
    out = []
    for t, side, spread_deg, travel, rad in picks:
        w = w_base + (w_top - w_base) * (t ** curve)
        x0 = xc + side * w
        y0 = cy + s * (10 + length * t)
        a = math.radians(spread_deg)
        dx, dy = side * math.sin(a), s * math.cos(a)
        out.append((x0 + dx * travel, y0 + dy * travel, (dx, dy), rad, travel))
    return out


def comet(hx, hy, d, back, rad, bow=0.0):
    """Tapered trail behind an escaping particle: full width at the head,
    pinching to a point at the tail, bowed slightly so it still remembers the
    curve of the orbit it broke out of.

    A uniform-width stroke here read as a lollipop -- a stick with a ball on
    the end. The taper is what makes it motion.
    """
    dx, dy = d
    px, py = -dy, dx                                  # unit perpendicular
    tx, ty = hx - dx * back, hy - dy * back           # tail point
    mx = 0.5 * (hx + tx) + px * bow * back
    my = 0.5 * (hy + ty) + py * bow * back
    return (f"M{hx + px * rad:.1f} {hy + py * rad:.1f}"
            f"Q{mx + px * rad * 0.62:.1f} {my + py * rad * 0.62:.1f} {tx:.1f} {ty:.1f}"
            f"Q{mx - px * rad * 0.62:.1f} {my - py * rad * 0.62:.1f} "
            f"{hx - px * rad:.1f} {hy - py * rad:.1f}Z")


def grain_filter():
    return ('<filter id="grain" x="0" y="0" width="100%" height="100%">'
            '<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" '
            'stitchTiles="stitch" result="n"/>'
            '<feColorMatrix in="n" type="saturate" values="0"/>'
            '</filter>')


def wrap(defs, body, bg=PAPER, grain=0.0, tilt=-8, w=None, h=None, pivot=None,
         vb=None):
    """Tilting the whole motif keeps it from reading as a static symmetric
    emblem. The wavefronts are circles centred on the pivot, so they are
    invariant under this rotation -- only the jet, sheet and holes swing.

    The hero passes tilt=0: its whole point is a clean vertical split, and a
    tilt would fight it.
    """
    w = W if w is None else w
    h = H if h is None else h
    px, py = pivot if pivot else (CX, CY)
    g = ""
    if grain:
        g = (f'<rect width="{w}" height="{h}" filter="url(#grain)" '
             f'opacity="{grain}" style="mix-blend-mode:multiply"/>')
    view = vb if vb else f"0 0 {w} {h}"
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}" '
            f'width="{w}" height="{h}" role="img">'
            f'<defs>{defs}</defs>'
            f'<rect x="{view.split()[0]}" y="{view.split()[1]}" '
            f'width="{view.split()[2]}" height="{view.split()[3]}" fill="{bg}"/>'
            f'<g transform="rotate({tilt} {px} {py})">{body}</g>{g}</svg>')


# ------------------------------------------------------------------ riso
def variant_riso():
    """Flat inks laid over one another with multiply, the way a risograph or a
    two-colour screenprint builds its secondary colours in the overlaps."""
    defs = grain_filter() + (
        f'<radialGradient id="halo"><stop offset="0" stop-color="{AMBER}" stop-opacity=".30"/>'
        f'<stop offset="1" stop-color="{AMBER}" stop-opacity="0"/></radialGradient>')
    o = []

    o.append(f'<circle cx="{CX}" cy="{CY}" r="470" fill="url(#halo)"/>')

    # Wavefronts: bold concentric rings, spacing opening outward.
    o.append('<g style="mix-blend-mode:multiply">')
    r = 118.0
    i = 0
    while r < 520:
        op = max(0.0, 0.58 - 0.055 * i)
        sw = 8.0 - 0.62 * i
        if op > 0.03 and sw > 1.2:
            o.append(f'<circle cx="{CX}" cy="{CY}" r="{r:.1f}" fill="none" '
                     f'stroke="{INDIGO}" stroke-width="{sw:.1f}" opacity="{op:.2f}"/>')
        r *= 1.168
        i += 1
    o.append('</g>')

    # Jets: each hole drives its OWN bipolar pair. Both lobes of a pair stay
    # vertical, so they are collinear and never scissor; the whole motif's 8
    # degree tilt supplies the movement instead.
    o.append('<g style="mix-blend-mode:multiply">')
    for xc, ln, wb, wt in ((CX - 88, 252, 15, 50), (CX + 90, 212, 12, 40)):
        for up in (True, False):
            o.append(f'<path d="{cone(xc, CY, up, ln, wb, wt, curve=0.68)}" fill="{AMBER}" '
                     f'opacity=".58"/>')
    o.append('</g>')


    # The holes: solid ink, the only fully opaque thing in the picture.
    for xc, rr in ((CX - 88, 52), (CX + 90, 38)):
        o.append(f'<circle cx="{xc}" cy="{CY}" r="{rr}" fill="{INK}"/>')
        o.append(f'<circle cx="{xc}" cy="{CY}" r="{rr + 9}" fill="none" stroke="{AMBER}" '
                 f'stroke-width="4" opacity=".9"/>')

    return wrap(defs, "".join(o), grain=0.10)


# ------------------------------------------------------------------ cartoon
def variant_cartoon():
    """Thick outlines, flat fills, no gradients -- a sticker of a merger."""
    defs = ""
    o = []
    OL = 5.5     # outline weight

    def outlined(d, fill, w=OL, op=1.0):
        return (f'<path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="{w}" '
                f'stroke-linejoin="round" opacity="{op}"/>')

    # Wavefronts: chunky arcs, alternating weights.
    r = 134.0
    i = 0
    while r < 530:
        o.append(f'<circle cx="{CX}" cy="{CY}" r="{r:.1f}" fill="none" stroke="{INDIGO}" '
                 f'stroke-width="{8.5 if i % 2 == 0 else 4.5}" opacity="{max(0.0, 0.92 - 0.085 * i):.2f}" '
                 f'stroke-linecap="round"/>')
        r *= 1.20
        i += 1

    # (x of the hole, lobe length, half-width at base, half-width at the top),
    # then the helix turn count and phase for that jet.
    JETS = (((CX - 90, 248, 17, 52), 3.4, 0.0),
            ((CX + 92, 208, 13, 42), 2.9, 1.9))

    # Jets: one bipolar pair per hole, each pair collinear.
    for (xc, ln, wb, wt), _turns, _ph in JETS:
        for up in (True, False):
            o.append(outlined(cone(xc, CY, up, ln, wb, wt, curve=0.68), AMBER))

    # Kinetic layer: particles spiralling along the field inside each jet.
    # Different turn counts and phases per jet, so the pair does not read as
    # one shape mirrored.
    for (xc, ln, wb, wt), turns, ph in JETS:
        for up in (True, False):
            kw = dict(curve=0.68, turns=turns, phase=ph + (0.0 if up else 0.7))
            for front, pts in helix_runs(xc, CY, up, ln, wb, wt, **kw):
                o.append(f'<path d="{polyline(pts)}" fill="none" stroke="{INK}" '
                         f'stroke-width="{4.4 if front else 2.0}" stroke-linecap="round" '
                         f'opacity="{1.0 if front else 0.34}"/>')
            for px, py, pr, pf in helix_particles(xc, CY, up, ln, wb, wt, **kw):
                o.append(f'<circle cx="{px:.1f}" cy="{py:.1f}" r="{pr:.1f}" '
                         f'fill="{MAGENTA}" stroke="{INK}" stroke-width="2.8" '
                         f'opacity="{1.0 if pf else 0.62}"/>')

    # Non-thermal escapees: accelerated particles that have left the jet.
    # (t along the lobe, which side, tilt from the axis, distance, radius)
    PICKS = {
        (0, True):  [(0.52, -1, 34, 118, 8.0), (0.86, 1, 26, 74, 6.4)],
        (0, False): [(0.70, -1, 30, 132, 8.6)],
        (1, True):  [(0.44, 1, 38, 140, 8.2), (0.90, -1, 22, 66, 6.0)],
        (1, False): [(0.62, 1, 33, 122, 7.6)],
    }
    for j, ((xc, ln, wb, wt), _t, _p) in enumerate(JETS):
        for up in (True, False):
            for hx, hy, d, rad, travel in escapees(
                    xc, CY, up, ln, wb, wt, 0.68, PICKS[(j, up)]):
                o.append(f'<path d="{comet(hx, hy, d, travel * 0.97, rad, bow=0.16)}" '
                         f'fill="{MAGENTA}" stroke="{INK}" stroke-width="3" '
                         f'stroke-linejoin="round"/>')
                o.append(f'<circle cx="{hx:.1f}" cy="{hy:.1f}" r="{rad:.1f}" '
                         f'fill="{MAGENTA}" stroke="{INK}" stroke-width="3"/>')

    for xc, rr in ((CX - 90, 54), (CX + 92, 39)):
        o.append(f'<circle cx="{xc}" cy="{CY}" r="{rr + 11}" fill="{AMBER}" '
                 f'stroke="{INK}" stroke-width="{OL}"/>')
        o.append(f'<circle cx="{xc}" cy="{CY}" r="{rr}" fill="{INK}"/>')

    return wrap(defs, "".join(o))


# ------------------------------------------------------------------ hero
# One black hole, bisected. Left half is the gravitational-wave description,
# right half is the kinetic-plasma one -- the same object, two ways of writing
# it down.
#
# The two halves are deliberately opposite in what they do, and that contrast
# does the explaining that text would otherwise have to:
#
#   LEFT   energy leaving. A single wave, radiating outward along the axis.
#   RIGHT  matter arriving. A cone of accreting flow converging on the hole,
#          with particles accelerated at its boundary and escaping across it.
#
# An earlier version used concentric wavefront arcs on the left and a
# particle-in-cell mesh with gyro-orbits on the right; both were replaced.

HW, HH = 1200, 480
HCX, HCY = 600, 240
HR = 63          # black-hole radius
HGAP = 5         # half-width of the seam between the two halves

# Hero animation timing. DUPLICATED, not imported: index.html's @keyframes
# hold the same numbers. The reveal circle grows from REVEAL_R0 to REVEAL_R1
# over the first EMERGE_FRAC of a CYCLE_S cycle, and each escaping particle is
# delayed until that front reaches it. Change these and the @keyframes must
# change with them -- tools/test.js asserts the two copies agree on all three,
# because drift here fires particles ahead of the jet and nothing else notices.
# The hero runs full bleed, so its NATURAL aspect has to be wide enough that a
# full-width figure still fits above the fold. Cropping a 2.5:1 drawing to fit
# threw away ~45% of its height; flattening the composition instead keeps all
# of it. These two dominate the vertical extent: the cone's half-angle and the
# wave's amplitude.
CONE_HALF_ANGLE = 0.175
WAVE_AMP = 72.0

# R1 is the distance at which the reveal has uncovered EVERYTHING, so it must
# be the artwork's real extent -- measured 2026-08-15 as 668 for the jet cone
# and 715.6 for the outermost escapee at full drift, hence 740 with margin.
# It was 1500, which meant the circle outran the drawing: everything was
# uncovered by 22% of the cycle instead of EMERGE_FRAC, the last ~31% of the
# "grow" phase was dead time, and the jet finished BEFORE the wave rather than
# at half its rate. Too small is worse than too large -- anything past R1 is
# clipped forever -- so tools/test.js bounds it on both sides against the
# measured extent.
REVEAL_R0, REVEAL_R1 = 80.0, 740.0
EMERGE_FRAC, CYCLE_S = 0.415, 17.0


def _hero_art(idp=""):
    """The artwork itself, shared by variant_hero() and variant_rail().

    Returns (defs, body). Both callers hand it to wrap() with different
    rotation and viewBox, so the rail is the same drawing seen sideways
    rather than a second copy that can drift. Only the hero is on the site --
    see variant_rail().

    `idp` prefixes every internal id. Several of these SVGs are inlined into
    one page, and without it they all define id="hL"/"hR" -- duplicate ids
    whose url(#...) references resolve to whichever came first.
    """
    OL = 5.0
    L, R, J = f"{idp}hL", f"{idp}hR", f"{idp}jet"
    defs = (f'<clipPath id="{L}"><rect x="0" y="0" width="{HCX - HGAP}" height="{HH}"/></clipPath>'
            f'<clipPath id="{R}"><rect x="{HCX + HGAP}" y="0" width="{HW}" height="{HH}"/></clipPath>'
            # Reveal for the jet: a circle on the hole whose radius the
            # page's CSS animates outward. The static value here covers the
            # whole cone, so if the animation never runs -- reduced motion, or
            # an engine that will not animate `r` -- the jet is simply drawn
            # in full rather than vanishing.
            f'<clipPath id="{J}"><circle class="jet-reveal" cx="{HCX}" cy="{HCY}" r="2000"/></clipPath>')
    o = []

    # ---- LEFT: a single wave leaving the hole.
    #
    # Distance from the source IS time before merger, so reading leftward runs
    # the inspiral backwards: FREQUENCY is highest at the hole and winds down
    # going outward. That is the site's old chirp law mapped onto space rather
    # than time.
    #
    # AMPLITUDE does not follow the same rule here. It is pinched back to zero
    # at the hole as well as at the far edge, so the wave leaves along the axis
    # and emerges from behind the disc as a straight line before it swells.
    # Letting it peak at the hole -- which is what the physical falloff alone
    # gives -- sent the crests arcing over and under the disc, and the wave
    # read as wrapping around the hole rather than exiting it.
    o.append(f'<g clip-path="url(#{L})">')
    X_FAR = -30.0
    X_EXIT = HCX - HR - 12                         # the disc's outer edge
    N = 700

    def w_env(e):
        """Zero at both ends, peaking just short of the hole. The taper has to
        be keyed to the DISC EDGE, not to the end of the path: keyed to the
        path it all happened behind the disc, so the wave still arrived at full
        amplitude and its crests arced over and under the hole."""
        if e >= 1.0:
            return 0.0
        return (e ** 1.9) * (1.0 - e) ** 0.58

    peak = max(w_env(i / N) for i in range(N + 1)) or 1.0
    wpts = []
    for i in range(N + 1):
        e = i / N                                  # 0 at the far edge, 1 at the disc
        x = X_FAR + (X_EXIT + 10 - X_FAR) * e
        ee = min(1.0, (x - X_FAR) / (X_EXIT - X_FAR))
        phase = 2 * math.pi * (2.6 * ee + 4.9 * ee ** 3.4)
        wpts.append((x, HCY - (w_env(ee) / peak) * WAVE_AMP * math.sin(phase)))
    # Points are generated far-edge -> hole, then reversed here so the emitted
    # path STARTS at the hole. That is what lets the page's dash-offset
    # animation read as the wave streaming outward rather than draining inward.
    o.append(f'<path class="gw-wave" d="{polyline(wpts[::-1])}" fill="none" stroke="{INDIGO}" '
             f'stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>')
    o.append('</g>')

    # ---- RIGHT: conical accretion flow onto the hole.
    o.append(f'<g clip-path="url(#{R})">')
    o.append(f'<g class="jet" clip-path="url(#{J})">')
    APEX = HCX + HR - 2
    HALF = CONE_HALF_ANGLE                         # cone half-angle, radians
    REACH = HW + 60 - APEX

    def cone_edge(frac):
        """Point on the cone at radial fraction `frac`, offset `frac` of the
        half-angle. Streamlines bow slightly inward, as infalling material
        converging on a point does."""
        return lambda u: (APEX + REACH * u,
                          HCY + math.tan(HALF * frac) * REACH * u * (0.72 + 0.28 * u))

    # The cone itself
    up, dn = [], []
    M = 40
    for i in range(M + 1):
        u = i / M
        xu, yu = cone_edge(1.0)(u)
        up.append((xu, HCY - (yu - HCY)))
        dn.append((xu, yu))
    o.append(f'<path d="{polyline(up) + "L" + polyline(dn[::-1])[1:]}Z" fill="{AMBER}" '
             f'stroke="{INK}" stroke-width="{OL}" stroke-linejoin="round"/>')

    # Streamlines converging on the hole
    for frac in (-0.62, -0.24, 0.24, 0.62):
        sl = [cone_edge(frac)(i / 30) for i in range(31)]
        o.append(f'<path d="{polyline(sl)}" fill="none" stroke="{INK}" '
                 f'stroke-width="2.4" opacity=".38"/>')

    o.append('</g>')   # /jet

    # Escapees keep their own animation group -- they drift on a short loop of
    # their own, independent of the jet's -- but they SHARE the reveal clip.
    #
    # That clip is the real gate, and it has to be: --esc-delay below can only
    # hide a particle during its FIRST animation iteration (CSS animation-delay
    # applies once, not per iteration). The drift loop is short and the jet
    # cycle is long, so from the second cycle onward the delay means nothing
    # and every particle is on screen while the front is still at the hole.
    # Clipping to the same growing circle as the jet gates them exactly, on
    # every cycle, with no shared constant to drift.
    o.append(f'<g class="escs" clip-path="url(#{J})">')

    # Particles accelerated at the boundary and escaping across it. Each trail
    # starts inside the cone, crosses the edge, and the head sits outside, so
    # the boundary is visibly where the particle changed its mind. Direction is
    # the outward normal plus a LARGER downstream component: normal-dominated,
    # they flew back against the flow and looked repelled rather than
    # accelerated.
    #
    # These are the only particles in the figure. Blobs riding inside the cone
    # were tried and cut -- with some going in and some going out the eye had
    # to sort them, and the bulk flow reads well enough from the streamlines.
    for ei, (side, u, out) in enumerate(((-1, 0.40, 56), (-1, 0.78, 72),
                                        (1, 0.34, 52), (1, 0.66, 66), (1, 0.92, 76))):
        f_at = cone_edge(float(side))
        bxy = f_at(u)
        nxt = f_at(min(1.0, u + 0.05))
        tx, ty = nxt[0] - bxy[0], nxt[1] - bxy[1]      # tangent, pointing outward
        tl = math.hypot(tx, ty) or 1.0
        tx, ty = tx / tl, ty / tl
        nx, ny = -ty * side, tx * side                  # normal, away from the axis
        dx, dy = nx + 1.25 * tx, ny + 1.25 * ty
        dl = math.hypot(dx, dy) or 1.0
        d = (dx / dl, dy / dl)
        hx, hy = bxy[0] + d[0] * out, bxy[1] + d[1] * out
        rad = 7.4
        # The reveal clip on the group above is what GUARANTEES a particle is
        # invisible until the front reaches it. This delay is the refinement on
        # top: it starts each particle's drift at roughly the moment the front
        # arrives, so it emerges moving rather than popping into view already
        # mid-flight. Derived from the particle's own radial distance mapped
        # onto the reveal's growth -- an index-based stagger put them out of
        # order. tools/test.js re-derives all five from these constants.
        dist = math.hypot(hx - HCX, hy - HCY)
        frac = min(1.0, max(0.0, (dist - REVEAL_R0) / (REVEAL_R1 - REVEAL_R0)))
        o.append(f'<g class="esc" style="--esc-dx:{d[0]:.3f};--esc-dy:{d[1]:.3f};'
                 f'--esc-delay:{frac * EMERGE_FRAC * CYCLE_S:.2f}s">'
                 f'<path d="{comet(hx, hy, d, out + 40, rad, bow=0.05)}" '
                 f'fill="{MAGENTA}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>'
                 f'<circle cx="{hx:.1f}" cy="{hy:.1f}" r="{rad:.1f}" '
                 f'fill="{MAGENTA}" stroke="{INK}" stroke-width="3"/></g>')
    o.append('</g>')   # /escs
    o.append('</g>')

    # ---- the bisected hole
    for cid, ring in ((L, INDIGO), (R, AMBER)):
        o.append(f'<g clip-path="url(#{cid})">'
                 f'<circle cx="{HCX}" cy="{HCY}" r="{HR + 12}" fill="{ring}" '
                 f'stroke="{INK}" stroke-width="{OL}"/>'
                 f'<circle cx="{HCX}" cy="{HCY}" r="{HR}" fill="{VOID}"/></g>')

    return defs, "".join(o)


def variant_hero():
    """Hero band: energy leaving on the left, matter arriving on the right."""
    defs, body = _hero_art("h")
    # Tight viewBox around the drawn content, measured with getBBox().
    #
    # This is what lets the figure run full bleed AND stay above the fold: the
    # rendered height is width / viewBox-aspect, so the VIEWBOX ratio is what
    # matters, not the content's. With the nominal 1200x480 box the figure came
    # out 2.5:1 and had to be cropped ~45% vertically to fit; cropping to the
    # content instead gives 4.3:1 and nothing is cut off.
    #
    # Re-measure these if CONE_HALF_ANGLE or WAVE_AMP change -- they set the
    # vertical extent, and the numbers below follow from them.
    VB_X, VB_W = -30.0, 1297.0
    VB_Y, VB_H = 100.0, 302.0
    return wrap(defs, body, tilt=0, w=VB_W, h=VB_H, pivot=(HCX, HCY),
                vb=f"{VB_X:g} {VB_Y:g} {VB_W:g} {VB_H:g}")


def variant_rail():
    """The same artwork stood on end for the scroll rail: jet up, wave down.

    UNUSED as of 2026-08-15. The gutter rails were built, iterated (animated ->
    static -> dark-mode-only) and then removed; nothing on the site consumes
    light-rail.svg or rail-inline.svg. Kept, with RAIL_LABEL, as the starting
    point if they ever come back. See TODO.md -- deleting it is an open call.

    Rotating -90 about the hole's centre maps the cone (which points +x) to
    point up and the wave (-x) to point down. The footprint swaps, so the
    viewBox becomes HH wide by HW tall about the same pivot -- no second
    drawing, no chance of the two versions diverging.
    """
    defs, body = _hero_art("r")
    # Rotating -90 about (HCX, HCY) sends (x, y) -> (HCX + y - HCY, HCY - x + HCX).
    # So the LONG axis of the rail comes from the artwork's x-extent and the
    # narrow axis from its y-extent. Using the hero's own 1200x480 box here
    # clipped both the cone tip and the far end of the wave, because the
    # artwork deliberately bleeds past that box in x (-30 to HW+60).
    ART_X0, ART_X1 = -30.0, HW + 60.0          # wave far edge .. cone reach
    ART_Y0, ART_Y1 = 59.0, 452.0               # measured with getBBox()
    PAD = 22.0
    top = HCY - ART_X1 + HCX - PAD             # cone end
    bot = HCY - ART_X0 + HCX + PAD             # wave end
    left = HCX + ART_Y0 - HCY - PAD
    right = HCX + ART_Y1 - HCY + PAD
    return wrap(defs, body, tilt=-90, pivot=(HCX, HCY),
                w=right - left, h=bot - top,
                vb=f"{left:g} {top:g} {right - left:g} {bot - top:g}")


# Colours -> the site's CSS custom properties, so one inline SVG serves both
# themes. INK becomes light on a dark page (light outlines on dark ground read
# fine); VOID maps to --field, which is near-black in BOTH palettes, so the
# hole stays a hole either way.
THEME_MAP = ((VOID, "var(--field)"),
             (INK, "var(--ink)"),
             (PAPER, "var(--paper)"),
             (INDIGO, "var(--wave-1)"),
             (MAGENTA, "var(--wave-2)"),
             (AMBER, "var(--wave-3)"))

HERO_LABEL = ("Illustration: a black hole split down the middle. On the left a "
              "gravitational wave leaves along the axis; on the right a conical "
              "accretion flow runs onto the hole, with particles accelerated at "
              "its boundary and escaping across it.")


RAIL_LABEL = ("Decorative illustration: a black hole with a gravitational wave "
              "streaming downward and a conical accretion flow above it.")


def themed(svg, label):
    """Rewrite a standalone figure for inlining into the page.

    Matched by pattern rather than by exact string: the background rect and the
    root's width/height both move whenever the viewBox is re-cropped, and an
    exact match would silently stop firing -- leaving an opaque cream ground
    and a fixed size in the themed build.
    """
    import re as _re
    before = svg
    # Drop the opaque ground so the page colour shows through in both themes.
    svg = _re.sub(r'<rect x="[-\d.]+" y="[-\d.]+" width="[\d.]+" '
                  r'height="[\d.]+" fill="' + _re.escape(PAPER) + r'"/>', "", svg, count=1)
    if svg == before:
        raise SystemExit("themed(): background rect not found -- update the pattern")
    # Fixed width/height would defeat the responsive CSS; the viewBox carries
    # the aspect ratio on its own.
    svg, n = _re.subn(r' width="[\d.]+" height="[\d.]+" role="img"',
                      f' role="img" aria-label="{label}"', svg, count=1)
    if not n:
        raise SystemExit("themed(): root width/height not found -- update the pattern")
    for hexv, var in THEME_MAP:
        svg = svg.replace(hexv, var)
    return svg


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out, exist_ok=True)
    for name, fn in (("light-riso", variant_riso),
                     ("light-cartoon", variant_cartoon),
                     ("light-hero", variant_hero),
                     ("light-rail", variant_rail)):
        p = os.path.join(out, name + ".svg")
        svg = fn()
        with open(p, "w", encoding="utf-8") as f:
            f.write(svg)
        print(f"{p}  {os.path.getsize(p) / 1024:.1f} KB")
        if name == "light-rail":
            q = os.path.join(out, "rail-inline.svg")
            with open(q, "w", encoding="utf-8") as f:
                f.write(themed(svg, RAIL_LABEL))
            print(f"{q}  {os.path.getsize(q) / 1024:.1f} KB  (themed, for inlining)")
        if name == "light-hero":
            q = os.path.join(out, "hero-inline.svg")
            with open(q, "w", encoding="utf-8") as f:
                f.write(themed(svg, HERO_LABEL))
            print(f"{q}  {os.path.getsize(q) / 1024:.1f} KB  (themed, for inlining)")


if __name__ == "__main__":
    main()
