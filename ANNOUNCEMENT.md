# Announcement — Undi Lain

**Live:** https://zachtheyek.github.io/undi-lain/

Draft posts for X and LinkedIn. Lean into virality + civic usefulness, stay strictly
non-partisan (it measures the voting system, it doesn't take a side), and credit Thevesh
prominently. **Confirm the `@Thevesh` handle before posting. Do not post — these are drafts.**

The hook is a fact most Malaysians half-remember: under first-past-the-post a coalition can
win the most seats while losing the popular vote. Undi Lain lets you re-run history under the
fairer alternatives and see exactly when that would have changed who governed.

---

## X / Twitter thread

**1/ (hook + demo)**

🪑 What if Malaysia had counted its votes differently?

Undi Lain re-runs every general election since 1955 under proportional representation.

The one that jumps out: in 2013, BN took **60% of the seats on 47% of the vote** — and lost
the popular vote. Under PR it loses its majority. A different government, five years before 2018.

👉 https://zachtheyek.github.io/undi-lain/

**2/ (what's inside + how to use)**

Pick any election → pick a system (D'Hondt, Sainte-Laguë, largest-remainder) → watch the
chamber rearrange, seat by seat.

Each system has a little animation showing *how* it shares out seats. And when the result is
hung — like 1969 would be under PR — you can tap blocs to build a government yourself.

Free, no login, mobile.

**3/ (credit)**

None of this is my data. It's a visualiser for @Thevesh's Malaysian Election Corpus — about
four years of curating clean, component-party results for every election since 1955. CC0,
peer-reviewed in Nature Scientific Data. The data is the hard part. 🙏 electiondata.my

**4/ (method + caveat + source)**

Method: seats are re-allocated *nationally* by each bloc's vote share — a deliberate
simplification (real PR uses multi-member districts) that makes FPTP's distortion exact and
explainable. It's a measurement, not a verdict. Allocation methods are unit-tested.

Code + notes: https://github.com/zachtheyek/undi-lain

---

## LinkedIn

**What if Malaysia had counted its votes differently?**

Electoral systems quietly decide who governs, but almost no one gets to see how. I built a
small, free tool — Undi Lain — that re-runs every Malaysian general election since 1955 under
proportional representation, so you can watch the difference for yourself.

A couple of examples it surfaces, purely as measurements of the voting rules:

• In 2013, the long-ruling coalition won 60% of the seats on 47% of the vote — having actually
lost the popular vote. Under proportional representation it would not have held a majority.

• Re-run 1969 under PR and the two-thirds-dominated chamber that actually sat becomes a hung
parliament instead.

How it works: pick an election, pick a system (D'Hondt, Sainte-Laguë, or largest-remainder),
and the parliament rearranges seat by seat. Each system comes with a short animation of how it
distributes seats, a plain-language one-liner, and — when a result is hung — a builder that
lets you assemble a working coalition yourself. It's deliberately neutral: it describes what
the arithmetic does, not who "should" have won.

Crucially, the hard part isn't mine. Undi Lain only visualises **Thevesh Thevananthan's
Malaysian Election Corpus** (electiondata.my) — roughly four years of curating clean,
component-party results for every election since 1955, released CC0 and peer-reviewed in
Nature Scientific Data.

Free, no login, works on your phone: https://zachtheyek.github.io/undi-lain/

Data: Malaysian Election Corpus (CC0). Methodology and caveats are on the page and in the repo.

---

*Notes:*
- Scenarios are shareable at clean URLs, e.g. `/s/GE-13/sainte-lague/`, each with its own before/after OG card.
- Confirm `@Thevesh` is the correct X handle before posting; on LinkedIn, link/tag Thevesh if he has a profile.
- Demo assets: the OG card (`dist/og-default.png`, the 2013 minority-win) is a ready hero image; record a short screen GIF against the live site per the handoff if a motion demo is wanted.
