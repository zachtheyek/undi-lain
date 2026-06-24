# 🪑 Undi Lain

**What if Malaysia counted votes differently?**
Re-run any general election under proportional representation — D'Hondt,
Sainte-Laguë or largest-remainder — and watch the seats move, in a parliament arc.

🔗 **Live:** https://zachtheyek.github.io/undi-lain/

![Undi Lain](https://zachtheyek.github.io/undi-lain/og-default.png)

## The point

First-past-the-post doesn't just pick winners — it distorts. In **2022**, BN won
**22%** of the national vote but only **30** of 222 seats; under Sainte-Laguë it
would have won **49**. GPS, with 4% of the vote concentrated in Sarawak, took 23
seats — under PR, just 9. Disproportionality (Gallagher) falls from **8.0 to 0.3**.

Pick any of 16 general elections, any of three PR methods, and an optional
electoral threshold, and see exactly how the chamber changes.

## How it works

Seats are re-allocated **nationally** in proportion to each bloc's share of the
national vote. This is a deliberate simplification of real-world PR (which uses
multi-member districts), chosen so the headline distortion is exact and explainable.
The unit is each bloc = its coalition, or its party if unaligned.

The allocation methods live in [`src/allocate.ts`](src/allocate.ts) and are
**unit-tested** ([`src/allocate.test.ts`](src/allocate.test.ts)) against the
canonical textbook worked examples — `npm test`.

## Credit

All underlying data is the **Malaysian Election Corpus (MECo)** by
**[Thevesh Thevananthan](https://electiondata.my)** (CC0). Not affiliated with the author.

## Build

```bash
npm install
npm run data    # build_data.py → public/data/elections.json
npm test        # vitest — allocation methods
npm run dev
npm run build   # tests + vite + OG card
```

## Licence

Code: MIT. Data: CC0 (MECo / Thevesh Thevananthan).
