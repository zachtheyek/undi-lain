import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "./style.css";
import { allocate, gallagher, METHOD_NAMES, type Method, type Bloc } from "./allocate";
import { coalitionColor, partyColor } from "./colors";

const BASE = import.meta.env.BASE_URL;
const app = document.getElementById("app")!;

interface Election { election: string; year: number; n_seats: number; total_votes: number; blocs: { bloc: string; votes: number; seats: number }[]; }
let ELECTIONS: Election[] = [];
let ei = 0;
let method: Method = "sainte-lague";
let threshold = 0;

const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
function blocColor(b: string): string {
  if (b === "Others") return "#5b6472";
  return coalitionColor(b) !== "#6a6a78" ? coalitionColor(b) : partyColor(b);
}

// ---- parliament arc ----
function arcPositions(N: number) {
  const rows = Math.max(3, Math.round(Math.sqrt(N / 3)));
  const inner = 58, outer = 145, cx = 150, cy = 152;
  const radii: number[] = [];
  for (let i = 0; i < rows; i++) radii.push(inner + (outer - inner) * (rows === 1 ? 0 : i / (rows - 1)));
  const sumR = radii.reduce((s, r) => s + r, 0);
  const counts = radii.map((r) => Math.max(1, Math.round((N * r) / sumR)));
  let diff = N - counts.reduce((s, c) => s + c, 0);
  const order = radii.map((_, i) => i).sort((a, b) => radii[b] - radii[a]);
  let k = 0;
  while (diff !== 0) { const i = order[k % rows]; if (diff > 0) { counts[i]++; diff--; } else if (counts[i] > 1) { counts[i]--; diff++; } k++; }
  const pts: { x: number; y: number; ang: number; r: number }[] = [];
  radii.forEach((r, i) => {
    const n = counts[i];
    for (let j = 0; j < n; j++) {
      const t = n === 1 ? 0.5 : j / (n - 1);
      const ang = Math.PI * (1 - t);
      pts.push({ x: cx + r * Math.cos(ang), y: cy - r * Math.sin(ang), ang, r });
    }
  });
  pts.sort((a, b) => b.ang - a.ang || a.r - b.r);
  const rowGap = rows > 1 ? (outer - inner) / (rows - 1) : 30;
  const dot = Math.max(2.4, Math.min(6, rowGap * 0.42));
  return { pts, dot, cx, cy };
}

function arc(seatsMap: Map<string, number>, order: string[], N: number) {
  const { pts, dot, cx, cy } = arcPositions(N);
  const seq: string[] = [];
  for (const b of order) for (let i = 0; i < (seatsMap.get(b) ?? 0); i++) seq.push(b);
  const circles = pts.map((p, i) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${dot.toFixed(1)}" fill="${blocColor(seq[i] ?? "Others")}"/>`).join("");
  const maj = Math.floor(N / 2) + 1;
  return `<svg viewBox="0 0 300 168" role="img" aria-label="parliament seats">
    <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="13" font-weight="700" fill="#eef1f6">${N}</text>
    <text x="${cx}" y="${cy + 8}" text-anchor="middle" font-size="8.5" fill="#8a93a4">seats</text>
    ${circles}</svg>`;
}

function majorityLine(seatsMap: Map<string, number>, order: string[], N: number) {
  const maj = Math.floor(N / 2) + 1;
  const top = order[0];
  const topSeats = seatsMap.get(top) ?? 0;
  const has = topSeats >= maj;
  return `<div class="maj">${has ? `${esc(top)} <b style="color:#4ade80">has a majority</b> (${topSeats}/${maj})` : `<b style="color:#f87171">hung</b> — top bloc ${esc(top)} ${topSeats}/${maj} needed`}</div>`;
}

function render() {
  const e = ELECTIONS[ei];
  const N = e.n_seats;
  const blocs: (Bloc & { seats: number })[] = e.blocs.map((b) => ({ bloc: b.bloc, votes: b.votes, seats: b.seats }));
  const order = [...e.blocs].sort((a, b) => b.seats - a.seats || b.votes - a.votes).map((b) => b.bloc);
  const fptp = allocate(blocs, N, "fptp");
  const pr = allocate(blocs, N, method, threshold);
  const gF = gallagher(blocs, fptp, N);
  const gP = gallagher(blocs, pr, N);

  const top = order[0];
  const tv = e.blocs.find((b) => b.bloc === top)!;
  const votePct = (tv.votes / e.total_votes) * 100;
  const fS = fptp.get(top) ?? 0, pS = pr.get(top) ?? 0;
  const d = pS - fS;
  const headline = `In <b>${e.year}</b>, <b>${esc(top)}</b> won <b>${fS}</b> of ${N} seats (${(fS / N * 100).toFixed(0)}%) with just <b>${votePct.toFixed(0)}%</b> of the vote. Under <b>${METHOD_NAMES[method].replace(" (actual)", "")}</b>, they'd hold <b>${pS}</b> (${(pS / N * 100).toFixed(0)}%) — ${d === 0 ? "no change" : d > 0 ? `<b style="color:#4ade80">+${d}</b> seats` : `<b style="color:#f87171">${d}</b> seats`}.`;

  const sysBtn = (m: Method, sub: string) => `<button class="${method === m ? "on" : ""}" data-m="${m}">${METHOD_NAMES[m].replace(" (actual)", "")}<small>${sub}</small></button>`;
  const eChip = (i: number) => `<button class="${i === ei ? "on" : ""}" data-e="${i}">${ELECTIONS[i].year}</button>`;

  const rows = order.map((b) => {
    const bb = e.blocs.find((x) => x.bloc === b)!;
    const f = fptp.get(b) ?? 0, p = pr.get(b) ?? 0, dd = p - f;
    const cls = dd > 0 ? "up" : dd < 0 ? "down" : "flat";
    return `<div class="trow">
      <div class="nm"><span class="dot" style="background:${blocColor(b)}"></span>${esc(b)}</div>
      <div class="num">${(bb.votes / e.total_votes * 100).toFixed(1)}%</div>
      <div class="num">${f}</div>
      <div class="num">${p}</div>
      <div class="num delta ${cls}">${dd > 0 ? "+" : ""}${dd || "—"}</div>
    </div>`;
  }).join("");

  const url = `${location.origin}${BASE}?e=${e.election}&m=${method}&t=${threshold}`;
  const shareText = `${e.year}: ${esc(top)} won ${(fS / N * 100).toFixed(0)}% of seats on ${votePct.toFixed(0)}% of votes under FPTP. Under ${METHOD_NAMES[method]} it'd be ${(pS / N * 100).toFixed(0)}%. Re-run any Malaysian election:`;

  app.innerHTML = `
  <main><div class="wrap">
    <div class="hero"><h1>Undi <em>Lain</em></h1>
      <p>What if Malaysia counted votes differently? Re-run any general election under proportional representation, and watch the seats move.</p>
    </div>

    <div class="controls">
      <div><div class="ctl-label">Election</div><div class="chips" id="echips">${ELECTIONS.map((_, i) => eChip(i)).join("")}</div></div>
      <div><div class="ctl-label">Electoral system</div><div class="systems" id="systems">
        ${sysBtn("fptp", "what happened")}${sysBtn("dhondt", "favours large")}${sysBtn("sainte-lague", "most proportional")}${sysBtn("largest-remainder", "Hare quota")}
      </div></div>
      <div><div class="ctl-label">Electoral threshold</div><div class="thresh"><input id="thr" type="range" min="0" max="10" step="0.5" value="${threshold}"><span class="val">${threshold}%</span></div></div>
    </div>

    <div class="headline">${headline}</div>

    <div class="arcs">
      <div class="arc"><h3>Actual — First-past-the-post</h3>${majorityLine(fptp, order, N)}${arc(fptp, order, N)}<div class="gap">Disproportionality (Gallagher): <b>${gF.toFixed(1)}</b></div></div>
      <div class="arc"><h3>Under ${esc(METHOD_NAMES[method].replace(" (actual)", ""))}</h3>${majorityLine(pr, order, N)}${arc(pr, order, N)}<div class="gap">Disproportionality (Gallagher): <b>${gP.toFixed(1)}</b></div></div>
    </div>

    <div class="disp">
      <div class="d"><div class="v">${gF.toFixed(1)} → ${gP.toFixed(1)}</div><div class="l">Gallagher disproportionality (lower = fairer)</div></div>
      <div class="d"><div class="v">${(Math.abs([...order].reduce((s, b) => s + Math.abs((pr.get(b) ?? 0) - (fptp.get(b) ?? 0)), 0)) / 2).toFixed(0)}</div><div class="l">seats that would change hands</div></div>
    </div>

    <div class="table">
      <div class="trow"><div>Bloc</div><div class="num">Vote %</div><div class="num">FPTP</div><div class="num">${esc(method === "fptp" ? "—" : METHOD_NAMES[method].split(" ")[0])}</div><div class="num">Δ</div></div>
      ${rows}
    </div>

    <div class="sharebar">
      <button class="primary" id="copy">🔗 Copy this scenario</button>
      <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}" target="_blank" rel="noopener">𝕏 Share</a>
    </div>
    <p class="note">Seats are re-allocated <b>nationally</b> in proportion to each bloc's share of the national vote — a deliberate simplification of real PR (which uses multi-member districts), chosen so the headline distortion of first-past-the-post is exact and explainable. The unit is each bloc = coalition (or party, if unaligned). Allocation methods are unit-tested.</p>

    <footer>Built on the <a href="https://electiondata.my" target="_blank" rel="noopener">Malaysian Election Corpus</a> by Thevesh Thevananthan (CC0). Not affiliated with the author. <a href="https://github.com/zachtheyek/undi-lain" target="_blank" rel="noopener">Source &amp; tests</a>.</footer>
  </div></main>`;

  document.getElementById("echips")!.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { ei = +(b as HTMLElement).dataset.e!; sync(); render(); }));
  document.getElementById("systems")!.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { method = (b as HTMLElement).dataset.m as Method; sync(); render(); }));
  const thr = document.getElementById("thr") as HTMLInputElement;
  thr.addEventListener("input", () => { threshold = +thr.value; sync(); render(); });
  document.getElementById("copy")!.onclick = async (ev) => { await navigator.clipboard.writeText(url); (ev.target as HTMLElement).textContent = "✓ Copied!"; };
}

function sync() { history.replaceState({}, "", `${BASE}?e=${ELECTIONS[ei].election}&m=${method}&t=${threshold}`); }

(async () => {
  app.innerHTML = `<div class="loading">Loading…</div>`;
  ELECTIONS = (await fetch(`${BASE}data/elections.json`).then((r) => r.json())).elections;
  ei = ELECTIONS.length - 1;
  const p = new URLSearchParams(location.search);
  const e = p.get("e"); if (e) { const i = ELECTIONS.findIndex((x) => x.election === e); if (i >= 0) ei = i; }
  const m = p.get("m") as Method; if (m && m in METHOD_NAMES) method = m;
  const t = p.get("t"); if (t != null && !isNaN(+t)) threshold = Math.max(0, Math.min(10, +t));
  render();
})();
