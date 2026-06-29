// Shared helpers for the OG-card + prerender scripts (Node side). Mirrors src/allocate.ts
// and src/colors.ts so a shared link's card matches what the page renders. PR routes are
// always at threshold 0, so allocation here takes no threshold.

const COALITION = { BN: "#1f4ea1", PH: "#d7282f", PN: "#0e2a6b", GPS: "#15788a", GRS: "#e08e0b", PR: "#c0392b", BA: "#117a4d", PERIKATAN: "#c79a3b", GS: "#1f8a4c", ALONE: "#6a6a78" };
const PARTY = { UMNO: "#cc0001", MCA: "#16348f", MIC: "#f0a30a", DAP: "#d7282f", PKR: "#0096d6", PAS: "#1f8a4c", BERSATU: "#b01116", AMANAH: "#e2231a", GERAKAN: "#e4002b", PBB: "#1a6f7e", WARISAN: "#2aa7a0", PBS: "#2e7d32", STAR: "#283593", MUDA: "#000000", BEBAS: "#6a6a78", PSRM: "#9b2226", PERIKATAN: "#c79a3b" };
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return `hsl(${h % 360} 58% 52%)`; }
const coalitionColor = (c) => COALITION[c] ?? PARTY[c] ?? hash(c);
const partyColor = (p) => PARTY[p] ?? COALITION[p] ?? hash(p);
export function blocColor(b) {
  if (b === "Others") return "#5b6472";
  return coalitionColor(b) !== "#6a6a78" ? coalitionColor(b) : partyColor(b);
}

export const METHOD_NAMES = { dhondt: "D'Hondt", "sainte-lague": "Sainte-Laguë", "largest-remainder": "Largest remainder (Hare)" };
export const PR_METHODS = ["dhondt", "sainte-lague", "largest-remainder"];

function highestAverages(blocs, seats, divisor) {
  const res = new Map(blocs.map((b) => [b.bloc, 0]));
  for (let i = 0; i < seats; i++) {
    let best = null, bestQ = -Infinity;
    for (const b of blocs) { const q = b.votes / divisor(res.get(b.bloc)); if (q > bestQ) { bestQ = q; best = b.bloc; } }
    if (best) res.set(best, res.get(best) + 1);
  }
  return res;
}
function largestRemainder(blocs, seats) {
  const total = blocs.reduce((s, b) => s + b.votes, 0), quota = total / seats;
  const rows = blocs.map((b) => { const exact = b.votes / quota, s = Math.floor(exact); return { bloc: b.bloc, seats: s, rem: exact - s }; });
  let left = seats - rows.reduce((s, r) => s + r.seats, 0);
  rows.sort((a, b) => b.rem - a.rem);
  for (let i = 0; i < left; i++) rows[i % rows.length].seats++;
  return new Map(rows.map((r) => [r.bloc, r.seats]));
}
export function allocate(blocs, N, method) {
  if (method === "fptp") return new Map(blocs.map((b) => [b.bloc, b.seats ?? 0]));
  if (method === "dhondt") return highestAverages(blocs, N, (h) => h + 1);
  if (method === "sainte-lague") return highestAverages(blocs, N, (h) => 2 * h + 1);
  return largestRemainder(blocs, N);
}

// per-scenario summary used by both the card and the prerendered <meta>
export function scenario(e, method) {
  const N = e.n_seats, tot = e.total_votes;
  const order = [...e.blocs].sort((a, b) => b.seats - a.seats || b.votes - a.votes).map((b) => b.bloc);
  const fptp = allocate(e.blocs, N, "fptp");
  const pr = allocate(e.blocs, N, method);
  const top = order[0], tv = e.blocs.find((b) => b.bloc === top);
  const fS = fptp.get(top) ?? 0, pS = pr.get(top) ?? 0;
  const votePct = (tv.votes / tot) * 100;
  return {
    N, order, fptp, pr, top, label: METHOD_NAMES[method],
    fS, pS, d: pS - fS, votePct, fSeatPct: (fS / N) * 100, pSeatPct: (pS / N) * 100,
  };
}
