/* DS3 (8 Oct 2026) — for the checks run from this machine: the account, from the private file if it is here.
   The repository is public and holds no account (study/ds1/live.mjs starts from a made-up example). study/private/account.json is
   listed in .gitignore; this reads it when it exists, so a check run here still works on the real account, and says which it used.
     import { useLocalAccount } from "./local-account.mjs";  const which = useLocalAccount();   // "the private file" | "the example (…why)" */
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { setAccount, useExampleAccount } from "../study/ds1/live.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PRIVATE_ACCOUNT = path.join(ROOT, "study/private/account.json");
export function useLocalAccount(file = PRIVATE_ACCOUNT) { if (process.argv.includes("--example-account")) { useExampleAccount(); return "the example (asked for with --example-account)"; }
  if (!fs.existsSync(file)) return "the example (no private account file on this machine)"; let a; try { a = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return "the example (the private file is not readable: " + e.message + ")"; }
  const r = setAccount(a); return r.ok ? "the private file" : "the example (" + r.why + ")"; }
