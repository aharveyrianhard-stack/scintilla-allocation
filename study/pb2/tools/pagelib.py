#!/usr/bin/env python3
"""PB2 · small pieces the page and the playbook are built from: number formats, bars, tables. No data logic lives here."""
import datetime, html

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def esc(s): return html.escape(str(s), quote=False)


def day(d):
    """'2026-10-06' -> '6 Oct 2026'"""
    if not d: return "—"
    y, m, dd = d.split("-"); return f"{int(dd)} {MONTHS[int(m) - 1]} {y}"


def pct(v, k=1, sign=True):
    """A share of 1 as a signed percent with a real minus sign: 0.048 -> '+4.8%'."""
    if v is None: return "—"
    x = round(100 * v, k)
    if x == 0: x = 0.0
    s = f"{abs(x):.{k}f}%"
    return ("−" if x < 0 else ("+" if sign else "")) + s


def pp(v, k=1):
    """A difference in points: 0.021 -> '+2.1'."""
    if v is None: return "—"
    x = round(100 * v, k)
    if x == 0: return f"{0:.{k}f}"
    return ("−" if x < 0 else "+") + f"{abs(x):.{k}f}"


def ab(v, k=1):
    """The size of a difference with no sign, for sentences that say the direction in words: -0.023 -> '2.3'."""
    return "—" if v is None else f"{abs(round(100 * v, k)):.{k}f}"


def way(v, neg, pos, k=1, unit=" points"):
    """'2.3 points cheaper' or '2.3 points dearer' — the word follows the sign, so a re-measure cannot leave the sentence wrong."""
    if v is None: return "—"
    return f"{ab(v, k)}{unit} {neg if v < 0 else pos}"


def sh(v, k=0):
    if v is None: return "—"
    return f"{100 * v:.{k}f}%"


def usd(v, k=2): return "—" if v is None else f"{v:,.{k}f}"


def n0(v): return "—" if v is None else f"{v:,.0f}"


def ci(e, key="ci", k=1):
    """'−3.2 to −1.4' from a [lo, hi] pair in shares of 1."""
    if not e or e.get(key) is None: return "—"
    lo, hi = e[key]; return f"{pp(lo, k)} to {pp(hi, k)}"


def cls(v):
    if v is None: return ""
    return "up" if v > 0 else ("dn" if v < 0 else "")


def num(v, k=1, c=True):
    """A signed percent in a table cell, green over zero and red under it."""
    return f'<span class="{cls(v) if c else ""}">{pct(v, k)}</span>'


def signed_bar(v, vmax, label=None, k=1, width=None):
    """A bar that grows right (green) for a gain and left (red) for a loss from a centre line."""
    if v is None: return '<div class="sb"></div><span class="bv">—</span>'
    w = min(50.0, 50.0 * abs(v) / vmax) if vmax else 0
    side = "pos" if v >= 0 else "neg"
    return f'<div class="sb"><i class="{side}" style="width:{w:.1f}%"></i></div><span class="bv {cls(v)}">{label if label is not None else pct(v, k)}</span>'


def share_bar(v, label=None):
    if v is None: return '<div class="pb"></div><span class="bv">—</span>'
    return f'<div class="pb"><i style="width:{max(0.0, min(100.0, 100 * v)):.1f}%"></i></div><span class="bv">{label if label is not None else sh(v)}</span>'


def table(head, rows, cls_="", note=None):
    """head: list of (text, is_number); rows: list of lists of html strings."""
    h = "".join(f'<th class="{"n" if isn else ""}">{t}</th>' for t, isn in head)
    b = "".join("<tr>" + "".join(f'<td class="{"n" if head[i][1] else ""}">{c}</td>' for i, c in enumerate(r)) + "</tr>" for r in rows)
    return f'<div class="wrap"><table class="{cls_}"><thead><tr>{h}</tr></thead><tbody>{b}</tbody></table></div>' + (f'<div class="small">{note}</div>' if note else "")


def stacked(parts):
    """A 100%-wide bar in segments. parts: [(share, css class, label)]"""
    tot = sum(p[0] for p in parts) or 1
    return '<div class="stk">' + "".join(f'<i class="{c}" style="width:{100 * p / tot:.2f}%" title="{esc(l)}"></i>' for p, c, l in parts if p > 0) + "</div>"


CSS = """
:root{--bg:#0a0b0d;--panel:#101114;--panel2:#0d0e11;--line:#1d1e23;--line2:#2a2b31;--txt:#d0d0d2;--dim:#9a9ca2;--faint:#6e7076;--up:#2fbf71;--dn:#cc4458;--mid:#8f9197;--mark:#bfc0c4}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--txt);font-family:"SF Mono",ui-monospace,Menlo,Consolas,monospace;font-size:13px;line-height:1.55;padding:18px 14px 70px;overflow-x:hidden}
@media(min-width:900px){body{padding:24px 30px 70px}}
h1{font-size:18px;letter-spacing:.2em;font-weight:600;margin:10px 0 0;line-height:1.45}
.sub{color:var(--dim);margin-top:6px;font-size:11px;letter-spacing:.08em;line-height:1.6}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px 18px;margin-top:16px;min-width:0}
@media(max-width:600px){.panel{padding:13px 11px}}
.panel h2{font-size:12px;letter-spacing:.18em;color:var(--txt);margin:0 0 4px;font-weight:600;line-height:1.5;text-transform:uppercase}
.panel h3{font-size:11px;letter-spacing:.16em;color:var(--dim);margin:20px 0 8px;font-weight:600;text-transform:uppercase;line-height:1.5}
.ans{font-size:14px;line-height:1.65;margin:8px 0 2px;max-width:1150px}
.ans b{font-weight:600}
table{border-collapse:collapse;width:100%;font-size:12px}
th{color:var(--dim);text-align:left;font-weight:400;font-size:11px;letter-spacing:.06em;padding:6px 7px;border-bottom:1px solid var(--line2);vertical-align:bottom;line-height:1.4}
td{padding:6px 7px;border-bottom:1px solid var(--line);vertical-align:top;line-height:1.45}
td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}td.n{white-space:nowrap}
tr.hl td{background:#15161a}
tr.sep td{border-top:1px solid var(--line2)}
.wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
.wrap table{min-width:640px}
.wrap table.wide{min-width:1000px}
table.wide td:first-child,table.wide th:first-child{min-width:215px}
table.lab2 td:nth-child(3){min-width:230px;white-space:normal}
.dim{color:var(--dim)}.small{font-size:11px;color:var(--dim);line-height:1.6;margin-top:6px;max-width:1150px}
.up{color:var(--up)}.dn{color:var(--dn)}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));gap:10px;margin-top:14px}
.tile{border:1px solid var(--line);border-radius:8px;padding:12px 14px;background:var(--panel2);min-width:0}
.tile .l{font-size:11px;letter-spacing:.14em;color:var(--dim);text-transform:uppercase;line-height:1.5}
.tile .v{font-size:15px;font-weight:600;margin-top:6px;line-height:1.4}
.tile .d{font-size:12px;color:var(--dim);margin-top:6px;line-height:1.6}
.rows{display:grid;gap:5px;margin-top:8px}
.brow{display:grid;grid-template-columns:minmax(150px,330px) minmax(90px,1fr) 62px minmax(90px,1fr) 62px;gap:8px;align-items:center;font-size:12px}
.brow.h{color:var(--dim);font-size:11px;letter-spacing:.06em;align-items:end}
.brow .bl{line-height:1.4;min-width:0}
.brow.one{grid-template-columns:minmax(150px,330px) minmax(120px,1fr) 70px}
@media(max-width:700px){.brow{grid-template-columns:minmax(0,1fr) 54px minmax(0,1fr) 54px;row-gap:2px;column-gap:6px}.brow .bl{grid-column:1/-1}.brow.one{grid-template-columns:1fr 64px}
.brow.h{margin-bottom:4px}.brow.h>div:nth-child(2){grid-column:1/3}.brow.h>div:nth-child(4){grid-column:3/5}.brow.h>div:nth-child(3),.brow.h>div:nth-child(5){display:none}.brow.h .bl{color:var(--txt)}}
.cap{display:none;font-size:11px;color:var(--faint)}
.sb{position:relative;height:12px;background:linear-gradient(var(--line2),var(--line2)) center/1px 100% no-repeat;min-width:0}
.sb i{position:absolute;top:2px;height:8px}.sb i.pos{left:50%;background:var(--up);border-radius:0 3px 3px 0}.sb i.neg{right:50%;background:var(--dn);border-radius:3px 0 0 3px}
.pb{position:relative;height:12px;background:#17181c;border-radius:3px;min-width:0;overflow:hidden}.pb i{position:absolute;left:0;top:0;bottom:0;background:var(--mid);border-radius:3px}
.bv{font-variant-numeric:tabular-nums;white-space:nowrap;text-align:right;font-size:12px}
.stk{display:flex;height:16px;border-radius:3px;overflow:hidden;background:#17181c;min-width:0}.stk i{display:block;height:100%}
.p0{background:#3d3e44}.p1{background:#62646b}.p2{background:#8f9197}.p3{background:#c2c3c7}
.srow{display:grid;grid-template-columns:minmax(150px,300px) minmax(120px,1fr);gap:10px;align-items:center;font-size:12px;margin-top:6px}
@media(max-width:700px){.srow{grid-template-columns:1fr}}
.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:11px;color:var(--dim);margin:8px 0 2px}.legend i{display:inline-block;width:11px;height:11px;vertical-align:-1px;margin-right:6px;border-radius:2px}.legend i.ln{height:2px;width:18px;vertical-align:3px;border-radius:0}
.chart{overflow-x:auto;-webkit-overflow-scrolling:touch;margin-top:8px}.chart svg{display:block;width:100%;min-width:880px;max-width:1240px;height:auto}
.two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,430px),1fr));gap:18px}.two>div{min-width:0}
.verdict{display:inline-block;font-size:11px;letter-spacing:.14em;font-weight:600;padding:2px 7px;border:1px solid var(--line2);border-radius:4px;white-space:nowrap}
.verdict.keep{color:var(--up);border-color:#1f5a3b}.verdict.change{color:var(--mark);border-color:#55565c}.verdict.drop{color:var(--dn);border-color:#6b2a35}
.q{border-left:2px solid var(--line2);padding:2px 0 2px 10px;margin:6px 0;color:var(--dim);font-size:12px;line-height:1.6}
.ok{color:var(--up)}.bad{color:var(--dn)}
details{margin-top:12px}details>summary{cursor:pointer;font-size:11px;letter-spacing:.14em;color:var(--dim);text-transform:uppercase}details[open]>summary{margin-bottom:8px}
details.sc-pagespecs{margin-top:24px;color:var(--dim);font-size:12px;line-height:1.7}details.sc-pagespecs summary{letter-spacing:.2em}
details.sc-pagespecs h4{font-size:11px;letter-spacing:.16em;color:var(--txt);margin:16px 0 4px;font-weight:600;text-transform:uppercase}
details.sc-pagespecs p,details.sc-pagespecs li{margin:4px 0;max-width:1150px}details.sc-pagespecs ul{padding-left:18px;margin:4px 0}
ul.plain{padding-left:18px;margin:8px 0;max-width:1150px}ul.plain li{margin-bottom:7px;line-height:1.6}
.scnav{display:flex;gap:6px;font:600 11px/1 ui-monospace,"SF Mono",Menlo,Consolas,monospace;letter-spacing:.16em;text-transform:uppercase;margin:0 0 6px}
.scnav a{display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 12px;background:rgba(10,11,13,.92);color:#9a9ea3;border:1px solid rgba(150,154,160,.35);border-radius:4px;text-decoration:none}
.scnav a:hover,.scnav a:focus-visible{color:#c4c7cb;border-color:rgba(190,194,198,.75);outline:none}
"""
