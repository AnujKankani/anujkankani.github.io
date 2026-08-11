# anujkankani.github.io

Anuj Kankani's academic site — gravitational-wave physics, PhD candidate at West Virginia University. Served by GitHub Pages from `main`.

Alongside the usual publications-and-CV pages it hosts **interactive physics widgets**: self-contained HTML files that run real calculations in the browser, with no install, no backend, and no runtime dependencies.

## The tools

| | |
|---|---|
| [`swsh-visualizer.html`](swsh-visualizer.html) | Spin-weighted spherical harmonics, s = −2 — the angular building blocks of a gravitational-wave signal. Re, Im, \|Y\| and \|Y\|² of ₋₂Y_ℓm drawn as a radius-deformed sphere, ℓ = 2…8. |
| [`geodesic-explorer.html`](geodesic-explorer.html) | Equatorial **Kerr** geodesics (Schwarzschild is the a = 0 case). RK4 integration of massive and null orbits beside a live effective-potential panel, with the horizon, photon orbit and ISCO tracking the spin. |

Each is one file with inline `<style>` and `<script>` and zero runtime fetches, so it can be opened directly, iframed, or saved and read offline. Both run standalone or embedded (`?embed=1`).

## Running it locally

```bash
python3 -m http.server 8000     # then open http://localhost:8000
```

A server rather than `file://`, because the homepage loads the tools through `<iframe>` and they read `location.search`.

## Development

There is no package manager and nothing to install for the site itself. `tools/` holds development-only tooling that never reaches the browser:

```bash
python3 tools/build.py           # inline tools/_shared.{css,js} into the tool pages
python3 tools/build.py --check   # exit 1 if any page is stale

NODE=/path/to/node
$NODE tools/test.js              # regression suite (physics, UI, rendering, layout)
```

`tools/build.py` inlines shared code at *build* time, so the committed pages stay self-contained — the constraint is about what a visitor's browser fetches, not about whether a generator exists.

The test suite exercises the actual functions inlined in the pages via a `vm` sandbox rather than copies of them, so a sign error introduced while refactoring a renderer fails the suite. It covers closed forms and landmark values, UI state driven through the real controls, rendering contracts, and the embed layout contract.

[`TOOLS.md`](TOOLS.md) documents how the widgets are built and the rules they hold to; [`CLAUDE.md`](CLAUDE.md) documents the site's conventions.

## Reuse

The physics in these widgets is standard and the implementations are checked against published closed forms, so they may be useful for teaching or for talks. No licence is attached yet — if you'd like to reuse or adapt one, please get in touch.

## Notes

The animations under `animations/` are [Manim](https://www.manim.community/) sources for paper explainers. Rendered video is not committed; two of the three still carry placeholder data and are marked as such on screen.
