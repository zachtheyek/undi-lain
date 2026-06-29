// OG cards: one default (the most striking distortion) + one per election×PR-system,
// each a "before/after" of the chamber as proportional seat bars. OG_LIMIT subsets the
// per-scenario cards for quick local runs.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import satori from "satori";
import { html } from "satori-html";
import { Resvg } from "@resvg/resvg-js";
import { blocColor, scenario, PR_METHODS } from "./lib.mjs";

const fontDir = "node_modules/@fontsource/space-grotesk/files";
const fonts = [
  { name: "Space Grotesk", weight: 400, style: "normal", data: readFileSync(join(fontDir, "space-grotesk-latin-400-normal.woff")) },
  { name: "Space Grotesk", weight: 700, style: "normal", data: readFileSync(join(fontDir, "space-grotesk-latin-700-normal.woff")) },
];
const elections = JSON.parse(readFileSync("public/data/elections.json", "utf8")).elections;

function bar(seatsMap, order, N) {
  const segs = order.filter((b) => (seatsMap.get(b) ?? 0) > 0).map((b) =>
    `<div style="display:flex;width:${((seatsMap.get(b) ?? 0) / N) * 100}%;background:${blocColor(b)}"></div>`).join("");
  return `<div style="display:flex;position:relative;width:100%;height:46px;border-radius:7px;overflow:hidden;background:#1a1f29">
    ${segs}
    <div style="display:flex;position:absolute;left:50%;top:-5px;width:2px;height:56px;background:#eef1f6"></div>
  </div>`;
}

const ACC = "#ffcf4d", INK = "#eef1f6", MUT = "#8a93a4";
const seg = (t, c, b = false) => `<div style="display:flex;color:${c}${b ? ";font-weight:700" : ""}">${t}</div>`;
// satori trims leading/trailing whitespace per flex item, so word spacing comes from `gap`
const row = (segs) => `<div style="display:flex;gap:9px;align-items:baseline">${segs.join("")}</div>`;

function card(s, year) {
  const dColor = s.d > 0 ? "#4ade80" : s.d < 0 ? "#f87171" : MUT;
  const dText = `${s.d > 0 ? "+" : ""}${s.d}`;
  // ">" chevron drawn with borders (satori has no arrow glyph)
  const chevron = `<div style="display:flex;width:9px;height:9px;border-top:3px solid ${MUT};border-right:3px solid ${MUT};transform:rotate(45deg);margin:0 13px 0 11px"></div>`;
  return html(`
  <div style="display:flex;flex-direction:column;width:1200px;height:630px;padding:54px 70px;background:#0d0f14;font-family:'Space Grotesk'">
    <div style="display:flex;align-items:baseline">
      <div style="display:flex;font-size:60px;font-weight:700;color:${INK}">Undi</div>
      <div style="display:flex;font-size:60px;font-weight:700;color:${ACC};margin-left:16px">Lain</div>
    </div>
    <div style="display:flex;flex-direction:column;margin-top:18px;font-size:29px;line-height:1.45">
      ${row([seg("In", INK), seg(`${year},`, ACC, true), seg(s.top, ACC, true), seg("won", INK), seg(`${Math.round(s.fSeatPct)}%`, ACC, true), seg("of seats on", INK), seg(`${Math.round(s.votePct)}%`, ACC, true), seg("of the vote.", INK)])}
      ${row([seg("Under", INK), seg(`${s.label},`, ACC, true), seg("they'd hold", INK), seg(`${Math.round(s.pSeatPct)}%`, ACC, true), seg("—", INK), seg(`${dText} seats`, dColor, true)])}
    </div>
    <div style="display:flex;flex-direction:column;margin-top:28px">
      <div style="display:flex;font-size:20px;color:${MUT};margin-bottom:8px">Actual: First-past-the-post</div>
      ${bar(s.fptp, s.order, s.N)}
    </div>
    <div style="display:flex;flex-direction:column;margin-top:18px">
      <div style="display:flex;font-size:20px;color:${MUT};margin-bottom:8px">Scenario: ${s.label}</div>
      ${bar(s.pr, s.order, s.N)}
    </div>
    <div style="display:flex;align-items:center;font-size:27px;margin-top:24px">
      <div style="display:flex;color:${MUT}">${s.top}:</div>
      <div style="display:flex;color:${dColor};font-weight:700;margin-left:12px">${dText} seats</div>
      <div style="display:flex;align-items:center;color:${MUT};margin-left:14px">
        <div style="display:flex">(${s.fS}</div>${chevron}<div style="display:flex">${s.pS})</div>
      </div>
    </div>
    <div style="display:flex;margin-top:auto;font-size:20px;color:#5d6678">Data: Malaysian Election Corpus (Thevesh) · electiondata.my</div>
  </div>`);
}

async function png(markup) {
  const svg = await satori(markup, { width: 1200, height: 630, fonts });
  return new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
}
function out(path, buf) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, buf); }

// default card = the election where the seat-winner most over-performed its vote (prefer a popular-vote loser)
const featured = elections
  .map((e) => { const s = scenario(e, "sainte-lague"); const byVotes = [...e.blocs].sort((a, b) => b.votes - a.votes)[0]; return { e, s, lost: byVotes.bloc !== s.top, bonus: s.fSeatPct - s.votePct }; })
  .sort((a, b) => (b.lost - a.lost) || (b.bonus - a.bonus))[0];
out("dist/og-default.png", await png(card(featured.s, featured.e.year)));
console.log(`default OG: ${featured.e.election} ${featured.e.year}`);

let pairs = [];
for (const e of elections) for (const m of PR_METHODS) pairs.push([e, m]);
const limit = process.env.OG_LIMIT ? +process.env.OG_LIMIT : pairs.length;
pairs = pairs.slice(0, limit);
for (const [e, m] of pairs) out(`dist/og/s/${e.election}/${m}.png`, await png(card(scenario(e, m), e.year)));
console.log(`generated ${pairs.length} scenario OG cards`);
