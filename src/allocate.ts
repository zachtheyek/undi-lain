// Seat-allocation methods for the electoral-system sandbox.
// All functions are pure and total-preserving (Σ allocated === seats).

export type Bloc = { bloc: string; votes: number };
export type Method = "fptp" | "dhondt" | "sainte-lague" | "largest-remainder";

export const METHOD_NAMES: Record<Method, string> = {
  fptp: "First-past-the-post (actual)",
  dhondt: "D'Hondt",
  "sainte-lague": "Sainte-Laguë",
  "largest-remainder": "Largest remainder (Hare)",
};

function applyThreshold(blocs: Bloc[], thresholdPct: number): Bloc[] {
  if (thresholdPct <= 0) return blocs;
  const total = blocs.reduce((s, b) => s + b.votes, 0);
  const cut = (total * thresholdPct) / 100;
  const kept = blocs.filter((b) => b.votes >= cut);
  return kept.length ? kept : blocs; // never exclude everyone
}

/** Highest-averages (divisor) method. divisor(seatsHeld) → next divisor. */
function highestAverages(blocs: Bloc[], seats: number, divisor: (held: number) => number): Map<string, number> {
  const res = new Map<string, number>(blocs.map((b) => [b.bloc, 0]));
  for (let i = 0; i < seats; i++) {
    let best: string | null = null, bestQ = -Infinity;
    for (const b of blocs) {
      const q = b.votes / divisor(res.get(b.bloc)!);
      if (q > bestQ) { bestQ = q; best = b.bloc; }
    }
    if (best) res.set(best, res.get(best)! + 1);
  }
  return res;
}

export const dHondt = (blocs: Bloc[], seats: number) => highestAverages(blocs, seats, (h) => h + 1);
export const sainteLague = (blocs: Bloc[], seats: number) => highestAverages(blocs, seats, (h) => 2 * h + 1);

/** Largest-remainder method with the Hare quota. */
export function largestRemainder(blocs: Bloc[], seats: number): Map<string, number> {
  const total = blocs.reduce((s, b) => s + b.votes, 0);
  const quota = total / seats;
  const rows = blocs.map((b) => { const exact = b.votes / quota; const s = Math.floor(exact); return { bloc: b.bloc, seats: s, rem: exact - s }; });
  let left = seats - rows.reduce((s, r) => s + r.seats, 0);
  rows.sort((a, b) => b.rem - a.rem);
  for (let i = 0; i < left; i++) rows[i % rows.length].seats++;
  return new Map(rows.map((r) => [r.bloc, r.seats]));
}

/** Dispatch. `fptp` returns the supplied actual seats unchanged. */
export function allocate(blocs: (Bloc & { seats?: number })[], totalSeats: number, method: Method, thresholdPct = 0): Map<string, number> {
  if (method === "fptp") return new Map(blocs.map((b) => [b.bloc, b.seats ?? 0]));
  const elig = applyThreshold(blocs, thresholdPct);
  const eligSet = new Set(elig.map((b) => b.bloc));
  const m = method === "dhondt" ? dHondt(elig, totalSeats)
    : method === "sainte-lague" ? sainteLague(elig, totalSeats)
    : largestRemainder(elig, totalSeats);
  // excluded blocs get 0
  for (const b of blocs) if (!eligSet.has(b.bloc)) m.set(b.bloc, 0);
  return m;
}

/** Gallagher least-squares disproportionality (%) for an allocation. */
export function gallagher(blocs: Bloc[], seatsMap: Map<string, number>, totalSeats: number): number {
  const totalVotes = blocs.reduce((s, b) => s + b.votes, 0);
  let acc = 0;
  for (const b of blocs) {
    const v = (b.votes / totalVotes) * 100;
    const s = ((seatsMap.get(b.bloc) ?? 0) / totalSeats) * 100;
    acc += (v - s) ** 2;
  }
  return Math.sqrt(acc / 2);
}
