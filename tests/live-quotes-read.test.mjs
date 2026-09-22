/* live_quotes lost its `volume` column upstream. Both analytics pages still asked for it, so
 * PostgREST rejected the WHOLE read (HTTP 400) and every price on the product went blank:
 *   allocation root  — PRICE / DAY columns "—", and impliedPrices() returned null for every
 *                      name, because an implied price needs a live price (IMPLIED "—" everywhere)
 *   analytics.html   — QUOTES FRESH "ERR", and DCF vs PRICE printed "FEED ERROR — no dcf data"
 *                      although fundamentals.dcf was populated.
 * The providers had the data (live 2026-09-21: 387 live_quotes rows, readable without `volume`).
 * Offline: the fixture rejects unknown columns exactly as the live API does. SYNTHETIC numbers.
 * Run: node --test tests/   (needs Playwright; see tests/harness.mjs) */
import test from 'node:test';
import assert from 'node:assert/strict';
import { openPage } from './harness.mjs';

const ROOT_READY = () => document.getElementById('loading') && document.getElementById('loading').style.display === 'none';

/* 22 Sep (one source): equity prices now come from the chart API /quotes (the Hub's own quotes) through the
 * same-origin /chart-api rewrite; live_quotes is still read, and accepted, for the names the chart API does not
 * quote. The fixture's /quotes price is the live_quotes price + 0.50, so the assertions show which source won. */
test('allocation root: equity prices come from chart API /quotes, live_quotes still read for the rest', async () => {
  const h = await openPage('index.html', { waitFor: ROOT_READY });
  try {
    assert.deepEqual(h.escaped, [], 'no request may leave the offline fixture');
    assert.deepEqual(h.errors, [], 'the page threw');
    const lq = h.reads.find(r => r.path.startsWith('live_quotes'));
    assert.ok(lq, 'the page reads live_quotes');
    assert.equal(lq.status, 200, 'the live_quotes read is accepted (was 400: column live_quotes.volume does not exist) — ' + lq.path);
    const st = await h.page.evaluate(() => ({
      mode: SPINE.quotes && SPINE.quotes.mode, note: SPINE.quotes && SPINE.quotes.note,
      quotes: Object.keys(QUOTES).length, implied: impliedPrices('NVDA'),
      nvdaSrc: QUOTES.NVDA && QUOTES.NVDA.src, btcSrc: QUOTES.BTCUSD && QUOTES.BTCUSD.src,
    }));
    assert.equal(st.mode, 'LIVE', 'spine badge: ' + st.note);
    assert.equal(st.quotes, 17, 'every fixture quote row is loaded (13 from /quotes + 4 from live_quotes)');
    assert.equal(st.nvdaSrc, 'chart API /quotes', 'an equity is priced from the chart API');
    assert.equal(st.btcSrc, 'live_quotes', 'a name the chart API does not quote keeps its live_quotes row');
    assert.ok(h.chartReads.some(r => r.path.startsWith('/chart-api/quotes') && r.status === 200), 'the page asks /chart-api/quotes');
    assert.ok(st.implied, 'NVDA has an implied price once its live price is read (peer set: 5 fixture semis)');
    assert.equal(st.implied.px, 181.75, 'implied price uses the chart API price (181.25 + 0.50)');
    assert.ok(Number.isFinite(st.implied.mid) && st.implied.mid > 0);
    const row = await h.page.evaluate(() => {
      const tr = [...document.querySelectorAll('#cohort tr')].find(r => /\bNVDA\b/.test((r.cells[1] || {}).textContent || ''));
      return tr ? { price: tr.cells[4].textContent.trim(), day: tr.cells[5].textContent.trim(), rvol: tr.cells[6].innerHTML } : null;
    });
    assert.ok(row, 'NVDA is listed in the candidates table');
    assert.equal(row.price, '181.75', 'PRICE column shows the chart API /quotes price');
    assert.equal(row.day, '+0.75%', 'DAY column shows /quotes change_pct (percent units, like chg_pct)');
    assert.match(row.rvol, /volume/i, 'RVOL says why it is blank (no volume source) instead of a bare "—"');
  } finally { await h.close(); }
});

test('allocation root: a failed quote read states what is missing, not a fallback that no longer exists', async () => {
  const h = await openPage('index.html', { waitFor: ROOT_READY, fixtureOpts: { failTables: ['live_quotes'], chartFail: ['quotes'] } });
  try {
    const note = await h.page.evaluate(() => SPINE.quotes && SPINE.quotes.note);
    assert.ok(note, 'a failed quote read still lands a badge');
    assert.ok(!/cohort-feed/.test(note), 'the cohort-feed (Yahoo) path was removed 2026-08-11; the badge promised it: ' + note);
    assert.match(note, /prices, day % and implied prices not read/, 'the badge names what the failure removes: ' + note);
  } finally { await h.close(); }
});

test('analytics.html: quotes load, so DCF vs PRICE is drawn from the populated fundamentals.dcf', async () => {
  const h = await openPage('analytics.html', { waitFor: () => /feeds/.test((document.getElementById('asof') || {}).textContent || '') });
  try {
    assert.deepEqual(h.escaped, [], 'no request may leave the offline fixture');
    assert.deepEqual(h.errors, [], 'the page threw');
    const lq = h.reads.find(r => r.path.startsWith('live_quotes'));
    assert.equal(lq.status, 200, 'the live_quotes read is accepted — ' + lq.path);
    const out = await h.page.evaluate(() => ({ strip: document.getElementById('macroStrip').innerText, dcf: document.getElementById('dcfGaps').innerText }));
    assert.doesNotMatch(out.strip, /QUOTES FRESH\s*ERR/, 'QUOTES FRESH reads the table instead of ERR');
    assert.doesNotMatch(out.dcf, /no dcf data/, 'the DCF panel is not reported empty when fundamentals.dcf is populated');
    assert.match(out.dcf, /NVDA\s+150\.00\s+181\.25\s+-17\.24%/, 'FMP-DCF 150 vs live 181.25 → gap −17.24% (synthetic fixture)');
  } finally { await h.close(); }
});

test('allocation root: live_quotes failing alone leaves equity prices from the chart API and says what is missing', async () => {
  const h = await openPage('index.html', { waitFor: ROOT_READY, fixtureOpts: { failTables: ['live_quotes'] } });
  try {
    const st = await h.page.evaluate(() => ({ note: SPINE.quotes && SPINE.quotes.note, nvda: QUOTES.NVDA && QUOTES.NVDA.price, btc: QUOTES.BTCUSD }));
    assert.equal(st.nvda, 181.75, 'equities still priced from /quotes');
    assert.equal(st.btc, undefined, 'no invented non-equity price');
    assert.match(st.note, /non-equity prices not read/, 'the badge names what the live_quotes failure removes: ' + st.note);
  } finally { await h.close(); }
});
