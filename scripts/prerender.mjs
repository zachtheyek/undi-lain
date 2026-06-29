// Prerender one HTML page per election×PR-system at dist/s/<election>/<system>/index.html,
// each carrying its own OG meta (so a shared scenario link renders its before/after card),
// plus dist/404.html as the SPA fallback for everything else. OG_LIMIT mirrors gen_og.mjs.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { scenario, PR_METHODS } from "./lib.mjs";

const SITE = process.env.SITE_URL || "https://zachtheyek.github.io/undi-lain";
const tpl = readFileSync("dist/index.html", "utf8");
const elections = JSON.parse(readFileSync("dist/data/elections.json", "utf8")).elections;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const out = (path, txt) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, txt); };

function withMeta(title, desc, img, url) {
  let h = tpl;
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  h = h.replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(desc)}$2`);
  h = h.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`);
  h = h.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(desc)}$2`);
  h = h.replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${esc(img)}$2`);
  // add og:url + twitter:image just after the twitter:card line
  h = h.replace(/(<meta name="twitter:card"[^>]*>)/, `$1\n    <meta property="og:url" content="${esc(url)}" />\n    <meta name="twitter:image" content="${esc(img)}" />`);
  return h;
}

// homepage: keep default card, but make its image + url absolute for crawlers
out("dist/index.html", withMeta(
  "Undi Lain — what if Malaysia counted votes differently?",
  "Re-run any Malaysian general election under D'Hondt, Sainte-Laguë or largest-remainder proportional representation, and see how the seats would change.",
  `${SITE}/og-default.png`, `${SITE}/`));
// SPA fallback for any path that isn't prerendered (GitHub Pages serves it as 404)
out("dist/404.html", tpl);

let pairs = [];
for (const e of elections) for (const m of PR_METHODS) pairs.push([e, m]);
const limit = process.env.OG_LIMIT ? +process.env.OG_LIMIT : pairs.length;
for (const [e, m] of pairs.slice(0, limit)) {
  const s = scenario(e, m);
  const title = `Undi Lain — ${e.year}: ${s.top} ${Math.round(s.fSeatPct)}% of seats on ${Math.round(s.votePct)}% of votes`;
  const desc = `In ${e.year}, ${s.top} won ${s.fS} of ${s.N} seats under first-past-the-post. Under ${s.label}: ${s.pS} (${s.d >= 0 ? "+" : ""}${s.d}). Re-run any Malaysian election under proportional representation.`;
  out(`dist/s/${e.election}/${m}/index.html`,
    withMeta(title, desc, `${SITE}/og/s/${e.election}/${m}.png`, `${SITE}/s/${e.election}/${m}/`));
}
console.log(`prerendered ${Math.min(limit, pairs.length)} scenario pages + 404 fallback`);
