/*
 * Generate a superellipse/squircle SVG mask data URL.
 *
 * Usage:
 *   node tools/generate-squircle-mask.mjs 4
 *
 * n=2 circle
 * n=4 classic squircle/superellipse
 * n=5 squarer/tensed
 */

const n = Number(process.argv[2] || 3);
const pointsPerQuadrant = 26;

const pts = [];
const total = pointsPerQuadrant * 4;

for (let i = 0; i < total; i += 1) {
  const t = (2 * Math.PI * i) / total;
  const c = Math.cos(t);
  const s = Math.sin(t);
  const x = Math.sign(c) * Math.abs(c) ** (2 / n);
  const y = Math.sign(s) * Math.abs(s) ** (2 / n);
  pts.push([50 + 50 * x, 50 + 50 * y]);
}

const d = `M ${pts.map(([x, y]) => `${x.toFixed(3)} ${y.toFixed(3)}`).join(" L ")} Z`;
const svg = `<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><path d='${d}' fill='black'/></svg>`;
const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

console.log(url);
