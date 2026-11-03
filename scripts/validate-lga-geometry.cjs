/**
 * Integrity checks for the generated LGA geometry.
 *
 * Verifies: 774 LGAs across 37 states, every path parses, all coordinates sit
 * inside the viewBox, every label anchor falls inside its own polygon, and each
 * state has a base outline.
 *
 * Usage: node scripts/validate-lga-geometry.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let src = fs.readFileSync(path.join(ROOT, 'constants/nigeriaLgaGeometries.ts'), 'utf8');
src = src
  .replace(/export interface[\s\S]*?\n}\n/, '')
  .replace(/export const (\w+)\s*:\s*[^=]+=/g, 'const $1 =')
  .replace(/export const/g, 'const');

const { NIGERIA_LGA_GEOMETRIES: GEO, NIGERIA_LGA_STATE_OUTLINES: OUTLINES } = new Function(
  `${src}\nreturn { NIGERIA_LGA_GEOMETRIES, NIGERIA_LGA_STATE_OUTLINES };`
)();

const W = 680;
const H = 460;
const errors = [];
let states = 0;
let lgas = 0;
let vertices = 0;

function parsePath(d) {
  const rings = [];
  let ring = null;
  const re = /([MLZ])\s*(-?\d+(?:\.\d+)?)?\s*(-?\d+(?:\.\d+)?)?/gi;
  let m;
  while ((m = re.exec(d))) {
    const cmd = m[1].toUpperCase();
    if (cmd === 'M') {
      if (ring && ring.length) rings.push(ring);
      ring = [[Number(m[2]), Number(m[3])]];
    } else if (cmd === 'L') {
      if (!ring) { errors.push('L before M'); return []; }
      ring.push([Number(m[2]), Number(m[3])]);
    } else if (cmd === 'Z') {
      if (ring && ring.length) rings.push(ring);
      ring = null;
    }
  }
  if (ring && ring.length) rings.push(ring);
  return rings;
}

function inside(rings, x, y) {
  let hit = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
  }
  return hit;
}

for (const [state, entries] of Object.entries(GEO)) {
  states++;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [name, g] of Object.entries(entries)) {
    lgas++;
    if (!g.label || g.label !== name) errors.push(`${state}/${name}: label mismatch`);
    if (!(g.area > 0)) errors.push(`${state}/${name}: non-positive area`);

    const rings = parsePath(g.path);
    if (!rings.length) { errors.push(`${state}/${name}: empty path`); continue; }

    for (const ring of rings) {
      if (ring.length < 3) errors.push(`${state}/${name}: ring with ${ring.length} points`);
      for (const [x, y] of ring) {
        vertices++;
        if (!Number.isFinite(x) || !Number.isFinite(y)) errors.push(`${state}/${name}: non-finite coord`);
        if (x < -0.1 || x > W + 0.1 || y < -0.1 || y > H + 0.1) {
          errors.push(`${state}/${name}: coord out of viewBox (${x}, ${y})`);
        }
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }

    if (!inside(rings, g.labelX, g.labelY)) {
      errors.push(`${state}/${name}: label point (${g.labelX},${g.labelY}) outside polygon`);
    }
  }
  if (maxX - minX <= 0 || maxY - minY <= 0) errors.push(`${state}: degenerate bbox`);
}

let outlines = 0;
for (const state of Object.keys(GEO)) {
  const d = OUTLINES[state];
  if (!d) { errors.push(`${state}: missing state outline`); continue; }
  const rings = parsePath(d);
  if (!rings.length) { errors.push(`${state}: empty state outline`); continue; }
  outlines++;
  for (const ring of rings) {
    for (const [x, y] of ring) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) errors.push(`${state}: outline non-finite coord`);
      if (x < -8 || x > W + 8 || y < -8 || y > H + 8) {
        errors.push(`${state}: outline coord far outside viewBox (${x}, ${y})`);
      }
    }
  }
}

console.log(`states=${states} lgas=${lgas} vertices=${vertices} outlines=${outlines}`);
if (states !== 37 || lgas !== 774 || outlines !== 37) {
  errors.push(`count mismatch: expected 37 states / 774 LGAs / 37 outlines`);
}

if (errors.length) {
  console.error(`${errors.length} validation error(s):`);
  errors.slice(0, 40).forEach((e) => console.error('  -', e));
  process.exit(1);
}
console.log('LGA GEOMETRY VALIDATION PASSED');
