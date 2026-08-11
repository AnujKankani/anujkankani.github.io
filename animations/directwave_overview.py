"""The Direct Wave is Not a Meaningful Test of Horizon Properties -- ~75 s.

Kankani & McWilliams, arXiv:2607.02380.

  0. What the direct wave is: prompt emission from the plunging perturber
  1. The claim under test: direct wave <-> horizon (Omega_H, kappa)
  2. The test: Re(omega)/2 Omega_H vs remnant spin -- crosses 1 only near 0.7
  3. GW250114 sits at chi_f ~ 0.68, right at the incidental crossing
  4. Consequence: recovered horizon area is wrong away from that spin
  5. Close

Runtime is not capped at 60 s -- the data beats are paced so the trends
are actually readable rather than flashing past.

=============================================================================
!!  PLACEHOLDER DATA  --  NOT PUBLICATION VALUES  !!

The scatter points in beats 2 and 4 are SCHEMATIC. Remnant spins on the
x-axis are the real Table I values, and the curves honour the trends the
paper states in prose (ratio >1 at low spin, crossing 1 near chi_f~0.7,
<1 at high spin; A_DW/A_actual ~1.65 at low spin for the widest interval).
But the individual y-values are interpolated stand-ins, not the measured
results, and the error bars are illustrative.

Replace PLACEHOLDER_FIG1 / PLACEHOLDER_FIG4 with the real exports before
rendering anything public. Set SHOW_PLACEHOLDER_BANNER = False only once
real data is in.
=============================================================================

Render:
    MANIM=/home/anuj/anaconda3/envs/manim_env/bin/manim
    $MANIM -ql animations/directwave_overview.py DirectWaveOverview
"""

from manim import *
import numpy as np

SHOW_PLACEHOLDER_BANNER = True   # set False only when real data is loaded

# ---- palette: 3Blue1Brown -- manim's own defaults on a near-black ground --
# All accents clear 4.5 contrast against #0E0E10 without lifting:
#   BLUE_C 9.5   GOLD 9.9   GREEN 9.0   RED 6.4   WHITE 19.3   GREY_B 10.0
BG = "#0E0E10"      # near-black, very slightly warm
INK = "#FFFFFF"
MUTED = "#BBBBBB"   # GREY_B
ACCENT = "#58C4DD"  # BLUE_C -- the signature 3b1b blue
AMBER = "#F0AC5F"   # GOLD
CYAN = "#83C167"    # GREEN_C (the ground is no longer cyan, so green reads
                    # as the distinct "emission" colour without clashing)
ROSE = "#FC6255"    # RED_C

config.background_color = BG

# ---- Real remnant spins, SXS Table I of the paper -------------------------
CHI = np.array([0.4942, 0.5478, 0.6215, 0.6864, 0.6921,
                0.7447, 0.8029, 0.8574, 0.9075, 0.9499])

# ---- PLACEHOLDER: Fig. 1 top panel, Re(omega) / 2 Omega_H ----------------
# Qualitatively faithful (high at low spin -> crosses 1 near 0.7 -> low at
# high spin) but the values are invented. REPLACE WITH REAL EXPORT.
PLACEHOLDER_FIG1 = np.array([1.36, 1.28, 1.17, 1.02, 1.01,
                             0.94, 0.88, 0.84, 0.80, 0.76])
PLACEHOLDER_FIG1_ERR = np.array([0.05, 0.05, 0.05, 0.04, 0.04,
                                 0.04, 0.04, 0.05, 0.06, 0.07])

# ---- PLACEHOLDER: Fig. 4, A_DW / A_actual for two fitting intervals ------
# NOTE: FIG4 arrays are currently UNUSED -- the A_DW beat was replaced by the
# damping-time result. Kept in case that figure is wanted again later.
PLACEHOLDER_FIG4_WIDE = np.array([1.66, 1.62, 1.58, 1.55, 1.55,
                                  1.54, 1.55, 1.58, 1.62, 1.69])
PLACEHOLDER_FIG4_TIGHT = np.array([0.90, 0.91, 0.93, 0.97, 0.98,
                                   1.00, 1.02, 1.03, 1.05, 1.08])

GW250114_CHI = 0.68     # remnant spin of GW250114 (stated in the paper)


def horizon_freq(chi):
    """Omega_H = chi / (2 r_+),  r_+ = 1 + sqrt(1 - chi^2)."""
    rp = 1.0 + np.sqrt(1.0 - chi**2)
    return chi / (2.0 * rp)


def surface_gravity(chi):
    """kappa = sqrt(1 - chi^2) / (2 r_+)."""
    rp = 1.0 + np.sqrt(1.0 - chi**2)
    return np.sqrt(1.0 - chi**2) / (2.0 * rp)


def ringdown(t, omega=0.55, tau=11.0):
    """A damped sinusoid stand-in for the filtered strain."""
    t = np.asarray(t, dtype=float)
    return np.exp(-t / tau) * np.cos(omega * t)


class DirectWaveOverview(Scene):

    HOLD = 2.8

    def construct(self):
        if SHOW_PLACEHOLDER_BANNER:
            self.add(self._banner())
        self.beat_what_is_it()
        self.beat_claim()
        self.beat_test()
        self.beat_gw250114()
        self.beat_consequence()
        self.beat_close()

    # ------------------------------------------------------------------
    # 0. What IS the direct wave?  (~15 s)
    #
    # Paper's wording: "a distinct non-QNM portion of the merger radiation,
    # which they dubbed the direct wave ... associated with the prompt
    # emission of the plunging perturber."  So: emission thrown off DURING
    # the plunge, not the light-ring congruence that sources the QNMs.
    # ------------------------------------------------------------------
    def beat_what_is_it(self):
        title = Text("What is the direct wave?", font="sans-serif",
                     color=INK, weight=BOLD).scale(0.68)
        title.to_edge(UP, buff=0.65)
        self.play(Write(title), run_time=1.4)

        # Raised so the emission fan (lowest arrow tip ~0.75 below centre)
        # still leaves a clear band above SAFE_BOTTOM for the two-line
        # caption. Measured, not guessed -- see the caption placement below.
        centre = LEFT * 3.5 + UP * 0.15
        # Pure black on a near-black ground: the stroke is what makes the
        # horizon read, so give it a bright rim rather than a muted one.
        hole = Circle(radius=0.46, fill_color="#000000", fill_opacity=1,
                      stroke_color=INK, stroke_width=2.8).move_to(centre)
        ring = DashedVMobject(
            Circle(radius=1.12, stroke_color=AMBER, stroke_width=2.2),
            num_dashes=46).move_to(centre)
        ring_lab = Text("light ring", font="monospace", color=AMBER).scale(0.24)
        ring_lab.next_to(ring, LEFT, buff=0.14)

        self.play(FadeIn(hole), Create(ring), FadeIn(ring_lab), run_time=1.0)

        # The perturber spirals in and STOPS at the light ring -- that is the
        # last point from which emission can still reach a distant observer,
        # so the visual ends where the physics we are illustrating ends.
        # Fewer turns than a real inspiral: legibility beats literalism.
        LIGHT_RING_S = 0.59          # where r(s) reaches the ring radius 1.12
        plunge_pts = []
        for s in np.linspace(0, LIGHT_RING_S, 160):
            r = 1.62 * (1.0 - 0.80 * s ** 1.8)
            th = 0.30 * PI + 1.25 * TAU * s ** 0.9
            plunge_pts.append(centre + np.array([r * np.cos(th), r * np.sin(th), 0]))
        plunge = VMobject(stroke_color=ACCENT, stroke_width=2.0,
                          stroke_opacity=0.45).set_points_smoothly(plunge_pts)

        perturber = Dot(radius=0.075, color=ACCENT).move_to(plunge_pts[0])
        pert_lab = Text("plunging perturber", font="monospace",
                        color=ACCENT).scale(0.25)
        pert_lab.next_to(ring, DOWN, buff=1.05)

        self.play(FadeIn(perturber), FadeIn(pert_lab), run_time=0.7)

        # Prompt emission: a wavy arrow launched radially outward from wherever
        # the perturber is at that instant. Emission happens THROUGHOUT the
        # orbit and plunge, not only at the end.
        def wavy_arrow(src, length=0.85, waves=2.5, amp=0.075):
            radial = src - centre
            rad_n = max(np.linalg.norm(radial), 1e-9)
            u = radial / rad_n                       # outward unit vector
            perp = np.array([-u[1], u[0], 0.0])      # transverse
            pts = []
            n = 90
            for i in range(n):
                f = i / (n - 1)
                # amplitude grows a little as the wave leaves the source
                a = amp * (0.35 + 0.65 * f)
                pts.append(src + u * (0.30 + length * f)
                           + perp * a * np.sin(waves * TAU * f))
            body = VMobject(stroke_color=CYAN, stroke_width=2.6,
                            stroke_opacity=0.9).set_points_smoothly(pts)
            tip = Triangle(fill_color=CYAN, fill_opacity=0.9,
                           stroke_width=0).scale(0.070)
            tip.rotate(np.arctan2(u[1], u[0]) - PI / 2)
            tip.move_to(pts[-1] + u * 0.07)
            return VGroup(body, tip)

        # Emission stops at the light ring: inside it nothing escapes to a
        # distant observer. plunge_pts now ENDS at the ring, so these are
        # fractions of the truncated path and all of them are valid.
        burst_fracs = (0.14, 0.34, 0.54, 0.72, 0.87, 0.98)
        bursts = VGroup(*[
            wavy_arrow(plunge_pts[int(f * (len(plunge_pts) - 1))],
                       length=0.95 - 0.35 * f)
            for f in burst_fracs
        ])

        # Emission must accompany the motion, not follow it: run the body's
        # travel and the arrow launches in ONE play() call, with each arrow
        # timed (via lag) to fire as the perturber passes that point.
        TRAVEL = 4.4
        emit = [
            AnimationGroup(
                Wait(f * TRAVEL * 0.92),
                Create(b, run_time=0.75),
                lag_ratio=1.0,
            )
            for f, b in zip(burst_fracs, bursts)
        ]
        self.play(
            MoveAlongPath(perturber, plunge, rate_func=rate_functions.ease_in_sine),
            Create(plunge, rate_func=rate_functions.ease_in_sine),
            *emit,
            run_time=TRAVEL,
        )
        # The perturber stops at the light ring and stays there: past this
        # point nothing it emits can reach us, so the story ends here.
        self.wait(0.5)

        self.play(FadeOut(pert_lab), run_time=0.25)
        # Sits below the whole emission fan, not just the ring, so the wavy
        # arrows launched from the outer orbit cannot overlap it.
        emit_lab = VGroup(
            Text("radiation emitted promptly during the plunge",
                 font="monospace", color=CYAN).scale(0.25),
            Text("— nothing escapes once inside the light ring",
                 font="monospace", color=MUTED).scale(0.23),
        ).arrange(DOWN, buff=0.12)
        emit_lab.next_to(bursts, DOWN, buff=0.30)
        emit_lab.set_x(centre[0])
        self._clear_banner(emit_lab, above=bursts)
        self.play(FadeIn(emit_lab), run_time=0.9)

        # Contrast with the QNMs -- this is the distinction that matters.
        defn = VGroup(
            Text("a non-QNM component", font="monospace", color=INK).scale(0.52),
            Text("of the gravitational wave", font="monospace", color=INK).scale(0.52),
            Text("merger radiation", font="monospace", color=INK).scale(0.52),
        ).arrange(DOWN, buff=0.18)
        contrast = VGroup(
            Text("QNMs:  the remnant ringing down", font="monospace",
                 color=MUTED).scale(0.40),
            Text("direct wave:  the plunge itself", font="monospace",
                 color=CYAN).scale(0.40),
        ).arrange(DOWN, buff=0.24, aligned_edge=LEFT)
        block = VGroup(defn, contrast).arrange(DOWN, buff=0.62)
        block.move_to(RIGHT * 3.05 + UP * 0.15)   # aligned with the raised diagram

        self.play(FadeIn(defn, shift=UP * 0.12), run_time=1.0)
        self.play(FadeIn(contrast, shift=UP * 0.10), run_time=1.1)

        self.wait(self.HOLD)
        self.play(FadeOut(VGroup(title, hole, ring, ring_lab, plunge,
                                 perturber, bursts, emit_lab, block)),
                  run_time=0.9)

    # Lowest y a beat may place text at. The banner chip occupies the bottom
    # of the frame, so anything below this collides with it. Beats call
    # _clear_banner() instead of hand-tuning buffs against a fixed element.
    SAFE_BOTTOM = -3.05

    def _clear_banner(self, mob, above=None, gap=0.16):
        """Lift `mob` clear of the banner, and assert it stays clear of
        whatever sits above it.

        Lifting text off the banner is only safe if there is room; otherwise
        it silently collides with the element above (which is exactly how the
        slide-1 and slide-3 captions ended up overlapping). Passing `above`
        turns that silent failure into a loud one at render time.
        """
        if SHOW_PLACEHOLDER_BANNER and mob.get_bottom()[1] < self.SAFE_BOTTOM:
            mob.shift(UP * (self.SAFE_BOTTOM - mob.get_bottom()[1]))
        if above is not None:
            clearance = above.get_bottom()[1] - mob.get_top()[1]
            assert clearance >= gap, (
                f"layout collision: only {clearance:.2f} between this text and "
                f"the element above it (need {gap}). Raise the diagram/plot."
            )
        return mob

    def _banner(self):
        # Black type on an amber chip: genuinely black (contrast 10.3 against
        # the chip) and visually unmistakable as chrome rather than a caption.
        # Black directly on the teal ground would be 2.8 -- unreadable.
        t = Text("SCHEMATIC — placeholder data, not publication values",
                 font="monospace", color="#141414").scale(0.26)
        chip = RoundedRectangle(
            width=t.width + 0.44, height=t.height + 0.26, corner_radius=0.08,
            fill_color=AMBER, fill_opacity=1.0, stroke_width=0)
        return VGroup(chip, t).arrange(ORIGIN).to_edge(DOWN, buff=0.16)

    # ------------------------------------------------------------------
    # 1. The claim under test  (~13 s)
    # ------------------------------------------------------------------
    def beat_claim(self):
        title = Text("Can the direct wave probe the horizon?",
                     font="sans-serif", color=INK, weight=BOLD).scale(0.68)
        title.to_edge(UP, buff=0.75)
        self.play(Write(title), run_time=1.3)

        # Two columns: what you MEASURE from the wave, vs what the HORIZON
        # predicts. The beat's job is to show the comparison being set up --
        # a decorative spinning remnant added nothing, so it's gone.
        meas_head = Text("measured from the wave", font="monospace",
                         color=CYAN).scale(0.30)
        meas = VGroup(
            MathTex(r"\mathrm{Re}(\omega)", color=CYAN).scale(0.85),
            MathTex(r"-\mathrm{Im}(\omega)", color=CYAN).scale(0.85),
        ).arrange(DOWN, buff=0.62)
        meas_col = VGroup(meas_head, meas).arrange(DOWN, buff=0.42)
        meas_col.move_to(LEFT * 3.5 + DOWN * 0.30)

        horiz_head = Text("horizon properties", font="monospace",
                          color=AMBER).scale(0.30)
        horiz = VGroup(
            MathTex(r"2\,\Omega_H = \frac{\chi}{r_+}", color=AMBER).scale(0.80),
            MathTex(r"\kappa = \frac{\sqrt{1-\chi^2}}{2 r_+}",
                    color=AMBER).scale(0.80),
        ).arrange(DOWN, buff=0.36)
        horiz_col = VGroup(horiz_head, horiz).arrange(DOWN, buff=0.42)
        horiz_col.move_to(RIGHT * 3.3 + DOWN * 0.30)

        self.play(FadeIn(meas_head), FadeIn(horiz_head), run_time=0.9)
        self.play(Write(meas[0]), Write(horiz[0]), run_time=1.4)
        self.play(Write(meas[1]), Write(horiz[1]), run_time=1.4)

        # The claim is that these two columns are the same thing.
        eq1 = MathTex(r"\stackrel{?}{=}", color=INK).scale(0.85)
        eq1.move_to((meas[0].get_center() + horiz[0].get_center()) / 2)
        eq2 = MathTex(r"\stackrel{?}{=}", color=INK).scale(0.85)
        eq2.move_to((meas[1].get_center() + horiz[1].get_center()) / 2)

        self.play(Write(eq1), Write(eq2), run_time=1.0)
        self.wait(0.7)

        payoff = Text("if so → an independent test of Hawking's area law",
                      font="monospace", color=INK).scale(0.32)
        payoff.to_edge(DOWN, buff=1.15)
        self._clear_banner(payoff)
        self.play(FadeIn(payoff, shift=UP * 0.12), run_time=1.0)

        self.wait(self.HOLD)
        self.play(FadeOut(VGroup(title, meas_col, horiz_col, eq1, eq2,
                                 payoff)), run_time=0.8)

    # ------------------------------------------------------------------
    # 2. The test  (~19 s)  -- the central figure
    # ------------------------------------------------------------------
    def beat_test(self):
        title = Text("Does it actually track the horizon?",
                     font="sans-serif", color=INK, weight=BOLD).scale(0.58)
        title.to_edge(UP, buff=0.55)
        self.play(FadeIn(title, shift=DOWN * 0.15), run_time=0.9)

        ax = Axes(
            x_range=[0.45, 1.0, 0.1], y_range=[0.6, 1.5, 0.2],
            x_length=8.0, y_length=3.9,
            axis_config={"stroke_color": MUTED, "stroke_width": 1.6,
                         "include_tip": False, "font_size": 22},
            x_axis_config={"numbers_to_include": [0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
                           "decimal_number_config": {"num_decimal_places": 1}},
            y_axis_config={"numbers_to_include": [0.6, 0.8, 1.0, 1.2, 1.4],
                           "decimal_number_config": {"num_decimal_places": 1}},
        # Raised so the x-label and the two-line finding below it both fit
        # above SAFE_BOTTOM without _clear_banner having to lift the caption
        # back up into the label.
        ).shift(UP * 0.70)
        xlab = MathTex(r"|\chi_f|", color=MUTED).scale(0.60)
        xlab.next_to(ax.x_axis, DOWN, buff=0.22)
        ylab = MathTex(r"\mathrm{Re}(\omega)\,/\,2\Omega_H", color=MUTED).scale(0.55)
        ylab.rotate(PI / 2).next_to(ax.y_axis, LEFT, buff=0.28)

        self.play(Create(ax), FadeIn(xlab), FadeIn(ylab), run_time=1.3)

        # The "perfect agreement" line the claim predicts.
        unity = DashedLine(ax.c2p(0.45, 1.0), ax.c2p(1.0, 1.0),
                           stroke_color=CYAN, stroke_width=2.0, dash_length=0.10)
        unity_lab = Text("if it tracked the horizon, every point sits here",
                         font="monospace", color=CYAN).scale(0.26)
        unity_lab.next_to(ax.c2p(0.725, 1.0), UP, buff=0.10)
        self.play(Create(unity), FadeIn(unity_lab), run_time=1.0)

        # The measurements.
        pts, bars = VGroup(), VGroup()
        for c, y, e in zip(CHI, PLACEHOLDER_FIG1, PLACEHOLDER_FIG1_ERR):
            p = ax.c2p(c, y)
            bars.add(Line(ax.c2p(c, y - e), ax.c2p(c, y + e),
                          stroke_color=AMBER, stroke_width=1.8,
                          stroke_opacity=0.75))
            pts.add(Dot(p, radius=0.062, color=AMBER))

        # This is the paper's central claim -- let the trend land rather than
        # flashing ten points past the viewer.
        self.play(LaggedStart(*[FadeIn(b) for b in bars], lag_ratio=0.10),
                  LaggedStart(*[GrowFromCenter(p) for p in pts], lag_ratio=0.10),
                  run_time=3.6)
        self.wait(1.4)

        # The finding: it only agrees at one spin, by coincidence.
        self.play(FadeOut(unity_lab), run_time=0.4)
        cross = DashedLine(ax.c2p(GW250114_CHI, 0.6), ax.c2p(GW250114_CHI, 1.5),
                           stroke_color=ROSE, stroke_width=2.0, dash_length=0.09)
        finding = VGroup(
            Text("it crosses that line once,", font="monospace", color=ROSE).scale(0.30),
            Text("and only by coincidence", font="monospace", color=ROSE).scale(0.30),
        ).arrange(DOWN, buff=0.10)
        finding.next_to(xlab, DOWN, buff=0.30)
        self._clear_banner(finding, above=xlab)

        self.play(Create(cross), run_time=0.9)
        self.play(FadeIn(finding, shift=UP * 0.12), run_time=1.1)

        self.wait(self.HOLD + 0.6)
        # Shrink the figure into the corner so beat 3 can refer back to it.
        # Clear the figure entirely -- the next beat is centred text, so a
        # corner thumbnail would fight it for attention.
        self.play(FadeOut(VGroup(title, finding, ax, xlab, ylab, unity,
                                 pts, bars, cross)),
                  run_time=1.0)

    # ------------------------------------------------------------------
    # 3. GW250114 sits exactly at the crossing  (~11 s)
    # ------------------------------------------------------------------
    def beat_gw250114(self):
        title = Text("GW250114 sits right at the crossing",
                     font="sans-serif", color=INK, weight=BOLD).scale(0.62)
        title.to_edge(UP, buff=0.75)
        self.play(FadeIn(title, shift=DOWN * 0.15), run_time=0.9)

        body = VGroup(
            MathTex(r"\chi_f \approx 0.68", color=AMBER).scale(1.15),
            Text("the one spin where the direct wave frequency",
                 font="monospace", color=MUTED).scale(0.38),
            Text("happens to match twice the horizon frequency",
                 font="monospace", color=MUTED).scale(0.38),
        ).arrange(DOWN, buff=0.28)
        body.move_to(DOWN * 0.15)

        self.play(Write(body[0]), run_time=1.3)
        self.play(FadeIn(body[1]), FadeIn(body[2]), run_time=1.5)
        self.wait(1.4)

        punch = Text("the agreement is incidental, not physical",
                     font="monospace", color=ROSE).scale(0.40)
        punch.next_to(body, DOWN, buff=0.75)
        self._clear_banner(punch)
        self.play(FadeIn(punch, shift=UP * 0.12), run_time=1.1)

        # This beat is the hinge of the argument -- the coincidence is the
        # whole finding -- so it holds noticeably longer than the others.
        self.wait(self.HOLD + 1.8)
        self.play(FadeOut(VGroup(title, body, punch)), run_time=0.9)

    # ------------------------------------------------------------------
    # 4. The consequence  (~16 s)
    # ------------------------------------------------------------------
    def beat_consequence(self):
        title = Text("And the damping time isn't constant",
                     font="sans-serif", color=INK, weight=BOLD).scale(0.60)
        title.to_edge(UP, buff=0.70)
        self.play(FadeIn(title, shift=DOWN * 0.15), run_time=0.9)

        # The paper's contrast: the instantaneous frequency is quasi-stable,
        # but -Im(omega) evolves strongly over the same brief interval. A
        # single damped sinusoid assumes ONE fixed damping time -- so it
        # cannot describe this.
        ax = Axes(
            # Manim draws the y-axis at the x_range ORIGIN, so plot in a
            # shifted coordinate u = t + 10 (u = 0 at the left edge). Tick
            # labels are relabelled back to real t below, so the axis sits
            # at the edge instead of slicing through both curves at t = 0.
            x_range=[0, 25, 5], y_range=[0.0, 2.6, 0.5],
            x_length=7.6, y_length=2.9,
            axis_config={"stroke_color": MUTED, "stroke_width": 1.6,
                         "include_tip": False, "font_size": 22},
            x_axis_config={"numbers_to_include": []},
            y_axis_config={"numbers_to_include": [0.0, 1.0, 2.0]},
        ).shift(DOWN * 0.05)

        # Relabel the shifted x-axis with the real (t - t_peak) values.
        T_OFF = 10.0
        xticks = VGroup()
        for tval in (-10, -5, 0, 5, 10, 15):
            lbl = MathTex(str(tval), color=MUTED).scale(0.44)
            lbl.next_to(ax.c2p(tval + T_OFF, 0.0), DOWN, buff=0.16)
            xticks.add(lbl)
        xlab = MathTex(r"(t - t_{\rm peak})\ [M]", color=MUTED).scale(0.50)
        xlab.next_to(xticks, DOWN, buff=0.16)   # below the relabelled ticks

        self.play(Create(ax), FadeIn(xticks), FadeIn(xlab), run_time=1.1)

        # Frequency: flat. (Schematic -- see module header.)
        # u = t + T_OFF, so pass u and convert back inside the lambda.
        freq = ax.plot(lambda u: 1.02 + 0.02 * np.tanh((u - T_OFF) / 8.0),
                       x_range=[0, 25, 0.2], stroke_width=3.4, color=AMBER)
        freq_lab = Text("Re(ω) / 2Ω_H  —  quasi-stable", font="monospace",
                        color=AMBER).scale(0.30)
        freq_lab.next_to(ax.c2p(25, 1.04), RIGHT, buff=0.12).shift(LEFT * 2.9 + UP * 0.42)

        self.play(Create(freq), run_time=1.6)
        self.play(FadeIn(freq_lab), run_time=0.7)
        self.wait(0.8)

        # Damping: strongly evolving over the same window.
        damp = ax.plot(lambda u: 0.30 + 0.115 * u,
                       x_range=[0, 25, 0.2], stroke_width=3.4, color=ROSE)
        damp_lab = Text("−Im(ω) / κ  —  evolving strongly", font="monospace",
                        color=ROSE).scale(0.30)
        damp_lab.next_to(ax.c2p(16.5, 2.35), UP, buff=0.10)

        self.play(Create(damp), run_time=1.8)
        self.play(FadeIn(damp_lab), run_time=0.7)
        self.wait(0.9)

        verdict = VGroup(
            Text("a single damped sinusoid assumes one fixed damping time",
                 font="monospace", color=MUTED).scale(0.32),
            Text("— so it cannot describe the direct wave",
                 font="monospace", color=ROSE).scale(0.34),
        ).arrange(DOWN, buff=0.16)
        verdict.next_to(xlab, DOWN, buff=0.26)
        self._clear_banner(verdict, above=xlab)

        self.play(FadeIn(verdict, shift=UP * 0.10), run_time=1.1)

        self.wait(self.HOLD + 0.6)
        self.play(FadeOut(VGroup(title, ax, xlab, freq, freq_lab, damp,
                                 damp_lab, verdict, xticks)),
                  run_time=0.9)

    # ------------------------------------------------------------------
    def beat_close(self):
        headline = Paragraph("The direct wave is not a reliable probe",
                             "of the remnant horizon",
                             font="sans-serif", color=INK, weight=BOLD,
                             alignment="center", line_spacing=0.8).scale(0.62)
        headline.move_to(UP * 0.95)

        # The paper's own framing: a direct-wave test does not merely fail,
        # it "will lead to apparent violations of Hawking's area law when no
        # violation actually occurs." That failure mode is the sharper claim.
        area = Paragraph("So it cannot be used to test Hawking's area law —",
                         "such a test may report violations that never happened",
                         font="monospace", color=ROSE,
                         alignment="center", line_spacing=0.9).scale(0.32)
        area.next_to(headline, DOWN, buff=0.55)

        cite = Text("Kankani & McWilliams — arXiv:2607.02380",
                    font="monospace", color=AMBER).scale(0.32)
        cite.next_to(area, DOWN, buff=0.85)
        self._clear_banner(cite, above=area)

        self.play(Write(headline), run_time=1.6)
        self.play(FadeIn(area), run_time=1.1)
        self.wait(0.6)
        self.play(FadeIn(cite, shift=UP * 0.1), run_time=0.8)
        self.wait(3.2)
        self.play(FadeOut(VGroup(headline, area, cite)), run_time=0.9)
