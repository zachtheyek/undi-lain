"""
Undi Lain — per-election bloc vote/seat totals
=============================================
For every federal general election, the national vote total and actual (FPTP)
seats won by each coalition/bloc — enough for the browser to re-allocate seats
under alternative electoral systems.

Unit = coalition where a candidate ran in one, else their party (independents
share BEBAS). Output: public/data/elections.json
"""
from __future__ import annotations
import json
from pathlib import Path
import pandas as pd

FOUND = Path("../meco-data/out")
OUT = Path("public/data"); OUT.mkdir(parents=True, exist_ok=True)
ballots = pd.read_parquet(FOUND / "ballots.parquet")
coal = pd.read_parquet(FOUND / "lookup_coalition.parquet").set_index("coalition_uid")["coalition"].to_dict()
party = pd.read_parquet(FOUND / "lookup_party.parquet").set_index("party_uid")["party"].to_dict()

fed = ballots[ballots.seat.str.startswith("P.") & ballots.election.str.startswith("GE-")].copy()
fed["won"] = fed.result.isin(["won", "won_uncontested"])
fed["bloc"] = fed.apply(lambda r: coal.get(r.coalition_uid) if r.coalition_uid != "000-ALONE" else party.get(r.party_uid, "BEBAS"), axis=1)

out = []
for elec, g in fed.groupby("election"):
    year = int(g.date.str[:4].iloc[0])
    n_seats = g[["state", "seat"]].drop_duplicates().shape[0]
    total_votes = int(g.votes.sum())
    blocs = (g.groupby("bloc").agg(votes=("votes", "sum"), seats=("won", "sum")).reset_index()
             .sort_values("votes", ascending=False))
    blocs = blocs[blocs.votes > 0]
    # group tiny blocs (<1.5% and 0 seats) into "Others" to keep it readable
    big = blocs[(blocs.votes / total_votes >= 0.015) | (blocs.seats > 0)]
    small = blocs[~blocs.index.isin(big.index)]
    rows = [{"bloc": r.bloc, "votes": int(r.votes), "seats": int(r.seats)} for _, r in big.iterrows()]
    if len(small):
        rows.append({"bloc": "Others", "votes": int(small.votes.sum()), "seats": int(small.seats.sum())})
    out.append({"election": elec, "year": year, "n_seats": int(n_seats),
                "total_votes": total_votes, "blocs": rows})

out.sort(key=lambda e: e["year"])
(OUT / "elections.json").write_text(json.dumps({"elections": out}, separators=(",", ":")))
print(f"wrote {len(out)} elections")
g15 = out[-1]
print(f"latest {g15['election']} {g15['year']}: {g15['n_seats']} seats")
for b in g15["blocs"][:6]:
    print(f"  {b['bloc']:<10} {b['votes']:>10,} votes  {b['seats']:>3} seats  ({b['votes']/g15['total_votes']*100:.1f}% votes, {b['seats']/g15['n_seats']*100:.1f}% seats)")
