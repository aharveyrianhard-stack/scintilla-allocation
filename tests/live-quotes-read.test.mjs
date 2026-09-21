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

test('allocation root: live_quotes is read, so prices and implied prices are populated', async () => {
  const h = await openPage('index.html', { waitFor: ROOT_READY });
  try {
    assert.deepEqual(h.escaped, [], 'no request may leave the offline fixture');
    assert.deepEqual(h.errors, [], 'the page threw');
    const lq = h.reads.find(r => r.path.startsWith('live_quotes'));
    assert.ok(lq, 'the page reads live_quotes');
    assert.equal(lq.status, 200, 'the live_quotes read is accepted (was 400: column live_quotes.volume does not exist) — ' + lq.path);
    const st = await h.page.evaluate(() => ({
      mode: SPINE.live_quotes && SPINE.live_quotes.mode, note: SPINE.live_quotes && SPINE.live_quotes.note,
      quotes: Object.keys(QUOTES).length, implied: impliedPrices('NVDA'),
    }));
    assert.equal(st.mode, 'LIVE', 'spine badge: ' + st.note);
    assert.equal(st.quotes, 17, 'every fixture quote row is loaded');
    assert.ok(st.implied, 'NVDA has an implied price once its live price is read (peer set: 5 fixture semis)');
    assert.equal(st.implied.px, 181.25);
    assert.ok(Number.isFinite(st.implied.mid) && st.implied.mid > 0);
    const row = await h.page.evaluate(() => {
      const tr = [...document.querySelectorAll('#cohort tr')].find(r => /\bNVDA\b/.test((r.cells[1] || {}).textContent || ''));
      return tr ? { price: tr.cells[4].textContent.trim(), day: tr.cells[5].textContent.trim(), rvol: tr.cells[6].innerHTML } : null;
    });
    assert.ok(row, 'NVDA is listed in the candidates table');
    assert.equal(row.price, '181.25', 'PRICE column shows the live_quotes price (was "—")');
    assert.equal(row.day, '+1.25%', 'DAY column shows live_quotes.chg_pct (was "—")');
    assert.match(row.rvol, /volume/i, 'RVOL says why it is blank (live_quotes carries no volume) instead of a bare "—"');
  } finally { await h.close(); }
});

test('allocation root: a failed quote read states what is missing, not a fallback that no longer exists', async () => {
  const h = await openPage('index.html', { waitFor: ROOT_READY, fixtureOpts: { failTables: ['live_quotes'] } });
  try {
    const note = await h.page.evaluate(() => SPINE.live_quotes && SPINE.live_quotes.note);
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
