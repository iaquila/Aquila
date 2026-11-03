/**
 * Generates real LGA boundary geometry for all 774 Nigerian Local Government Areas.
 *
 * Source: geoBoundaries gbOpen NGA ADM2 (sourced from GRID3), CC BY 4.0.
 *   https://www.geoboundaries.org/api/current/gbOpen/NGA/ADM2/
 *
 * Pipeline: GeoJSON -> spatial join to ADM1 states -> name-match to the app's
 * canonical LGA list -> Web Mercator -> per-state fit into a fixed viewBox ->
 * simplified SVG path.
 *
 * Usage: node scripts/build-lga-geometry.cjs
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const CACHE = path.join(__dirname, '.cache');
const OUT = process.env.LGA_OUT || path.join(ROOT, 'constants', 'nigeriaLgaGeometries.ts');
const CANONICAL_SRC = path.join(ROOT, 'constants', 'nigeriaLgasData.ts');

const SOURCES = {
  adm1: 'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/NGA/ADM1/geoBoundaries-NGA-ADM1_simplified.geojson',
  // Full-resolution ADM2: we simplify ourselves so every LGA is reduced by the
  // same rule. The pre-simplified variant carries topology gaps between units.
  adm2: 'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/NGA/ADM2/geoBoundaries-NGA-ADM2.geojson',
};

const VIEW_W = 680;
const VIEW_H = 460;
const PAD = 24;
const MAX_RING_POINTS = Number(process.env.LGA_MAX_POINTS || 44);
const MIN_TOLERANCE = Number(process.env.LGA_MIN_TOL || 0.12);

// geoBoundaries ADM1 labels differ from the app's state labels.
const STATE_ALIAS = { 'Abuja Federal Capital Territory': 'FCT' };

// geoBoundaries ADM2 spellings that differ from the canonical app list.
// Everything else resolves by exact/normalised match or edit distance <= 2.
const LGA_ALIAS = {
  'Obi Nwga': 'Obioma Ngwa',
  'Osisioma Ngwa': 'Osisioma',
  'Municipal Area Council': 'Municipal',
  'Wasagu-Danko': 'Danko/Wasagu',
  Bagudu: 'Bagudo',
};

// ---------------------------------------------------------------------------
// Fetch / cache
// ---------------------------------------------------------------------------
function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlinkSync(dest);
          return download(res.headers.location, dest).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(dest);
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      })
      .on('error', (err) => {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(err);
      });
  });
}

async function loadSource(name) {
  fs.mkdirSync(CACHE, { recursive: true });
  const file = path.join(CACHE, `${name}.geojson`);
  if (!fs.existsSync(file) || fs.statSync(file).size < 1024) {
    process.stdout.write(`downloading ${name}...\n`);
    await download(SOURCES[name], file);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// ---------------------------------------------------------------------------
// Canonical LGA list (SSOT lives in the app)
// ---------------------------------------------------------------------------
function readCanonical() {
  const src = fs.readFileSync(CANONICAL_SRC, 'utf8');
  const out = {};
  const blockRe = /"([^"]+)":\s*\[([\s\S]*?)\]/g;
  let m;
  while ((m = blockRe.exec(src))) {
    const items = [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    if (items.length) out[m[1]] = items;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------
const polygonsOf = (geom) => (geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates);

function ringContains(ring, x, y) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function polygonContains(rings, x, y) {
  if (!ringContains(rings[0], x, y)) return false;
  for (let i = 1; i < rings.length; i++) if (ringContains(rings[i], x, y)) return false;
  return true;
}

function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return Math.abs(a / 2);
}

function ringCentroid(ring) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    a += f;
    cx += (ring[j][0] + ring[i][0]) * f;
    cy += (ring[j][1] + ring[i][1]) * f;
  }
  if (Math.abs(a) < 1e-12) return [ring[0][0], ring[0][1]];
  return [cx / (3 * a), cy / (3 * a)];
}

/** Widest interior span across horizontal scanlines — robust label anchor. */
function interiorPoint(rings) {
  const outer = rings[0];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of outer) {
    if (p[0] < minX) minX = p[0];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  let best = null;
  const steps = 11;
  for (let s = 1; s < steps; s++) {
    const y = minY + ((maxY - minY) * s) / steps;
    const xs = [];
    for (const ring of rings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const yi = ring[i][1], yj = ring[j][1];
        if (yi > y !== yj > y) xs.push(((ring[j][0] - ring[i][0]) * (y - yi)) / (yj - yi) + ring[i][0]);
      }
    }
    if (xs.length < 2) continue;
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const span = xs[i + 1] - xs[i];
      if (!best || span > best.span) best = { span, x: (xs[i] + xs[i + 1]) / 2, y };
    }
  }
  if (best) return [best.x, best.y];
  return ringCentroid(outer);
}

function representativePoint(geom) {
  const polys = polygonsOf(geom);
  let bestRings = polys[0];
  let bestArea = ringArea(bestRings[0]);
  for (const rings of polys) {
    const a = ringArea(rings[0]);
    if (a > bestArea) { bestArea = a; bestRings = rings; }
  }
  return interiorPoint(bestRings);
}

// ---------------------------------------------------------------------------
// State assignment (ADM2 has no parent field, so spatial-join against ADM1)
// ---------------------------------------------------------------------------
function buildStateIndex(adm1) {
  return adm1.features.map((f) => ({ name: f.properties.shapeName, polygons: polygonsOf(f.geometry) }));
}

function stateFor(geom, states) {
  const pt = representativePoint(geom);
  for (const s of states) {
    for (const rings of s.polygons) if (polygonContains(rings, pt[0], pt[1])) return s.name;
  }
  for (const rings of polygonsOf(geom)) {
    for (const p of rings[0]) {
      for (const s of states) for (const sr of s.polygons) if (polygonContains(sr, p[0], p[1])) return s.name;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Name matching
// ---------------------------------------------------------------------------
const normalize = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\(.*?\)/g, ' ')
    .replace(/\blocal government area\b/g, ' ')
    .replace(/\blga\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function editDistance(a, b) {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

const fuzzyMatches = [];

function matchName(geoName, canonical, state) {
  const byNorm = new Map(canonical.map((c) => [normalize(c), c]));
  const alias = LGA_ALIAS[geoName];
  if (alias && canonical.includes(alias)) return alias;

  const n = normalize(geoName);
  if (byNorm.has(n)) return byNorm.get(n);

  let best = null;
  let bestD = Infinity;
  for (const [cn, original] of byNorm) {
    const d = editDistance(n, cn);
    if (d < bestD) { bestD = d; best = original; }
  }
  if (bestD <= 2) {
    fuzzyMatches.push(`${state}: "${geoName}" -> "${best}" (edit distance ${bestD})`);
    return best;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Projection + simplification
// ---------------------------------------------------------------------------
const mercator = (lon, lat) => [
  (lon * Math.PI) / 180,
  Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)),
];

function perpDistance(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
}

function douglasPeucker(points, tolerance) {
  if (points.length < 3) return points;
  let maxD = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDistance(points[i], points[0], points[points.length - 1]);
    if (d > maxD) { maxD = d; index = i; }
  }
  if (maxD <= tolerance) return [points[0], points[points.length - 1]];
  const left = douglasPeucker(points.slice(0, index + 1), tolerance);
  const right = douglasPeucker(points.slice(index), tolerance);
  return left.slice(0, -1).concat(right);
}

function simplifyRing(ring) {
  // Drop the duplicated closing vertex before simplifying.
  const pts = ring.slice(0, ring.length - 1);
  if (pts.length <= 3) return pts;
  let tolerance = MIN_TOLERANCE;
  let simplified = pts;
  while (simplified.length > MAX_RING_POINTS && tolerance < 30) {
    tolerance *= 1.55;
    simplified = douglasPeucker(pts, tolerance);
  }
  return simplified;
}

const round1 = (n) => {
  const v = Math.round(n * 10) / 10;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
};

function toPath(ringsPx) {
  let d = '';
  for (const ring of ringsPx) {
    if (ring.length < 3) continue;
    d += `M${round1(ring[0][0])} ${round1(ring[0][1])}`;
    for (let i = 1; i < ring.length; i++) d += `L${round1(ring[i][0])} ${round1(ring[i][1])}`;
    d += 'Z';
  }
  return d;
}

/** Drop interior rings that are too small to matter after simplification. */
function significantRings(ringsPx) {
  return ringsPx.filter((ring, i) => i === 0 || ringArea(ring) > 2);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const [adm1, adm2] = await Promise.all([loadSource('adm1'), loadSource('adm2')]);
  const canonical = readCanonical();
  const states = buildStateIndex(adm1);

  const canonicalTotal = Object.values(canonical).reduce((a, b) => a + b.length, 0);
  if (canonicalTotal !== 774) {
    throw new Error(`Canonical LGA list has ${canonicalTotal} entries, expected 774`);
  }

  // ---- assign every LGA to a state and a canonical name ----
  const grouped = {}; // state -> Map<canonicalName, feature>
  const problems = [];
  let assigned = 0;

  for (const feature of adm2.features) {
    const geoName = feature.properties.shapeName;
    const rawState = stateFor(feature.geometry, states);
    const state = STATE_ALIAS[rawState] || rawState;
    if (!state || !canonical[state]) {
      problems.push(`state unresolved for LGA "${geoName}" (got "${rawState}")`);
      continue;
    }
    const name = matchName(geoName, canonical[state], state);
    if (!name) {
      problems.push(`no canonical match for "${geoName}" in ${state}`);
      continue;
    }
    if (!grouped[state]) grouped[state] = new Map();
    if (grouped[state].has(name)) {
      problems.push(`duplicate "${name}" in ${state} (geo "${geoName}")`);
      continue;
    }
    grouped[state].set(name, feature);
    assigned++;
  }

  for (const state of Object.keys(canonical)) {
    const seen = grouped[state] || new Map();
    for (const name of canonical[state]) {
      if (!seen.has(name)) problems.push(`missing geometry for "${name}" in ${state}`);
    }
  }

  if (problems.length) {
    console.error(`\n${problems.length} unresolved geometry problem(s):`);
    problems.forEach((p) => console.error('  -', p));
    process.exit(1);
  }

  if (fuzzyMatches.length) {
    console.log('Approximate name matches (review these):');
    fuzzyMatches.forEach((f) => console.log('  ~', f));
  }

  // ---- project, fit per state, simplify, emit ----
  const output = {};
  const outlines = {};
  const adm1ByState = new Map();
  for (const s of states) adm1ByState.set(STATE_ALIAS[s.name] || s.name, s);
  let totalVertices = 0;
  let minVertices = Infinity;
  let maxVertices = 0;

  for (const state of Object.keys(canonical)) {
    const entries = grouped[state];

    // Web Mercator bbox across every ring in the state.
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const projected = [];
    for (const [, feature] of entries) {
      const polys = polygonsOf(feature.geometry).map((rings) =>
        rings.map((ring) => ring.map(([lon, lat]) => mercator(lon, lat)))
      );
      projected.push(polys);
      for (const rings of polys) {
        for (const ring of rings) {
          for (const p of ring) {
            if (p[0] < minX) minX = p[0];
            if (p[0] > maxX) maxX = p[0];
            if (p[1] < minY) minY = p[1];
            if (p[1] > maxY) maxY = p[1];
          }
        }
      }
    }

    const scale = Math.min((VIEW_W - PAD * 2) / (maxX - minX), (VIEW_H - PAD * 2) / (maxY - minY));
    const offsetX = (VIEW_W - (maxX - minX) * scale) / 2;
    const offsetY = (VIEW_H - (maxY - minY) * scale) / 2;
    const project = ([x, y]) => [offsetX + (x - minX) * scale, offsetY + (maxY - y) * scale];

    // State-level base outline in the same fitted space. Rendered beneath the
    // LGAs so source topology gaps (e.g. an enclave hole larger than the
    // enclave) fill with territory colour instead of the canvas background.
    const stateGeom = adm1ByState.get(state);
    if (stateGeom) {
      const outlineRings = [];
      for (const rings of stateGeom.polygons) {
        for (const ring of rings) {
          outlineRings.push(simplifyRing(ring.map(([lon, lat]) => project(mercator(lon, lat)))));
        }
      }
      outlines[state] = toPath(outlineRings);
    }

    const stateOut = {};
    let index = 0;
    for (const [name, feature] of entries) {
      const polygonsPx = projected[index++].map((rings) => rings.map((ring) => ring.map(project)));

      // Label anchor from the largest polygon in unscaled pixel space.
      let labelRings = polygonsPx[0];
      let labelArea = ringArea(labelRings[0]);
      for (const rings of polygonsPx) {
        const a = ringArea(rings[0]);
        if (a > labelArea) { labelArea = a; labelRings = rings; }
      }
      const [labelX, labelY] = interiorPoint(labelRings);

      const simplified = polygonsPx.map((rings) => significantRings(rings.map(simplifyRing)));
      const pathData = toPath(simplified.flat());

      let vertices = 0;
      for (const ring of simplified.flat()) vertices += ring.length;
      totalVertices += vertices;
      if (vertices < minVertices) minVertices = vertices;
      if (vertices > maxVertices) maxVertices = vertices;

      stateOut[name] = {
        path: pathData,
        labelX: Math.round(labelX),
        labelY: Math.round(labelY),
        area: Math.round(labelArea),
        label: name,
      };
    }
    output[state] = stateOut;
  }

  const lines = [];
  lines.push('/**');
  lines.push(' * REAL Local Government Area boundary geometry — all 774 Nigerian LGAs.');
  lines.push(' *');
  lines.push(' * GENERATED FILE — do not edit by hand.');
  lines.push(' * Regenerate with: node scripts/build-lga-geometry.cjs');
  lines.push(' *');
  lines.push(' * Source: geoBoundaries gbOpen NGA ADM2 (upstream GRID3), CC BY 4.0.');
  lines.push(' * https://www.geoboundaries.org/api/current/gbOpen/NGA/ADM2/');
  lines.push(' *');
  lines.push(` * Each state is normalised into a ${VIEW_W}x${VIEW_H} viewBox (Web Mercator,`);
  lines.push(' * aspect-preserving). Paths use SVG coordinates, 1 decimal place.');
  lines.push(' */');
  lines.push('');
  lines.push('export interface LgaMapGeometry {');
  lines.push('  path: string;');
  lines.push('  labelX: number;');
  lines.push('  labelY: number;');
  lines.push('  /** Projected area in viewBox units — used for label level-of-detail. */');
  lines.push('  area: number;');
  lines.push('  label: string;');
  lines.push('}');
  lines.push('');
  lines.push(`export const NIGERIA_LGA_MAP_VIEWBOX = '0 0 ${VIEW_W} ${VIEW_H}';`);
  lines.push(`export const NIGERIA_LGA_MAP_WIDTH = ${VIEW_W};`);
  lines.push(`export const NIGERIA_LGA_MAP_HEIGHT = ${VIEW_H};`);
  lines.push('');
  lines.push('export const NIGERIA_LGA_GEOMETRIES: Record<string, Record<string, LgaMapGeometry>> = {');
  for (const state of Object.keys(output)) {
    lines.push(`  ${JSON.stringify(state)}: {`);
    for (const [name, geom] of Object.entries(output[state])) {
      lines.push(
        `    ${JSON.stringify(name)}: { path: ${JSON.stringify(geom.path)}, labelX: ${geom.labelX}, labelY: ${geom.labelY}, area: ${geom.area}, label: ${JSON.stringify(geom.label)} },`
      );
    }
    lines.push('  },');
  }
  lines.push('};');
  lines.push('');
  lines.push('/** ADM1 state outline per state, in the same fitted LGA space. */');
  lines.push('export const NIGERIA_LGA_STATE_OUTLINES: Record<string, string> = {');
  for (const state of Object.keys(outlines)) {
    lines.push(`  ${JSON.stringify(state)}: ${JSON.stringify(outlines[state])},`);
  }
  lines.push('};');
  lines.push('');

  fs.writeFileSync(OUT, lines.join('\n'));

  const bytes = fs.statSync(OUT).size;
  console.log('\nLGA geometry generated');
  console.log(`  states:        ${Object.keys(output).length}`);
  console.log(`  LGAs:          ${assigned}`);
  console.log(`  vertices:      ${totalVertices} (min ${minVertices}, max ${maxVertices}, mean ${Math.round(totalVertices / assigned)})`);
  console.log(`  output:        ${path.relative(ROOT, OUT)} (${(bytes / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
