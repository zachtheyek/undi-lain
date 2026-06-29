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

Pick any of 16 general elections (1955–2022), any of three PR methods, and an
optional electoral threshold, and see exactly how the chamber changes.

## What's on the page

- **Two parliament arcs** side by side: the actual first-past-the-post result on
  the left, the chosen PR system on the right.
- **A single disproportionality readout** — the Gallagher index for FPTP and for
  the chosen system on one scale, so you see the gap close (lower = fairer), plus
  how many seats change hands.
- **A bloc table** where the *change* is the headline: each bloc's logo, its vote
  share, and the seat swing as `+19 (30 → 49)` (green for gains, red for losses).
- **Explainer infographics for every system.** The biggest barrier here is jargon:
  most readers don't already know what D'Hondt or the Gallagher index *are*. So each
  system shows a small, self-contained graphic of how it shares out the same eight
  seats among the same four blocs, a one-line gist (e.g. *"rewards the strong"*), and
  an ⓘ card with the deeper explanation. The D'Hondt and Sainte-Laguë panels are
  deliberately drawn as the same grid with different divisors, so the only difference
  between them is visible at a glance. First-past-the-post is shown as the fixed
  baseline (it's the actual result on every left-hand chamber), so it isn't a
  selectable option.

## How the re-allocation works

Seats are re-allocated **nationally** in proportion to each bloc's share of the
national vote. This is a deliberate simplification of real-world PR (which uses
multi-member districts), chosen so the headline distortion is exact and explainable.
The unit is each bloc = its coalition, or its party if unaligned.

The allocation methods live in [`src/allocate.ts`](src/allocate.ts) and are
**unit-tested** ([`src/allocate.test.ts`](src/allocate.test.ts)) against the
canonical textbook worked examples — `npm test`. The animated per-system explainers
in [`src/anim.ts`](src/anim.ts) play out the real algorithm on one shared four-bloc
example (A 120 · B 80 · C 30 · D 20 over 8 seats), so what they show is how the
method actually distributes seats, not a mock-up.

## Credit

All underlying data is the **Malaysian Election Corpus (MECo)** by
**[Thevesh Thevananthan](https://x.com/Thevesh)** ([electiondata.my](https://electiondata.my), CC0).
Not affiliated with the author.

## Data & deployment

The site **self-updates**. `public/data/` is **not committed** — it's generated
from the shared [`meco-data`](https://github.com/zachtheyek/meco-data) foundation
during the GitHub Actions build. The deploy workflow runs weekly; on each scheduled
run it first diffs the live data stamp against `meco-data`'s current commit and only
rebuilds if the upstream data actually moved (pushes and manual runs always build).
No manual step is needed in steady state. Party/coalition logos in
`public/logos/` are committed assets (mirrored from `undi-wrapped`).

## Build

```bash
npm install
npm run data    # build_data.py: ../meco-data/out → public/data/elections.json
npm test        # vitest — allocation methods
npm run dev
npm run build   # tests + vite + OG card
```

## Sibling projects

Part of a family of civic data-viz tools built on the Malaysian Election Corpus:

- [**Undi Wrapped**](https://zachtheyek.github.io/undi-wrapped/) — your constituency's election story, Spotify-Wrapped style
- [**Lompat**](https://zachtheyek.github.io/lompat/) — every party-hop since 1955, and the "frog" leaderboards
- [**Salasilah**](https://zachtheyek.github.io/salasilah/) — the family tree of Malaysia's parties & coalitions
- [**Nadi Demokrasi**](https://zachtheyek.github.io/nadi-demokrasi/) — the health of the democracy in six indicators
- [**Undi Generasi**](https://zachtheyek.github.io/undi-generasi/) — how Malaysia votes across generations

## Licence

Code: MIT. Data: CC0 (MECo / Thevesh Thevananthan).
