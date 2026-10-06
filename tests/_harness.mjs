/* PA4 (5 Oct 2026) — the shared headless harness: a local stand-in for Vercel (static index.html + the rewrites in vercel.json),
   a headless browser, every non-GET request blocked and counted unless the caller allows a path. Used by the tests, the
   picture run and the guidance writer. */
import { createRequire } from "node:module";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const require = createRequire("/Users/alanharvey/SCINTILLA 0.5/visual-supervisor/package.json");
export const { chromium } = require("playwright-core");
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const API = "https://scintilla-massive-chart-api.fly.dev";
export const SB = "https://wadinxqplrggagkvrdag.supabase.co/rest/v1";
export const KEY = fs.readFileSync(path.join(ROOT, "index.html"), "utf8").match(/const SB_ANON='([^']+)'/)[1];
export const rewrites = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8")).rewrites;
export const sbGet = async (p) => { const r = await fetch(SB + "/" + p, { headers: { apikey: KEY, Authorization: "Bearer " + KEY } }); if (r.status !== 200) throw new Error(p + " " + r.status); return r.json(); };
export const hours = (iso) => (Date.now() - Date.parse(iso)) / 36e5;
export async function startServer() {
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, "http://x"); const rw = rewrites.find((x) => x.source === u.pathname);
    if (rw) { try { const r = await fetch(rw.destination + u.search); res.writeHead(r.status, { "content-type": r.headers.get("content-type") || "application/json" }); return res.end(Buffer.from(await r.arrayBuffer())); } catch (e) { res.writeHead(502); return res.end(String(e)); } }   /* PA6: the upstream's own type — the C5 method is a JavaScript module */
    const f = path.join(ROOT, u.pathname === "/" ? "index.html" : u.pathname);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": f.endsWith(".json") ? "application/json" : "text/html" }); res.end(fs.readFileSync(f));
  });
  await new Promise((ok) => server.listen(0, ok));
  return { server, port: server.address().port, url: `http://127.0.0.1:${server.address().port}/` };
}
/* opts.allowPost: a predicate(url) for the one write path a test lets through (it is still counted in nonGet.allowed) */
export async function openPage({ width = 1680, height = 1050, allowPost = null, storage = null } = {}) {
  const srv = await startServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width, height } });
  if (storage) await context.addInitScript((st) => { for (const [k, v] of Object.entries(st)) localStorage.setItem(k, v); }, storage);
  const page = await context.newPage();
  const errors = [], nonGet = { blocked: 0, allowed: 0, urls: [] };
  await page.route("**/*", (r) => { const m = r.request().method(); if (m !== "GET") { nonGet.urls.push(m + " " + r.request().url()); if (allowPost && allowPost(r.request().url())) { nonGet.allowed++; return r.continue(); } nonGet.blocked++; return r.abort(); } r.continue(); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(srv.url, { waitUntil: "networkidle", timeout: 180000 }); await page.waitForTimeout(2500);
  const close = async () => { await browser.close(); srv.server.close(); };
  return { page, browser, errors, nonGet, close, url: srv.url };
}
