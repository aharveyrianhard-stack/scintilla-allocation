/* Offline browser harness for the allocation pages. Loads a page FROM THIS WORKTREE in headless
 * Chromium and answers every Supabase request from tests/fixtures/supabase-fixture.mjs.
 * No request leaves the machine: anything that is not the page itself or the fixture is aborted
 * and recorded, and the test fails if one happens.
 * Playwright is resolved from $SCINTILLA_PLAYWRIGHT, else the MacBook's visual-supervisor install. */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTables, restGet, compsCsv } from './fixtures/supabase-fixture.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PW = process.env.SCINTILLA_PLAYWRIGHT || '/Users/alanharvey/SCINTILLA 0.5/visual-supervisor/node_modules/playwright';
const PAGE_ORIGIN = 'https://allocation.fixture.test';
const SB_HOST = 'wadinxqplrggagkvrdag.supabase.co';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, OPTIONS' };

export async function openPage(file, { waitFor, fixtureOpts = {}, settleMs = 400 } = {}) {
  let chromium;
  try { ({ chromium } = require(PW)); }
  catch (e) { throw new Error('Playwright not found at ' + PW + ' — set SCINTILLA_PLAYWRIGHT to a playwright package directory'); }
  const tables = buildTables(Date.now(), fixtureOpts);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const escaped = [], reads = [], errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route('**/*', async route => {
    const req = route.request(), u = new URL(req.url());
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    if (u.origin === PAGE_ORIGIN) {
      const p = path.join(ROOT, decodeURIComponent(u.pathname === '/' ? '/index.html' : u.pathname));
      if (!p.startsWith(ROOT) || !fs.existsSync(p)) return route.fulfill({ status: 404, body: 'not in worktree' });
      const type = p.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8';
      return route.fulfill({ status: 200, headers: { 'content-type': type }, body: fs.readFileSync(p) });
    }
    if (u.host === SB_HOST && u.pathname.startsWith('/rest/v1/')) {
      const r = restGet(tables, req.url(), fixtureOpts);
      reads.push({ path: u.pathname.slice(9) + u.search, status: r.status });
      return route.fulfill({ status: r.status, headers: { 'content-type': 'application/json', ...CORS }, body: JSON.stringify(r.body) });
    }
    if (u.host === SB_HOST && u.pathname === '/functions/v1/comps-feed') {
      const syms = (u.searchParams.get('syms') || '').split(',').filter(Boolean);
      return route.fulfill({ status: 200, headers: { 'content-type': 'text/csv', ...CORS }, body: compsCsv(syms) });
    }
    if (u.host === SB_HOST && u.pathname.startsWith('/storage/v1/')) return route.fulfill({ status: 404, headers: CORS, body: '' });
    escaped.push(req.method() + ' ' + req.url());
    return route.abort();
  });
  await page.goto(PAGE_ORIGIN + '/' + file, { waitUntil: 'load' });
  if (waitFor) await page.waitForFunction(waitFor, null, { timeout: 20000 });
  await page.waitForTimeout(settleMs);
  return { browser, page, escaped, reads, errors, close: () => browser.close() };
}
