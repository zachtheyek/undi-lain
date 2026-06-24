import { describe, it, expect } from "vitest";
import { dHondt, sainteLague, largestRemainder, allocate, gallagher, Bloc } from "./allocate";

// Canonical worked example (Wikipedia): 8 seats.
const ex: Bloc[] = [
  { bloc: "A", votes: 100_000 },
  { bloc: "B", votes: 80_000 },
  { bloc: "C", votes: 30_000 },
  { bloc: "D", votes: 20_000 },
];

const sum = (m: Map<string, number>) => [...m.values()].reduce((s, v) => s + v, 0);

describe("D'Hondt", () => {
  it("matches the textbook 8-seat result A4 B3 C1 D0", () => {
    const r = dHondt(ex, 8);
    expect(r.get("A")).toBe(4);
    expect(r.get("B")).toBe(3);
    expect(r.get("C")).toBe(1);
    expect(r.get("D")).toBe(0);
    expect(sum(r)).toBe(8);
  });
});

describe("Sainte-Laguë", () => {
  it("matches the textbook 8-seat result A3 B3 C1 D1", () => {
    const r = sainteLague(ex, 8);
    expect(r.get("A")).toBe(3);
    expect(r.get("B")).toBe(3);
    expect(r.get("C")).toBe(1);
    expect(r.get("D")).toBe(1);
    expect(sum(r)).toBe(8);
  });
});

describe("Largest remainder (Hare)", () => {
  it("allocates all seats, leftovers to largest remainders", () => {
    // quota 28750: floors A3 B2 C1 D0 (=6); remainders B.78 > D.70 > A.48 > C.04,
    // so the 2 leftover seats go to B and D → A3 B3 C1 D1.
    const r = largestRemainder(ex, 8);
    expect(sum(r)).toBe(8);
    expect(r.get("A")).toBe(3);
    expect(r.get("B")).toBe(3);
    expect(r.get("C")).toBe(1);
    expect(r.get("D")).toBe(1);
  });
  it("is perfectly proportional when shares divide evenly", () => {
    const r = largestRemainder([{ bloc: "X", votes: 60 }, { bloc: "Y", votes: 40 }], 10);
    expect(r.get("X")).toBe(6);
    expect(r.get("Y")).toBe(4);
  });
});

describe("allocate dispatch + threshold", () => {
  it("fptp returns supplied seats unchanged", () => {
    const r = allocate([{ bloc: "A", votes: 1, seats: 5 }, { bloc: "B", votes: 9, seats: 2 }], 7, "fptp");
    expect(r.get("A")).toBe(5);
    expect(r.get("B")).toBe(2);
  });
  it("threshold excludes small blocs and reallocates", () => {
    const blocs = [{ bloc: "A", votes: 50 }, { bloc: "B", votes: 47 }, { bloc: "C", votes: 3 }];
    const r = allocate(blocs, 10, "dhondt", 5); // C (3%) excluded
    expect(r.get("C")).toBe(0);
    expect(sum(r)).toBe(10);
  });
  it("every method allocates exactly totalSeats", () => {
    for (const m of ["dhondt", "sainte-lague", "largest-remainder"] as const) {
      const r = allocate(ex, 222, m);
      expect(sum(r)).toBe(222);
    }
  });
});

describe("Gallagher", () => {
  it("is zero for a perfectly proportional allocation", () => {
    const blocs = [{ bloc: "X", votes: 60 }, { bloc: "Y", votes: 40 }];
    expect(gallagher(blocs, new Map([["X", 6], ["Y", 4]]), 10)).toBeCloseTo(0, 6);
  });
  it("is positive when a bloc is over-represented", () => {
    const blocs = [{ bloc: "X", votes: 50 }, { bloc: "Y", votes: 50 }];
    expect(gallagher(blocs, new Map([["X", 8], ["Y", 2]]), 10)).toBeGreaterThan(0);
  });
});
