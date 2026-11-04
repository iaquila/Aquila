#!/usr/bin/env node
// Syncs the documented iAquila API surface (public Postman documenter) with the
// checked-in endpoint inventory, and can capture live response shapes.
//
//   node scripts/api-sync.cjs            # drift check: documented vs docs/api-endpoints.json
//   node scripts/api-sync.cjs --capture  # call every GET and dump samples + inferred shapes
//
// Capture credentials come from the environment, never from a file:
//   AQUILA_TOKEN                                     (preferred)
//   AQUILA_EMAIL + AQUILA_PASSWORD                   (falls back to POST /auth/login)
//   AQUILA_API_BASE_URL                              (default: https://api.iaquila.com.ng/api/v1)

const fs = require('fs');
const path = require('path');

const SOURCE_URL = 'https://documenter.getpostman.com/api/collections/6734990/2sBYHXSKAY';
const INVENTORY_PATH = path.join(__dirname, '..', 'docs', 'api-endpoints.json');
const SAMPLES_DIR = path.join(__dirname, '..', '.api-samples');
const DEFAULT_BASE_URL = 'https://api.iaquila.com.ng/api/v1';

// The published collection ships a copy-paste path here; keep the check quiet
// about it by applying the same correction on both sides.
const KNOWN_PATH_FIXES = {
  'Edit Election Cycle': 'election-cycle/edit/6',
};

function normalizePath(raw) {
  return String(raw || '')
    .trim()
    .replace(/^\{\{BASE_URL\}\}\/?/, '')
    .replace(/^https?:\/\/[^/]+\//, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
}

function documentedEndpoints(collection) {
  return collection.item.map((item) => {
    const request = item.request || {};
    const raw = typeof request.url === 'string' ? request.url : (request.url && request.url.raw) || '';
    const fixed = KNOWN_PATH_FIXES[item.name];
    return {
      method: String(request.method || 'GET').toUpperCase(),
      path: normalizePath(fixed || raw),
      name: item.name,
    };
  });
}

function sortEndpoints(list) {
  return [...list].sort((a, b) => `${a.path} ${a.method}`.localeCompare(`${b.path} ${b.method}`));
}

const keyOf = (endpoint) => `${endpoint.method} ${endpoint.path}`;

function readInventory() {
  if (!fs.existsSync(INVENTORY_PATH)) return null;
  return JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
}

async function fetchDocumented() {
  const response = await fetch(SOURCE_URL, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`documenter responded ${response.status}`);
  return documentedEndpoints(await response.json());
}

function driftCheck(live) {
  const inventory = readInventory();
  if (!inventory) {
    console.error(`No inventory at ${path.relative(process.cwd(), INVENTORY_PATH)} — run with --write to create it.`);
    process.exit(2);
  }
  const liveKeys = new Map(sortEndpoints(live).map((e) => [keyOf(e), e]));
  const knownKeys = new Map(sortEndpoints(inventory.endpoints).map((e) => [keyOf(e), e]));

  const added = [...liveKeys.keys()].filter((key) => !knownKeys.has(key));
  const removed = [...knownKeys.keys()].filter((key) => !liveKeys.has(key));

  if (!added.length && !removed.length) {
    console.log(`API surface in sync — ${liveKeys.size} endpoints.`);
    return;
  }
  if (added.length) {
    console.log(`\n${added.length} endpoint(s) newly documented:`);
    added.forEach((key) => console.log(`  + ${key}  (${liveKeys.get(key).name})`));
  }
  if (removed.length) {
    console.log(`\n${removed.length} endpoint(s) no longer documented:`);
    removed.forEach((key) => console.log(`  - ${key}  (${knownKeys.get(key).name})`));
  }
  console.log('\nRun with --write to accept the documented surface, then update constants/api.ts.');
  process.exit(1);
}

function makeShape(value, depth = 0) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return depth > 3 ? 'array' : [makeShape(value[0], depth + 1)];
  if (typeof value === 'object') {
    if (depth > 3) return 'object';
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, makeShape(v, depth + 1)]));
  }
  return typeof value;
}

async function resolveToken(baseUrl) {
  if (process.env.AQUILA_TOKEN) return process.env.AQUILA_TOKEN;
  const { AQUILA_EMAIL, AQUILA_PASSWORD } = process.env;
  if (!AQUILA_EMAIL || !AQUILA_PASSWORD) return null;

  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      identifierType: process.env.AQUILA_IDENTIFIER_TYPE || 'email',
      identifierValue: AQUILA_EMAIL,
      password: AQUILA_PASSWORD,
    }),
  });
  const body = await response.text();
  if (!response.ok) {
    console.error(`login failed ${response.status}: ${body.slice(0, 400)}`);
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    console.error('login returned non-JSON');
    return null;
  }
  const data = parsed.data || parsed;
  const token =
    data.accessToken || data.access_token || data.token || (data.session && (data.session.accessToken || data.session.access_token));
  if (!token) {
    console.error(`login succeeded but no token in response. keys: ${Object.keys(data).join(', ')}`);
    return null;
  }
  return token;
}

async function capture(live) {
  const baseUrl = (process.env.AQUILA_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const token = await resolveToken(baseUrl);
  if (!token) {
    console.error('Capture needs AQUILA_TOKEN, or AQUILA_EMAIL + AQUILA_PASSWORD.');
    process.exit(2);
  }

  fs.mkdirSync(SAMPLES_DIR, { recursive: true });
  const gets = sortEndpoints(live).filter((e) => e.method === 'GET');
  const results = [];

  for (const endpoint of gets) {
    const url = `${baseUrl}/${endpoint.path}`;
    let status = 0;
    let note = '';
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      });
      status = response.status;
      const text = await response.text();
      const isJson = (response.headers.get('content-type') || '').includes('json');
      if (response.ok && isJson) {
        const parsed = JSON.parse(text);
        fs.writeFileSync(path.join(SAMPLES_DIR, `${endpoint.path.replace(/\//g, '_')}.json`), JSON.stringify(parsed, null, 2));
        results.push({ endpoint, status, shape: makeShape(parsed && parsed.data !== undefined ? parsed.data : parsed) });
        await sleep(350);
        continue;
      }
      note = isJson ? text.slice(0, 120) : `<${response.headers.get('content-type') || 'unknown'} body>`;
    } catch (error) {
      note = error.message;
    }
    results.push({ endpoint, status, note });
    await sleep(350);
  }

  console.log(`\nCaptured against ${baseUrl}\n`);
  for (const result of results) {
    const label = `${result.status || 'ERR'}  ${result.endpoint.method} /${result.endpoint.path}`;
    console.log(`${label.padEnd(64)} ${result.note || result.endpoint.name}`);
  }

  const shaped = results.filter((r) => r.shape);
  if (shaped.length) {
    console.log('\nInferred response shapes (data envelope):\n');
    for (const result of shaped) {
      console.log(`/${result.endpoint.path}`);
      console.log(JSON.stringify(result.shape, null, 2));
      console.log('');
    }
  }
  console.log(`Samples written to ${path.relative(process.cwd(), SAMPLES_DIR)} (gitignored).`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const args = process.argv.slice(2);
  const live = await fetchDocumented();

  if (args.includes('--capture')) return capture(live);

  if (args.includes('--write')) {
    const inventory = {
      source: SOURCE_URL,
      capturedAt: new Date().toISOString().slice(0, 10),
      endpoints: sortEndpoints(live),
    };
    fs.mkdirSync(path.dirname(INVENTORY_PATH), { recursive: true });
    fs.writeFileSync(INVENTORY_PATH, `${JSON.stringify(inventory, null, 2)}\n`);
    console.log(`Wrote ${live.length} endpoints to ${path.relative(process.cwd(), INVENTORY_PATH)}.`);
    return;
  }

  if (args.includes('--list')) {
    sortEndpoints(live).forEach((e) => console.log(`${e.method.padEnd(6)} /${e.path}  (${e.name})`));
    return;
  }

  driftCheck(live);
}

main().catch((error) => {
  console.error(`api-sync failed: ${error.message}`);
  process.exit(2);
});
