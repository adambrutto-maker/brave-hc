"""One-time source-grounded 2026-10-26 Cristillo baseline.

Reads the exact previously published Brave H.C. standings.json from git
commit 7ece75e and identifies team IDs through separately verified current
league public data. Never fabricates a previous division for teams which were
not in that historical Cristillo-only observation.
"""
from pathlib import Path
import json,subprocess
ROOT=Path(__file__).resolve().parents[1]
SOURCE_COMMIT="7ece75e"
b=subprocess.run(["git","-C",str(ROOT),"show",SOURCE_COMMIT+":widgets/standings.json"],capture_output=True,text=True,check=True)
old=json.loads(b.stdout)
new=json.loads((ROOT/"widgets"/"league-intelligence.json").read_text(encoding="utf8"))
assert old["schema"]=="brave-hc-svhl-standings/v1" and old["division"]=="Cristillo" and old["team"]=="Braves HC"
assert old["capturedAt"]=="2026-10-26T00:02:03.422Z"
current_by_name={x["leagueName"]:x for x in new["teams"]}
names=[x["name"] for x in old["teams"]]
assert len(names)==len(set(names))==8 and "Sugo Sundays" in names and "Maplewolves" not in names
assert all(name in current_by_name for name in names),"Old published names do not resolve to actual current season TeamInfo identifiers"
data={
 "schema":"brave-hc-cristillo-membership-observation/v1",
 "sourceScope":"ONLY_CRISTILLO_MEMBER_LIST_AT_RECORDED_CAPTURE",
 "sourceCommit":SOURCE_COMMIT,
 "sourceFile":"widgets/standings.json",
 "sourceLeagueId":570,
 "sourceDivision":"The Cristillo Division",
 "observedAt":old["capturedAt"],
 "teams":[{"leagueName":n,"officialSeasonTeamId":current_by_name[n]["sourceTeamId"]} for n in names],
 "knownNotToContainCurrentMaplewolves":True,
 "otherPriorDivisionMembershipKnown":False,
 "originalStandingsDataRewritten":False
}
path=ROOT/"widgets"/"cristillo-membership-20261026-baseline.json"
path.write_text(json.dumps(data,indent=2)+"\n",encoding="utf8")
print(json.dumps({"status":"PINNED_HISTORICAL_CRISTILLO_BASELINE_CREATED","teams":len(names),"sourceCommit":SOURCE_COMMIT,"asOf":old["capturedAt"],"path":str(path)}))
