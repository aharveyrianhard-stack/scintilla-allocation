/* AL8 (7 Oct 2026) — the dated files the page reads until the Hub serves the originals. Nothing here is computed: each file is another
   lane's own output, copied (the cards) or cut down to what the page draws (the zones, the five scenarios), with where it came from.
     data/decision-cards-20261006.json     the 26 decision cards, byte for byte (Hub branch hub/cp1-comps-cards-20261006)
     data/confluence-zones-20261006.json   every name's zones as they stand on the close — low, high, side, distance, the named members
                                           (Hub branch hub/cz1-confluence-20261006); the 20-session projections are left out
     data/deployment-scenarios.json        the five scenario rows of the deployment study, marked "placeholder" (allocation branch
                                           dm1-deployment-engine-20261007). The page reads study/dm1/data/dm1.json first — the engine's own
                                           file, when that branch is merged — and this file only while that one is absent.
   node scripts/al8-data.mjs [cards worktree] [zones worktree] [deployment worktree] */
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { execFileSync } from "node:child_process"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), W = "/Users/alanharvey/SCINTILLA 0.5/_worktrees/";
const CARDS = process.argv[2] || W + "cp1-comps-cards-20261006", ZONES = process.argv[3] || W + "cz1-confluence-20261006", DEPLOY = process.argv[4] || W + "alloc-dm1-deployment-engine-20261007";
const sha = (dir) => execFileSync("git", ["-C", dir, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
const branch = (dir) => execFileSync("git", ["-C", dir, "rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" }).trim();
const sum = (buf) => crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);
const out = (name, text) => { fs.writeFileSync(path.join(ROOT, "data", name), text); console.log(name, text.length, "bytes", sum(text)); };

/* 1 · the cards, as they are */
{ const src = path.join(CARDS, "deliverables/20261006/decision-cards/data/cards.json"), buf = fs.readFileSync(src, "utf8"), j = JSON.parse(buf);
  out("decision-cards-20261006.json", buf);
  console.log("  cards", Object.keys(j.cards).length, "· card date", j.as_of.card_date, "· from", branch(CARDS), "@" + sha(CARDS)); }

/* 2 · the zones on the close */
{ const win = {}; new Function("window", fs.readFileSync(path.join(ZONES, "deliverables/20261006/confluence-zones/data/confluence-page-20261006.js"), "utf8"))(win); const Z = win.CZ1;
  const names = {};
  for (const [t, n] of Object.entries(Z.names)) {
    const inZone = new Set(n.zones.flatMap((z) => z.m.map((m) => m[0])));
    names[t] = { price: n.price, as_of: n.as_of, lines_reviewed: !!n.lines,
      averages: Object.fromEntries(Object.entries(n.avg || {}).filter(([, a]) => a && a.v != null).map(([k, a]) => [k, a.v])),   /* a fund too new for a 200-day has none */
      zones: n.zones.map((z) => ({ low: z.lo, high: z.hi, side: z.side, pct: z.d, two_sources: !!z.ms, members: z.m.map(([label, level, kind, tf]) => ({ label, level, kind: kind === "a" ? "average" : "line", tf })) })),
      /* every reviewed line of the name as the zones study read it (the long-term context rails left out), for the nearest named level */
      levels: (n.levels || []).filter((l) => !l.lt).map((l) => ({ label: l.label, level: l.v, tf: l.tf })),
      /* a reviewed line or an average that stands by itself (in no zone), nearest first — the page names the one between two zones */
      alone: (n.levels || []).filter((l) => !inZone.has(l.label) && !l.lt).map((l) => ({ label: l.label, level: l.v, pct: l.d, tf: l.tf })).sort((a, b) => Math.abs(a.pct) - Math.abs(b.pct)).slice(0, 8) };
  }
  out("confluence-zones-20261006.json", JSON.stringify({ what: "confluence zones on the close: two or more named levels within 1% of each other — reviewed lines by the Lab's own labels, and the 21-, 50-, 100- and 200-day averages",
    as_of: Z.as_of, built_at: Z.built_at, rule: Z.rule.zone, two_sources: Z.rule.multi_source, source: { branch: branch(ZONES), sha: sha(ZONES), file: "deliverables/20261006/confluence-zones/data/confluence-page-20261006.js" }, parents: Z.name_parents, names }));
  console.log("  names", Object.keys(names).length, "· MU zones below:", names.MU.zones.filter((z) => z.side === "below").map((z) => z.low + "–" + z.high + " (" + z.members.map((m) => m.label).join(" + ") + ")").join(" · ")); }

/* 3 · the five scenarios — placeholder until the engine's own file sits beside the page */
{ const j = JSON.parse(fs.readFileSync(path.join(DEPLOY, "study/dm1/data/dm1.json"), "utf8"));
  out("deployment-scenarios.json", JSON.stringify({ status: "placeholder",
    what: "the deployment study's five scenario rows from the 6 Oct close — a study on a branch, not reviewed and not wired; the page labels every number read from this file as a placeholder",
    built_utc: j.built_utc, source: { branch: branch(DEPLOY), sha: sha(DEPLOY), file: "study/dm1/data/dm1.json" },
    today: j.today, scenarios: j.scenarios.map((s) => ({ key: s.key, name: s.name, note: s.note, spy: s.spy, rsi: s.rsi, vix: s.vix, vixPct: s.vixPct, pct: s.pct, line: s.line, money: s.money })) }, null, 1));
  console.log("  scenarios", j.scenarios.map((s) => s.key + " " + s.pct).join(" · ")); }
