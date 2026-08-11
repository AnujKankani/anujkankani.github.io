"""BOB in ~60 seconds -- the physical picture and where the equations come from.

Rendered length is 61.2 s (assets/bob-overview.mp4). It began as a ~30 s cut;
each beat now holds at its end rather than cutting straight on, which is what
made the equations readable.

Three beats:
  1. The merger is the gap between two solved regimes.
  2. Perturbed null geodesics at the light ring -> the sech AMPLITUDE.
  3. The implicit rotating source (rigid rotator) -> the News ties A to Omega,
     which integrates to the BOB FREQUENCY.

Assumes the viewer knows what QNMs are.

Render:
    MANIM=/home/anuj/anaconda3/envs/manim_env/bin/manim
    $MANIM -qh animations/bob_overview.py BOBOverview     # 1080p60
    $MANIM -ql animations/bob_overview.py BOBOverview     # fast preview

Physics:
  McWilliams, PRL 122, 191102 (2019), arXiv:1810.00040 -- Eqs. (1)-(7).
      congruence -> dA ∝ cosh[γ(t-tp)] -> A = Ap sech[γ(t-tp)]
  Baker et al., PRD 78, 044046 (2008), arXiv:0805.1428 -- Eqs. (11), (15).
      implicit rotating source; ξ ≡ dJ/dΩ ≈ const  =>  A² ≈ 16πξ Ω Ω̇
  Kankani & McWilliams, arXiv:2510.25012.
See papers/BOB/. Palette matches tools/_shared.css.
"""

from manim import *
import numpy as np

# ---- palette: saturated cyan ground, accents lifted to suit it ----------
# The ground is bright, so every accent is lightened from the tools' values
# to hold >=4.5 contrast against it. Measured against #005C77:
#   INK 6.87   MUTED 4.67   ACCENT 4.79   AMBER 5.33   CYAN 5.83   ROSE 4.73
# The ground is itself cyan, so the null rays use a pale sky rather than the
# tools' #6FD3F2, which would vanish into it.
BG = "#005C77"       # saturated cyan
INK = "#F2F5FA"
MUTED = "#C2CDDD"
ACCENT = "#CBCEFC"   # indigo, lifted
AMBER = "#FBD48F"    # lifted; keeps the boxed equations crisp
CYAN = "#BFE9FF"     # pale sky -- separates from the cyan ground
ROSE = "#FDBCCB"     # lifted

config.background_color = BG

# ---- BOB parameters (geometrized units, G = c = M = 1) ----
TAU_D = 11.0     # damping time tau = 1/gamma of the fundamental QNM
TP = 0.0         # time of peak amplitude
OM_QNM = 0.35    # asymptotic orbital frequency, omega_QNM / m
OM_0 = 0.18      # orbital frequency at attachment
T0 = -26.0       # attachment time


def bob_amplitude(t):
    """A = A_p sech[(t - t_p)/tau]   -- arXiv:1810.00040 Eq. (4)."""
    return 1.0 / np.cosh((np.asarray(t, dtype=float) - TP) / TAU_D)


def bob_omega(t):
    """Omega(t) from integrating A^2 ∝ Omega Omega-dot -- Eq. (7)."""
    k = (OM_QNM**4 - OM_0**4) / (1.0 - np.tanh((T0 - TP) / TAU_D))
    inner = OM_0**4 + k * (np.tanh((np.asarray(t, dtype=float) - TP) / TAU_D)
                           - np.tanh((T0 - TP) / TAU_D))
    return np.power(np.clip(inner, 1e-12, None), 0.25)


# Precompute the News phase once: phi = int omega dt, with omega = 2 Omega.
_GRID = np.linspace(T0 - 40.0, 70.0, 9000)
_PHASE = np.concatenate([[0.0],
                         np.cumsum(2.0 * bob_omega(_GRID[1:]) * np.diff(_GRID))])


def bob_news(t):
    """Re(News) = A cos(phi) -- the quantity BOB's amplitude describes."""
    t = np.asarray(t, dtype=float)
    return bob_amplitude(t) * np.cos(np.interp(t, _GRID, _PHASE))


class BOBOverview(Scene):
    """~30 s: the merger gap, the amplitude, and the frequency."""

    # Beat-boundary hold. Long enough to read the result before it clears.
    HOLD = 2.4

    def construct(self):
        self.beat_gap()
        self.beat_amplitude()
        self.beat_frequency()
        self.beat_summary()

    # ------------------------------------------------------------------
    # 1. Title card: pose the question  (~9 s)
    # ------------------------------------------------------------------
    def beat_gap(self):
        question = Text("How do we model the merger–ringdown?",
                        font="sans-serif", color=INK, weight=BOLD).scale(0.72)
        question.move_to(UP * 1.75)

        # Only the merger-ringdown: BOB does not model the inspiral, so
        # showing a long inspiral here would misrepresent the model.
        axes = Axes(
            x_range=[T0, 55, 30], y_range=[-1.25, 1.25, 1],
            x_length=8.6, y_length=2.5,
            axis_config={"stroke_color": MUTED, "stroke_width": 1.4,
                         "include_ticks": False, "include_tip": False},
        ).move_to(DOWN * 0.35)

        wave = axes.plot(lambda t: float(bob_news(t)),
                         x_range=[T0, 53, 0.1], stroke_width=3.2, color=ACCENT)

        answer = VGroup(
            Text("Introducing the Backwards One Body (BOB) model!",
                 font="sans-serif", color=INK, weight=BOLD).scale(0.50),
            VGroup(
                Text("only 4 parameters:", font="monospace", color=MUTED).scale(0.32),
                MathTex(r"M_f,\ \chi_f,\ A_p,\ \Omega_0",
                        color=AMBER).scale(0.62),
            ).arrange(RIGHT, buff=0.26),
        ).arrange(DOWN, buff=0.24)
        answer.next_to(axes, DOWN, buff=0.55)

        self.play(Write(question), run_time=1.6)
        self.wait(0.6)
        self.play(Create(wave), run_time=2.4)
        self.wait(0.5)
        self.play(FadeIn(answer, shift=UP * 0.12), run_time=1.1)

        # `axes` is only a coordinate frame for plotting `wave` -- it is never
        # added to the scene, so there is nothing to fade out here. (Calling
        # FadeOut on it would add it implicitly first, flashing the axes on.)
        self.wait(self.HOLD)
        self.play(FadeOut(VGroup(question, wave, answer)), run_time=0.9)

    # ------------------------------------------------------------------
    # 2. Perturbed null geodesics -> the AMPLITUDE  (~12 s)
    # ------------------------------------------------------------------
    def beat_amplitude(self):
        title = Text("1. Amplitude — from perturbed null geodesics",
                     font="sans-serif", color=INK, weight=BOLD).scale(0.52)
        title.to_edge(UP, buff=0.45)
        self.play(FadeIn(title, shift=DOWN * 0.2), run_time=0.8)

        centre = LEFT * 3.55 + DOWN * 0.45
        hole = Circle(radius=0.40, fill_color="#05070c", fill_opacity=1,
                      stroke_color="#33405a", stroke_width=2).move_to(centre)
        ring = DashedVMobject(
            Circle(radius=1.15, stroke_color=AMBER, stroke_width=2.6),
            num_dashes=52).move_to(centre)
        ring_lab = Text("light ring", font="monospace", color=AMBER).scale(0.27)
        ring_lab.next_to(ring, DR, buff=0.02).shift(RIGHT * 0.30)

        self.play(FadeIn(hole), Create(ring), FadeIn(ring_lab), run_time=1.0)
        self.wait(0.3)

        # A tight bundle of null rays launched together ON the light ring.
        # Sweep only the upper-right arc so the rays never cross the labels.
        th_start = 0.92 * PI
        offsets = np.linspace(-0.07, 0.07, 5)   # tiny initial spread

        def ray_path(dr0, turns=0.40, grow=2.6):
            """Start on the light ring; deviation grows as e^{gamma t}."""
            pts = []
            for s in np.linspace(0, 1, 120):
                r = 1.15 + dr0 * np.exp(grow * s)      # Lyapunov divergence
                th = th_start - turns * TAU * s
                pts.append(centre + np.array([r * np.cos(th), r * np.sin(th), 0]))
            return pts

        bundle = VGroup()
        for dr0 in offsets:
            col = CYAN if dr0 >= 0 else ROSE
            bundle.add(VMobject(stroke_color=col, stroke_width=2.2,
                                stroke_opacity=0.9).set_points_smoothly(ray_path(dr0)))

        # The perturber spirals in and CROSSES the light ring. That crossing
        # is what sources the null congruence -- so show it happening.
        launch = centre + 1.15 * np.array([np.cos(th_start), np.sin(th_start), 0])

        infall_pts = []
        for s in np.linspace(0, 1, 140):
            r = 2.15 - 1.00 * s                       # spirals inward to r_LR
            th = th_start + 0.85 * TAU * (1 - s)      # trailing in phase
            infall_pts.append(centre + np.array([r * np.cos(th), r * np.sin(th), 0]))
        infall = VMobject(stroke_color=ACCENT, stroke_width=2.0,
                          stroke_opacity=0.55).set_points_smoothly(infall_pts)

        perturber = Dot(radius=0.075, color=ACCENT).move_to(infall_pts[0])
        pert_lab = Text("perturber", font="monospace", color=ACCENT).scale(0.25)
        pert_lab.add_updater(lambda m: m.next_to(perturber, UR, buff=0.10))

        self.play(FadeIn(perturber), FadeIn(pert_lab), run_time=0.7)
        self.play(MoveAlongPath(perturber, infall), Create(infall),
                  run_time=3.4, rate_func=rate_functions.ease_in_sine)
        pert_lab.clear_updaters()

        # Crossing the light ring: flash, then the rays leave from that point.
        cross = Flash(launch, color=AMBER, line_length=0.22,
                      num_lines=14, flash_radius=0.32, run_time=0.9)
        cross_lab = Text("crosses the light ring", font="monospace",
                         color=AMBER).scale(0.25)
        cross_lab.next_to(ring, DOWN, buff=0.72)

        self.play(FadeOut(pert_lab), run_time=0.25)
        self.play(cross, FadeIn(cross_lab), run_time=1.0)
        self.wait(0.5)

        start_lab = Text("sourcing a bundle of null rays", font="monospace",
                         color=MUTED).scale(0.25)
        start_lab.next_to(ring, DOWN, buff=0.72)

        self.play(FadeOut(cross_lab), FadeIn(start_lab), run_time=0.5)
        self.play(*[Create(r) for r in bundle], run_time=3.2)
        self.wait(0.5)

        # Name the mechanism: the orbit is unstable, so the bundle diverges.
        self.play(FadeOut(start_lab), run_time=0.35)
        gamma_lab = VGroup(
            Text("unstable orbit — the bundle spreads", font="monospace",
                 color=CYAN).scale(0.24),
            MathTex(r"\delta r \sim e^{\gamma t}", color=CYAN).scale(0.55),
        ).arrange(DOWN, buff=0.10).next_to(ring, DOWN, buff=0.68)

        self.play(FadeIn(gamma_lab), run_time=0.9)
        self.wait(0.9)

        # The congruence's cross-section grows as cosh -> the amplitude is sech.
        chain = VGroup(
            Text("bundle cross-section", font="monospace", color=MUTED).scale(0.28),
            MathTex(r"d\mathcal{A} \propto \cosh\!\left[\gamma\,(t-t_p)\right]",
                    color=INK).scale(0.68),
            Text("transport equation", font="monospace", color=MUTED).scale(0.28),
            MathTex(r"k^{\mu}\partial_{\mu}\!\left(d\mathcal{A}\,A\right) = 0",
                    color=INK).scale(0.68),
        ).arrange(DOWN, buff=0.20)
        chain.move_to(RIGHT * 2.75 + UP * 0.55)

        self.play(FadeIn(chain[0]), Write(chain[1]), run_time=1.6)
        self.wait(0.8)
        self.play(FadeIn(chain[2]), Write(chain[3]), run_time=1.5)
        self.wait(0.8)

        amp_eq = MathTex(r"A = A_p\,\mathrm{sech}\!\left[\frac{t-t_p}{\tau}\right]",
                         color=AMBER).scale(0.88)
        amp_eq.move_to(RIGHT * 2.75 + DOWN * 1.35)
        box = SurroundingRectangle(amp_eq, color=AMBER, buff=0.22,
                                   stroke_width=1.8, corner_radius=0.1)

        self.play(Write(amp_eq), run_time=1.4)
        self.play(Create(box), run_time=0.6)

        self.wait(self.HOLD)
        self.amp_keep = VGroup(amp_eq, box)
        self.play(
            FadeOut(VGroup(title, hole, ring, ring_lab, gamma_lab, perturber,
                           infall, bundle, chain)),
            self.amp_keep.animate.scale(0.78).to_corner(UL, buff=0.55),
            run_time=1.0,
        )

    # ------------------------------------------------------------------
    # 3. Implicit rotating source -> the FREQUENCY  (~12 s)
    # ------------------------------------------------------------------
    def beat_frequency(self):
        title = Text("2. Frequency", font="sans-serif", color=INK,
                     weight=BOLD).scale(0.52)
        title.to_edge(UP, buff=0.45).shift(RIGHT * 1.2)
        self.play(FadeIn(title, shift=DOWN * 0.2), run_time=0.8)

        # The News ties the amplitude to the frequency; xi = dJ/dOmega is
        # ~constant through merger-ringdown, which is what closes the ODE.
        # Wording: the News does not "carry" J -- it IS the radiative field
        # (N = h-dot), and the angular momentum FLUX is quadratic in it
        # (Baker et al. 2008 Eq. 11: J-dot ~ A^2 / 16 pi Omega).
        news = VGroup(
            Text("angular momentum flux", font="monospace",
                 color=MUTED).scale(0.27),
            MathTex(r"|\mathcal{N}|^{2} \;\approx\; 16\pi\,\xi\;\Omega\,\dot{\Omega}",
                    color=INK).scale(0.80),
            MathTex(r"\xi \equiv \frac{dJ}{d\Omega} \approx \text{const}",
                    color=CYAN).scale(0.60),
        ).arrange(DOWN, buff=0.20)
        news.move_to(RIGHT * 2.4 + UP * 0.95)

        self.play(FadeIn(news[0]), Write(news[1]), run_time=1.7)
        self.wait(0.8)
        self.play(Write(news[2]), run_time=1.2)
        self.wait(0.8)

        # Substitute the sech amplitude, separate variables, integrate.
        sub = Text("substitute A, separate, integrate", font="monospace",
                   color=MUTED).scale(0.27)
        sub.next_to(news, DOWN, buff=0.32)
        self.play(FadeIn(sub), run_time=0.9)
        self.wait(0.4)

        om_eq = MathTex(
            r"\Omega = \left\{\Omega_0^{4} + k\!\left[\tanh\!\left(\frac{t-t_p}{\tau}\right)"
            r"-\tanh\!\left(\frac{t_0-t_p}{\tau}\right)\right]\right\}^{1/4}",
            color=AMBER).scale(0.60)
        om_eq.next_to(sub, DOWN, buff=0.32)
        om_box = SurroundingRectangle(om_eq, color=AMBER, buff=0.20,
                                      stroke_width=1.8, corner_radius=0.1)

        self.play(Write(om_eq), run_time=2.0)
        self.play(Create(om_box), run_time=0.6)
        self.wait(0.8)

        # What that equation DOES: a monotonic sweep from the inspiral
        # frequency up to the ringdown value. Draw it as the result.
        # y_axis hidden: the two dashed asymptotes carry the scale, and a
        # vertical axis line through the curve is just noise here.
        plot = Axes(
            x_range=[T0, 55, 30], y_range=[0.12, 0.40, 0.1],
            x_length=4.3, y_length=2.4,
            axis_config={"stroke_color": MUTED, "stroke_width": 1.3,
                         "include_ticks": False, "include_tip": False},
            y_axis_config={"stroke_opacity": 0.0},
        ).move_to(LEFT * 3.5 + DOWN * 0.55)

        qnm_line = DashedLine(
            plot.c2p(T0, OM_QNM), plot.c2p(54, OM_QNM),
            stroke_color=CYAN, stroke_width=1.5, dash_length=0.07)
        qnm_lab = MathTex(r"\Omega_{\rm QNM}", color=CYAN).scale(0.48)
        qnm_lab.next_to(plot.c2p(54, OM_QNM), RIGHT, buff=0.10)

        om0_line = DashedLine(
            plot.c2p(T0, OM_0), plot.c2p(54, OM_0),
            stroke_color=MUTED, stroke_width=1.2, dash_length=0.07,
            stroke_opacity=0.6)
        om0_lab = MathTex(r"\Omega_{0}", color=MUTED).scale(0.48)
        om0_lab.next_to(plot.c2p(T0, OM_0), LEFT, buff=0.10)

        curve = plot.plot(lambda t: float(bob_omega(t)),
                          x_range=[T0, 54, 0.4], stroke_width=3.2, color=AMBER)
        plot_lab = Text("frequency rises to the ringdown value",
                        font="monospace", color=MUTED).scale(0.25)
        plot_lab.next_to(plot, DOWN, buff=0.30)

        self.play(FadeIn(plot), FadeIn(om0_line), FadeIn(om0_lab),
                  FadeIn(qnm_line), FadeIn(qnm_lab), run_time=0.9)
        self.play(Create(curve), run_time=2.0)
        self.play(FadeIn(plot_lab), run_time=0.6)

        self.wait(self.HOLD)
        self.play(FadeOut(VGroup(title, news, sub, om_eq, om_box, plot, curve,
                                 qnm_line, qnm_lab, om0_line, om0_lab,
                                 plot_lab, self.amp_keep)),
                  run_time=0.9)

    # ------------------------------------------------------------------
    # 4. Summary: the two equations, and where to get the code
    # ------------------------------------------------------------------
    def beat_summary(self):
        title = Text("The Backwards One Body model", font="sans-serif",
                     color=INK, weight=BOLD).scale(0.62).to_edge(UP, buff=0.85)

        amp_lab = Text("amplitude", font="monospace", color=MUTED).scale(0.30)
        amp_eq = MathTex(r"A = A_p\,\mathrm{sech}\!\left[\frac{t-t_p}{\tau}\right]",
                         color=AMBER).scale(0.92)
        amp_row = VGroup(amp_lab, amp_eq).arrange(DOWN, buff=0.22)

        om_lab = Text("frequency", font="monospace", color=MUTED).scale(0.30)
        om_eq = MathTex(
            r"\Omega = \left\{\Omega_0^{4} + k\!\left[\tanh\!\left(\frac{t-t_p}{\tau}\right)"
            r"-\tanh\!\left(\frac{t_0-t_p}{\tau}\right)\right]\right\}^{1/4}",
            color=AMBER).scale(0.72)
        om_row = VGroup(om_lab, om_eq).arrange(DOWN, buff=0.22)

        eqs = VGroup(amp_row, om_row).arrange(DOWN, buff=0.62).move_to(UP * 0.15)

        self.play(FadeIn(title, shift=DOWN * 0.2), run_time=0.9)
        self.play(Write(amp_eq), FadeIn(amp_lab), run_time=1.5)
        self.wait(0.7)
        self.play(Write(om_eq), FadeIn(om_lab), run_time=2.0)
        self.wait(1.4)

        # The call to action.
        install = Text("pip install gwBOB", font="monospace",
                       color=INK).scale(0.52)
        install_box = SurroundingRectangle(install, color=MUTED, buff=0.28,
                                          stroke_width=1.4, corner_radius=0.12)
        install_grp = VGroup(install_box, install).to_edge(DOWN, buff=0.85)

        self.play(FadeIn(install_grp, shift=UP * 0.15), run_time=1.0)
        self.wait(2.2)
        self.play(FadeOut(VGroup(title, eqs, install_grp)), run_time=0.8)
