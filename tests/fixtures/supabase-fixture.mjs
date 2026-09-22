/* OFFLINE SUPABASE FIXTURE — SYNTHETIC DATA, NOT MARKET DATA.
 *
 * A small PostgREST stand-in for the allocation pages' reads. It behaves like the live
 * REST API in the one way these tests depend on: a `select=` (or filter / order) that names
 * a column the table does not have is rejected with HTTP 400 (PostgREST 42703), and a table
 * that does not exist is a 404. The column lists below are the LIVE schemas as read on
 * 2026-09-21 through the public read path (evidence: deliverables/20260921/analytics/
 * evidence/live-quotes-columns.json and live-read-shapes.json). In particular live_quotes has
 * NO `volume` column any more — asking for it fails the whole read.
 *
 * Every number here is invented. Ticker symbols are real only because the page keys its
 * logic on them (SPY, QQQ, IWM, RSP ...). Nothing in this file is a price, a rate or a view.
 */
const DAY = 864e5;
const iso = d => new Date(d).toISOString().slice(0, 10);

export const SCHEMA = {
  live_quotes: ['ticker', 'price', 'change', 'updated_ts', 'prev_close', 'chg_pct', 'price_source'],
  ticker_cohorts: ['ticker', 'cohort'],
  ticker_membership: ['ticker', 'group_key', 'kind'],
  hub_favorites: ['ticker', 'added_at'],
  composite_staged: ['ticker', 'trend', 'momentum', 'composite', 'core', 'updated_ts', 'tf'],
  company_profile: ['ticker', 'name', 'sector', 'beta', 'is_etf', 'market_cap', 'avg_volume'],
  treasury_rates: ['date', 'y2', 'y10', 'updated_ts'],
  vix_term: ['date', 'vix', 'vix3m', 'ratio', 'skew', 'vvix', 'vix9d', 'updated_ts'],
  sector_rankings: ['date', 'sector', 'sector_name', 'rank', 'score', 'trend', 'momentum', 'method', 'updated_at'],
  fan_daily: ['ticker', 'asof', 'read'],
  momentum_daily: ['ticker', 'asof', 'read'],
  operator_weights: ['dim', 'key', 'weight', 'enabled'],
  market_internals: ['asof', 'advancers', 'decliners', 'add_line', 'trin', 'universe', 'adv_volume', 'dec_volume'],
  fundamentals: ['ticker', 'price', 'market_cap', 'trailing_pe', 'eps_ttm', 'revenue_ttm', 'dcf', 'source', 'updated_ts', 'adjusted_eps_ttm', 'adjusted_pe'],
  eod_adjusted: ['ticker', 'd', 'adj_o', 'adj_h', 'adj_l', 'adj_c', 'volume'],
  ohlcv_history: ['ticker', 'tf', 'source', 'timestamp', 'open', 'high', 'low', 'close', 'volume'],
  ratios_history: ['ticker', 'fiscal_date', 'period', 'pe', 'pb', 'ps', 'net_margin', 'roe', 'debt_to_equity', 'dividend_yield'],
  analyst_estimates: ['ticker', 'fiscal_date', 'period', 'est_eps_avg', 'est_revenue_avg', 'price_target_avg', 'num_analysts_eps'],
  // ticker_peers and market_breadth do not exist live (the page reports FALLBACK for both) -> 404
};

// name, sector key, industry, cohort, synthetic price, synthetic composite, synthetic P/E, P/S, P/B, FWD P/E, synthetic FMP-style dcf
const NAMES = [
  ['NVDA', 'TECH', 'SEMIS_FIX', 'AI_HARDWARE', 181.25, -0.42, 40, 20, 30, 30, 150],
  ['AMD', 'TECH', 'SEMIS_FIX', 'AI_HARDWARE', 150.10, -0.30, 60, 8, 4, 35, 120],
  ['AVGO', 'TECH', 'SEMIS_FIX', 'AI_HARDWARE', 320.00, -0.10, 70, 22, 12, 32, 260],
  ['MU', 'TECH', 'SEMIS_FIX', 'AI_HARDWARE', 110.40, -0.55, 20, 4, 2.5, 9, 140],
  ['TSM', 'TECH', 'SEMIS_FIX', 'AI_HARDWARE', 240.75, -0.20, 25, 9, 7, 20, 230],
  ['MRVL', 'TECH', 'SEMIS_FIX', 'AI_HARDWARE', 70.30, -0.35, 45, 10, 4, 28, 60],
  ['BTCUSD', 'CRYPTO', 'CRYPTO_FIX', 'CRYPTO', 60000, 0.50, null, null, null, null, null],
  ['ETHUSD', 'CRYPTO', 'CRYPTO_FIX', 'CRYPTO', 3000, 0.40, null, null, null, null, null],
  ['SOLUSD', 'CRYPTO', 'CRYPTO_FIX', 'CRYPTO', 150, 0.30, null, null, null, null, null],
];
// index / proxy rows the macro voters and the brief read (synthetic composites)
const PROXIES = [['SPY', 0.30], ['QQQ', 0.20], ['IWM', 0.25], ['RSP', 0.40], ['SMH', -0.10], ['XLP', 0.10], ['XLU', 0.05], ['CLUSD', 0.00]];

export function buildTables(now = Date.now(), opts = {}) {
  const today = iso(now), sec = Math.floor(now / 1000) - 60, isoTs = new Date(now - 60000).toISOString();
  const T = {};
  T.ticker_cohorts = [...NAMES.map(n => ({ ticker: n[0], cohort: n[3] })), ...PROXIES.map(p => ({ ticker: p[0], cohort: 'INDEX' }))];
  T.ticker_membership = [
    ...NAMES.map(n => ({ ticker: n[0], group_key: n[1], kind: 'sector' })),
    ...NAMES.map(n => ({ ticker: n[0], group_key: n[2], kind: 'industry' })),
    ...NAMES.map(n => ({ ticker: n[0], group_key: n[3], kind: 'cohort' })),
  ];
  T.hub_favorites = [{ ticker: 'NVDA', added_at: isoTs }, { ticker: 'MU', added_at: isoTs }];
  T.composite_staged = [...NAMES.map(n => ({ ticker: n[0], trend: n[5], momentum: n[5], composite: n[5], core: n[5], updated_ts: sec - (opts.compositeAgeSec || 0), tf: 'D' })),
    ...PROXIES.map(p => ({ ticker: p[0], trend: p[1], momentum: p[1], composite: p[1], core: p[1], updated_ts: sec - (opts.compositeAgeSec || 0), tf: 'D' }))];
  T.live_quotes = [...NAMES, ...PROXIES.map(p => [p[0], null, null, null, 100 + p[1] * 10])].map(n => ({
    ticker: n[0], price: n[4], change: 1.0, updated_ts: isoTs, prev_close: +(n[4] - 1).toFixed(2), chg_pct: 1.25, price_source: null }));
  T.company_profile = NAMES.filter(n => n[1] === 'TECH').map(n => ({ ticker: n[0], name: n[0] + ' (fixture)', sector: 'Technology', beta: 1.2, is_etf: false, market_cap: 2e11, avg_volume: 1e7 }));
  T.treasury_rates = [{ date: today, y2: 3.9, y10: 4.2, updated_ts: isoTs }];
  T.vix_term = [{ date: iso(now - (opts.vixAgeDays ?? 0) * DAY), vix: opts.vix ?? 15, vix3m: 17, ratio: 0.88, skew: 140, vvix: 90, vix9d: 14, updated_ts: isoTs }];
  T.sector_rankings = [
    { date: today, sector: 'XLK', sector_name: 'Technology', rank: 1, score: 0.2, trend: 0.3, momentum: 0.1, method: 'fixture', updated_at: isoTs },
    { date: today, sector: 'CRYPTO', sector_name: 'Crypto', rank: 2, score: 0.1, trend: 0.1, momentum: 0.1, method: 'fixture', updated_at: isoTs },
    { date: iso(now - 30 * DAY), sector: 'XLB', sector_name: 'Materials (OLD ROW)', rank: 1, score: 0.9, trend: 1, momentum: 0.8, method: 'fixture old', updated_at: isoTs },
  ];
  T.fan_daily = NAMES.map(n => ({ ticker: n[0], asof: today, read: n[5] }));
  T.momentum_daily = NAMES.map(n => ({ ticker: n[0], asof: today, read: n[5] + 0.05 }));
  T.operator_weights = [{ dim: 'FAMILY', key: 'TREND', weight: 0.5, enabled: true }, { dim: 'FAMILY', key: 'MOMENTUM', weight: 0.5, enabled: true }];
  T.market_internals = [{ asof: today, advancers: 3000, decliners: 2500, add_line: 1000, trin: 0.9, universe: 6000, adv_volume: 5e9, dec_volume: 4e9 }];
  T.fundamentals = NAMES.filter(n => n[10] != null).map(n => ({ ticker: n[0], price: n[4], market_cap: 2e11, trailing_pe: n[6], eps_ttm: +(n[4] / n[6]).toFixed(2), revenue_ttm: 5e10, dcf: n[10], source: 'fixture', updated_ts: sec, adjusted_eps_ttm: null, adjusted_pe: null }));
  T.eod_adjusted = []; T.ohlcv_history = []; T.ratios_history = []; T.analyst_estimates = [];
  return T;
}

export function compsCsv(syms) {
  const head = 'sym,mktcap,pe,fwd_pe,ps,pb,gross_m,net_m,de,div_yld,rev_growth,updated';
  const by = Object.fromEntries(NAMES.map(n => [n[0], n]));
  const lines = syms.filter(s => by[s]).map(s => { const n = by[s]; const f = v => v == null ? '' : v;
    return [s, 2e11, f(n[6]), f(n[9]), f(n[7]), f(n[8]), 0.5, 0.2, 0.3, 0.01, 0.1, '2026-01-01T00:00:00Z'].join(','); });
  return [head, ...lines].join('\n');
}

/* PostgREST-ish GET: select / eq / in / gte / lte / order / limit / offset. Unknown column -> 400, unknown table -> 404. */
export function restGet(tables, url, opts = {}) {
  const u = new URL(url);
  const table = u.pathname.split('/').pop();
  if ((opts.failTables || []).includes(table)) return { status: 503, body: { message: 'fixture: forced failure for ' + table } };
  const cols = SCHEMA[table];
  if (!cols) return { status: 404, body: { code: 'PGRST205', message: `Could not find the table 'public.${table}' in the schema cache` } };
  const bad = c => !cols.includes(c);
  const sel = (u.searchParams.get('select') || '*').split(',').map(s => s.trim()).filter(Boolean);
  for (const c of sel) if (c !== '*' && bad(c)) return { status: 400, body: { code: '42703', message: `column ${table}.${c} does not exist` } };
  let rows = (tables[table] || []).slice();
  for (const [k, v] of u.searchParams) {
    if (['select', 'order', 'limit', 'offset'].includes(k)) continue;
    if (bad(k)) return { status: 400, body: { code: '42703', message: `column ${table}.${k} does not exist` } };
    const dot = v.indexOf('.'), op = v.slice(0, dot), val = v.slice(dot + 1);
    const S = x => String(x);
    if (op === 'eq') rows = rows.filter(r => S(r[k]) === val);
    else if (op === 'in') { const set = new Set(val.replace(/^\(|\)$/g, '').split(',')); rows = rows.filter(r => set.has(S(r[k]))); }
    else if (op === 'gte') rows = rows.filter(r => S(r[k]) >= val);
    else if (op === 'lte') rows = rows.filter(r => S(r[k]) <= val);
    else return { status: 400, body: { code: 'PGRST100', message: 'unsupported operator in fixture: ' + op } };
  }
  const order = u.searchParams.get('order');
  if (order) {
    const keys = order.split(',').map(o => { const [c, d] = o.split('.'); return [c, d === 'desc' ? -1 : 1]; });
    for (const [c] of keys) if (bad(c)) return { status: 400, body: { code: '42703', message: `column ${table}.${c} does not exist` } };
    rows.sort((a, b) => { for (const [c, d] of keys) { if (a[c] < b[c]) return -d; if (a[c] > b[c]) return d; } return 0; });
  }
  const off = +(u.searchParams.get('offset') || 0), lim = +(u.searchParams.get('limit') || 1000);
  rows = rows.slice(off, off + Math.min(lim, 1000));
  if (!sel.includes('*')) rows = rows.map(r => Object.fromEntries(sel.map(c => [c, r[c] ?? null])));
  return { status: 200, body: rows };
}
