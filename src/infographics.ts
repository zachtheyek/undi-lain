// Mechanism infographics for each electoral system.
// Each builder returns an inline SVG that *shows how seats are distributed* under
// that system, using ONE shared toy election so the four read as small multiples:
//   A 100k · B 80k · C 30k · D 20k votes, 8 seats.
// That is the canonical highest-averages example (see allocate.test.ts):
//   FPTP A5 B2 C1 D0 · D'Hondt A4 B3 C1 D0 · Sainte-Laguë A3 B3 C1 D1 · Hare A3 B3 C1 D1.
// The seat count falls for the biggest bloc (A: 5→4→3) and the smallest contender
// (D: 0→0→1) climbs as the method gets fairer — the one-liners carry the "why".

import type { Method } from "./allocate";

type Party = { k: string; v: number; c: string };
// Muted, distinct hues — they carry party identity across all four panels, so they
// must stay quiet enough not to fight the real palette elsewhere on the page.
const TOY: Party[] = [
  { k: "A", v: 100, c: "#6ea8fe" },
  { k: "B", v: 80, c: "#5cc9b0" },
  { k: "C", v: 30, c: "#e8b34a" },
  { k: "D", v: 20, c: "#c98bdb" },
];
const SEATS = 8;
const r1 = (n: number) => (n >= 10 ? Math.round(n) : n.toFixed(1).replace(/\.0$/, ""));

// ---- highest-averages grid (D'Hondt / Sainte-Laguë) ----------------------------
type Cell = { val: number; won: boolean; order: number };
function grid(divs: number[]) {
  const all: { p: number; c: number; q: number }[] = [];
  TOY.forEach((p, pi) => divs.forEach((d, ci) => all.push({ p: pi, c: ci, q: p.v / d })));
  all.sort((a, b) => b.q - a.q);
  const win = new Map<string, number>();
  for (let i = 0; i < SEATS; i++) win.set(`${all[i].p}-${all[i].c}`, i + 1);
  return TOY.map((p, pi) => ({
    key: p.k, color: p.c,
    cells: divs.map((d, ci): Cell => { const k = `${pi}-${ci}`; return { val: p.v / d, won: win.has(k), order: win.get(k) ?? 0 }; }),
    seats: divs.filter((_, ci) => win.has(`${pi}-${ci}`)).length,
  }));
}

function divisorSvg(divs: number[]): string {
  const rows = grid(divs);
  const x0 = 38, colW = 42, rowH = 25, y0 = 22, cw = 36, ch = 19;
  const header = divs.map((d, ci) => `<text x="${x0 + ci * colW + cw / 2}" y="14" text-anchor="middle" class="ig-h">÷${d}</text>`).join("");
  const body = rows.map((row, ri) => {
    const y = y0 + ri * rowH;
    const chip = `<rect x="6" y="${y + 2}" width="15" height="15" rx="4" fill="${row.color}"/><text x="13.5" y="${y + 13}" text-anchor="middle" class="ig-k">${row.key}</text>`;
    const cells = row.cells.map((c, ci) => {
      const x = x0 + ci * colW;
      if (c.won) return `<g class="ig-win" style="--i:${c.order}"><rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="5" fill="${row.color}"/><text x="${x + cw / 2}" y="${y + 13.5}" text-anchor="middle" class="ig-vw">${r1(c.val)}</text></g>`;
      return `<text x="${x + cw / 2}" y="${y + 13.5}" text-anchor="middle" class="ig-vf">${r1(c.val)}</text>`;
    }).join("");
    const total = `<text x="${x0 + divs.length * colW + 8}" y="${y + 13.5}" class="ig-tot" fill="${row.color}">${row.seats}</text>`;
    return chip + cells + total;
  }).join("");
  const tx = x0 + divs.length * colW + 8;
  return `<svg viewBox="0 0 ${tx + 30} ${y0 + 4 * rowH + 6}" class="ig" role="img" aria-label="seat allocation grid">
    ${header}<text x="${tx}" y="14" class="ig-h">seats</text>${body}</svg>`;
}

// ---- largest remainder (Hare) ---------------------------------------------------
function hareSvg(): string {
  const total = TOY.reduce((s, p) => s + p.v, 0);
  const quota = total / SEATS;                 // 28.75
  const rows = TOY.map((p) => { const full = Math.floor(p.v / quota); return { ...p, full, frac: p.v / quota - full }; });
  const leftover = SEATS - rows.reduce((s, r) => s + r.full, 0);
  const winners = new Set([...rows].sort((a, b) => b.frac - a.frac).slice(0, leftover).map((r) => r.k));
  const x0 = 22, w = 196, rowH = 26, y0 = 22, bh = 13;
  const sx = (v: number) => x0 + (v / TOY[0].v) * w;
  const ticks = [1, 2, 3].map((n) => `<line x1="${sx(n * quota)}" y1="14" x2="${sx(n * quota)}" y2="${y0 + 4 * rowH - 4}" class="ig-tick"/>`).join("");
  const qlabel = `<text x="${sx(quota)}" y="10" text-anchor="middle" class="ig-h">1 quota</text>`;
  const body = rows.map((r, ri) => {
    const y = y0 + ri * rowH;
    const chip = `<rect x="2" y="${y}" width="15" height="${bh}" rx="4" fill="${r.c}"/><text x="9.5" y="${y + 10.5}" text-anchor="middle" class="ig-k">${r.k}</text>`;
    const fullW = sx(r.full * quota) - x0;
    const win = winners.has(r.k);
    const order = [...winners].indexOf(r.k) + 1;
    const fullBar = r.full ? `<rect x="${x0}" y="${y}" width="${fullW}" height="${bh}" rx="3" fill="${r.c}"/>` : "";
    const stub = `<rect x="${x0 + fullW}" y="${y}" width="${sx(r.v) - x0 - fullW}" height="${bh}" rx="3" fill="${r.c}" opacity="${win ? 0.85 : 0.3}"${win ? ` class="ig-win" style="--i:${order}"` : ""}/>`;
    const ring = win ? `<rect x="${x0 + fullW - 1}" y="${y - 1}" width="${sx(r.v) - x0 - fullW + 2}" height="${bh + 2}" rx="4" fill="none" stroke="${r.c}" stroke-width="1.5" class="ig-win" style="--i:${order}"/>` : "";
    const seats = r.full + (win ? 1 : 0);
    const total = `<text x="${x0 + w + 8}" y="${y + 10.5}" class="ig-tot" fill="${r.c}">${seats}</text>`;
    return chip + fullBar + stub + ring + total;
  }).join("");
  return `<svg viewBox="0 0 ${x0 + w + 30} ${y0 + 4 * rowH + 4}" class="ig" role="img" aria-label="largest remainder allocation">
    ${qlabel}${ticks}${body}
    <text x="${x0 + w + 8}" y="14" class="ig-h">seats</text></svg>`;
}

// ---- first-past-the-post --------------------------------------------------------
function fptpSvg(): string {
  // one district shown in detail (A leads), then the 8-seat chamber A5 B2 C1 D0
  const [A, B, C] = TOY;
  const dx = 14, baseY = 70, maxH = 44;
  const bars = [{ p: A, h: 1 }, { p: B, h: 0.62 }, { p: C, h: 0.34 }].map((b, i) => {
    const x = dx + i * 17, h = maxH * b.h, win = i === 0;
    return `<rect x="${x}" y="${baseY - h}" width="12" height="${h}" rx="2" fill="${b.p.c}" opacity="${win ? 1 : 0.32}"/>` +
      (win ? `<circle cx="${x + 6}" cy="${baseY - h - 7}" r="3.4" fill="${b.p.c}" class="ig-win" style="--i:1"/>` : "");
  }).join("");
  const winners = [A, A, B, A, C, A, B, A]; // 8 districts: A5 B2 C1 D0
  const cols = 4, gx = 150, gy = 30, gap = 18;
  const chamber = winners.map((p, i) => {
    const cx = gx + (i % cols) * gap, cy = gy + Math.floor(i / cols) * gap;
    return `<circle cx="${cx}" cy="${cy}" r="6.4" fill="${p.c}" class="ig-win" style="--i:${i + 1}"/>`;
  }).join("");
  return `<svg viewBox="0 0 240 96" class="ig" role="img" aria-label="first-past-the-post">
    <text x="${dx + 20}" y="12" text-anchor="middle" class="ig-h">one seat</text>
    ${bars}
    <line x1="${dx - 2}" y1="${baseY}" x2="${dx + 49}" y2="${baseY}" class="ig-axis"/>
    <text x="${dx + 23}" y="84" text-anchor="middle" class="ig-cap">local lead wins</text>
    <text x="76" y="46" class="ig-arrow">→</text>
    <text x="${gx + 27}" y="12" text-anchor="middle" class="ig-h">8 seats</text>
    ${chamber}
    <text x="${gx + 27}" y="84" text-anchor="middle" class="ig-cap">runner-up votes vanish</text></svg>`;
}

export const SYSTEM_INFOGRAPHIC: Record<Method, () => string> = {
  fptp: fptpSvg,
  dhondt: () => divisorSvg([1, 2, 3, 4]),
  "sainte-lague": () => divisorSvg([1, 3, 5, 7]),
  "largest-remainder": hareSvg,
};
