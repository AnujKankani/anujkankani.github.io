#!/usr/bin/env python3
"""Rasterise the favicon mark into favicon.ico at the repo root.

WHY THIS EXISTS. The page declares its icon as a `data:` URI so a visitor
fetches nothing but the font -- see tools/mkfav.js. But **Google Search cannot
use a data: URI favicon**, so search results showed the generic globe. Google
falls back to the well-known /favicon.ico path, so shipping that file fixes the
search result.

It costs visitors nothing: a browser that has already been given a valid
<link rel="icon"> never probes /favicon.ico. Measured on the real page -- the
only requests were the page, the two widget iframes and the images.

So the site deliberately carries the SAME mark twice, in two forms:
  * the data: URI in <head>  -> what browsers draw, zero requests
  * favicon.ico at the root  -> what Google Search crawls, never requested
Regenerate BOTH when the mark changes, or the tab and the search result will
show different logos.

Node cannot rasterise SVG, so this goes through headless Chrome. Run:
    node tools/mkfav.js <dir>        # emits favicon.svg + the data URI
    python3 tools/mkfavico.py <dir>  # emits favicon.ico here at the root
"""
import os, subprocess, sys, tempfile, http.server, socketserver, threading, functools

CHROME = os.environ.get(
    "CHROME", "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe")
# Rendered once at 192 and downsampled: one render, uniform stroke scaling.
RENDER = 192
SIZES = [(16, 16), (32, 32), (48, 48), (96, 96), (144, 144)]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main(svgdir):
    svg = os.path.join(svgdir, "favicon.svg")
    if not os.path.exists(svg):
        sys.exit("no favicon.svg in %s -- run tools/mkfav.js first" % svgdir)

    # The wrapper pins the 32-unit viewBox to an exact RENDER-px square and
    # keeps the page transparent, so everything outside the rounded plate
    # stays transparent in the .ico rather than turning white.
    with open(os.path.join(svgdir, "_wrap.html"), "w") as f:
        f.write("<!doctype html><meta charset='utf-8'>"
                "<style>html,body{margin:0;background:transparent}"
                "svg{display:block;width:%dpx;height:%dpx}</style>"
                "<body></body><script>fetch('favicon.svg').then(r=>r.text())"
                ".then(t=>{document.body.innerHTML=t});</script>"
                % (RENDER, RENDER))

    # Chrome will not read the SVG through file:// fetch(), so serve the dir.
    handler = functools.partial(http.server.SimpleHTTPRequestHandler,
                                directory=svgdir)
    with socketserver.TCPServer(("127.0.0.1", 0), handler) as srv:
        port = srv.server_address[1]
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        png = os.path.join(svgdir, "_raw.png")
        # Chrome writes Windows paths; hand it the UNC form of the temp dir.
        unc = "\\\\wsl.localhost\\Ubuntu" + png.replace("/", "\\")
        subprocess.run([CHROME, "--headless", "--disable-gpu",
                        "--hide-scrollbars", "--default-background-color=00000000",
                        "--screenshot=" + unc,
                        "--window-size=%d,%d" % (RENDER, RENDER),
                        "--virtual-time-budget=4000",
                        "http://127.0.0.1:%d/_wrap.html" % port],
                       check=True, capture_output=True)
        srv.shutdown()

    from PIL import Image
    im = Image.open(png).convert("RGBA")
    if im.getpixel((1, 1))[3] != 0:
        sys.exit("corner is not transparent -- the render lost its alpha")
    out = os.path.join(ROOT, "favicon.ico")
    im.save(out, format="ICO", sizes=SIZES)
    print("wrote", out, os.path.getsize(out), "bytes",
          "sizes:", [s[0] for s in SIZES])


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp())
