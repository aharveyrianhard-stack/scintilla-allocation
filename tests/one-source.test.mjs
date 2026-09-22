/* ONE SOURCE (22 Sep 2026). The allocation engine reads the equity Geiger, trend/momentum, sector ETFs and
 * prices from the chart API the Hub reads (same-origin /chart-api rewrite), and keeps composite_staged /
 * fan_daily / momentum_daily / live_quotes only for names the chart API does not carry. Freshness badges
 * come from every row (oldest / median / stale count), never from the newest row.
 * Offline: tests/fixtures/chart-api-fixture.mjs + supabase-fixture.mjs. SYNTHETIC numbers. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { openPage } from './harness.mjs';
import { CHART_EQUITIES, CHART_SECTORS } from './fixtures/chart-api-fixture.mjs';

const ROOT_READY = () => document.getElementById('loading') && document.getElementById('loading').style.display === 'none';

test('the deploy config proxies /chart-api to the chart API, so no CORS change is needed', () => {
  const v = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.deepEqual(v.rewrites, [{ source: '/chart-api/:path*', destination: 'https://scintilla-massive-chart-api.fly.dev/:path*' }]);
});

test('equity Geiger comes from /geiger; composite_staged only for names the chart API does not carry', async () => {
  const h = await openPage('index.html', { waitFor: ROOT_READY });
  try {
    assert.deepEqual(h.escaped, [], 'no request may leave the offline fixtures');
    assert.deepEqual(h.errors, [], 'the page threw');
    const st = await h.page.evaluate(() => ({ nvda: COMPOSITE.NVDA, spy: COMPOSITE.SPY, btc: COMPOSITE.BTCUSD, badge: SPINE.geiger, old: SPINE.composite_staged, gv: gv('NVDA') }));
    assert.equal(st.nvda.src, 'chart API /geiger'); assert.equal(st.nvda.composite, +(CHART_EQUITIES.NVDA[0] + 0.05).toFixed(4));
    assert.equal(st.spy.src, 'chart API /geiger', 'the SPY voter reads the Hub Geiger');
    assert.equal(st.gv, st.nvda.composite, 'gv() returns the chart API value');
    assert.equal(st.btc.src, 'composite_staged', 'BTCUSD is not in /geiger, so its composite_staged row is kept');
    assert.equal(st.old, undefined, 'no badge claims composite_staged is the Geiger source any more');
    assert.equal(st.badge.mode, 'LIVE', st.badge.note);
    assert.match(st.badge.note, /equities from chart API \/geiger \(COMPLETE_UNSTAMPED\)/);
    assert.match(st.badge.note, /oldest row .* · median .* · all \d+ rows current/);
    assert.equal(h.chartReads.filter(r => r.path === '/chart-api/geiger').length, 1, 'one shared /geiger read feeds every loader');
  } finally { await h.close(); }
});

test('freshness comes from every row: one fresh source cannot hide frozen rows (never max(updated_ts))', async () => {
  const h = await openPage('index.html', { waitFor: ROOT_READY, fixtureOpts: { compositeAgeSec: 40 * 86400 } });
  try {
    const b = await h.page.evaluate(() => ({ ...SPINE.geiger, oldestAgeDays: (Date.now() / 1000 - SPINE.geiger.ts) / 86400 }));
    assert.equal(b.mode, 'STALE', 'four 40-day-old non-equity rows make the badge STALE although the equity rows are 90 s old: ' + b.note);
    assert.ok(b.oldestAgeDays > 39, 'the badge carries the OLDEST row time, not the newest');
    assert.match(b.note, /4 of \d+ rows stale/);
    assert.match(b.note, /oldest row 40d ago/);
  } finally { await h.close(); }
});

test('a stale timeframe in /geiger turns the Geiger badge STALE', async () => {
  const h = await openPage('index.html', { waitFor: ROOT_READY, fixtureOpts: { staleTimeframes: ['1w'] } });
  try {
    const b = await h.page.evaluate(() => SPINE.geiger);
    assert.equal(b.mode, 'STALE'); assert.match(b.note, /stale timeframes 1w/);
  } finally { await h.close(); }
});

test('with /geiger unreadable the page falls back to composite_staged alone and says so', async () => {
  const h = await openPage('index.html', { waitFor: ROOT_READY, fixtureOpts: { chartFail: ['geiger'] } });
  try {
    const st = await h.page.evaluate(() => ({ b: SPINE.geiger, nvda: COMPOSITE.NVDA }));
    assert.equal(st.b.mode, 'STALE', 'a fallback is never labelled LIVE'); assert.match(st.b.note, /chart API \/geiger unreadable .* composite_staged only/);
    assert.equal(st.nvda.src, 'composite_staged');
  } finally { await h.close(); }
});

test('the sector ranking is computed live from the /geiger sector ETFs, not read from sector_rankings', async () => {
  const h = await openPage('index.html', { waitFor: ROOT_READY });
  try {
    const st = await h.page.evaluate(() => ({ ranks: SECTOR_RANKS, tech: SECTOR_READ.TECH, energy: SECTOR_READ.ENERGY, badge: SPINE.sector_rotation, oldBadge: SPINE.sector_rankings }));
    assert.ok(!h.reads.some(r => r.path.startsWith('sector_rankings')), 'sector_rankings is not read by the allocation engine');
    assert.equal(st.oldBadge, undefined);
    const order = st.ranks.list.map(r => r.sector);
    const expected = Object.entries(CHART_SECTORS).concat([['XLP', [0.17, 0.13]], ['XLU', [0.12, 0.08]]])
      .map(([t, [tr, mo]]) => [t, (tr + mo) / 2]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
    assert.equal(order[0], 'XLK', 'XLK leads (trend 0.60, momentum 0.40)'); assert.equal(order.at(-1), 'XLE', 'XLE trails');
    assert.deepEqual(order, expected, 'ranked by (trend + momentum) / 2 from /geiger');
    assert.equal(st.tech.etf, 'XLK'); assert.equal(st.tech.trend, 0.60); assert.equal(st.tech.rank, 1);
    assert.equal(st.badge.mode, 'LIVE', st.badge.note); assert.match(st.badge.note, /sectors live from the chart API \/geiger sector ETFs/);
  } finally { await h.close(); }
});

test('regimes use the /geiger trend and momentum for equities, the daily tables only for the rest', async () => {
  const h = await openPage('index.html', { waitFor: ROOT_READY });
  try {
    const st = await h.page.evaluate(() => ({ nvda: REGIME.NVDA, btc: REGIME.BTCUSD, b: SPINE.regimes }));
    assert.equal(st.nvda.src, 'chart API /geiger'); assert.equal(st.nvda.trend, +(CHART_EQUITIES.NVDA[0] + 0.05 + 0.02).toFixed(4));
    assert.equal(st.btc.src, 'fan_daily/momentum_daily');
    assert.match(st.b.note, /equities from chart API \/geiger \+ \d+ from fan_daily\/momentum_daily/);
  } finally { await h.close(); }
});

test('desk: Geiger age from every row, sector standing from the engine, VIX by trading date', async () => {
  const h = await openPage('desk.html', { waitFor: () => /Tape \(the geiger\)/.test(document.body.innerText) && /oldest row|—/.test(document.body.innerText), settleMs: 1500 });
  try {
    assert.deepEqual(h.errors, [], 'the desk threw');
    const txt = await h.page.evaluate(() => document.body.innerText);
    assert.doesNotMatch(txt, /NaN/, 'no NaN from mixing ISO and epoch row times');
    assert.match(txt, /chart API \/geiger \(equities\) · composite_staged \(non-equities\)/);
    assert.match(txt, /oldest row \d+m · median \d+m/, 'the tape badge states oldest and median row age, never the newest row');
    assert.ok(!h.reads.some(r => r.path.startsWith('sector_rankings')), 'the desk no longer reads sector_rankings');
    const vix = h.reads.find(r => r.path.startsWith('vix_term'));
    assert.ok(vix && /order=date\.desc/.test(vix.path), 'VIX is the newest trading date, not the newest updated_ts: ' + (vix && vix.path));
  } finally { await h.close(); }
});

test('sectors.html: the sector-ETF Geiger and quotes come from the chart API, with their own row ages', async () => {
  const h = await openPage('sectors.html', { waitFor: () => /feeds/.test((document.getElementById('asof') || {}).textContent || '') && /SOURCES/.test((document.getElementById('cross') || {}).innerText || ''), settleMs: 600 });
  try {
    assert.deepEqual(h.errors, [], 'the page threw');
    assert.ok(!h.reads.some(r => r.path.startsWith('composite_staged') || r.path.startsWith('live_quotes')), 'no frozen equity table is read: ' + h.reads.map(r => r.path.split('?')[0]).join(','));
    assert.ok(h.chartReads.some(r => r.path.startsWith('/chart-api/geiger?symbols=') && r.status === 200));
    assert.ok(h.chartReads.some(r => r.path.startsWith('/chart-api/quotes?symbols=') && r.status === 200));
    const t = await h.page.evaluate(() => document.getElementById('cross').innerText);
    assert.match(t, /Technology\s+XLK\s+0\.500/, 'XLK Geiger = (0.60 + 0.40) / 2 from the chart fixture');
    assert.match(t, /Consumer Defensive\s+XLP[\s\S]*?\+0\.75%/, 'XLP ETF change from /quotes change_pct');
    assert.match(t, /SOURCES · Geiger: chart API \/geiger, 11 of 11 ETFs.* quotes: chart API \/quotes, 2 of 11 ETFs, oldest \d+m ago/);
  } finally { await h.close(); }
});

test('analytics.html: Geiger, sectors and prices from the chart API; freshness cards date every row', async () => {
  const h = await openPage('analytics.html', { waitFor: () => /feeds/.test((document.getElementById('asof') || {}).textContent || ''), settleMs: 800 });
  try {
    assert.deepEqual(h.errors, [], 'the page threw');
    assert.ok(!h.reads.some(r => r.path.startsWith('sector_rankings')), 'sector_rankings is not read');
    const out = await h.page.evaluate(() => ({ strip: document.getElementById('macroStrip').innerText, sect: document.getElementById('sectors').innerText, head: document.getElementById('secHead').innerText, nvda: S.map.NVDA && S.map.NVDA.g && S.map.NVDA.g.src, btc: S.map.BTCUSD && S.map.BTCUSD.g && S.map.BTCUSD.g.src }));
    assert.equal(out.nvda, 'chart API /geiger'); assert.equal(out.btc, 'composite_staged');
    assert.match(out.strip, /GEIGER — OLDEST ROW[\s\S]*median[\s\S]*from chart API \/geiger \(COMPLETE_UNSTAMPED\) \+ \d+ composite_staged/);
    assert.match(out.sect, /^\s*#[\s\S]*?\n1\s+Technology\s+0\.500/m, 'XLK (Technology) ranks first, score (0.60+0.40)/2');
    assert.match(out.head, /live from the chart API \/geiger sector ETFs/i);  // the heading is uppercased by CSS
  } finally { await h.close(); }
});

test('dcf.html: prices from ONE chart API /quotes call; live_quotes only for names it does not return', async () => {
  const h = await openPage('dcf.html', { waitFor: () => /\$\d/.test((document.getElementById('tickerStat') || {}).textContent || '') && typeof SPINE !== 'undefined' && SPINE.quotes, settleMs: 600 });
  try {
    assert.deepEqual(h.errors, [], 'the page threw');
    const q = h.chartReads.filter(r => r.path.startsWith('/chart-api/quotes'));
    assert.equal(q.length, 1, 'one request for all ten names'); assert.equal(q[0].status, 200);
    assert.ok(!h.reads.some(r => r.path.startsWith('live_quotes') && /ticker=eq\.NVDA/.test(r.path)), 'NVDA is not read from live_quotes');
    const st = await h.page.evaluate(() => ({ stat: document.getElementById('tickerStat').textContent, badge: SPINE.quotes, old: SPINE.live_quotes }));
    assert.match(st.stat, /\$181\.75 \(chart API \/quotes /, 'NVDA priced from the chart API (fixture 181.25 + 0.50)');
    assert.match(st.badge.note, /from chart API \/quotes, \d+ from live_quotes · oldest row/);
    assert.equal(st.old, undefined, 'no badge claims live_quotes is the price source');
  } finally { await h.close(); }
});
