"""Reconcile six verified HTO native date display edits back to the original
558 historical source ONLY for immutable source parity tests. These do not
represent changed stats, game scope or identity. Active widget keeps the
readable native source values untouched."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
PROOF=json.loads((ROOT/"docs/261028_RCD05_HTO_Native6_Date_Source_Adoption.json").read_text(encoding='utf-8'))
pairs=PROOF["exact_verified_date_display_id_crosswalk"]
assert len(pairs)==6
ALIASES={}
for rec in pairs:
 old,new=rec['old'],rec['new']
 assert old[:3]==new[:3]
 key=tuple(new)
 assert key not in ALIASES
 ALIASES[key]=old[3]
def original_statistical_value(group,value):
 k=(group['section'],group['category'],group['period'],value)
 return ALIASES.get(k,value)
