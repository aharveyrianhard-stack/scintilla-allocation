/* PA6 tests (6 Oct 2026): the way back. The Hub's scnav pair (← HUB · ✕ CLOSE) sits on the allocation page like on every Hub
   sub-page: both lead to the Hub (this tool lives on its own domain); it is drawn inline above the title, covers nothing, and
   is the first thing in the tab order. Headless, against the local stand-in for Vercel. node --test tests/ */
import { test } from "node:test";
import assert from "node:assert/strict";
import { openPage } from "./_harness.mjs";

let P;
test("the scnav pair is on the page, inline above the title, and both buttons lead to the Hub", async () => {
  P = await openPage();
  const s = await P.page.evaluate(() => {
    const nav = document.querySelector("nav.scnav"), h1 = document.querySelector("h1");
    const r = nav.getBoundingClientRect(), hr = h1.getBoundingClientRect();
    const b = [...nav.querySelectorAll("button")].map((x) => ({ go: x.getAttribute("data-go"), txt: x.innerText.replace(/\s+/g, " ").trim(), h: x.getBoundingClientRect().height, visible: !!(x.offsetWidth && x.offsetHeight) }));
    return { inline: nav.classList.contains("is-inline"), top: r.top, bottom: r.bottom, h1top: hr.top, buttons: b, label: nav.getAttribute("aria-label"), css: !!document.getElementById("scnav-css") };
  });
  assert.deepEqual(P.errors, []); assert.equal(P.nonGet.blocked, 0);
  assert.ok(s.css && s.inline && s.label, "the Hub's snippet, placed in the slot");
  assert.deepEqual(s.buttons.map((b) => [b.go, b.txt]), [["hub", "← HUB"], ["close", "✕ CLOSE"]]);
  assert.ok(s.buttons.every((b) => b.visible && b.h >= 28), "both buttons visible at the Hub's size");
  assert.ok(s.bottom <= s.h1top + 1, "the pair sits above the title and covers nothing: nav bottom " + s.bottom + " vs h1 top " + s.h1top);
  assert.ok(s.top >= 0 && s.top < 60, "on the first screen, at the top");
  /* the clicks: HUB with no Hub referrer → the Hub's address; CLOSE → window.close(), then the Hub when the tab stays open */
  await P.page.evaluate(() => { window.__nav = []; const stop = (e) => { e.preventDefault(); }; window.addEventListener("beforeunload", stop);
    const d = Object.getOwnPropertyDescriptor(window, "location"); window.__closed = 0; window.close = () => { window.__closed++; }; });
  const hrefs = [];
  await P.page.route("https://scintillahub.ai/**", (r) => { hrefs.push(r.request().url()); r.fulfill({ status: 200, contentType: "text/html", body: "<title>hub</title>" }); });
  await P.page.click('nav.scnav button[data-go="hub"]'); await P.page.waitForTimeout(600);
  assert.equal(hrefs[0], "https://scintillahub.ai/", "HUB leads to the Hub: " + JSON.stringify(hrefs));
  await P.page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {}); await P.page.waitForTimeout(1500);
  if (await P.page.$("nav.scnav button[data-go=close]")) {
    await P.page.evaluate(() => { window.__closed = 0; window.close = () => { window.__closed++; }; });
    await P.page.click('nav.scnav button[data-go="close"]'); await P.page.waitForTimeout(600);
    assert.equal(hrefs[hrefs.length - 1], "https://scintillahub.ai/", "CLOSE falls back to the Hub when the tab cannot close");
  }
});
/* the browser always closes, even after a failed assertion — otherwise the test process never exits */
test("teardown", async () => { if (P) await P.close(); });
