#!/usr/bin/env python3
"""PB2 · the local open-model critique. A language model run under llama.cpp on this MacBook (no paid model API) is given ONE
facts sheet built from this study's own numbers and argues three sides of the Micron plan — a bull, a bear and a risk
manager — then names three changes after reading both sides.

  usage: critique.py <label>=<gguf> [<label>=<gguf> ...]
         e.g. critique.py qwen2.5-7b=/path/qwen2.5-7b-instruct-q4_k_m-00001-of-00002.gguf fin-o1-8b=/path/fin-o1-8b-q4.gguf

Three mechanical checks keep the model honest, because a small model misreads:
  QUOTES   every point must carry the sentence from the facts it rests on, copied word for word; each quote is looked up in the sheet.
  FIGURES  every number the model writes is looked up in the sheet.
  QUIZ     ten yes/no questions whose answers are in the sheet, scored against the truth computed from the study's data.
Writes study/pb2/data/parts/critique.json."""
import json, os, re, subprocess, sys, time, urllib.request
from common import DATA

P = json.load(open(os.path.join(DATA, "pb2.json")))
pc = lambda v, k=1: "n/a" if v is None else f"{100 * v:+.{k}f}%"
sh = lambda v: "n/a" if v is None else f"{100 * v:.0f}%"


def facts():
    c = P["cases"]; L = P["layer"]["sets"]; S = P["stops"]; R = P["review"]; t = c["today_mu"]; mo = L["micron_own"]; w = L["wide"]; rg = R["range"]; reg = R["regimes"]; mr = R["market_rules"]
    f1 = S["micron_first_close_under_100"]; b100 = S["levels"]["100"]["all"]; rule = lambda k: mr["rules"][k]
    e = lambda k, i=1: rule(k)["spy"][i]
    lv = {x["name"]: x for x in rg["levels"]}
    lines = [
        "THE PLAN (Micron, drafted 7 Oct 2026, not live):",
        f"- Micron closed {t['close']:.2f} on {t['date']}. 21-day average {t['ma21']:.2f}, 50-day {t['ma50']:.2f}, 100-day {t['ma100']:.2f}, 200-day {t['ma200']:.2f}. It is {abs(100 * t['off_high']):.1f}% under its 52-week high of {t['high252']:.2f}.",
        "- Four buy orders: 18 shares at 1,036.13; 22 shares at 1,030.40; 27 shares at 1,011.77; then 37 shares at 989.17, placed only after one of the first three fills. 104 shares in all, about 20% of the account. At most three orders work at once. Orders are re-priced each evening.",
        "- The stop under study: sell on a daily close under the 100-day average, buy back on a daily close above it. The old stop near 900 was rejected by the owner as too far.",
        "- A deeper buy 5% to 8% under the 100-day average is allowed only when the VIX is 20 or more.",
        "",
        "TODAY'S READINGS:",
        f"- VIX {mr['today']['vix']:.2f}. Credit (high-yield bond fund with payouts) is UNDER its 200-day average since {mr['today']['credit_under_since']}. The 10-year yield is {mr['today']['ten']:.2f}% and its RSI is in the top {100 - mr['today']['ten_rsi_pct']:.0f}% of its own year.",
        f"- A market-regime model (three states: calm, choppy, stress) reads today as '{reg['today']['state']}' with probability {100 * reg['today']['prob'][reg['today']['state']]:.0f}%.",
        f"- Micron's expected daily range tomorrow is {rg['expected_range_pct']:.1f}% (about {rg['expected_range_usd']:.0f} dollars). The first two orders are {abs(lv[P['layer']['sizes']['draft_names'][0]]['dist_pct'] - lv[P['layer']['sizes']['draft_names'][1]]['dist_pct']):.2f}% apart.",
        f"- Chance each order is reached in the next session / within 5 sessions: 1,036.13: {sh(lv[P['layer']['sizes']['draft_names'][0]]['p1'])} / {sh(lv[P['layer']['sizes']['draft_names'][0]]['p5'])}; 1,011.77: {sh(lv[P['layer']['sizes']['draft_names'][2]]['p1'])} / {sh(lv[P['layer']['sizes']['draft_names'][2]]['p5'])}; 989.17: {sh(lv[P['layer']['sizes']['draft_names'][3]]['p1'])} / {sh(lv[P['layer']['sizes']['draft_names'][3]]['p5'])}.",
        "",
        f"HISTORY OF SET-UPS LIKE THIS ({c['wide']['n']} leader pullbacks in {c['counts']['names_with_cases']} stocks since 2003; a leader is 25% or more over its rising 200-day, 8% or more off its high, 0-3% over its rising 21-day):",
        f"- Held the 21-day average for 10 sessions: {sh(c['wide']['held21_10'])}. Touched the 50-day within 20 sessions: {sh(c['wide']['t50_20'])}. Touched the 100-day within 20 sessions: {sh(c['wide']['t100_20'])}.",
        f"- Median deepest dip within 20 sessions {pc(c['wide']['dd20_med'])}, within 60 sessions {pc(c['wide']['dd60_med'])}. Median result 60 sessions later {pc(c['wide']['r60_med'])}; higher in {sh(c['wide']['r60_pos'])} of cases. New 52-week high within 60 sessions: {sh(c['wide']['nh60'])}.",
        f"- When the 50-day and 100-day were within 3% of each other, as now ({c['wide_bunched_flag']['n']} cases): touched the 50-day within 20 sessions {sh(c['wide_bunched_flag']['t50_20'])}, the 100-day {sh(c['wide_bunched_flag']['t100_20'])}; median result 60 sessions later {pc(c['wide_bunched_flag']['r60_med'])}; higher in {sh(c['wide_bunched_flag']['r60_pos'])}.",
        f"- Micron's own {c['micron_own']['n']} set-ups: median deepest dip within 20 sessions {pc(c['micron_own']['dd20_med'])}; median result 60 sessions later {pc(c['micron_own']['r60_med'])}; higher in {sh(c['micron_own']['r60_pos'])}.",
        "",
        f"THE ORDER LAYER REPLAYED on Micron's own {mo['allin21']['n']} set-ups (result = profit on the planned money 60 sessions later; drawdown = worst loss on the planned money inside 60 sessions):",
        f"- Everything at the 21-day: median result {pc(mo['allin21']['res']['60']['med'])}, average {pc(mo['allin21']['res']['60']['mean'])}, worst-tenth drawdown {pc(mo['allin21']['res']['60']['dd_p10'])}.",
        f"- Pyramid at the 21, 50 and 100-day, bigger lower, no stop: median {pc(mo['pyramid']['res']['60']['med'])}, average {pc(mo['pyramid']['res']['60']['mean'])}, worst-tenth drawdown {pc(mo['pyramid']['res']['60']['dd_p10'])}. The 100-day order filled within 60 sessions in {sh(mo['pyramid']['rungs'][2]['fill60'])} of cases.",
        f"- Pyramid with the 100-day close stop and buy-back: median {pc(mo['pyr_stop']['res']['60']['med'])}, average {pc(mo['pyr_stop']['res']['60']['mean'])}, worst-tenth drawdown {pc(mo['pyr_stop']['res']['60']['dd_p10'])}; {mo['pyr_stop']['stops_per100']:.0f} stops and {mo['pyr_stop']['whipsaws_per100']:.0f} whipsaws per 100 cases.",
        f"- The four drafts as placed: median {pc(mo['draft']['res']['60']['med'])}, average {pc(mo['draft']['res']['60']['mean'])}, worst-tenth drawdown {pc(mo['draft']['res']['60']['dd_p10'])}. All three working orders filled in one single session in {sh(mo['draft']['same_day3'])} of cases.",
        f"- Pyramid with a fixed stop 13% under the first fill (the old 900): median {pc(mo['pyr_fixed13']['res']['60']['med'])}; the stop was hit in {sh(mo['pyr_fixed13']['stopped'])} of cases.",
        "",
        "STOPS:",
        f"- Micron's first daily close under a rising 100-day ({f1['n']} cases): back above within 20 sessions {f1['back_within20']} times. Of the {f1['back_within60']} that came back within 60 sessions, {f1['whipsaws']} were bought back at a higher price than they were sold (median {pc(f1['rebuy_vs_sale_med'])} higher).",
        f"- Across {b100['all']['n']} days when a stock's low broke a rising 100-day: {sh(b100['flush_share'])} closed back above it the same day. Against simply holding, 60 sessions later an intraday stop was {pc(b100['all']['intraday']['eff60_mean'])} on average and a daily-close stop {pc(b100['all']['close']['eff60_mean'])}.",
        "",
        "MARKET RULES (edge = rule days minus other days, SPY 60 sessions later, with a 95% interval):",
        f"- VIX spike above 20: edge {pc(e('vix_spike_20')['edge_mean'])}, interval {pc(e('vix_spike_20')['edge_mean_ci'][0])} to {pc(e('vix_spike_20')['edge_mean_ci'][1])}.",
        f"- Credit under its 200-day: edge {pc(e('credit_under_200')['edge_mean'])}, interval {pc(e('credit_under_200')['edge_mean_ci'][0])} to {pc(e('credit_under_200')['edge_mean_ci'][1])}. For Micron itself 60 sessions later: {pc(rule('credit_under_200')['mu'][1]['edge_mean'])}, interval {pc(rule('credit_under_200')['mu'][1]['edge_mean_ci'][0])} to {pc(rule('credit_under_200')['mu'][1]['edge_mean_ci'][1])}.",
        f"- 10-year yield stretched high (as now): edge {pc(e('ten_short_stretched_high')['edge_mean'])}, interval {pc(e('ten_short_stretched_high')['edge_mean_ci'][0])} to {pc(e('ten_short_stretched_high')['edge_mean_ci'][1])}.",
        "",
        "VALUATION NOTE (from the owner's comps work, not measured here): Micron trades near 6.0 times next year's earnings; SK hynix 3.6, Samsung 3.9, Kioxia 3.7.",
    ]
    return "\n".join(lines)


FORMAT = """Give exactly THREE points. Write each point as two lines:
POINT: one sentence of argument in your own words.
FACT: "the one sentence, or part of a sentence, from the FACTS that supports it, copied word for word"
Then one last pair of lines:
WEAKEST: one sentence on what most weakens your own side.
FACT: "the fact behind that, copied word for word"."""
ROLES = {
    "bull": "You are the BULL. Argue, from the facts only, why this plan is worth doing and where it is too timid.",
    "bear": "You are the BEAR. Argue, from the facts only, why this plan could lose money or tie up money for nothing.",
    "risk": "You are the RISK MANAGER. You do not care about direction. Judge, from the facts only, the size, the spacing of the orders, the stop and the deep buy: which part is most likely to hurt, and why.",
}
SYSTEM = "You review a trading plan for its owner, a finance professional. Use ONLY the facts given. Copy quotes exactly as written in the facts. Do not invent any number, price, date or event. Do not give a buy or sell order. Plain words, no headings."
NUM = re.compile(r"(?<![A-Za-z])[-+−]?\d[\d,]*\.?\d*%?")
QUIZ = """Answer these ten questions using ONLY the facts. Reply with one line of JSON and nothing else, like {"q1":"yes","q2":"no"}. Use "yes" or "no".
q1 Is the VIX today at 20 or more?
q2 Under the plan's own rule, is the deeper buy (5% to 8% under the 100-day average) allowed today?
q3 Is credit above its 200-day average today?
q4 On Micron's own set-ups, did putting everything at the 21-day have a HIGHER average result than the pyramid with no stop?
q5 On Micron's own set-ups, was the worst-tenth drawdown SMALLER with the 100-day close stop than for the pyramid with no stop?
q6 On Micron's own set-ups, was the fixed stop 13% under the first fill hit in MORE than half of the cases?
q7 Of Micron's first closes under a rising 100-day that came back within 60 sessions, were ALL bought back at a higher price than they were sold?
q8 Is the 95% interval for the 'VIX spike above 20' edge entirely above zero?
q9 Are the first two orders further apart than Micron's expected daily range?
q10 Sixty sessions after a stock's low broke a rising 100-day, did simply holding do better on average than the intraday stop?"""


def truth():
    c = P["cases"]; mo = P["layer"]["sets"]["micron_own"]; S = P["stops"]; R = P["review"]; mr = R["market_rules"]; rg = R["range"]; lv = {x["name"]: x for x in rg["levels"]}; dn = P["layer"]["sizes"]["draft_names"]
    f1 = S["micron_first_close_under_100"]; b = S["levels"]["100"]["all"]["all"]
    return dict(q1=mr["today"]["vix"] >= 20, q2=mr["today"]["vix"] >= 20, q3=not mr["today"]["credit_under"], q4=mo["allin21"]["res"]["60"]["mean"] > mo["pyramid"]["res"]["60"]["mean"],
                q5=mo["pyr_stop"]["res"]["60"]["dd_p10"] > mo["pyramid"]["res"]["60"]["dd_p10"], q6=mo["pyr_fixed13"]["stopped"] > 0.5, q7=f1["whipsaws"] == f1["back_within60"],
                q8=mr["rules"]["vix_spike_20"]["spy"][1]["edge_mean_ci"][0] > 0, q9=abs(lv[dn[0]]["dist_pct"] - lv[dn[1]]["dist_pct"]) > rg["expected_range_pct"], q10=b["intraday"]["eff60_mean"] < 0)


def ask(port, system, user, max_tokens=700, temperature=0.2):
    body = json.dumps({"model": "local", "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}], "temperature": temperature, "max_tokens": max_tokens, "seed": 20261007}).encode()
    req = urllib.request.Request(f"http://127.0.0.1:{port}/v1/chat/completions", data=body, headers={"Content-Type": "application/json"})
    r = json.load(urllib.request.urlopen(req, timeout=1500)); msg = r["choices"][0]["message"]; text = msg.get("content") or ""
    visible = re.sub(r"<think>.*?</think>", "", text, flags=re.S).strip()
    if "<think>" in visible: visible = ""                     # ran out of room while still thinking
    return visible, r.get("usage", {}), (bool(msg.get("reasoning_content")) or "<think>" in text)


def norm(tok): return tok.replace("−", "-").replace(",", "").rstrip(".").lstrip("+")
def squash(t): return re.sub(r"\s+", " ", t.replace("“", '"').replace("”", '"').replace("’", "'").replace("−", "-")).strip().lower()


def check_numbers(text, sheet):
    """Every figure in the answer, and whether the same figure stands in the facts sheet (sign and % ignored when the bare number matches)."""
    have = {norm(x).lstrip("-").rstrip("%") for x in NUM.findall(sheet)}; have |= {h.rstrip("0").rstrip(".") for h in have if "." in h}
    out = []
    for tok in NUM.findall(text):
        v = norm(tok).lstrip("-").rstrip("%")
        if not v or v in ("1", "2", "3"): continue            # the model numbering its own points
        out.append(dict(figure=tok, in_facts=(v in have or (("." in v) and v.rstrip("0").rstrip(".") in have))))
    return out


def parse_points(text, sheet):
    """POINT / FACT pairs, and whether each quoted fact stands word for word in the sheet."""
    sq = squash(sheet); pts = []; cur = None
    for line in text.splitlines():
        line = line.strip().lstrip("-*0123456789. ").strip()
        m = re.match(r"(POINT|WEAKEST|KEEP|CHANGE|DROP)\b[:\s]*(.*)", line, re.I)
        if m:
            body = m.group(2).strip(); inline = re.split(r"\bFACT\b\s*:", body, maxsplit=1, flags=re.I)        # "CHANGE: ... FACT: "..." on one line
            cur = dict(kind=m.group(1).upper(), text=inline[0].strip(), quote=None, verbatim=None); pts.append(cur)
            if len(inline) == 2:
                q = inline[1].strip().strip('"“”').strip(); cur["quote"] = q; core = squash(q).strip('". '); cur["verbatim"] = bool(core) and (core in sq or core.rstrip(".") in sq)
            continue
        m = re.match(r"FACT\b[:\s]*(.*)", line, re.I)
        if m and cur is not None and cur["quote"] is None:
            q = m.group(1).strip().strip('"“”').strip(); cur["quote"] = q
            core = squash(q).strip('". '); cur["verbatim"] = bool(core) and (core in sq or core.rstrip(".") in sq)
    return pts


def run_model(label, gguf, port, sheet, tr):
    t0 = time.time()
    srv = subprocess.Popen(["llama-server", "-m", gguf, "-ngl", "99", "-c", "12288", "-np", "1", "--host", "127.0.0.1", "--port", str(port), "--no-webui"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(300):
            try:
                if json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=2)).get("status") == "ok": break
            except Exception: time.sleep(1)
        else: raise RuntimeError("llama-server did not come up")
        out = dict(label=label, gguf=os.path.basename(gguf), load_seconds=round(time.time() - t0, 1), roles={}, thinking_model=False)
        for k, role in ROLES.items():
            t1 = time.time(); txt, use, th = ask(port, SYSTEM, role + "\n" + FORMAT + "\n\nFACTS:\n" + sheet, max_tokens=2600); out["thinking_model"] |= th
            nums = check_numbers(txt, sheet); pts = parse_points(txt, sheet)
            out["roles"][k] = dict(prompt=role, answer=txt, points=pts, seconds=round(time.time() - t1, 1), usage=use, figures=len(nums), figures_not_in_facts=[n["figure"] for n in nums if not n["in_facts"]],
                                   quotes=sum(1 for p in pts if p["quote"]), quotes_verbatim=sum(1 for p in pts if p["verbatim"]))
            print(label, k, out["roles"][k]["seconds"], "s; points", len(pts), "quotes verbatim", out["roles"][k]["quotes_verbatim"], "of", out["roles"][k]["quotes"], "| figures not in facts", out["roles"][k]["figures_not_in_facts"], flush=True)
        t1 = time.time()
        judge = ("You are the RISK MANAGER again. Below are the facts, then the bull's case and the bear's case. Name exactly THREE changes to the plan, most important first. Write each as two lines:\n"
                 "KEEP, CHANGE or DROP: the part of the plan and what to do with it, in one sentence.\nFACT: \"the fact behind it, copied word for word from the FACTS\"\n\nFACTS:\n" + sheet + "\n\nBULL:\n" + out["roles"]["bull"]["answer"] + "\n\nBEAR:\n" + out["roles"]["bear"]["answer"])
        txt, use, th = ask(port, SYSTEM, judge, max_tokens=2200); nums = check_numbers(txt, sheet); pts = parse_points(txt, sheet)
        out["roles"]["three_changes"] = dict(prompt="the risk manager's three changes after reading both sides", answer=txt, points=pts, seconds=round(time.time() - t1, 1), usage=use, figures=len(nums),
                                             figures_not_in_facts=[n["figure"] for n in nums if not n["in_facts"]], quotes=sum(1 for p in pts if p["quote"]), quotes_verbatim=sum(1 for p in pts if p["verbatim"]))
        t1 = time.time(); txt, use, th = ask(port, "Answer only from the facts. Reply with one line of JSON.", "FACTS:\n" + sheet + "\n\n" + QUIZ, max_tokens=2600, temperature=0.0)
        m = re.search(r"\{[^{}]*\}", txt, re.S); ans = {}
        try: ans = {k.lower(): str(v).strip().lower() for k, v in json.loads(m.group(0)).items()} if m else {}
        except Exception: ans = {}
        right = [k for k, v in tr.items() if ans.get(k) == ("yes" if v else "no")]
        out["quiz"] = dict(asked=len(tr), right=len(right), wrong=[k for k in tr if k not in right], answers=ans, raw=txt[:500], seconds=round(time.time() - t1, 1))
        print(label, "quiz", len(right), "of", len(tr), "wrong", out["quiz"]["wrong"], flush=True)
        out["total_seconds"] = round(time.time() - t0, 1); return out
    finally:
        srv.terminate()
        try: srv.wait(timeout=20)
        except Exception: srv.kill()


if __name__ == "__main__":
    sheet = facts(); tr = truth()
    out = dict(runtime="llama.cpp (llama-server, Metal, 12k context), temperature 0.2 for the arguments and 0 for the quiz, fixed seed", facts=sheet, quiz=QUIZ, quiz_truth={k: ("yes" if v else "no") for k, v in tr.items()}, format=FORMAT, models=[])
    for n, arg in enumerate(sys.argv[1:]):
        label, gguf = arg.split("=", 1); out["models"].append(run_model(label, gguf, 18231 + n, sheet, tr))
        os.makedirs(os.path.join(DATA, "parts"), exist_ok=True); json.dump(out, open(os.path.join(DATA, "parts", "critique.json"), "w"), indent=1, ensure_ascii=False)
    # what BOTH models' risk managers rested on: the same sentence of the facts, quoted word for word by each
    if len(out["models"]) >= 2:
        def quoted(m): return [squash(p["quote"]).strip('". ') for k in ("risk", "three_changes") for p in m["roles"][k]["points"] if p.get("verbatim")]
        a, b = quoted(out["models"][0]), quoted(out["models"][1]); both = []
        for x in a:
            for y in b:
                if (x in y or y in x) and min(len(x), len(y)) > 20:
                    short = x if len(x) <= len(y) else y
                    if short not in both: both.append(short)
        out["risk_quoted_by_both"] = both
        json.dump(out, open(os.path.join(DATA, "parts", "critique.json"), "w"), indent=1, ensure_ascii=False)
    print("CRITIQUE_DONE", [m["total_seconds"] for m in out["models"]])
