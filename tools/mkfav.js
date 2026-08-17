// Generates the site favicon: the chirp mark, simplified until it survives
// 16px. The chirp is no longer drawn on the homepage (replaced by the split
// black-hole figure), and og-home.jpg was regenerated from that figure on
// 2026-08-17 -- so this favicon is the only place the chirp still appears.
// If the mark is ever retired, this generator goes with it.
const fs = require('fs');
const OUT = process.argv[2];

const N = 96, tm = 0.70, x0 = 3.2, x1 = 28.8, mid = 16, A = 9.6;
let d = '';
for (let i = 0; i <= N; i++) {
  const t = i / N;
  const ph = 2 * Math.PI * (1.35 * t + 2.15 * Math.pow(t, 3.4));
  const env = t < tm ? Math.pow(t / tm, 1.9) : Math.exp(-(t - tm) * 11);
  d += (i ? 'L' : 'M') + (x0 + (x1 - x0) * t).toFixed(1) + ' ' +
       (mid - env * A * Math.sin(ph)).toFixed(1);
}

// Single quotes throughout so the whole thing can sit inside an HTML
// double-quoted href with no escaping beyond the URL-unsafe characters.
const svg =
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>" +
  "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='0'>" +
  "<stop offset='0' stop-color='#7C83F0'/>" +
  "<stop offset='.55' stop-color='#E070B4'/>" +
  "<stop offset='1' stop-color='#F0B457'/>" +
  "</linearGradient></defs>" +
  "<rect width='32' height='32' rx='7' fill='#0E141F'/>" +
  "<path d='" + d + "' fill='none' stroke='url(#g)' stroke-width='2.7' " +
  "stroke-linecap='round' stroke-linejoin='round'/></svg>";

fs.writeFileSync(OUT + '/favicon.svg', svg);

// Only what actually breaks an HTML attribute or a URL needs escaping;
// over-encoding (encodeURIComponent) doubles the size for no benefit.
const uri = 'data:image/svg+xml,' +
  svg.replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E');
fs.writeFileSync(OUT + '/favicon-uri.txt', uri);
console.log('svg bytes:', svg.length, ' data uri bytes:', uri.length);
