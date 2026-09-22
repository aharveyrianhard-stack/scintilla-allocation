/* Offline chart API for the allocation tests: answers /geiger and /quotes the way the live chart API does
 * (shapes read 2026-09-22 from scintilla-massive-chart-api). SYNTHETIC numbers, deliberately different from
 * the Supabase fixture so a test can tell which source a value came from:
 *   /geiger composite = the Supabase composite + 0.05;  /quotes price = the live_quotes price + 0.50. */
export const CHART_EQUITIES = {
  // ticker: [supabase composite, supabase live price]
  NVDA: [-0.42, 181.25], AMD: [-0.30, 150.10], AVGO: [-0.10, 320.00], MU: [-0.55, 110.40], TSM: [-0.20, 240.75], MRVL: [-0.35, 70.30],
  SPY: [0.30, 103.0], QQQ: [0.20, 102.0], IWM: [0.25, 102.5], RSP: [0.40, 104.0], SMH: [-0.10, 99.0], XLP: [0.10, 101.0], XLU: [0.05, 100.5],
};
// sector ETFs: [trend, momentum] — XLK leads, XLE trails
export const CHART_SECTORS = { XLK: [0.60, 0.40], XLF: [0.30, 0.10], XLV: [0.10, 0.00], XLY: [0.20, -0.10], XLI: [0.15, 0.05], XLB: [-0.10, -0.20], XLE: [-0.50, -0.40], XLRE: [0.00, 0.05], XLC: [0.25, 0.15] };
export const NOT_IN_CHART_API = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'CLUSD'];

export function geigerBody(now, opts = {}) {
  const symbols = {};
  for (const [t, [c]] of Object.entries(CHART_EQUITIES)) {
    const comp = +(c + 0.05).toFixed(4);
    symbols[t] = { composite: comp, trend: +(comp + 0.02).toFixed(4), momentum: +(comp - 0.02).toFixed(4), structure: null, tf_contributors: 8 };
  }
  for (const [t, [tr, mo]] of Object.entries(CHART_SECTORS)) if (!symbols[t]) symbols[t] = { composite: (tr + mo) / 2, trend: tr, momentum: mo, structure: null, tf_contributors: 8 };
  const tf = k => ({ as_of_oldest_et: '2026-09-22', as_of_newest_et: '2026-09-22', required_through_et: '2026-09-21', available_cells: 364, stale_cells: 0, missing_cells: 0, stale: (opts.staleTimeframes || []).includes(k) });
  return {
    verification: { fully_verified: false, label: 'COMPLETE_UNSTAMPED', blocking_issue_count: 0 },
    per_timeframe: Object.fromEntries(['2h', '3h', '4h', '6h', '12h', '1d', '3d', '1w'].map(k => [k, tf(k)])),
    computed_utc: new Date(now - 90000).toISOString(), symbols,
  };
}
export function quotesBody(syms, now) {
  const quotes = {};
  for (const t of syms) {
    const e = CHART_EQUITIES[t]; if (!e) continue;
    const price = +(e[1] + 0.5).toFixed(2);
    quotes[t] = { symbol: t, state: 'OK', price, previous_close: +(price - 1).toFixed(2), change_pct: 0.75, price_observation_utc: new Date(now - 20000).toISOString() };
  }
  return { provider: 'MASSIVE', requested: syms.length, returned: Object.keys(quotes).length, quotes };
}
export function chartRoute(pathname, search, now, opts = {}) {
  const fail = opts.chartFail || [];
  if (pathname === '/geiger') return fail.includes('geiger') ? { status: 503, body: { error: 'fixture: geiger down' } } : { status: 200, body: geigerBody(now, opts) };
  if (pathname === '/quotes') {
    if (fail.includes('quotes')) return { status: 503, body: { error: 'fixture: quotes down' } };
    const syms = (new URLSearchParams(search).get('symbols') || '').split(',').filter(Boolean);
    return syms.length ? { status: 200, body: quotesBody(syms, now) } : { status: 400, body: { error: 'symbols required' } };
  }
  return { status: 404, body: { error: 'not in chart fixture' } };
}
