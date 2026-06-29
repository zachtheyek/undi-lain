// Animated "how a seat-allocation system works" explainers, one per electoral system.
// Each card shares the same stage — four party bars (blue/orange/red/green) and eight
// blank seat-circles — and plays a short, looping video of how that system fills the
// chamber. Default state is the FIRST frame (paused). On desktop, hovering a card plays
// it on a loop and leaving resets to the first frame; on touch, the card nearest the
// centre of the screen plays and the rest stay paused. prefers-reduced-motion stays on
// the first frame.
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
const BY = 112, MAXH = 74, BX = [14, 36, 58, 80], BW = 16;
const CX = [138, 167, 196, 223], CY = [58, 92], CR = 11;
const cx = (i: number) => CX[i % 4], cy = (i: number) => CY[i < 4 ? 0 : 1];
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// timing: every titled phase stays on screen for at least MIN_TEXT so it can be read.
const MIN_TEXT = 1300, GAP = 180, PAUSE = 1100;
type Tok = { c: boolean };

function svgSkeleton(): string {
  const bars = BX.map((x, i) => `<rect class="ab" data-i="${i}" x="${x}" y="${BY - MAXH}" width="${BW}" height="${MAXH}" rx="2" fill="${COL[i]}" style="transform:scaleY(0)"/>`).join("");
  const blabels = BX.map((x, i) => `<text class="ablab" x="${x + BW / 2}" y="124" text-anchor="middle">${KEY[i]}</text>`).join("");
  const circles = ORDER.fptp.map((_, i) => `<circle class="ac" data-i="${i}" cx="${cx(i)}" cy="${cy(i)}" r="${CR}" fill="none" stroke="#3a4254" stroke-width="1.6"/>`).join("");
  return `<svg viewBox="0 0 240 150" class="ig" role="img" aria-label="how seats are allocated">
    <text class="astat" x="120" y="11" text-anchor="middle"></text>
    <text class="aseatlab" x="180" y="34" text-anchor="middle">8 seats</text>
    ${bars}${blabels}${circles}
    <text class="abnum" opacity="0"></text>
    <g class="apm" opacity="0"><text class="apmt" x="0" y="0" text-anchor="middle">PM</text></g>
    <g class="adot" opacity="0"><circle r="5.5"/></g>
  </svg>`;
}

function makeStage(wrap: HTMLElement) {
  wrap.innerHTML = svgSkeleton();
  const svg = wrap.querySelector("svg")!;
  const bars = [...svg.querySelectorAll<SVGRectElement>(".ab")];
  const circles = [...svg.querySelectorAll<SVGCircleElement>(".ac")];
  const stat = svg.querySelector<SVGTextElement>(".astat")!;
  const seatlab = svg.querySelector<SVGTextElement>(".aseatlab")!;
  const num = svg.querySelector<SVGTextElement>(".abnum")!;
  const dot = svg.querySelector<SVGGElement>(".adot")!;
  const dotc = dot.querySelector("circle")!;
  const pm = svg.querySelector<SVGGElement>(".apm")!;
  const pmt = pm.querySelector<SVGTextElement>(".apmt")!;
  const h = (v: number, max: number) => (v / max) * MAXH;
  const barH = [0, 0, 0, 0];

  const setBar = (i: number, height: number) => { barH[i] = Math.max(0, height); bars[i].style.transform = `scaleY(${Math.min(1, barH[i] / MAXH)})`; };
  const focusBar = (i: number) => bars.forEach((b, j) => (b.style.opacity = j === i ? "1" : ".28"));
  const allBars = (o: string) => bars.forEach((b) => (b.style.opacity = o));
  const fillCircle = (i: number, c: string) => { circles[i].setAttribute("fill", c); circles[i].setAttribute("stroke", c); };
  const blankCircle = (i: number) => { const c = circles[i]; c.setAttribute("fill", "none"); c.setAttribute("stroke", "#3a4254"); c.style.opacity = "1"; c.style.transform = ""; };
  const status = (s: string) => (stat.textContent = s);
  const showNum = (i: number, text: string, color: string) => { num.setAttribute("x", `${BX[i] + BW / 2}`); num.setAttribute("y", `${BY - barH[i] - 7}`); num.setAttribute("fill", color); num.textContent = text; num.setAttribute("opacity", "1"); };
  const hideNum = () => num.setAttribute("opacity", "0");

  async function fly(barI: number, seatI: number, c: string, dur = 360) {
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

  // first frame: votes not yet in, no seats yet — the paused default
  function firstFrame() {
    bars.forEach((_, i) => setBar(i, 0));
    allBars("1");
    circles.forEach((_, i) => blankCircle(i));
    pm.style.transition = "none"; pm.style.opacity = "0";
    hideNum(); status(""); seatlab.textContent = "8 seats";
  }

  return { svg, bars, circles, h, setBar, focusBar, allBars, fillCircle, blankCircle, status, seatlab, showNum, hideNum, fly, pm, pmt, firstFrame, cx, cy };
}
type Stage = ReturnType<typeof makeStage>;

// run `work`, then hold its title for the rest of MIN_TEXT (so it can be read), then a beat
async function phase(s: Stage, tok: Tok, title: string, work: () => Promise<void>) {
  if (tok.c) throw 0;
  s.status(title);
  const t0 = performance.now();
  await work();
  if (tok.c) throw 0;
  const el = performance.now() - t0;
  if (el < MIN_TEXT) await sleep(MIN_TEXT - el);
  if (tok.c) throw 0;
  await sleep(GAP);
}

async function finale(s: Stage, tok: Tok, ord: number[]) {
  await phase(s, tok, `${KEY[WIN]} wins the most seats → forms government`, async () => {
    s.hideNum();
    s.circles.forEach((c, i) => (c.style.opacity = ord[i] === WIN ? "1" : ".28"));
    s.allBars(".2");
    await sleep(650); if (tok.c) throw 0;
    const seat = ord.indexOf(WIN);
    s.pmt.setAttribute("x", `${s.cx(seat)}`); s.pmt.setAttribute("y", `${s.cy(seat) - CR - 5}`);
    s.circles[seat].style.transition = "transform .4s ease";
    s.circles[seat].style.transform = "translateY(-9px)";
    s.pm.style.transition = "opacity .3s"; s.pm.style.opacity = "1";
    await sleep(720);
  });
}

async function runFPTP(s: Stage, tok: Tok) {
  const ord = ORDER.fptp;
  s.seatlab.textContent = "8 local seats";
  await phase(s, tok, "Each seat goes to its local winner", async () => {
    for (let i = 0; i < SEATS; i++) {
      if (tok.c) throw 0;
      const w = ord[i], losers = [0.52, 0.4, 0.28];
      let li = 0;
      s.bars.forEach((_, p) => s.setBar(p, s.h(p === w ? 0.86 : losers[(li++ + i) % 3], 1)));
      s.allBars("1");
      await sleep(420); if (tok.c) throw 0;
      s.focusBar(w);
      await sleep(280); if (tok.c) throw 0;
      await s.fly(w, i, COL[w]); if (tok.c) throw 0;
      await sleep(70);
      s.bars.forEach((_, p) => s.setBar(p, 0));
    }
  });
  await finale(s, tok, ord);
}

async function runHA(s: Stage, tok: Tok, divisor: (held: number) => number, ord: number[]) {
  s.seatlab.textContent = "8 seats";
  await phase(s, tok, "Votes come in", async () => {
    s.bars.forEach((_, i) => s.setBar(i, s.h(VOTES[i], VOTES[0])));
    s.allBars("1"); await sleep(640);
  });
  const held = [0, 0, 0, 0];
  await phase(s, tok, "Each seat → the biggest average, then cut the winner", async () => {
    for (let i = 0; i < SEATS; i++) {
      if (tok.c) throw 0;
      const w = ord[i];
      s.focusBar(w);
      s.showNum(w, `${Math.round(VOTES[w] / divisor(held[w]))}`, COL[w]); // current average that won
      await sleep(320); if (tok.c) throw 0;
      await s.fly(w, i, COL[w]); if (tok.c) throw 0;
      held[w]++;
      const div = divisor(held[w]), next = VOTES[w] / div;
      s.showNum(w, `÷${div}`, COL[w]);                  // the division applied to the winner
      await sleep(300); if (tok.c) throw 0;
      s.setBar(w, s.h(next, VOTES[0]));
      s.showNum(w, `${Math.round(next)}`, COL[w]);
      await sleep(420); if (tok.c) throw 0;
      s.allBars("1"); s.hideNum();
    }
  });
  await finale(s, tok, ord);
}

async function runHare(s: Stage, tok: Tok) {
  const ord = ORDER["largest-remainder"];
  const total = VOTES.reduce((a, b) => a + b, 0), quota = total / SEATS;
  const q = VOTES.map((v) => v / quota), whole = q.map(Math.floor), maxQ = Math.max(...q);
  s.seatlab.textContent = "8 seats";
  await phase(s, tok, "Votes come in, counted in quotas", async () => {
    s.bars.forEach((_, i) => s.setBar(i, s.h(q[i], maxQ)));
    s.allBars("1"); await sleep(660);
  });
  let seat = 0;
  await phase(s, tok, "Each whole quota becomes a seat", async () => {
    for (let p = 0; p < 4; p++) {
      if (whole[p] === 0) continue;
      if (tok.c) throw 0;
      s.focusBar(p);
      let cur = q[p];
      s.showNum(p, cur.toFixed(1), COL[p]);
      await sleep(280);
      for (let k = 0; k < whole[p]; k++) {
        if (tok.c) throw 0;
        await s.fly(p, seat++, COL[p]); if (tok.c) throw 0;
        s.showNum(p, "−1", COL[p]);
        await sleep(260); if (tok.c) throw 0;
        cur -= 1;
        s.setBar(p, s.h(cur, maxQ));
        s.showNum(p, cur.toFixed(1), COL[p]);
        await sleep(380); if (tok.c) throw 0;
      }
      s.allBars("1"); s.hideNum();
    }
  });
  await phase(s, tok, "Leftover seats → the biggest remainders", async () => {
    for (; seat < SEATS; seat++) {
      if (tok.c) throw 0;
      const w = ord[seat];
      s.focusBar(w);
      s.showNum(w, (q[w] - whole[w]).toFixed(2), COL[w]); // the remainder
      await sleep(420); if (tok.c) throw 0;
      await s.fly(w, seat, COL[w]); if (tok.c) throw 0;
      s.allBars("1"); s.hideNum();
    }
  });
  await finale(s, tok, ord);
}

function runOne(s: Stage, method: Method, tok: Tok): Promise<void> {
  if (method === "fptp") return runFPTP(s, tok);
  if (method === "dhondt") return runHA(s, tok, (h) => h + 1, ORDER.dhondt);
  if (method === "sainte-lague") return runHA(s, tok, (h) => 2 * h + 1, ORDER["sainte-lague"]);
  return runHare(s, tok);
}

// ---- mobile coordinator: the card nearest the screen centre plays, the rest pause ----
type Ctl = { wrap: HTMLElement; start: () => void; stop: () => void };
const REG: Ctl[] = [];
let coordWired = false;
const TOUCH = !window.matchMedia?.("(hover: hover)").matches;
function coordinate() {
  const mid = window.innerHeight / 2;
  let best = -1, bd = Infinity;
  REG.forEach((c, i) => {
    const r = c.wrap.getBoundingClientRect();
    if (r.bottom < 40 || r.top > window.innerHeight - 40) return;
    const d = Math.abs(r.top + r.height / 2 - mid);
    if (d < bd) { bd = d; best = i; }
  });
  REG.forEach((c, i) => (i === best ? c.start() : c.stop()));
}
function wireCoordinator() {
  if (coordWired) return;
  coordWired = true;
  let raf = 0;
  const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(coordinate); };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  setTimeout(coordinate, 150);
}

export function setupAnim(wrap: HTMLElement, method: Method) {
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const s = makeStage(wrap);
  s.firstFrame();
  if (reduce) return;

  let tok: Tok | null = null;
  let running = false;
  const start = () => {
    if (running) return;
    running = true;
    const my: Tok = { c: false };
    tok = my;
    (async () => {
      try {
        s.firstFrame(); await sleep(140);
        while (!my.c) { await runOne(s, method, my); if (my.c) break; await sleep(PAUSE); s.firstFrame(); await sleep(140); }
      } catch { /* cancelled */ }
      if (tok === my) tok = null;
      running = false;
      s.firstFrame();
    })();
  };
  const stop = () => { if (tok) tok.c = true; };

  if (TOUCH) { REG.push({ wrap, start, stop }); wireCoordinator(); }
  else { wrap.addEventListener("mouseenter", start); wrap.addEventListener("mouseleave", stop); }
}
