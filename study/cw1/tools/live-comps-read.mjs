/* CW1 (13 Oct 2026, built on CS3's reader) · what the LIVE Hub's COMPS tab holds for each name — read from https://scintillahub.ai itself,
   headless, ONE page, one name after the other. The tab keeps its state on the tab element (root._cm); this reads that state in full:
   every yardstick row (each peer's multiple, the median, the band, the weight, the outliers), the peer set with its words, the business
   check, the fragile test, the whole-set band, the snapshot the tab priced on (earnings, sales, debt, their dates) and the tab's own text.
   Nothing is computed again here, nothing is written anywhere: every non-GET request is answered locally and counted.
     node study/cw1/tools/live-comps-read.mjs <out.json> TICKER …                                                                     */
import fs from "node:fs"; import { createRequire } from "node:module";
const require = createRequire("/Users/alanharvey/SCINTILLA 0.5/visual-supervisor/package.json");
const { chromium } = require("playwright-core");
const [out, ...tickers] = process.argv.slice(2), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, args: ["--disable-gpu", "--hide-scrollbars", "--mute-audio"] });
const writes = [], errors = [], names = fs.existsSync(out) ? (JSON.parse(fs.readFileSync(out, "utf8")).names || {}) : {};
const save = (served, servedAt) => fs.writeFileSync(out, JSON.stringify({ what: "CW1 · the live Hub COMPS tab's own state per name, read headless from https://scintillahub.ai (nothing recomputed, nothing written)", read_from: "https://scintillahub.ai/", served_n: served.length, served_at: servedAt, errors: errors.slice(0, 10), writes_blocked: writes.length, writes: [...new Set(writes)].slice(0, 10), names }, null, 1));
try {
  const context = await browser.newContext({ viewport: { width: 1680, height: 1050 }, deviceScaleFactor: 1, serviceWorkers: "block" });
  await context.route("**/*", async (route) => { const req = route.request(), m = req.method(); if (m !== "GET" && m !== "HEAD" && m !== "OPTIONS") { const u = new URL(req.url()); writes.push(m + " " + u.host + u.pathname); return route.fulfill({ status: 201, headers: { "access-control-allow-origin": "*", "content-type": "application/json" }, body: "[]" }); } return route.continue(); });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.length < 30 && errors.push(String(e.message).slice(0, 240)));
  await page.goto("https://scintillahub.ai/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(10000);
  const U = JSON.parse(fs.readFileSync(new URL("../data/universe-20261009.json", import.meta.url), "utf8")); const served = U.tickers, servedAt = U.read_utc;
  console.log("the Hub universe (ticker_cohorts, 9 Oct read):", served.length);
  for (const T of tickers) {
    const r = { ticker: T, read_utc: new Date().toISOString() };
    if (served.length && !served.includes(T)) { r.skipped = "not in the Hub universe (ticker_cohorts)"; names[T] = r; console.log(T, "SKIPPED not served"); save(served, servedAt); continue; }
    try {
      r.dash = await page.evaluate((t) => { const row = (typeof S !== "undefined" && S.rows || []).find((x) => x.t === t); return row ? { fpe: row.fpe ?? null, price: row.p ?? row.price ?? row.last ?? null } : null; }, T);
      await page.evaluate((t) => { openCo(t); }, T); await sleep(2500);
      await page.evaluate(() => { const b = document.querySelector('[data-act="cotab"][data-tab="COMPS"]'); if (b) b.click(); });
      let ok = false; for (let i = 0; i < 90 && !ok; i++) { await sleep(1000); ok = await page.evaluate((t) => { const b = document.getElementById("scCompsTab"); return !!(b && b._cm && b._cm.C && b.dataset.mounted === t && !/BUILDING|READING/.test(b.innerText.slice(0, 200))); }, T); }
      if (!ok) { r.error = "the tab did not finish in 90 s"; r.text = await page.evaluate(() => (document.getElementById("scCompsTab") || {}).innerText || "").then((t) => t.slice(0, 600)); }
      else r.state = await page.evaluate(() => {
        /* a bounded copy of any value: depth 7, arrays to 60, strings to 600, functions and DOM nodes dropped */
        const cp = (v, d = 0) => { if (v == null || typeof v === "number" || typeof v === "boolean") return v; if (typeof v === "string") return v.length > 600 ? v.slice(0, 600) + "…" : v; if (typeof v === "function") return undefined; if (v instanceof Node) return undefined; if (d > 7) return "…"; if (v instanceof Set) v = [...v]; if (v instanceof Map) v = Object.fromEntries(v); if (Array.isArray(v)) return v.slice(0, 60).map((x) => cp(x, d + 1)); const o = {}; for (const k of Object.keys(v).slice(0, 80)) { const x = cp(v[k], d + 1); if (x !== undefined) o[k] = x; } return o; };
        const S = document.getElementById("scCompsTab")._cm, C = S.C, c6 = C.c6 || {}, snap = C.snap || {};
        const rows = (C.rows || []).filter((x) => x && x.key).map((x) => cp(x));
        const snapOut = cp({ taken: snap.taken, today: snap.today, name: snap.name, cohort: snap.cohort, peer_source: snap.peer_source, sector: snap.sector, industry: snap.industry, price: snap.price, price_date: snap.price_date, price_from: snap.price_from, shares: snap.shares, mcap: snap.mcap, net_debt: snap.net_debt, net_debt_date: snap.net_debt_date, eps_ttm: snap.eps_ttm, eps_date: snap.eps_date, eps_fy1: snap.eps_fy1, fy1_date: snap.fy1_date, eps_fy2: snap.eps_fy2, fy2_date: snap.fy2_date, forward: snap.forward, fwd: snap.fwd, fwd_peers: snap.fwd_peers, eps_fy1_annual: snap.eps_fy1_annual, pe_fwd_annual: snap.pe_fwd_annual, revenue_ttm: snap.revenue_ttm, ebitda_ttm: snap.ebitda_ttm, dates: snap.dates, peer_dates: snap.peer_dates, table: snap.table, rows: snap.rows, members: snap.members, excluded: snap.excluded, names: snap.names, arithmetic: snap.arithmetic, quotes_error: snap.quotes_error });
        const kept = (S.set && S.set.kept || []).map((k) => ({ ticker: k.ticker, sim: k.sim, why: k.why, sources: k.sources, line_source: k.line_source, seat: !!k.seat, stated: !!k.stated, reference: !!k.reference, has_figures: k.has_figures ?? null, market_cap: k.market_cap ?? null, shared: (k.shared || []).slice(0, 3) }));
        const setOther = S.set ? cp({ dropped: S.set.dropped, off: S.set.off, words: S.set.words, keys: Object.keys(S.set) }) : null;
        return { T: S.T, way: S.way, n: S.n, mode: S.mode, today: S.opts && S.opts.today, price: snap.price ?? null, forward: snap.forward,
          Ckeys: Object.keys(C), c6: cp(c6), band: cp(C.band), upside: cp(C.upside), reason: C.reason ?? null, ways: cp(C.ways), sel: cp(C.sel), off: cp(C.off), measureWeights: cp(C.measureWeights), peerWeights: cp(C.peerWeights), outliers: cp(C.outliers), cp1: cp(C.cp1),
          peersOn: C.peersOn || null, members: S.members, rows, snap: snapOut, kept, setOther,
          text: document.getElementById("scCompsTab").innerText.replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").slice(0, 9000) };
      });
    } catch (e) { r.error = String(e && e.message || e).slice(0, 300); }
    names[T] = r; save(served, servedAt);
    console.log(T, r.error ? "ERROR " + r.error : `${r.state.c6 && r.state.c6.pricedOn} · band ${JSON.stringify(r.state.band && [r.state.band.lo, r.state.band.mid ?? r.state.band.centre, r.state.band.hi])} · price ${r.state.price} · peers on ${(r.state.peersOn || []).length} · rows ${r.state.rows.length}`);
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ done: true, n_errors: errors.length, writes_blocked: writes.length }));
