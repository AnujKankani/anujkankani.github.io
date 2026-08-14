"""BOB the (Waveform) Builder -- 99.4 s at 1080p60.

Kankani & McWilliams, "BOB the (Waveform) Builder" (2025).

Beats:
  0. The premise: a merger-ringdown model, minimally tuned to NR
  1. What BOB models: the News, the first time derivative of the strain
  1b. The equations: amplitude and phase for the News, t_0 -> -inf
  2. The sech written out as its first few overtone-like terms
  3. Almost nothing to fit -- one fitted frequency, not 8-16 parameters
  4. It predicts the fundamental QNM amplitude (Eq. 28), good to 1-2%
  5. The knee: BOB against a family of overtone fits
  6. Against the state of the art (real median mismatches)
  7. Where calibration runs out: high spin, unequal masses
  8. Superkicks: build the modes first, combine second
  9. Close

Render:
    MANIM=/home/anuj/anaconda3/envs/manim_env/bin/manim
    $MANIM -qh animations/bobbuilder_overview.py BOBBuilderOverview   # 1080p60
    $MANIM -ql animations/bobbuilder_overview.py BOBBuilderOverview   # preview

=============================================================================
!!  SCHEMATIC CURVES  --  the plotted shapes are illustrative  !!

Every NUMBER and EQUATION on screen is from the paper:
  Eq. (26)  sech expanded as 2A_p(e^-x - e^-3x + e^-5x + ...)
  Eq. (27)  tau_n = tau_0 / (2n+1)
  Eq. (28)  A_220 = 2 A_peak^{N22} e^{-(t-t_p)/tau} / |omega_220|
  median News mismatch, full non-precessing SXS catalog
      BOB 3.18e-5   SEOBNRv5HM 1.18e-5
  within the NRHybSur3dq8 training domain (q < 8, |chi_i| < 0.8)
      BOB 2.88e-5   SEOBNRv5HM 1.31e-5   NRHybSur3dq8 9.26e-6
  BOB's accuracy ~ a 4-8 overtone model, needing 8-16 fitted parameters
  the A_220 prediction verified to 1-2%
  no public SXS non-precessing case has q > 4 with chi_f > 0.9

BOB is NOT parameter-free: Omega_0 is obtained from a fit. What the paper
claims is that no OTHER parameter needs fitting, and that there are no
per-overtone amplitudes at all. Beat 3 says exactly that.

Beat 5's curves are analytic fits to anchors READ OFF Fig. 6 -- N=0 at 1e0
and N=7 at 1e-1.3 at t=-20M, N=0 at 1e-1 and N=7 at 1e-6 at t=0, plateaux
1e-5.3 (N=0) down to 1e-7, BOB from 1e-2 to a 1e-5.3 floor -- so the shape
and the crossings are right, but the curves are still smooth stand-ins
rather than the paper's data. Beat 7's scatter is hand-tuned. Replace both
with real exports (Figs. 6 and 25) and drop the banner in the same change,
never before.
=============================================================================
"""

from manim import *
import numpy as np

SHOW_PLACEHOLDER_BANNER = True

# ---- palette: caramel ground, cream and cool accents ---------------------
# Measured contrast against #6B4423 (relative luminance 0.074, hue 27deg):
#   INK 7.92  MUTED 6.16  GOLD 5.82  MINT 5.89  SKY 5.17  ORCHID 5.06
# Worst pair 5.06:1, clear of the 4.5 body-text floor.
#
# Hue separation matters as much as the ratio on a saturated warm ground. An
# earlier draft used a rose (#FFB59A, hue 16deg) for the competing series: it
# passed on contrast and still read as mud, 11deg from the ground with only
# lightness to separate it. ORCHID is 310deg -- far from the ground and from
# SKY (201deg), so the three data series never collide.
BG = "#6B4423"
INK = "#FFF6EA"     # cream, primary text
MUTED = "#EBD9C4"   # tan, secondary text
GOLD = "#FFCF70"    # BOB itself
SKY = "#8FD3F4"     # the calibrated comparison models
MINT = "#9BE8B4"    # answers, the payoff line
ORCHID = "#F0B6E6"  # the overtone-fit family

config.background_color = BG

TAU_D = 11.0        # BOB damping time; NOT manim's TAU (= 2*pi)


def sech_from_peak(t):
    """|N| ∝ sech(t/tau) for t >= 0 -- the envelope from the peak onwards."""
    return 1.0 / np.cosh(np.asarray(t, dtype=float) / TAU_D)


class BOBBuilderOverview(Scene):

    HOLD = 2.5
    SAFE_BOTTOM = -3.05

    def construct(self):
        if SHOW_PLACEHOLDER_BANNER:
            self.add(self._banner())
        self.beat_premise()
        self.beat_what_it_models()
        self.beat_equations()
        self.beat_ladder()
        self.beat_almost_nothing_to_fit()
        self.beat_amplitude_link()
        self.beat_knee()
        self.beat_state_of_the_art()
        self.beat_sparse_nr()
        self.beat_superkicks()
        self.beat_close()

    # ------------------------------------------------------------------
    # shared furniture
    # ------------------------------------------------------------------
    def _banner(self):
        t = Text("SCHEMATIC — illustrative curves; quoted numbers are from the paper",
                 font="monospace", color="#241203").scale(0.24)
        chip = RoundedRectangle(width=t.width + 0.44, height=t.height + 0.26,
                                corner_radius=0.08, fill_color=GOLD,
                                fill_opacity=1.0, stroke_width=0)
        return VGroup(chip, t).arrange(ORIGIN).to_edge(DOWN, buff=0.16)

    def _clear_banner(self, mob, above=None, gap=0.16):
        """Keep `mob` off the banner, and assert it clears `above`.

        The assert is the point: a silent overlap is the failure mode that
        hand-tuned buffers keep reintroducing whenever a font metric shifts.
        """
        if SHOW_PLACEHOLDER_BANNER and mob.get_bottom()[1] < self.SAFE_BOTTOM:
            mob.shift(UP * (self.SAFE_BOTTOM - mob.get_bottom()[1]))
        if above is not None:
            clearance = above.get_bottom()[1] - mob.get_top()[1]
            assert clearance >= gap, (
                f"layout collision: {clearance:.2f} < {gap}. Raise the figure.")
        return mob

    def _title(self, text, sub=None):
        t = Text(text, font="sans-serif", color=INK, weight=BOLD).scale(0.58)
        t.to_edge(UP, buff=0.62)
        out = [t]
        self.play(FadeIn(t, shift=DOWN * 0.12), run_time=0.85)
        if sub:
            s = Text(sub, font="monospace", color=MUTED).scale(0.29)
            s.next_to(t, DOWN, buff=0.24)
            self.play(FadeIn(s), run_time=0.65)
            out.append(s)
        return VGroup(*out)

    def _logy_labels(self, ax, exponents, x_at, y_off):
        """Tick labels for an axis carrying log10(mismatch) + y_off.

        The offset exists because Manim draws the x-axis at y = 0, clamping to
        the nearer end when 0 is outside y_range -- and for an all-negative
        log range that end is the TOP, which puts the x-axis above the data.
        Plotting log10 + y_off keeps the range positive so the axis sits at
        the foot; these labels carry the true exponents.
        """
        g = VGroup()
        for e in exponents:
            lab = MathTex(f"10^{{{e}}}", color=MUTED).scale(0.40)
            lab.next_to(ax.c2p(x_at, e + y_off), LEFT, buff=0.16)
            g.add(lab)
        return g

    # ------------------------------------------------------------------
    # 0. The premise
    # ------------------------------------------------------------------
    def beat_premise(self):
        head = self._title("BOB the (Waveform) Builder",
                           "a merger-ringdown model, minimally tuned to NR")

        # From the PEAK onwards. BOB is a merger-ringdown model, so drawing an
        # inspiral in front of it misrepresents what it covers.
        ax = Axes(x_range=[0, 70, 20], y_range=[-1.25, 1.25, 1],
                  x_length=8.2, y_length=2.5,
                  axis_config={"stroke_color": MUTED, "stroke_width": 1.4,
                               "include_tip": False},
                  x_axis_config={"numbers_to_include": []},
                  y_axis_config={"numbers_to_include": []}).shift(DOWN * 0.35)
        # y straddles zero deliberately: this is an oscillating waveform, so
        # the axis belongs through the middle.
        wave = ax.plot(lambda t: float(sech_from_peak(t) * np.cos(0.42 * t)),
                       x_range=[0, 70, 0.2], stroke_width=2.8, color=GOLD)
        env = ax.plot(lambda t: float(sech_from_peak(t)), x_range=[0, 70, 0.4],
                      stroke_width=1.6, color=MUTED, stroke_opacity=0.55)
        env2 = ax.plot(lambda t: float(-sech_from_peak(t)), x_range=[0, 70, 0.4],
                       stroke_width=1.6, color=MUTED, stroke_opacity=0.55)
        tp = MathTex(r"t_p", color=MUTED).scale(0.46)
        tp.next_to(ax.c2p(0, -1.25), DOWN, buff=0.18)
        self.play(Create(ax), FadeIn(tp), run_time=0.7)
        self.play(Create(wave), run_time=1.6)
        self.play(Create(env), Create(env2), run_time=0.7)

        inputs = Text("inputs:  remnant mass · remnant spin · peak amplitude · "
                      "initial frequency (as t → −∞)",
                      font="monospace", color=MINT).scale(0.27)
        inputs.next_to(ax, DOWN, buff=0.52)
        self._clear_banner(inputs, above=ax)
        self.play(FadeIn(inputs, shift=UP * 0.10), run_time=0.9)

        self.wait(self.HOLD)
        self.play(FadeOut(VGroup(head, ax, wave, env, env2, tp, inputs)), run_time=0.7)

    # ------------------------------------------------------------------
    # 1. What BOB models
    # ------------------------------------------------------------------
    def beat_what_it_models(self):
        head = self._title("What BOB models")

        eq = MathTex(r"\mathcal{N}", r"\;=\;", r"\frac{dh}{dt}",
                     color=INK).scale(1.05)
        eq[0].set_color(GOLD)
        eq.next_to(head, DOWN, buff=1.05)
        self.play(Write(eq), run_time=1.2)

        line = Text("BOB best models the gravitational-wave News —",
                    font="monospace", color=INK).scale(0.34)
        line2 = Text("the first time derivative of the strain",
                     font="monospace", color=MINT).scale(0.34)
        block = VGroup(line, line2).arrange(DOWN, buff=0.22)
        block.next_to(eq, DOWN, buff=0.90)
        self._clear_banner(block, above=eq)
        self.play(FadeIn(line, shift=UP * 0.10), run_time=0.9)
        self.play(FadeIn(line2, shift=UP * 0.10), run_time=0.9)

        self.wait(self.HOLD)
        self.play(FadeOut(VGroup(head, eq, block)), run_time=0.7)

    # ------------------------------------------------------------------
    # 1b. The equations themselves
    # ------------------------------------------------------------------
    def beat_equations(self):
        """BOB for the News: Eqs. (1), (10)-(11) and (13) of the paper.

        Eq. (13) is the t_0 -> -infinity form of the phase; Eq. (11)'s F
        collapses to (Omega_QNM^2 - Omega_0^2)/2 in that limit, since
        tanh((t_0-t_p)/tau) -> -1. Reconstructed from the PDF's word
        positions: the linear text extraction scrambles both fractions, and
        the absolute-value bars sit on the FIRST denominator only.
        """
        head = self._title("BOB for the News",
                           "amplitude and phase, in the  t₀ → −∞  limit")

        amp = MathTex(r"|\mathcal{N}|", r"=A_p\,\mathrm{sech}\!"
                      r"\left(\frac{t-t_p}{\tau}\right)", color=INK).scale(0.72)
        amp[0].set_color(GOLD)

        freq = MathTex(r"\Omega=\sqrt{\Omega_{\rm QNM}^{2}"
                       r"+F\left[\tanh\!\left(\frac{t-t_p}{\tau}\right)-1\right]}"
                       r"\ ,\qquad F=\tfrac{1}{2}\!\left(\Omega_{\rm QNM}^{2}"
                       r"-\Omega_0^{2}\right)", color=MUTED).scale(0.54)

        phase = MathTex(r"\Phi", r"=\frac{\tau}{2}\left[\Omega_{\rm QNM}\ln\!"
                        r"\left(\frac{\Omega+\Omega_{\rm QNM}}"
                        r"{\left|\Omega-\Omega_{\rm QNM}\right|}\right)"
                        r"-\Omega_0\ln\!\left(\frac{\Omega+\Omega_0}"
                        r"{\Omega-\Omega_0}\right)\right]+\Phi_0",
                        color=INK).scale(0.54)
        phase[0].set_color(GOLD)

        stack = VGroup(amp, freq, phase).arrange(DOWN, buff=0.46)
        stack.next_to(head, DOWN, buff=0.62)
        self.play(Write(amp), run_time=1.3)
        self.play(Write(freq), run_time=1.6)
        self.play(Write(phase), run_time=2.0)

        note = MathTex(r"\omega=m\Omega,\qquad \varphi=m\Phi,"
                       r"\qquad m=2\ \text{for the }(2,2)\text{ mode}",
                       color=MUTED).scale(0.46)
        note.next_to(stack, DOWN, buff=0.50)
        self._clear_banner(note, above=stack)
        self.play(FadeIn(note), run_time=0.9)

        self.wait(self.HOLD)
        self.play(FadeOut(VGroup(head, stack, note)), run_time=0.7)

    # ------------------------------------------------------------------
    # 2. The sech, written out
    # ------------------------------------------------------------------
    def beat_ladder(self):
        head = self._title("The sech already incorporates overtone information")

        # Eq. (26): the first few terms, as the paper writes them.
        series = MathTex(
            r"A_p\,\mathrm{sech}\!\left(\frac{t-t_p}{\tau}\right)",
            r"=2A_p\left(e^{-\frac{t-t_p}{\tau}}"
            r"-e^{-3\frac{t-t_p}{\tau}}"
            r"+e^{-5\frac{t-t_p}{\tau}}+\ \cdots\right)",
            color=INK).scale(0.60)
        series[0].set_color(GOLD)
        series.next_to(head, DOWN, buff=0.90)
        self.play(Write(series[0]), run_time=1.0)
        self.play(Write(series[1]), run_time=1.9)

        damping = MathTex(r"\tau_n=\frac{\tau_0}{2n+1}", color=SKY).scale(0.72)
        damping.next_to(series, DOWN, buff=0.65)
        note = Text("the overtone damping times, in the eikonal limit",
                    font="monospace", color=MUTED).scale(0.28)
        note.next_to(damping, DOWN, buff=0.24)
        self.play(Write(damping), run_time=1.0)
        self.play(FadeIn(note), run_time=0.7)

        punch = Text("one peak amplitude scales every term — only the signs alternate",
                     font="monospace", color=MINT).scale(0.30)
        punch.next_to(note, DOWN, buff=0.55)
        self._clear_banner(punch, above=note)
        self.play(FadeIn(punch, shift=UP * 0.10), run_time=1.0)

        self.wait(self.HOLD)
        self.play(FadeOut(VGroup(head, series, damping, note, punch)), run_time=0.7)

    # ------------------------------------------------------------------
    # 3. Almost nothing to fit
    # ------------------------------------------------------------------
    def beat_almost_nothing_to_fit(self):
        # NOT "nothing to fit": Omega_0 comes from a fit. The paper's claim is
        # that BOB has no OTHER parameters to fit, and no per-overtone
        # amplitudes at all.
        head = self._title("Almost nothing to fit")

        def column(title, colour, items, x):
            t = Text(title, font="monospace", color=colour, weight=BOLD).scale(0.33)
            rows = VGroup(*[Text(s, font="monospace", color=MUTED).scale(0.28)
                            for s in items])
            rows.arrange(DOWN, aligned_edge=LEFT, buff=0.20)
            grp = VGroup(t, rows).arrange(DOWN, aligned_edge=LEFT, buff=0.30)
            grp.move_to(np.array([x, -0.30, 0]))
            return grp

        left = column("a sum of overtones", ORCHID,
                      ["remnant mass",
                       "remnant spin",
                       "2 free parameters per overtone"], -3.35)
        right = column("BOB", GOLD,
                       ["remnant mass",
                        "remnant spin",
                        "one fitted frequency, Ω₀",
                        "one overall amplitude"], 3.05)
        # Different row counts, so centring both on the same y puts their
        # headings at different heights -- top-align instead.
        right.align_to(left, UP)
        self.play(FadeIn(left, shift=RIGHT * 0.12), run_time=1.0)
        self.play(FadeIn(right, shift=LEFT * 0.12), run_time=1.0)

        punch = VGroup(
            Text("comparable accuracy to a 4–8 overtone model",
                 font="monospace", color=MINT).scale(0.32),
            Text("near the peak, matching BOB takes a QNM sum ~10 fitted parameters",
                 font="monospace", color=MINT).scale(0.28),
            Text("BOB uses 4",
                 font="monospace", color=MINT).scale(0.28),
        ).arrange(DOWN, buff=0.16)
        punch.next_to(VGroup(left, right), DOWN, buff=0.42)
        punch.set_x(0)
        self._clear_banner(punch, above=VGroup(left, right))
        self.play(FadeIn(punch, shift=UP * 0.10), run_time=1.0)

        self.wait(self.HOLD)
        self.play(FadeOut(VGroup(head, left, right, punch)), run_time=0.7)

    # ------------------------------------------------------------------
    # 4. The amplitude prediction, Eq. (28)
    # ------------------------------------------------------------------
    def beat_amplitude_link(self):
        head = self._title("And it predicts the ringdown amplitude")

        eq = MathTex(
            r"A_{220}", r"=",
            r"\frac{2\,A_{\mathrm{peak}}^{\mathcal{N}_{22}}}{|\omega_{220}|}",
            r"\,e^{-\frac{t-t_p}{\tau}}",
            color=INK).scale(0.88)
        eq[0].set_color(SKY)
        eq[2].set_color(GOLD)
        eq.next_to(head, DOWN, buff=1.00)
        self.play(Write(eq), run_time=1.8)

        # Built line-by-line and arranged: a single multi-line Text is
        # left-aligned inside its own box, so centring the box still leaves
        # the lines ragged under a centred equation.
        note = VGroup(
            Text("This follows from matching BOB's late-time behaviour",
                 font="monospace", color=MUTED).scale(0.29),
            Text("to that of the fundamental quasinormal mode.",
                 font="monospace", color=MUTED).scale(0.29),
        ).arrange(DOWN, buff=0.14)
        note.next_to(eq, DOWN, buff=0.68)
        note.set_x(0)
        self.play(FadeIn(note), run_time=0.9)

        punch = VGroup(
            Text("It agrees with a ringdown surrogate to within",
                 font="monospace", color=MINT).scale(0.31),
            Text("that surrogate's own error bars.",
                 font="monospace", color=MINT).scale(0.31),
        ).arrange(DOWN, buff=0.14)
        punch.next_to(note, DOWN, buff=0.55)
        punch.set_x(0)
        self._clear_banner(punch, above=note)
        self.play(FadeIn(punch, shift=UP * 0.10), run_time=1.0)

        self.wait(self.HOLD)
        self.play(FadeOut(VGroup(head, eq, note, punch)), run_time=0.7)

    # ------------------------------------------------------------------
    # 5. The knee, against a family of overtone fits
    # ------------------------------------------------------------------
    def beat_knee(self):
        head = self._title("BOB against a family of overtone fits",
                           "accumulated mismatch vs. the time you start from")

        # Both axes are offset so Manim draws them at the left edge and the
        # foot: x as t + X_OFF, y as log10(mismatch) + Y_OFF. An all-negative
        # y_range would otherwise put the x-axis along the TOP.
        X_OFF, Y_OFF = 20.0, 7.4
        ax = Axes(x_range=[0, 70, 10], y_range=[0.0, 7.8, 1],
                  x_length=7.4, y_length=2.85,
                  axis_config={"stroke_color": MUTED, "stroke_width": 1.4,
                               "include_tip": False},
                  x_axis_config={"numbers_to_include": []},
                  y_axis_config={"numbers_to_include": []}).shift(DOWN * 0.60)
        yticks = self._logy_labels(ax, [0, -2, -4, -6], 0, Y_OFF)
        xnums = VGroup(*[MathTex(str(v), color=MUTED).scale(0.36)
                         .next_to(ax.c2p(v + X_OFF, 0), DOWN, buff=0.10)
                         for v in (-20, -10, 0, 10, 20, 30, 40, 50)])
        xlab = MathTex(r"t_0-t^{\,h}_{\mathrm{peak}}\ [M]", color=MUTED).scale(0.42)
        xlab.next_to(xnums, DOWN, buff=0.10)
        ylab = MathTex(r"\mathcal{M}", color=MUTED).scale(0.52)
        ylab.next_to(yticks, LEFT, buff=0.14)
        self.play(Create(ax), FadeIn(yticks), FadeIn(xnums), FadeIn(xlab),
                  FadeIn(ylab), run_time=1.1)

        # Digitised from Fig. 6 of the paper. Anchors reproduced to ~0.05 dex:
        #   t = -20M   N=0 ~1e0,  N=7 ~1e-1.3,  BOB ~1e-2
        #   t =   0    N=0 ~1e-1, N=7 ~1e-6
        #   t = +50M   N=0 ~1e-5.3, N=1 ~1e-5.8, N=2..7 cluster 1e-6.3..1e-7
        # Each extra overtone buys BOTH a lower floor and an earlier descent,
        # which is why the knee and width below depend on n. BOB starts below
        # every fit, is overtaken by the high-N ones a few M before the peak,
        # and ends level with the fundamental-only fit.
        FLOOR = [-5.30, -5.80, -6.25, -6.45, -6.60, -6.70, -6.80, -6.90]

        def qnm(t, n):
            f, st = FLOOR[n], -0.19 * n
            return f + (st - f) * 0.5 * (1 - np.tanh((t - (8.8 - 1.843 * n))
                                                     / (12.0 - 1.0 * n)))

        def bob_of(t):
            return -5.30 + 3.30 * 0.5 * (1 - np.tanh((t + 5.0) / 5.0))

        fam = VGroup(*[
            ax.plot(lambda v, n=n: float(qnm(v - X_OFF, n) + Y_OFF),
                    x_range=[0, 70, 0.4], stroke_width=1.9, color=ORCHID,
                    stroke_opacity=0.45 + 0.07 * n)
            for n in range(8)
        ])
        fam_lab = Text("QNM fits,  N = 0 … 7", font="monospace",
                       color=ORCHID).scale(0.26)
        fam_lab.next_to(ax.c2p(70, qnm(50, 4) + Y_OFF), RIGHT, buff=0.12)
        self.play(LaggedStart(*[Create(c) for c in fam], lag_ratio=0.14),
                  run_time=2.3)
        self.play(FadeIn(fam_lab), run_time=0.5)

        bob = ax.plot(lambda v: float(bob_of(v - X_OFF) + Y_OFF),
                      x_range=[0, 70, 0.3], stroke_width=3.8, color=GOLD)
        # BOB's plateau coincides with the N=0 fit's endpoint, so its label is
        # lifted clear rather than placed on the curve.
        bob_lab = Text("BOB", font="monospace", color=GOLD).scale(0.30)
        bob_lab.next_to(ax.c2p(70, bob_of(50) + Y_OFF), RIGHT, buff=0.12).shift(UP * 0.30)
        self.play(Create(bob), run_time=1.7)
        self.play(FadeIn(bob_lab), run_time=0.5)

        # The News peak sits ~7M after the strain peak the axis is zeroed on.
        news_mark = DashedLine(ax.c2p(7 + X_OFF, 0), ax.c2p(7 + X_OFF, 7.8),
                               stroke_color=MUTED, stroke_width=1.5,
                               dash_length=0.08, stroke_opacity=0.75)
        news_lab = MathTex(r"t^{\,\mathcal{N}_{22}}_{\mathrm{peak}}",
                           color=MUTED).scale(0.44)
        news_lab.next_to(ax.c2p(7 + X_OFF, 7.8), UP, buff=0.10)
        self.play(Create(news_mark), FadeIn(news_lab), run_time=0.7)

        punch = Text("near the peak it vastly outperforms QNMs per free parameter",
                     font="monospace", color=MINT).scale(0.30)
        punch.next_to(xlab, DOWN, buff=0.24)
        self._clear_banner(punch, above=xlab)
        self.play(FadeIn(punch, shift=UP * 0.10), run_time=1.0)

        # Longer hold: this is the densest figure in the film.
        self.wait(self.HOLD + 1.8)
        self.play(FadeOut(VGroup(head, ax, yticks, xnums, xlab, ylab,
                                 news_mark, news_lab,
                                 fam, fam_lab, bob, bob_lab, punch)), run_time=0.7)

    # ------------------------------------------------------------------
    # 6. Against the state of the art
    # ------------------------------------------------------------------
    def beat_state_of_the_art(self):
        head = self._title("Against the state of the art",
                           "median News mismatch, SXS quasi-circular non-precessing")

        rows = [("BOB", "3.18 × 10⁻⁵", GOLD),
                ("SEOBNRv5HM", "1.18 × 10⁻⁵", SKY)]
        rows2 = [("BOB", "2.88 × 10⁻⁵", GOLD),
                 ("SEOBNRv5HM", "1.31 × 10⁻⁵", SKY),
                 ("NRHybSur3dq8", "9.26 × 10⁻⁶", ORCHID)]

        def table(title, data, x):
            """Two aligned columns.

            Arranging each row independently let the value column start
            wherever the name happened to end, so the numbers did not line
            up under each other. Build the columns separately instead.
            """
            t = Text(title, font="monospace", color=MUTED).scale(0.27)
            names = VGroup(*[Text(n, font="monospace", color=c).scale(0.30)
                             for n, _, c in data])
            vals = VGroup(*[Text(v, font="monospace", color=INK).scale(0.30)
                            for _, v, _ in data])
            for col in (names, vals):
                col.arrange(DOWN, aligned_edge=LEFT, buff=0.26)
            body = VGroup(names, vals).arrange(RIGHT, buff=0.55, aligned_edge=UP)
            g = VGroup(t, body).arrange(DOWN, aligned_edge=LEFT, buff=0.30)
            g.move_to(np.array([x, 0.05, 0]))
            return g

        full = table("full catalog", rows, -3.60)
        train = table("within the surrogate's training domain", rows2, 2.70)
        # Top-align: different row counts, so centring each on the same y put
        # their headings at different heights.
        train.align_to(full, UP)
        self.play(FadeIn(full, shift=UP * 0.10), run_time=1.1)
        self.play(FadeIn(train, shift=UP * 0.10), run_time=1.1)

        punch = Text("within a factor of a few — from a model that is barely tuned",
                     font="monospace", color=MINT).scale(0.31)
        punch.next_to(VGroup(full, train), DOWN, buff=0.52)
        punch.set_x(0)          # the two tables are not symmetric about x=0
        self._clear_banner(punch, above=VGroup(full, train))
        self.play(FadeIn(punch, shift=UP * 0.10), run_time=1.0)

        self.wait(self.HOLD)
        self.play(FadeOut(VGroup(head, full, train, punch)), run_time=0.7)

    # ------------------------------------------------------------------
    # 7. Where calibration runs out
    # ------------------------------------------------------------------
    def beat_sparse_nr(self):
        head = self._title("Where calibration runs out",
                           "high remnant spin  χ_f > 0.9  —  thin NR coverage")

        # Sized to leave room for FOUR stacked captions below it (tick numbers,
        # axis label, the coverage fact, the payoff). At y_length 2.8 shifted
        # down 0.52 the stack ran past SAFE_BOTTOM, and _clear_banner lifted
        # the payoff straight into the line above it.
        Y_OFF = 6.0          # see _logy_labels: keeps the range positive
        ax = Axes(x_range=[1, 4, 1], y_range=[0.4, 3.4, 1],
                  x_length=6.8, y_length=2.55,
                  axis_config={"stroke_color": MUTED, "stroke_width": 1.4,
                               "include_tip": False},
                  x_axis_config={"numbers_to_include": []},
                  y_axis_config={"numbers_to_include": []}).shift(DOWN * 0.28)
        yticks = self._logy_labels(ax, [-3, -4, -5], 1, Y_OFF)
        xnums = VGroup(*[MathTex(str(q), color=MUTED).scale(0.42)
                         .next_to(ax.c2p(q, 0.4), DOWN, buff=0.12)
                         for q in (1, 2, 3, 4)])
        xlab = MathTex(r"\text{mass ratio}\ \ q", color=MUTED).scale(0.44)
        xlab.next_to(xnums, DOWN, buff=0.14)
        ylab = Text("mismatch", font="monospace", color=MUTED).scale(0.25)
        ylab.rotate(PI / 2).next_to(yticks, LEFT, buff=0.12)
        self.play(Create(ax), FadeIn(yticks), FadeIn(xnums), FadeIn(xlab),
                  FadeIn(ylab), run_time=1.0)

        # Scatter, as in the paper's Fig. 25: BOB flat across q, the calibrated
        # model degrading as the mass ratio climbs out of the NR coverage.
        # Fixed seed, so the figure is reproducible run to run.
        rng = np.random.default_rng(11)
        qs = np.linspace(1.05, 3.92, 13)
        bob_pts = VGroup(*[
            Dot(ax.c2p(q, -4.55 + Y_OFF + rng.normal(0, 0.15)),
                radius=0.052, color=GOLD)
            for q in qs])
        seob_pts = VGroup(*[
            Triangle(fill_color=SKY, fill_opacity=1.0, stroke_width=0).scale(0.070)
            .move_to(ax.c2p(q, -4.70 + Y_OFF + 0.58 * (q - 1) ** 1.25
                            + rng.normal(0, 0.13)))
            for q in qs])

        b_lab = Text("BOB", font="monospace", color=GOLD).scale(0.28)
        b_lab.next_to(ax.c2p(4, -4.55 + Y_OFF), RIGHT, buff=0.18)
        s_lab = Text("SEOBNRv5HM", font="monospace", color=SKY).scale(0.28)
        s_lab.next_to(ax.c2p(2.05, -3.05 + Y_OFF), UP, buff=0.14)
        self.play(LaggedStart(*[GrowFromCenter(d) for d in bob_pts],
                              lag_ratio=0.06), run_time=1.3)
        self.play(FadeIn(b_lab), run_time=0.4)
        self.play(LaggedStart(*[GrowFromCenter(d) for d in seob_pts],
                              lag_ratio=0.06), run_time=1.3)
        self.play(FadeIn(s_lab), run_time=0.4)

        fact = Text("no public SXS non-precessing case has q > 4 with χ_f > 0.9",
                    font="monospace", color=MUTED).scale(0.28)
        fact.next_to(xlab, DOWN, buff=0.24)
        punch = Text("heavily tuned models lose accuracy exactly where NR coverage is thin",
                     font="monospace", color=MINT).scale(0.29)
        punch.next_to(fact, DOWN, buff=0.20)
        self._clear_banner(punch, above=fact)
        self.play(FadeIn(fact), run_time=0.8)
        self.play(FadeIn(punch, shift=UP * 0.10), run_time=1.0)

        self.wait(self.HOLD)
        self.play(FadeOut(VGroup(head, ax, yticks, xnums, xlab, ylab, bob_pts,
                                 seob_pts, b_lab, s_lab, fact, punch)), run_time=0.7)

    # ------------------------------------------------------------------
    # 8. Superkicks
    # ------------------------------------------------------------------
    def beat_superkicks(self):
        head = self._title("Superkicks: build the modes, then combine",
                           "an earlier study reported BOB could not model the\nmass and current quadrupole waves")

        step1 = Text("model  N₂₂  and  N₂,₋₂  with BOB",
                     font="monospace", color=GOLD).scale(0.36)
        arrow = Text("↓", font="monospace", color=MUTED).scale(0.48)
        step2 = Text("combine them into  İ₂₂  and  Ṡ₂₂",
                     font="monospace", color=MINT).scale(0.36)
        chain = VGroup(step1, arrow, step2).arrange(DOWN, buff=0.22)
        chain.next_to(head, DOWN, buff=0.85)
        self.play(FadeIn(step1), run_time=0.7)
        self.play(FadeIn(arrow), run_time=0.4)
        self.play(FadeIn(step2), run_time=0.7)

        why = VGroup(
            Text("The earlier study applied BOB's amplitude and frequency",
                 font="monospace", color=MUTED).scale(0.28),
            Text("equations to the quadrupole waves themselves.",
                 font="monospace", color=MUTED).scale(0.28),
        ).arrange(DOWN, buff=0.14)
        why.next_to(chain, DOWN, buff=0.55)
        why.set_x(0)
        self.play(FadeIn(why), run_time=1.3)

        punch = Text("built this way, both the mass and current quadrupole are accurate",
                     font="monospace", color=MINT).scale(0.30)
        punch.next_to(why, DOWN, buff=0.45)
        punch.set_x(0)
        self._clear_banner(punch, above=why)
        self.play(FadeIn(punch, shift=UP * 0.10), run_time=1.0)

        self.wait(self.HOLD)
        self.play(FadeOut(VGroup(head, chain, why, punch)), run_time=0.7)

    # ------------------------------------------------------------------
    # 9. Close
    # ------------------------------------------------------------------
    def beat_close(self):
        line1 = Text("An analytic merger-ringdown model",
                     font="sans-serif", color=INK, weight=BOLD).scale(0.62)
        line2 = Text("that needs the remnant, not the catalog",
                     font="sans-serif", color=GOLD, weight=BOLD).scale(0.62)
        block = VGroup(line1, line2).arrange(DOWN, buff=0.26)
        block.move_to(UP * 0.55)
        self.play(FadeIn(line1, shift=UP * 0.12), run_time=1.0)
        self.play(FadeIn(line2, shift=UP * 0.12), run_time=1.0)

        cite = Text("Kankani & McWilliams — BOB the (Waveform) Builder",
                    font="monospace", color=MUTED).scale(0.30)
        cite.next_to(block, DOWN, buff=0.62)
        install = Text("pip install gwBOB", font="monospace", color=MINT).scale(0.34)
        install.next_to(cite, DOWN, buff=0.30)
        self._clear_banner(install, above=cite)
        self.play(FadeIn(cite), run_time=0.8)
        self.play(FadeIn(install, shift=UP * 0.10), run_time=0.8)

        self.wait(self.HOLD + 0.6)
        self.play(FadeOut(VGroup(block, cite, install)), run_time=0.9)
