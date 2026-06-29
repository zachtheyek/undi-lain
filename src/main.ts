import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "./style.css";
import { allocate, gallagher, METHOD_NAMES, type Method, type Bloc } from "./allocate";
import { coalitionColor, partyColor } from "./colors";
import { setupAnim, setSelectedAnim } from "./anim";

const BASE = import.meta.env.BASE_URL;
const app = document.getElementById("app")!;

interface BlocRow { bloc: string; votes: number; seats: number; uid: string | null; kind: string | null; }
interface Election { election: string; year: number; n_seats: number; total_votes: number; blocs: BlocRow[]; }
let ELECTIONS: Election[] = [];
let ei = 0;
let method: Method = "sainte-lague";
let threshold = 0;

const PR_METHODS: Method[] = ["dhondt", "sainte-lague", "largest-remainder"];

// One-liner (always visible) + the deeper explanation (revealed on the ⓘ card).
const META: Record<Method | "threshold" | "gallagher", { one: string; tip: string }> = {
  fptp: { one: "local winner takes all", tip: "Each place picks one champion; parliament is the sum of local champions." },
  dhondt: { one: "rewards the strong", tip: "Its built-in tilt toward big blocs is a feature, used to nudge toward governable majorities." },
  "sainte-lague": { one: "protects the weak", tip: "Its even hand lets small blocs win their fair seat at the table — no thumb on the scale for the big guys." },
  "largest-remainder": { one: "everyone keeps their share", tip: "Seat count = exact share, rounded up or down — never further." },
  threshold: { one: "", tip: "A minimum vote threshold that locks the smallest parties out before seats are shared, trading tidiness for fairness." },
  gallagher: { one: "scores the mismatch", tip: "Gallagher index — votes-to-seats fairness, hurt most by lopsided losers." },
};

const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const shortName = (m: Method) => METHOD_NAMES[m].replace(" (actual)", "");
function blocColor(b: string): string {
  if (b === "Others") return "#5b6472";
  return coalitionColor(b) !== "#6a6a78" ? coalitionColor(b) : partyColor(b);
}
const info = (key: keyof typeof META) => `<span class="info" tabindex="0" role="note" data-tip="${esc(META[key].tip)}" aria-label="${esc(META[key].tip)}">i</span>`;

function blocLogo(b: BlocRow): string {
  const color = blocColor(b.bloc), size = 26;
  const code = b.bloc === "Others" ? "···" : esc(b.bloc.slice(0, 4));
  const badge = `<span class="logobadge" style="background:${color};${b.uid ? "display:none" : ""}">${code}</span>`;
  const img = b.uid
    ? `<img class="logo" src="${BASE}logos/${b.kind === "coalition" ? "coalitions" : "parties"}/${b.uid}.png" width="${size}" height="${size}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : "";
  return `<span class="logowrap">${img}${badge}</span>`;
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
  const circles = pts.map((p, i) => { const b = seq[i] ?? "Others"; return `<circle class="seat" data-bloc="${esc(b)}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${dot.toFixed(1)}" fill="${blocColor(b)}"/>`; }).join("");
  return `<svg viewBox="0 0 300 168" role="img" aria-label="parliament seats">
    <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="13" font-weight="700" fill="#eef1f6">${N}</text>
    <text x="${cx}" y="${cy + 8}" text-anchor="middle" font-size="8.5" fill="#8a93a4">seats</text>
    ${circles}</svg>`;
}

const arcCard = (id: string, heading: string, seatsMap: Map<string, number>, order: string[], N: number) =>
  `<div class="arc" data-arc="${id}"><h3>${heading}</h3><div class="maj"></div>${arc(seatsMap, order, N)}<div class="coalition"></div></div>`;

// Fills the majority line and — when the chamber is hung — a clickable coalition builder.
// Selecting blocs keeps their seats lit and mutes the rest; once the selection crosses the
// majority line the text flips to "… have a majority".
function setupArc(card: HTMLElement, seatsMap: Map<string, number>, order: string[], N: number) {
  const maj = Math.floor(N / 2) + 1;
  const top = order[0], topSeats = seatsMap.get(top) ?? 0;
  const majEl = card.querySelector<HTMLElement>(".maj")!;
  const coalEl = card.querySelector<HTMLElement>(".coalition")!;
  const seats = [...card.querySelectorAll<SVGCircleElement>(".seat")];
  if (topSeats >= maj) {
    majEl.innerHTML = `<b style="color:var(--up)">${esc(top)} has a majority</b> (${topSeats}/${maj})`;
    return;
  }
  const blocs = order.filter((b) => (seatsMap.get(b) ?? 0) > 0);
  const selected = new Set<string>();
  const sumSel = () => [...selected].reduce((s, b) => s + (seatsMap.get(b) ?? 0), 0);
  const names = () => [...selected].sort((a, b) => (seatsMap.get(b) ?? 0) - (seatsMap.get(a) ?? 0)).map(esc).join(" + ");
  const update = () => {
    const sum = sumSel(), any = selected.size > 0;
    if (sum >= maj) majEl.innerHTML = `<b style="color:var(--up)">${names()} have a majority</b> (${sum}/${maj})`;
    else majEl.innerHTML = `<b class="hung">hung parliament, nobody has a majority</b><span class="majsub">${any ? `selected coalition: ${names()} (${sum}/${maj})` : `top bloc: ${esc(top)} (${topSeats}/${maj})`}</span>`;
    seats.forEach((c) => (c.style.opacity = !any || selected.has(c.getAttribute("data-bloc")!) ? "1" : ".16"));
    coalEl.querySelectorAll("button").forEach((b) => b.classList.toggle("on", selected.has((b as HTMLElement).dataset.b!)));
  };
  coalEl.innerHTML = `<div class="coalhint">tap blocs to form a government</div><div class="chips coalchips">` +
    blocs.map((b) => `<button data-b="${esc(b)}"><span class="cdot" style="background:${blocColor(b)}"></span>${esc(b)} ${seatsMap.get(b) ?? 0}</button>`).join("") + `</div>`;
  coalEl.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
    const k = (b as HTMLElement).dataset.b!;
    selected.has(k) ? selected.delete(k) : selected.add(k);
    update();
  }));
  update();
}

// ---- single disproportionality readout (FPTP vs the chosen PR system) ----
function disproSvg(gF: number, gP: number, label: string) {
  const w = 300, x0 = 16, x1 = w - 16, ty = 38;
  const dmax = Math.max(gF, gP, 4) * 1.12;
  const sx = (v: number) => x0 + (v / dmax) * (x1 - x0);
  // grey "current system" (FPTP) label is pinned right; the accent "selected system"
  // label drifts to follow its dot, but never crosses left of its home (x0) and always
  // keeps a gap from the grey label on the right.
  const prText = `${label} ${gP.toFixed(1)}`, fText = `FPTP ${gF.toFixed(1)}`;
  const cw = 6.2, gap = 14;
  const maxX = Math.max(x0, x1 - fText.length * cw - gap - prText.length * cw);
  const prX = Math.min(Math.max(sx(gP) - (prText.length * cw) / 2, x0), maxX);
  return `<svg viewBox="0 0 ${w} 60" class="dp" role="img" aria-label="fairness from FPTP to ${esc(label)}">
    <line x1="${x0}" y1="${ty}" x2="${x1}" y2="${ty}" class="dp-axis"/>
    <text x="${x0}" y="${ty + 15}" class="dp-tick">0 = perfectly fair</text>
    <text x="${x1}" y="${ty + 15}" text-anchor="end" class="dp-tick">more unfair →</text>
    <line x1="${sx(Math.min(gF, gP))}" y1="${ty}" x2="${sx(Math.max(gF, gP))}" y2="${ty}" class="dp-link"/>
    <circle cx="${sx(gF)}" cy="${ty}" r="5" class="dp-fptp"/>
    <text x="${x1}" y="${ty - 9}" text-anchor="end" class="dp-lab fptp">${esc(fText)}</text>
    <circle cx="${sx(gP)}" cy="${ty}" r="5.5" class="dp-pr"/>
    <text x="${prX.toFixed(1)}" y="${ty - 9}" text-anchor="start" class="dp-lab pr">${esc(prText)}</text>
  </svg>`;
}

// ---- the static shell (built once; the slider must survive a drag) ----
function mount() {
  const sysCard = (m: Method, baseline: boolean) => `
    <${baseline ? "div" : "button"} class="syscard${!baseline && method === m ? " on" : ""}${baseline ? " baseline" : ""}"${baseline ? "" : ` data-m="${m}"`}>
      <div class="ig-wrap" data-anim="${m}"></div>
      <div class="syshead"><span class="sysname">${esc(shortName(m))}</span>${info(m)}</div>
      <div class="sysone">${META[m].one}</div>
    </${baseline ? "div" : "button"}>`;

  app.innerHTML = `
  <main><div class="wrap">
    <div class="hero"><h1>Undi <em>Lain</em></h1>
      <p>What if Malaysia counted votes differently? Re-run any general election under proportional representation, and watch the seats move.</p>
    </div>

    <div class="controls">
      <div><div class="ctl-label">Election</div><div class="chips" id="echips">${ELECTIONS.map((e, i) => `<button class="${i === ei ? "on" : ""}" data-e="${i}">${e.year}</button>`).join("")}</div></div>

      <div>
        <div class="ctl-label">Electoral system</div>
        <p class="ctl-help">Malaysia currently uses first-past-the-post. Pick an alternative system and see what changes — each panel shows how 8 seats are split between 4 blocs with the same votes.</p>
        <div class="systems" id="systems">${sysCard("fptp", true)}${PR_METHODS.map((m) => sysCard(m, false)).join("")}</div>
      </div>

      <div>
        <div class="ctl-label">Electoral threshold ${info("threshold")}</div>
        <div class="thresh"><input id="thr" type="range" min="0" max="10" step="0.1" value="${threshold}"><span class="val" id="thrval">${threshold.toFixed(1)}%</span></div>
      </div>
    </div>

    <div id="results"></div>

    <p class="note">Seats are re-allocated <b>nationally</b> in proportion to each bloc's share of the national vote — a deliberate simplification of real PR (which uses multi-member districts), chosen so the headline distortion of first-past-the-post is exact and explainable. The unit is each bloc = coalition (or party, if unaligned). Allocation methods are unit-tested.</p>

    <footer>Built on the <a href="https://electiondata.my" target="_blank" rel="noopener">Malaysian Election Corpus</a> by <a href="https://x.com/Thevesh" target="_blank" rel="noopener">Thevesh Thevananthan</a> (CC0). Not affiliated with the author. <a href="https://github.com/zachtheyek/undi-lain" target="_blank" rel="noopener">Source</a>.</footer>
  </div></main>`;

  document.getElementById("echips")!.querySelectorAll("button").forEach((b) =>
    b.addEventListener("click", () => {
      ei = +(b as HTMLElement).dataset.e!;
      document.querySelectorAll("#echips button").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      sync(); renderResults();
    }));
  document.getElementById("systems")!.querySelectorAll("button").forEach((b) =>
    b.addEventListener("click", () => {
      method = (b as HTMLElement).dataset.m as Method;
      document.querySelectorAll("#systems .syscard").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      setSelectedAnim(method);
      sync(); renderResults();
    }));
  const thr = document.getElementById("thr") as HTMLInputElement;
  const thrval = document.getElementById("thrval")!;
  thr.addEventListener("input", () => {
    threshold = +thr.value;
    thrval.textContent = `${threshold.toFixed(1)}%`;
    sync(); renderResults();
  });

  document.querySelectorAll<HTMLElement>(".ig-wrap[data-anim]").forEach((el) => setupAnim(el, el.dataset.anim as Method));
  setSelectedAnim(method); // the selected system keeps playing
}

// ---- the part that changes when you pick an election / system / threshold ----
function renderResults() {
  const e = ELECTIONS[ei];
  const N = e.n_seats;
  const blocs: Bloc[] = e.blocs.map((b) => ({ bloc: b.bloc, votes: b.votes, seats: b.seats } as Bloc & { seats: number }));
  const order = [...e.blocs].sort((a, b) => b.seats - a.seats || b.votes - a.votes).map((b) => b.bloc);
  const fptp = allocate(blocs, N, "fptp");
  const pr = allocate(blocs, N, method, threshold);
  const gF = gallagher(blocs, fptp, N);
  const gP = gallagher(blocs, pr, N);
  const label = shortName(method);

  const top = order[0];
  const tv = e.blocs.find((b) => b.bloc === top)!;
  const votePct = (tv.votes / e.total_votes) * 100;
  const fS = fptp.get(top) ?? 0, pS = pr.get(top) ?? 0;
  const d = pS - fS;
  const headline = `In <b>${e.year}</b>, <b>${esc(top)}</b> won <b>${fS}</b> of ${N} seats (${(fS / N * 100).toFixed(0)}%) with just <b>${votePct.toFixed(0)}%</b> of the vote. Under <b>${esc(label)}</b>, they'd hold <b>${pS}</b> (${(pS / N * 100).toFixed(0)}%) — ${d === 0 ? "no change" : d > 0 ? `<b style="color:#4ade80">+${d}</b> seats` : `<b style="color:#f87171">${d}</b> seats`}.`;

  const seatsChanged = ([...order].reduce((s, b) => s + Math.abs((pr.get(b) ?? 0) - (fptp.get(b) ?? 0)), 0) / 2);

  const rows = order.map((b) => {
    const bb = e.blocs.find((x) => x.bloc === b)!;
    const f = fptp.get(b) ?? 0, p = pr.get(b) ?? 0, dd = p - f;
    const cls = dd > 0 ? "up" : dd < 0 ? "down" : "flat";
    const delta = dd > 0 ? `+${dd}` : dd < 0 ? `${dd}` : "0";
    return `<div class="trow">
      <div class="nm">${blocLogo(bb)}<span>${esc(b)}</span></div>
      <div class="vshare r">${(bb.votes / e.total_votes * 100).toFixed(1)}%</div>
      <div class="seatsgrp"><span class="d r ${cls}">${delta}</span><span class="ctx r">(${f} → ${p})</span></div>
    </div>`;
  }).join("");

  const url = `${location.origin}${scenarioPath()}`;
  const shareText = `${e.year}: ${esc(top)} won ${(fS / N * 100).toFixed(0)}% of seats on ${votePct.toFixed(0)}% of votes under FPTP. Under ${label}, it'd be ${(pS / N * 100).toFixed(0)}%. Re-run any Malaysian election:`;

  document.getElementById("results")!.innerHTML = `
    <div class="dispro">
      <div class="dp-head">Fairness ${info("gallagher")}</div>
      ${disproSvg(gF, gP, label)}
    </div>

    <div class="results">
      <div class="headline">${headline}</div>
      <div class="arcs">
        ${arcCard("fptp", "Actual: First-past-the-post", fptp, order, N)}
        ${arcCard("pr", "Scenario: " + esc(label), pr, order, N)}
      </div>
      <div class="rc-stat"><span class="big">${seatsChanged.toFixed(0)}</span> seats change hands vs first-past-the-post</div>
      <div class="table">
        <div class="trow thead"><div>Bloc</div><div class="r vshare">Vote %</div><div class="r seatschdr">Seats Changed</div></div>
        ${rows}
      </div>
    </div>

    <div class="sharebar">
      <button class="primary" id="copy">🔗 Copy this scenario</button>
      <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}" target="_blank" rel="noopener">𝕏 Share</a>
    </div>`;

  const resultsEl = document.getElementById("results")!;
  setupArc(resultsEl.querySelector<HTMLElement>('[data-arc="fptp"]')!, fptp, order, N);
  setupArc(resultsEl.querySelector<HTMLElement>('[data-arc="pr"]')!, pr, order, N);
  document.getElementById("copy")!.onclick = async () => { try { await navigator.clipboard.writeText(url); } catch { /* clipboard unavailable (e.g. unfocused frame) */ } toast("Link copied"); };
}

function toast(msg: string) {
  let t = document.getElementById("toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); }
  t.innerHTML = `<span class="tick">✓</span> ${esc(msg)}`;
  t.classList.add("show");
  clearTimeout((t as any)._h);
  (t as any)._h = setTimeout(() => t!.classList.remove("show"), 2400);
}

// path-based scenario URL: /<repo>/s/<election>/<system>/ (+ ?t= when a threshold is set)
function scenarioPath() {
  const base = `${BASE}s/${ELECTIONS[ei].election}/${method}/`;
  return threshold > 0 ? `${base}?t=${threshold.toFixed(1).replace(/\.0$/, "")}` : base;
}
function sync() { history.replaceState({}, "", scenarioPath()); }

(async () => {
  app.innerHTML = `<div class="loading">Loading…</div>`;
  ELECTIONS = (await fetch(`${BASE}data/elections.json`).then((r) => r.json())).elections;
  ei = ELECTIONS.length - 1;
  // preferred: /s/<election>/<system>/ path route (prerendered with its own OG card)
  const sm = location.pathname.replace(BASE, "").replace(/^\/+/, "").match(/^s\/(GE-\d+)\/([a-z-]+)\/?$/);
  if (sm) {
    const i = ELECTIONS.findIndex((x) => x.election === sm[1]); if (i >= 0) ei = i;
    if (PR_METHODS.includes(sm[2] as Method)) method = sm[2] as Method;
  }
  const p = new URLSearchParams(location.search);     // legacy ?e=&m= still works
  const e = p.get("e"); if (!sm && e) { const i = ELECTIONS.findIndex((x) => x.election === e); if (i >= 0) ei = i; }
  const m = p.get("m") as Method; if (!sm && m && PR_METHODS.includes(m)) method = m;
  const t = p.get("t"); if (t != null && !isNaN(+t)) threshold = Math.max(0, Math.min(10, +t));
  mount();
  renderResults();
})();
