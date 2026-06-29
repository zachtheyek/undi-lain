// Animated "how a seat-allocation system works" explainers, one per electoral system.
// Each card shares the same stage — four party bars (blue/orange/red/green) and eight
// blank seat-circles — and plays a short, looping video of how that system fills the
// chamber. Hover (desktop) replays on a loop with a pause; first scroll-into-view plays
// once (mobile); prefers-reduced-motion just shows the finished result.
//
// Toy election (the canonical highest-averages example): A 120 · B 80 · C 30 · D 20,
// 8 seats. FPTP A5 B2 C1 D0 · D'Hondt A4 B3 C1 D0 · Sainte-Laguë A4 B2 C1 D1 ·
// Hare A4 B2 C1 D1. A leads under every system (so it always "forms government"), and
// D'Hondt vs Sainte-Laguë differ — Sainte-Laguë cuts a winner's bar deeper.

import type { Method } from "./allocate";

const COL = ["#3b82f6", "#f59e0b", "#ef4444", "#22c55e"]; // A blue · B orange · C red · D green
const KEY = ["A", "B", "C", "D"];
const VOTES = [120, 80, 30, 20];
const SEATS = 8;
const WIN = 0; // A leads in seats under every system

// the order each circle (seat) is filled, by party index
const ORDER: Record<Method, number[]> = {
  fptp: [0, 0, 1, 0, 1, 0, 2, 0],            // 8 local winners → A5 B2 C1 D0
  dhondt: [0, 1, 0, 0, 1, 0, 2, 1],           // A B A A B A C B → A4 B3 C1 D0
  "sainte-lague": [0, 1, 0, 2, 1, 0, 3, 0],   // A B A C B A D A → A4 B2 C1 D1
  "largest-remainder": [0, 0, 0, 1, 1, 2, 0, 3], // 5 whole (A3 B2) then remainders C,A,D
};

// geometry (viewBox 240 × 150)
const BY = 112, MAXH = 78, BX = [14, 36, 58, 80], BW = 16;
const CX = [138, 167, 196, 223], CY = [58, 92], CR = 11;
const cx = (i: number) => CX[i % 4], cy = (i: number) => CY[i < 4 ? 0 : 1];
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function svgSkeleton(): string {
  // bars are full-height rects scaled vertically from the baseline (robust transform transition)
  const bars = BX.map((x, i) => `<rect class="ab" data-i="${i}" x="${x}" y="${BY - MAXH}" width="${BW}" height="${MAXH}" rx="2" fill="${COL[i]}" style="transform:scaleY(0)"/>`).join("");
  const blabels = BX.map((x, i) => `<text class="ablab" x="${x + BW / 2}" y="124" text-anchor="middle">${KEY[i]}</text>`).join("");
  const circles = ORDER.fptp.map((_, i) => `<circle class="ac" data-i="${i}" cx="${cx(i)}" cy="${cy(i)}" r="${CR}" fill="none" stroke="#3a4254" stroke-width="1.6"/>`).join("");
  return `<svg viewBox="0 0 240 150" class="ig" role="img" aria-label="how seats are allocated">
    <text class="astat" x="120" y="11" text-anchor="middle"></text>
    <text class="aseatlab" x="180" y="34" text-anchor="middle">8 seats</text>
    ${bars}${blabels}${circles}
    <g class="apm" opacity="0"><text class="apmt" x="0" y="0" text-anchor="middle">PM</text></g>
    <g class="adot" opacity="0"><circle r="5.5"/></g>
  </svg>`;
}

type Stage = ReturnType<typeof makeStage>;
function makeStage(wrap: HTMLElement) {
  wrap.innerHTML = svgSkeleton();
  const svg = wrap.querySelector("svg")!;
  const bars = [...svg.querySelectorAll<SVGRectElement>(".ab")];
  const circles = [...svg.querySelectorAll<SVGCircleElement>(".ac")];
  const stat = svg.querySelector<SVGTextElement>(".astat")!;
  const dot = svg.querySelector<SVGGElement>(".adot")!;
  const dotc = dot.querySelector("circle")!;
  const pm = svg.querySelector<SVGGElement>(".apm")!;
  const pmt = pm.querySelector<SVGTextElement>(".apmt")!;
  const h = (v: number, max: number) => (v / max) * MAXH;
  const barH = [0, 0, 0, 0];

  const setBar = (i: number, height: number) => { barH[i] = Math.max(0, height); bars[i].style.transform = `scaleY(${Math.min(1, barH[i] / MAXH)})`; };
  const focusBar = (i: number) => bars.forEach((b, j) => (b.style.opacity = j === i ? "1" : ".3"));
  const allBars = (o: string) => bars.forEach((b) => (b.style.opacity = o));
  const fillCircle = (i: number, c: string) => { circles[i].setAttribute("fill", c); circles[i].setAttribute("stroke", c); };
  const blankCircle = (i: number) => { const c = circles[i]; c.setAttribute("fill", "none"); c.setAttribute("stroke", "#3a4254"); c.style.opacity = "1"; c.style.transform = ""; };
  const status = (s: string) => (stat.textContent = s);

  async function fly(barI: number, seatI: number, c: string, dur = 380) {
    const fromX = BX[barI] + BW / 2, fromY = BY - barH[barI];
    dotc.setAttribute("fill", c);
    dot.style.transition = "none";
    dot.style.transform = `translate(${fromX}px,${fromY}px)`;
    dot.style.opacity = "1";
    void dot.getBoundingClientRect();
    dot.style.transition = `transform ${dur}ms ease`;
    dot.style.transform = `translate(${cx(seatI)}px,${cy(seatI)}px)`;
    await sleep(dur);
    fillCircle(seatI, c);
    circles[seatI].classList.add("pop");
    dot.style.opacity = "0";
    setTimeout(() => circles[seatI].classList.remove("pop"), 320);
  }

  function rest(method: Method) {
    const ord = ORDER[method];
    bars.forEach((_, i) => setBar(i, h(VOTES[i], VOTES[0])));
    allBars(".55");
    ord.forEach((p, i) => { fillCircle(i, COL[p]); circles[i].style.opacity = p === WIN ? "1" : ".32"; circles[i].style.transform = ""; });
    // park the PM tag on the first winning seat
    const pmSeat = ord.indexOf(WIN);
    pm.style.transition = "none";
    pmt.setAttribute("x", `${cx(pmSeat)}`); pmt.setAttribute("y", `${cy(pmSeat) - CR - 5}`);
    circles[pmSeat].style.transform = `translateY(-9px)`;
    pm.style.opacity = "1";
    status("");
  }

  return { svg, bars, circles, h, setBar, focusBar, allBars, fillCircle, blankCircle, status, fly, dot, pm, pmt, rest, cx, cy };
}

// ---- per-system choreography (returns when one playthrough finishes) ----
async function reset(s: Stage) {
  s.status("");
  s.bars.forEach((_, i) => s.setBar(i, 0));
  s.allBars("1");
  s.circles.forEach((_, i) => s.blankCircle(i));
  s.pm.style.opacity = "0";
  await sleep(260);
}

async function finale(s: Stage, ord: number[]) {
  await sleep(220);
  s.status(`${KEY[WIN]} has the most seats`);
  s.circles.forEach((c, i) => (c.style.opacity = ord[i] === WIN ? "1" : ".28"));
  s.allBars(".25");
  await sleep(700);
  const pmSeat = ord.indexOf(WIN);
  s.pmt.setAttribute("x", `${s.cx(pmSeat)}`); s.pmt.setAttribute("y", `${s.cy(pmSeat) - CR - 5}`);
  s.circles[pmSeat].style.transition = "transform .4s ease";
  s.circles[pmSeat].style.transform = "translateY(-9px)";
  s.pm.style.transition = "opacity .3s"; s.pm.style.opacity = "1";
  s.status(`${KEY[WIN]} forms government → picks the PM`);
  await sleep(900);
}

async function runFPTP(s: Stage, tok: { c: boolean }) {
  const ord = ORDER.fptp;
  s.svg.querySelector(".aseatlab")!.textContent = "8 local seats";
  for (let i = 0; i < SEATS; i++) {
    if (tok.c) throw 0;
    const w = ord[i];
    s.status(`Seat ${i + 1}: a local contest`);
    // grow this district's four candidate bars (winner tallest)
    const losers = [0.5, 0.38, 0.26];
    let li = 0;
    s.bars.forEach((_, p) => s.setBar(p, s.h(p === w ? 0.86 : losers[(li++ + i) % 3], 1)));
    s.allBars("1");
    await sleep(460); if (tok.c) throw 0;
    s.focusBar(w);
    s.status(`${KEY[w]} leads here → wins the seat`);
    await sleep(360); if (tok.c) throw 0;
    await s.fly(w, i, COL[w]);
    if (tok.c) throw 0;
    await sleep(120);
    s.bars.forEach((_, p) => s.setBar(p, 0));
  }
  await finale(s, ord);
}

async function runHA(s: Stage, tok: { c: boolean }, divisor: (held: number) => number, ord: number[], cutLabel: (n: number) => string) {
  s.svg.querySelector(".aseatlab")!.textContent = "8 seats";
  // votes come in once
  s.status("Votes come in");
  s.bars.forEach((_, i) => s.setBar(i, s.h(VOTES[i], VOTES[0])));
  s.allBars("1");
  await sleep(620); if (tok.c) throw 0;
  const held = [0, 0, 0, 0];
  for (let i = 0; i < SEATS; i++) {
    if (tok.c) throw 0;
    const w = ord[i];
    s.focusBar(w);
    s.status(`Most votes per seat → ${KEY[w]}`);
    await sleep(300); if (tok.c) throw 0;
    await s.fly(w, i, COL[w]); if (tok.c) throw 0;
    held[w]++;
    // cut the winner's bar to its next average (the deeper the cut, the fairer)
    const nextAvg = VOTES[w] / divisor(held[w]);
    s.setBar(w, s.h(nextAvg, VOTES[0]));
    s.status(cutLabel(held[w]));
    await sleep(460); if (tok.c) throw 0;
    s.allBars("1");
  }
  await finale(s, ord);
}

async function runHare(s: Stage, tok: { c: boolean }) {
  const ord = ORDER["largest-remainder"];
  const total = VOTES.reduce((a, b) => a + b, 0), quota = total / SEATS;
  const q = VOTES.map((v) => v / quota), whole = q.map(Math.floor);
  const maxQ = q[0];
  s.svg.querySelector(".aseatlab")!.textContent = "8 seats";
  s.status("Votes come in (measured in quotas)");
  s.bars.forEach((_, i) => s.setBar(i, s.h(q[i], maxQ)));
  s.allBars("1");
  await sleep(640); if (tok.c) throw 0;
  // 1) hand out every whole quota as a seat
  let seat = 0;
  for (let p = 0; p < 4; p++) {
    for (let k = 0; k < whole[p]; k++) {
      if (tok.c) throw 0;
      s.focusBar(p);
      s.status(`${KEY[p]} earns a whole seat`);
      await sleep(240); if (tok.c) throw 0;
      await s.fly(p, seat++, COL[p]); if (tok.c) throw 0;
      // shrink the bar by one quota (the seat that just left)
      s.setBar(p, s.h(q[p] - (k + 1), maxQ));
      await sleep(360);
    }
    s.allBars("1");
  }
  // 2) leftover seats to the largest remainders
  s.status("Leftover seats → largest remainders");
  await sleep(500); if (tok.c) throw 0;
  for (; seat < SEATS; seat++) {
    if (tok.c) throw 0;
    const w = ord[seat];
    s.focusBar(w);
    s.status(`${KEY[w]} has the biggest remainder`);
    await sleep(360); if (tok.c) throw 0;
    await s.fly(w, seat, COL[w]); if (tok.c) throw 0;
    s.allBars("1");
  }
  await finale(s, ord);
}

function choreography(s: Stage, method: Method, tok: { c: boolean }): Promise<void> {
  if (method === "fptp") return runFPTP(s, tok);
  if (method === "dhondt") return runHA(s, tok, (h) => h + 1, ORDER.dhondt, (n) => `Bar cut to a ${["", "half", "third", "quarter", "fifth"][n] ?? "sliver"}`);
  if (method === "sainte-lague") return runHA(s, tok, (h) => 2 * h + 1, ORDER["sainte-lague"], (n) => `Bar cut hard (÷${2 * n + 1}) — a deeper cut`);
  return runHare(s, tok);
}

// ---- controller: hover loops, first view plays once, reduced-motion stays static ----
export function setupAnim(wrap: HTMLElement, method: Method) {
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const s = makeStage(wrap);
  s.rest(method);
  if (reduce) return;

  let tok: { c: boolean } | null = null;
  let running = false;
  const PAUSE = 1300;

  async function loop(once: boolean) {
    if (running) return;
    running = true;
    const my = { c: false };
    tok = my;
    try {
      do {
        await reset(s);
        await choreography(s, method, my);
        if (my.c) break;
        if (!once) await sleep(PAUSE);
        if (my.c) break;
      } while (!once && !my.c);
    } catch { /* cancelled */ }
    if (tok === my) tok = null;
    running = false;
    s.rest(method);
  }
  const stop = () => { if (tok) tok.c = true; };

  wrap.addEventListener("mouseenter", () => loop(false));
  wrap.addEventListener("mouseleave", stop);

  let played = false;
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting && !played) { played = true; loop(true); } });
  }, { threshold: 0.6 });
  io.observe(wrap);
}
