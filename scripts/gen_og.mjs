// Default OG card for the sandbox, anchored on the latest election's distortion.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import satori from "satori";
import { html } from "satori-html";
import { Resvg } from "@resvg/resvg-js";

const fontDir = "node_modules/@fontsource/space-grotesk/files";
const fonts = [
  { name: "Space Grotesk", weight: 400, style: "normal", data: readFileSync(join(fontDir, "space-grotesk-latin-400-normal.woff")) },
  { name: "Space Grotesk", weight: 700, style: "normal", data: readFileSync(join(fontDir, "space-grotesk-latin-700-normal.woff")) },
];
const el = JSON.parse(readFileSync("public/data/elections.json", "utf8")).elections;
const last = el[el.length - 1];
const top = [...last.blocs].sort((a, b) => b.seats - a.seats)[0];
const votePct = (top.votes / last.total_votes * 100).toFixed(0);
const seatPct = (top.seats / last.n_seats * 100).toFixed(0);

const card = html(`
  <div style="display:flex;flex-direction:column;width:1200px;height:630px;padding:64px 70px;background:#0d0f14;font-family:'Space Grotesk'">
    <div style="display:flex;align-items:baseline">
      <div style="display:flex;font-size:80px;font-weight:700;color:#eef1f6">Undi </div>
      <div style="display:flex;font-size:80px;font-weight:700;color:#ffcf4d;margin-left:18px">Lain</div>
    </div>
    <div style="display:flex;font-size:36px;color:#8a93a4;margin-top:8px">What if Malaysia counted votes differently?</div>
    <div style="display:flex;flex-direction:column;background:#161a22;border-radius:18px;padding:34px 38px;margin-top:40px">
      <div style="display:flex;font-size:32px;color:#eef1f6">In ${last.year}, <span style="color:#ffcf4d;font-weight:700;margin:0 10px">${top.bloc}</span> took ${seatPct}% of seats</div>
      <div style="display:flex;font-size:32px;color:#eef1f6;margin-top:8px">on just <span style="color:#ffcf4d;font-weight:700;margin:0 10px">${votePct}%</span> of the vote.</div>
      <div style="display:flex;font-size:26px;color:#8a93a4;margin-top:20px">Re-run it under D'Hondt, Sainte-Laguë or largest-remainder PR.</div>
    </div>
    <div style="display:flex;margin-top:auto;font-size:22px;color:#5d6678">Data: Malaysian Election Corpus (Thevesh) · electiondata.my</div>
  </div>`);
writeFileSync("dist/og-default.png", new Resvg(await satori(card, { width: 1200, height: 630, fonts }), { fitTo: { mode: "width", value: 1200 } }).render().asPng());
console.log("generated default OG card");
