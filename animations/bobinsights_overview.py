"""Direct Waves in BBH Mergers: Insights from BOB -- ~75 s.

Kankani & McWilliams, arXiv:2603.15474.

  0. Two routes to the same envelope
  1a. The question: the amplitude is a sech -- can the QNM poles give it?
  1b. The maths: common source term -> PT B_n -> Gamma/hypergeometric
  2. The key physical assumption (common source term across overtones)
  3. Strip the QNMs: what's left is the direct wave, and BOB has it
  4. The BOB direct wave frequency is largely uncorrelated with omega_H
  5. Close

=============================================================================
!!  PLACEHOLDER DATA  --  NOT PUBLICATION VALUES  !!

The curves in beats 3 and 4 are SCHEMATIC. They honour the trends the paper
states (filtered BOB and filtered NR agreeing over ~15M before to ~20M after
the peak; omega_avg tracking omega_BOB,peak while omega_H diverges except
near chi_f ~ 0.7), but the values are stand-ins.

Replace PLACEHOLDER_FIG4_* / PLACEHOLDER_FILTERED with the real exports.
Set SHOW_PLACEHOLDER_BANNER = False only once real data is in.
=============================================================================

Render:
    MANIM=/home/anuj/anaconda3/envs/manim_env/bin/manim
    $MANIM -ql animations/bobinsights_overview.py BOBInsightsOverview
"""

from manim import *
import numpy as np

SHOW_PLACEHOLDER_BANNER = True

# ---- palette: deep maroon ground, high-contrast accents ------------------
# Ground darkened and accents brightened for legibility: the worst pair is
# now 12.2 (was 9.2 on a lighter maroon). Contrast against #240D12:
#   INK 18.4  MUTED 13.2  ACCENT 12.2  AMBER 13.6  GREEN 13.4  HORIZON 13.6
# Accents are pushed cool or bright-warm so they separate from a red-hued
# ground -- lightness contrast alone is not enough when the hues are close,
# which is how the old rose 2*Omega_H series came to read as invisible.
BG = "#240D12"
INK = "#FFFFFF"
MUTED = "#EBD5DA"
ACCENT = "#A8D8FF"
AMBER = "#FFD98A"
GREEN = "#9BEDC2"
ROSE = "#FFB59A"
VIOLET = "#D9B8FF"
HORIZON = "#A3E9F5"   # the 2*Omega_H series: cool, kept clear of the ground

config.background_color = BG

TAU_D = 11.0
TP = 0.0


def sech_env(t):
    """|N| ∝ sech[(t - t_p)/tau] -- the BOB amplitude envelope."""
    return 1.0 / np.cosh((np.asarray(t, dtype=float) - TP) / TAU_D)


# ---- PLACEHOLDER: Fig. 4 -- frequency vs remnant spin -------------------
# Trends per the paper: omega_avg tracks omega_BOB,peak across all spins;
# omega_H rises steeply and crosses only near chi_f ~ 0.7; omega_ISCO sits
# lower. Shapes are faithful, values are invented.
PLACEHOLDER_CHI = np.linspace(0.02, 0.95, 26)


def _ph_omega_H(chi):
    rp = 1.0 + np.sqrt(np.clip(1.0 - chi**2, 0, None))
    return 2.0 * chi / (2.0 * rp)          # 2 Omega_H


def _ph_omega_avg(chi):
    # b chosen so this crosses 2*Omega_H exactly at chi_f = 0.70, matching
    # the caption. Previously they crossed near 0.76 while the marker sat at
    # 0.70 -- the figure contradicted its own caption.
    return 0.33 + 0.1657 * chi**2.1


def _ph_omega_qnm(chi):
    return 0.37 + 0.45 * chi**2.0


def _ph_omega_isco(chi):
    return 0.14 + 0.42 * chi**1.9


class BOBInsightsOverview(Scene):

    HOLD = 2.6
    SAFE_BOTTOM = -3.05

    def construct(self):
        if SHOW_PLACEHOLDER_BANNER:
            self.add(self._banner())
        self.beat_two_routes()
        self.beat_question()
        self.beat_derivation()
        self.beat_approximations()
        self.beat_filters()
        self.beat_what_it_tracks()
        self.beat_close()

    def _banner(self):
        t = Text("SCHEMATIC — placeholder data, not publication values",
                 font="monospace", color="#141414").scale(0.26)
        chip = RoundedRectangle(width=t.width + 0.44, height=t.height + 0.26,
                                corner_radius=0.08, fill_color=AMBER,
                                fill_opacity=1.0, stroke_width=0)
        return VGroup(chip, t).arrange(ORIGIN).to_edge(DOWN, buff=0.16)

    def _clear_banner(self, mob, above=None, gap=0.16):
        if SHOW_PLACEHOLDER_BANNER and mob.get_bottom()[1] < self.SAFE_BOTTOM:
            mob.shift(UP * (self.SAFE_BOTTOM - mob.get_bottom()[1]))
        if above is not None:
            clearance = above.get_bottom()[1] - mob.get_top()[1]
            assert clearance >= gap, (
                f"layout collision: {clearance:.2f} < {gap}. Raise the figure.")
        return mob

    # ------------------------------------------------------------------
    # 0. Two routes, one envelope  (~13 s)
    # ------------------------------------------------------------------
    def beat_two_routes(self):
        title = Text("Why does BOB work so well near the peak?",
                     font="sans-serif", color=INK, weight=BOLD).scale(0.60)
        title.to_edge(UP, buff=0.70)
        self.play(Write(title), run_time=1.5)

        left = VGroup(
            Text("null geodesics", font="monospace", color=ACCENT).scale(0.34),
            Text("diverging from", font="monospace", color=MUTED).scale(0.28),
            Text("the light ring", font="monospace", color=MUTED).scale(0.28),
        ).arrange(DOWN, buff=0.14).move_to(LEFT * 3.9 + UP * 0.35)

        right = VGroup(
            Text("QNM poles", font="monospace", color=GREEN).scale(0.34),
            Text("under the", font="monospace", color=MUTED).scale(0.28),
            Text("Pöschl–Teller potential", font="monospace", color=MUTED).scale(0.28),
        ).arrange(DOWN, buff=0.14).move_to(RIGHT * 3.9 + UP * 0.35)

        self.play(FadeIn(left, shift=RIGHT * 0.2),
                  FadeIn(right, shift=LEFT * 0.2), run_time=1.2)
        self.wait(0.6)

        env = MathTex(r"|\mathcal{N}| \propto \mathrm{sech}"
                      r"\!\left[\frac{t-t_p}{\tau}\right]",
                      color=AMBER).scale(0.95).move_to(DOWN * 1.35)
        box = SurroundingRectangle(env, color=AMBER, buff=0.24,
                                   stroke_width=1.8, corner_radius=0.1)

        a1 = Arrow(left.get_bottom() + DOWN * 0.10, box.get_left() + LEFT * 0.05,
                   color=MUTED, stroke_width=2.6, buff=0.16,
                   max_tip_length_to_length_ratio=0.10)
        a2 = Arrow(right.get_bottom() + DOWN * 0.10, box.get_right() + RIGHT * 0.05,
                   color=MUTED, stroke_width=2.6, buff=0.16,
                   max_tip_length_to_length_ratio=0.10)

        self.play(GrowArrow(a1), GrowArrow(a2), run_time=0.9)
        self.play(Write(env), Create(box), run_time=1.4)

        same = Text("two routes to the same envelope",
                    font="monospace", color=INK).scale(0.32)
        same.next_to(box, DOWN, buff=0.40)
        self._clear_banner(same, above=box)
        self.play(FadeIn(same, shift=UP * 0.10), run_time=0.9)

        self.wait(self.HOLD)
        self.play(FadeOut(VGroup(title, left, right, env, box, a1, a2, same)),
                  run_time=0.8)

    # ------------------------------------------------------------------
    # 1a. The question: BOB's amplitude is a sech -- can the QNM poles
    #     reproduce it?  (~16 s)
    # ------------------------------------------------------------------
    def beat_question(self):
        """Poles sit at Re(omega) = -alpha*delta, i.e. LEFT of the imaginary
        axis: omega_n = -alpha*delta - i*alpha*(n+1/2). See footnote 1 of the
        paper (pole condition -beta - i*omega/alpha = -n, beta = -1/2 + i*delta,
        delta > 0 -- delta = 2.09 for the paper's V0 = 0.605, alpha = 0.362).
        Consistent with the e^{+i alpha delta (t-r_*)} factor in Eq. (7).
        """
        title = Text("BOB's amplitude is a hyperbolic secant",
                     font="sans-serif", color=INK, weight=BOLD).scale(0.58)
        title.to_edge(UP, buff=0.70)
        self.play(FadeIn(title, shift=DOWN * 0.12), run_time=1.0)

        # The envelope itself, drawn.
        # From the peak onwards only: BOB models the merger-ringdown, and the
        # decaying side is what the QNM sum has to reproduce.
        ax = Axes(
            x_range=[0, 40, 10], y_range=[0, 1.15, 0.5],
            x_length=5.0, y_length=1.9,
            axis_config={"stroke_color": MUTED, "stroke_width": 1.4,
                         "include_tip": False, "font_size": 18},
            x_axis_config={"numbers_to_include": []},
            y_axis_config={"numbers_to_include": []},
        ).move_to(LEFT * 3.35 + UP * 0.55)
        curve = ax.plot(lambda t: float(sech_env(t)), x_range=[0, 40, 0.3],
                        stroke_width=3.4, color=AMBER)
        peak_lab = MathTex(r"t_p", color=MUTED).scale(0.42)
        peak_lab.next_to(ax.c2p(0, 0), DOWN, buff=0.14)
        eq = MathTex(r"|\mathcal{N}| \propto \mathrm{sech}"
                     r"\!\left(\frac{t-t_p}{\tau}\right)",
                     color=AMBER).scale(0.62)
        eq.next_to(ax, DOWN, buff=0.34)

        self.play(Create(ax), FadeIn(peak_lab), run_time=0.6)
        self.play(Create(curve), run_time=1.4)
        self.play(Write(eq), run_time=1.0)
        self.wait(0.5)

        # The QNM picture it must be reconciled with: a ladder of poles.
        plane_c = RIGHT * 3.30 + UP * 0.30
        re_axis = Line(plane_c + LEFT * 1.70, plane_c + RIGHT * 1.10,
                       stroke_color=MUTED, stroke_width=1.4)
        im_axis = Line(plane_c + UP * 0.55, plane_c + DOWN * 2.00,
                       stroke_color=MUTED, stroke_width=1.4)
        re_lab = MathTex(r"\mathrm{Re}\,\omega", color=MUTED).scale(0.38)
        re_lab.next_to(re_axis.get_right(), UP, buff=0.08)
        im_lab = MathTex(r"\mathrm{Im}\,\omega", color=MUTED).scale(0.38)
        im_lab.next_to(im_axis.get_top(), RIGHT, buff=0.08)

        poles = VGroup(*[
            Dot(plane_c + np.array([-0.80, -(n + 0.45) * 0.42, 0]),
                radius=0.050, color=GREEN) for n in range(4)
        ])
        pole_lab = Text("QNM overtones", font="monospace",
                        color=GREEN).scale(0.24)
        pole_lab.next_to(poles, LEFT, buff=0.18)

        self.play(Create(re_axis), Create(im_axis), FadeIn(re_lab),
                  FadeIn(im_lab), run_time=0.8)
        self.play(LaggedStart(*[GrowFromCenter(d) for d in poles],
                              lag_ratio=0.12), FadeIn(pole_lab), run_time=1.2)

        # The question the next beat answers.
        question = Text("can we recover it from the QNM poles?",
                        font="monospace", color=INK).scale(0.36)
        question.to_edge(DOWN, buff=1.30)
        self._clear_banner(question)
        self.play(FadeIn(question, shift=UP * 0.12), run_time=1.1)

        self.wait(self.HOLD)
        self.play(FadeOut(VGroup(title, ax, curve, peak_lab, eq, re_axis, im_axis,
                                 re_lab, im_lab, poles, pole_lab, question)),
                  run_time=0.8)

    # ------------------------------------------------------------------
    # 1b. The maths  (~18 s)
    #
    # The paper's ACTUAL route: a series manipulation, not a contour integral.
    # B_n comes from the known PT reflection/transmission coefficients
    # (calculated in [6], explicit in [33]); substituting into the QNM sum and
    # applying Gamma-function identities plus a hypergeometric transformation
    # resums it. No residues are computed anywhere in the paper.
    # ------------------------------------------------------------------
    def beat_derivation(self):
        title = Text("Where the sech comes from", font="sans-serif",
                     color=INK, weight=BOLD).scale(0.60)
        title.to_edge(UP, buff=0.32)
        self.play(FadeIn(title, shift=DOWN * 0.12), run_time=0.9)

        # Eq. (1): the Sasaki-Nakamura master equation the whole derivation
        # starts from. X-hat^(s) is the Laplace transform of the spin-s
        # perturbation, r_* the tortoise coordinate, I(omega,r) the initial
        # data. Naming the terms costs one line and orients the viewer.
        c0_lab = Text("Sasaki–Nakamura master equation", font="monospace",
                      color=ACCENT).scale(0.30)
        c0 = MathTex(r"\frac{d^2 \hat{X}^{(s)}(\omega,r)}{dr_*^2}"
                     r" + V_{\rm eff}(r)\,\hat{X}^{(s)}(\omega,r) = I(\omega,r)",
                     color=INK).scale(0.58)
        c0_note = Text("r_* tortoise coordinate · I(ω,r) initial data",
                       font="monospace", color=MUTED).scale(0.25)
        card0 = VGroup(c0_lab, c0, c0_note).arrange(DOWN, buff=0.14)
        card0.move_to(UP * 2.55)

        c1_lab = Text("far from the hole, and with a common source term",
                      font="monospace", color=GREEN).scale(0.30)
        c1 = MathTex(r"X^{(s)} \propto \mathrm{Re}\!\left[\sum_n "
                     r"B_n\, e^{-i\omega_n (t-r_*)}\right]",
                     color=INK).scale(0.56)
        card1 = VGroup(c1_lab, c1).arrange(DOWN, buff=0.16)
        card1.move_to(UP * 1.10)

        # Eq. (5): the PT excitation factors in closed form, with beta.
        # Shown side by side with the potential they come from -- the claim
        # "in closed form" is worth backing with the actual expression.
        c2_lab = Text("Pöschl–Teller gives B_n in closed form",
                      font="monospace", color=MUTED).scale(0.30)
        c2_pot = MathTex(r"V_{\rm PT} = \frac{V_0}{\cosh^2 \alpha (x-x_0)}",
                         color=INK).scale(0.52)
        c2_bn = MathTex(r"B_n^{\rm PT} = \frac{i\alpha(-1)^{n+1}\,"
                        r"\Gamma(n-\beta)\,\Gamma(1+2\beta-n)}"
                        r"{2\omega_n\, n!\,\Gamma(1+\beta)\,\Gamma(-\beta)\,"
                        r"\Gamma(\beta-n)}",
                        color=INK).scale(0.52)
        c2_row = VGroup(c2_pot, c2_bn).arrange(RIGHT, buff=0.70)
        c2_beta = MathTex(r"\beta = -\tfrac{1}{2} + \sqrt{\tfrac{1}{4}"
                          r" - V_0/\alpha^2} \equiv -\tfrac{1}{2} + i\delta",
                          color=MUTED).scale(0.40)
        card2 = VGroup(c2_lab, c2_row, c2_beta).arrange(DOWN, buff=0.14)
        card2.move_to(DOWN * 0.42)

        # The full resummed result (Eq. 7), then the collapse to the sech.
        # Showing |F| ~ const explicitly keeps the last approximation visible
        # rather than folding it silently into the answer.
        c3_lab = Text("Γ-function identities → hypergeometric F",
                      font="monospace", color=GREEN).scale(0.30)
        c3 = MathTex(r"\frac{dX^{(s)}}{dt} \propto \mathrm{Re}\!\left["
                     r"\mathrm{sech}\!\left(\frac{t-t_p}{\tau}\right)"
                     r"e^{i\alpha\delta(t-t_p)}\,"
                     r"F\!\left(\tfrac{1}{2}-i\delta,\ -\tfrac{1}{2}-i\delta;"
                     r"\ 1-2i\delta;\ -e^{-\alpha(t-t_p)}\right)\right]",
                     color=INK).scale(0.46)
        card3 = VGroup(c3_lab, c3).arrange(DOWN, buff=0.18)
        card3.move_to(DOWN * 2.15)

        tau_note = MathTex(r"\tau = 2/\alpha\ \ \text{(fundamental QNM "
                           r"damping time)}", color=MUTED).scale(0.40)
        tau_note.next_to(card3, DOWN, buff=0.26)
        self._clear_banner(tau_note, above=card3)

        self.play(FadeIn(c0_lab), Write(c0), run_time=1.9)
        self.play(FadeIn(c0_note), run_time=0.6)
        self.wait(0.7)
        self.play(FadeIn(c1_lab), Write(c1), run_time=1.7)
        self.wait(0.6)
        self.play(FadeIn(c2_lab), Write(c2_row), run_time=2.0)
        self.play(FadeIn(c2_beta), run_time=0.6)
        self.wait(0.6)
        self.play(FadeIn(c3_lab), Write(c3), run_time=2.2)
        self.play(FadeIn(tau_note), run_time=0.7)
        self.wait(1.2)

        # Collapse: |F| is a sum of exponentially damped terms -> treat as
        # constant, leaving the bare sech envelope.
        self.play(FadeOut(VGroup(card0, card1, card2, tau_note)), run_time=0.7)
        self.play(card3.animate.move_to(UP * 0.95), run_time=0.9)

        approx = MathTex(r"\left|F\!\left(a,b;c;-e^{-\alpha(t-t_p)}\right)\right|"
                         r"\ \approx\ \text{const}", color=GREEN).scale(0.52)
        approx.next_to(card3, DOWN, buff=0.55)

        final = MathTex(r"|\mathcal{N}(t)| \propto "
                        r"\mathrm{sech}\!\left(\frac{t-t_p}{\tau}\right)",
                        color=AMBER).scale(0.86)
        final.next_to(approx, DOWN, buff=0.55)
        fbox = SurroundingRectangle(final, color=AMBER, buff=0.24,
                                    stroke_width=1.8, corner_radius=0.1)
        self._clear_banner(VGroup(final, fbox), above=approx)

        self.play(Write(approx), run_time=1.2)
        self.wait(0.5)
        self.play(Write(final), run_time=1.3)
        self.play(Create(fbox), run_time=0.5)

        self.wait(self.HOLD)
        self.play(FadeOut(VGroup(title, card3, approx, final, fbox)),
                  run_time=0.8)

    def beat_approximations(self):
        # The physical assumption underpinning the derivation. The paper
        # also makes a technical approximation (treating the hypergeometric
        # as constant); deliberately omitted here to keep one idea per beat.
        # (beat_derivation now clears its own objects.)
        title = Text("The key physical assumption", font="sans-serif",
                     color=INK, weight=BOLD).scale(0.60)
        title.to_edge(UP, buff=0.70)
        self.play(FadeIn(title, shift=DOWN * 0.12), run_time=0.9)

        # The physical assumption that makes the whole derivation possible:
        # a common source term across prograde overtones. Centred, one idea.
        statement = Paragraph(
            "Prograde QNMs share a common source term,",
            "largely independent of the overtone index n",
            font="monospace", color=INK, alignment="center",
            line_spacing=1.0).scale(0.40)
        statement.move_to(UP * 0.75)

        support = Text("— supported by studies of NR waveforms",
                       font="monospace", color=MUTED).scale(0.30)
        support.next_to(statement, DOWN, buff=0.42)

        self.play(FadeIn(statement, shift=UP * 0.10), run_time=1.5)
        self.wait(0.8)
        self.play(FadeIn(support), run_time=0.9)
        self.wait(1.0)

        result = MathTex(r"\Longrightarrow\quad |\mathcal{N}(t)| \propto "
                         r"\mathrm{sech}\!\left(\frac{t-t_p}{\tau}\right)",
                         color=AMBER).scale(0.78)
        result.next_to(support, DOWN, buff=0.75)
        box = SurroundingRectangle(result, color=AMBER, buff=0.24,
                                   stroke_width=1.8, corner_radius=0.1)
        self._clear_banner(VGroup(result, box), above=support)
        self.play(Write(result), run_time=1.3)
        self.play(Create(box), run_time=0.5)

        self.wait(self.HOLD)
        self.play(FadeOut(VGroup(title, statement, support, result, box)),
                  run_time=0.8)

    # ------------------------------------------------------------------
    # 3. Strip the QNMs  (~17 s)
    # ------------------------------------------------------------------
    def beat_filters(self):
        title = Text("Now strip the QNMs out", font="sans-serif",
                     color=INK, weight=BOLD).scale(0.60)
        title.to_edge(UP, buff=0.60)
        self.play(FadeIn(title, shift=DOWN * 0.12), run_time=0.9)

        sub = Text("rational filters remove QNM content without fitting any amplitudes",
                   font="monospace", color=MUTED).scale(0.30)
        sub.next_to(title, DOWN, buff=0.26)
        self.play(FadeIn(sub), run_time=0.8)

        ax = Axes(
            x_range=[0, 35, 10], y_range=[-3.2, 0.4, 1],
            x_length=8.0, y_length=2.9,
            axis_config={"stroke_color": MUTED, "stroke_width": 1.5,
                         "include_tip": False, "font_size": 20},
            x_axis_config={"numbers_to_include": []},
            y_axis_config={"numbers_to_include": []},
        ).shift(DOWN * 0.55)
        T_OFF = 15.0     # plot u = t + 15 so the y-axis sits at the left edge

        xticks = VGroup()
        for tval in (-15, -5, 5, 15, 20):
            lbl = MathTex(str(tval), color=MUTED).scale(0.40)
            lbl.next_to(ax.c2p(tval + T_OFF, -3.2), DOWN, buff=0.14)
            xticks.add(lbl)
        xlab = MathTex(r"(t-t_p)\ [M]", color=MUTED).scale(0.46)
        xlab.next_to(xticks, DOWN, buff=0.14)
        ylab = Text("log |Re N₂₂|", font="monospace", color=MUTED).scale(0.26)
        ylab.rotate(PI / 2).next_to(ax.y_axis, LEFT, buff=0.20)

        self.play(Create(ax), FadeIn(xticks), FadeIn(xlab), FadeIn(ylab),
                  run_time=1.1)

        # Filtered NR and filtered BOB: the point is that they COINCIDE.
        def filtered(u, phase=0.0):
            t = u - T_OFF
            base = -0.30 - 0.055 * (t + 15.0)
            osc = 0.42 * np.abs(np.cos(0.30 * t + phase))
            return base - 0.9 * (1.0 - osc)

        nr = ax.plot(lambda u: filtered(u), x_range=[0, 34.5, 0.08],
                     stroke_width=3.2, color=INK)
        bob = ax.plot(lambda u: filtered(u) + 0.055, x_range=[0, 34.5, 0.08],
                      stroke_width=3.0, color=ROSE, stroke_opacity=0.95)

        nr_lab = Text("filtered NR", font="monospace", color=INK).scale(0.28)
        nr_lab.next_to(ax.c2p(30, -0.55), RIGHT, buff=0.10).shift(LEFT * 1.5)
        bob_lab = Text("filtered BOB", font="monospace", color=ROSE).scale(0.28)
        bob_lab.next_to(nr_lab, DOWN, buff=0.14, aligned_edge=LEFT)

        self.play(Create(nr), run_time=1.6)
        self.play(FadeIn(nr_lab), run_time=0.5)
        self.play(Create(bob), run_time=1.6)
        self.play(FadeIn(bob_lab), run_time=0.5)

        punch = Text("what's left is the direct wave — and BOB already has it",
                     font="monospace", color=GREEN).scale(0.32)
        punch.next_to(xlab, DOWN, buff=0.30)
        self._clear_banner(punch, above=xlab)
        self.play(FadeIn(punch, shift=UP * 0.10), run_time=1.0)

        self.wait(self.HOLD)
        self.play(FadeOut(VGroup(title, sub, ax, xticks, xlab, ylab, nr, bob,
                                 nr_lab, bob_lab, punch)), run_time=0.8)

    # ------------------------------------------------------------------
    # 4. What the direct wave actually tracks  (~19 s)
    # ------------------------------------------------------------------
    def beat_what_it_tracks(self):
        title = Text("So what does the direct wave track?",
                     font="sans-serif", color=INK, weight=BOLD).scale(0.60)
        title.to_edge(UP, buff=0.60)
        self.play(FadeIn(title, shift=DOWN * 0.12), run_time=0.9)

        ax = Axes(
            x_range=[0, 1.0, 0.2], y_range=[0.0, 0.9, 0.2],
            x_length=7.4, y_length=3.2,
            axis_config={"stroke_color": MUTED, "stroke_width": 1.5,
                         "include_tip": False, "font_size": 20},
            x_axis_config={"numbers_to_include": [0.0, 0.2, 0.4, 0.6, 0.8],
                           "decimal_number_config": {"num_decimal_places": 1}},
            y_axis_config={"numbers_to_include": [0.0, 0.4, 0.8],
                           "decimal_number_config": {"num_decimal_places": 1}},
        ).shift(UP * 0.05)
        xlab = MathTex(r"\chi_f", color=MUTED).scale(0.56)
        xlab.next_to(ax.x_axis, DOWN, buff=0.20)
        ylab = MathTex(r"\omega\ [1/M]", color=MUTED).scale(0.46)
        ylab.rotate(PI / 2).next_to(ax.y_axis, LEFT, buff=0.20)

        self.play(Create(ax), FadeIn(xlab), FadeIn(ylab), run_time=1.1)

        # The paper distinguishes these with open circles vs crosses, since
        # the whole point is that they lie on top of each other.
        avg = VGroup(*[Circle(radius=0.058, stroke_color=INK, stroke_width=2.0,
                              fill_opacity=0).move_to(ax.c2p(c, _ph_omega_avg(c)))
                       for c in PLACEHOLDER_CHI])
        bobpk = VGroup(*[Cross(stroke_color=GREEN, stroke_width=2.0).scale(0.045)
                         .move_to(ax.c2p(c, _ph_omega_avg(c) + 0.012))
                         for c in PLACEHOLDER_CHI])
        # NOT ROSE here: a warm point on a maroon ground has adequate
        # lightness contrast but almost no hue separation, and reads as
        # invisible. Cyan separates cleanly.
        omh = VGroup(*[Dot(ax.c2p(c, _ph_omega_H(c)), radius=0.045,
                           color=HORIZON) for c in PLACEHOLDER_CHI])

        self.play(LaggedStart(*[GrowFromCenter(d) for d in avg],
                              lag_ratio=0.03), run_time=1.6)
        avg_lab = Text("BOB direct wave frequency", font="monospace",
                       color=INK).scale(0.28)
        avg_lab.next_to(ax.c2p(0.30, _ph_omega_avg(0.30)), UP, buff=0.28)
        self.play(FadeIn(avg_lab), run_time=0.6)

        self.play(LaggedStart(*[GrowFromCenter(d) for d in bobpk],
                              lag_ratio=0.03), run_time=1.2)
        bob_lab = Text("BOB News peak frequency", font="monospace",
                       color=GREEN).scale(0.26)
        bob_lab.next_to(avg_lab, UP, buff=0.14)
        self.play(FadeIn(bob_lab), run_time=0.6)
        self.wait(0.8)

        self.play(LaggedStart(*[GrowFromCenter(d) for d in omh],
                              lag_ratio=0.03), run_time=1.4)
        omh_lab = MathTex(r"2\,\Omega_H", color=HORIZON).scale(0.56)
        omh_lab.next_to(ax.c2p(0.93, _ph_omega_H(0.93)), RIGHT, buff=0.12)
        self.play(FadeIn(omh_lab), run_time=0.6)

        cross = DashedLine(ax.c2p(0.70, 0.0), ax.c2p(0.70, 0.9),
                           stroke_color=AMBER, stroke_width=1.8,
                           dash_length=0.08)
        punch = Text("largely uncorrelated with the horizon frequency — they happen to coincide near χ_f ≈ 0.7",
                     font="monospace", color=GREEN).scale(0.29)
        punch.next_to(xlab, DOWN, buff=0.30)
        self._clear_banner(punch, above=xlab)

        self.play(Create(cross), run_time=0.7)
        self.play(FadeIn(punch, shift=UP * 0.10), run_time=1.0)

        self.wait(self.HOLD)
        self.play(FadeOut(VGroup(title, ax, xlab, ylab, avg, bobpk, omh,
                                 avg_lab, bob_lab, omh_lab, cross, punch)),
                  run_time=0.8)

    # ------------------------------------------------------------------
    # 5. Close  (~9 s)
    # ------------------------------------------------------------------
    def beat_close(self):
        # Wording tracks the paper's Discussion, including its hedges. The
        # PT qualifier matters: the extension to Kerr is stated there as a
        # suggestion, not a result.
        headline = Paragraph("BOB's amplitude can be derived analytically",
                             "from black-hole perturbation theory",
                             font="sans-serif", color=INK, weight=BOLD,
                             alignment="center", line_spacing=0.85).scale(0.56)
        headline.move_to(UP * 1.45)

        qualifier = Text("(Sasaki–Nakamura formalism, Pöschl–Teller potential)",
                         font="monospace", color=MUTED).scale(0.28)
        qualifier.next_to(headline, DOWN, buff=0.24)

        points = VGroup(
            Text("the QNM pole sum resums, to a very good approximation,",
                 font="monospace", color=AMBER).scale(0.30),
            Text("to a hyperbolic secant envelope",
                 font="monospace", color=AMBER).scale(0.30),
            Text("suggests BOB captures both QNM and direct-wave content",
                 font="monospace", color=GREEN).scale(0.30),
            Text("using only  M_f,  χ_f,  A_p,  Ω_0",
                 font="monospace", color=MUTED).scale(0.30),
        ).arrange(DOWN, buff=0.22)
        points.next_to(qualifier, DOWN, buff=0.50)

        cite = Text("Kankani & McWilliams — arXiv:2603.15474",
                    font="monospace", color=MUTED).scale(0.30)
        cite.next_to(points, DOWN, buff=0.60)
        self._clear_banner(cite, above=points)

        self.play(Write(headline), run_time=1.7)
        self.play(FadeIn(qualifier), run_time=0.7)
        self.wait(0.4)
        self.play(LaggedStart(*[FadeIn(p, shift=UP * 0.08) for p in points],
                              lag_ratio=0.45), run_time=2.2)
        self.wait(0.6)
        self.play(FadeIn(cite, shift=UP * 0.1), run_time=0.8)
        self.wait(3.0)
        self.play(FadeOut(VGroup(headline, qualifier, points, cite)), run_time=0.9)
