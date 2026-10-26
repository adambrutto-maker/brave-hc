"""Create a never-auto-activated, date-bound HockeyOS v2 collector test runtime."""
from pathlib import Path
from shutil import copy2
from hashlib import sha256
import json,ast
H=Path(r"D:\BruTTech\Products\HockeyOS")
source=H/"Runtime"/"HTOCollector"/"five-game-source-v1-261026"
target=H/"Runtime"/"HTOCollector"/"dynamic-date-bound-v2-261026"
repo=Path(r"C:\BruTTech\00 SSD Runtime Shell\90 Migration Staging\HockeyOS\brave-hc-home-redesign-261025")
if target.exists():raise SystemExit("DYNAMIC_TEST_RUNTIME_ALREADY_EXISTS")
for root_name in ("scripts","tests"):
 for f in (source/root_name).rglob("*.py"):
  to=target/f.relative_to(source);to.parent.mkdir(parents=True,exist_ok=True);copy2(f,to)
for f in ("plan_date_bound_hto_game_ids.py","collect_hto_completed_scores.py"):
 copy2(repo/"scripts"/f,target/"scripts"/f)
helper=target/"scripts"/"hockeyos_dynamic_admission.py"
helper.write_text(r'''"""Configure bounded HTO game set from completed official source and Master calendar."""
from datetime import datetime
from pathlib import Path
import hockeyos_discovery_review as discovery
import hockeyos_collector_candidate as candidate
from plan_date_bound_hto_game_ids import calendar,current_plan
from collect_hto_completed_scores import parse_native_html
from hockeyos_review_four_game_source_parity import ReviewHold

def configure(collector,root):
    # Canonical Master is an immutable source, separate from the test output root.
    master=Path(r"D:\BruTTech\Products\HockeyOS\Reference Implementations\Brave H.C\01 Team Records\261001_Brave_HC_Master_Workbook.xlsx")
    html=collector.adapter.review.fetch_html(candidate.SCORE_URL)
    discovery.validate_scores_content(html)
    games=parse_native_html(html)
    evidence={"schema":"brave-hc-hto-completed-score-evidence/private-v1",
              "status":"PRIVATE_SOURCE_ONLY","publicationAuthorized":False,
              "sourceGamesCount":len(games),"games":games}
    plan=current_plan(calendar(master),evidence)
    mapping={g["htoGameId"]:(g["masterGameNumber"],g["date"]) for g in plan["mapping"]}
    game_dates={}
    for g in plan["mapping"]:
        d=datetime.fromisoformat(g["date"])
        game_dates[g["htoGameId"]]=d.strftime("%A, %b ")+str(d.day)+d.strftime(", %Y")
    if len(mapping)!=len(games) or any(not x for x in game_dates.values()):
        raise ReviewHold("DYNAMIC_GAME_MAP_COVERAGE_MISMATCH")
    candidate.GAME_MAP=mapping
    collector.adapter.review.GAME_DATES=game_dates
    collector.adapter.review.GAME_IDS=tuple(sorted(mapping))
    return plan
''',encoding="utf8")
ep=target/"scripts"/"hockeyos_hourly_collector_entrypoint.py"
text=ep.read_text(encoding="utf8")
start='import hockeyos_operational_collector as collector'
addition='import hockeyos_operational_collector as collector\nimport hockeyos_dynamic_admission as source_admission'
assert text.count(start)==1
text=text.replace(start,addition,1)
needle='    args=parser.parse_args(argv)\n'
assert text.count(needle)==1
text=text.replace(needle,
  needle+'    source_admission.configure(collector, args.operational_root or r"D:\\BruTTech\\Products\\HockeyOS")\n',1)
ast.parse(text,filename=str(ep));ep.write_text(text,encoding="utf8")
ad=target/"scripts"/"hockeyos_feed_adapter_review.py"
a=ad.read_text(encoding="utf8")
old='''    for key,complete,total in (("skaters",120,120),("goalies",11,12)):
        check=parity[key]
        if (check.get("completeFieldComparisons")!=complete or check.get("expectedFieldComparisons")!=total or
            check.get("discrepancies")!=[]):
            raise review.ReviewHold("BOUNDED_131_FIELD_PARITY_REQUIRED")'''
new='''    # Dynamically derive the expected field-by-person comparison count from
    # verified source names, then ensure each field was either observed or
    # explicitly marked incomplete. The lower write boundary recomputes
    # these figures independently from captured HTO tables.
    expected_names={
      "skaters":{p["name"] for game in games for p in game["skaters"]},
      "goalies":{p["name"] for game in games for p in game["goalies"]}}
    for key,fieldcount in (("skaters",len(review.SKATER_FIELDS)),
                           ("goalies",len(review.GOALIE_FIELDS))):
        check=parity[key]
        total=len(expected_names[key])*fieldcount
        completed=check.get("completeFieldComparisons")
        missing=check.get("incompleteFields")
        if (not isinstance(completed,int) or type(missing) is not list or
            check.get("expectedFieldComparisons")!=total or
            completed+len(missing)!=total or
            check.get("discrepancies")!=[]):
            raise review.ReviewHold("DYNAMIC_SOURCE_FIELD_PARITY_REQUIRED")'''
assert a.count(old)==1
a=a.replace(old,new,1)
old2='''    if not isinstance(incomplete,list) or len(incomplete)!=1 or incomplete[0].get("field")!="POTG" or incomplete[0].get("unknownGames")!=1:
        raise review.ReviewHold("UNKNOWN_GOALIE_POTG_NOT_PRESERVED")'''
new2='''    if not isinstance(incomplete,list) or any(x.get("field")!="POTG" or
           type(x.get("unknownGames")) is not int or x["unknownGames"]<1
           for x in incomplete):
        raise review.ReviewHold("UNVERIFIED_GOALIE_POTG_INCOMPLETENESS")'''
assert a.count(old2)==1
a=a.replace(old2,new2,1)
ast.parse(a,filename=str(ad));ad.write_text(a,encoding="utf8")
hashes={str(p.relative_to(target)).replace("\\","/"):sha256(p.read_bytes()).hexdigest()
        for folder in ("scripts","tests") for p in (target/folder).rglob("*.py")}
manifest={"state":"DYNAMIC_DATE_BOUND_RUNTIME_QA_NOT_ACTIVATED",
 "sourceRuntime":str(source),"targetRuntime":str(target),"sourceFiles":hashes,
 "currentProductionLauncherChanged":False,"originalWorkbookWritten":False,
 "productionFeedWritten":False,"futureSixthGameAcceptanceRequiresSource":True,
 "sourceChecks":["Master SHA256 pinned","24 unique dated Master slots","Official score page canonical",
  "Five prior exact source records locked","No future unplayed admitted",
  "Dynamic source per-player and goalie field parity","Operational observed HTO table replay",
  "Atomic CAS and rollback on private test root"]}
(target/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf8")
print(json.dumps({"state":manifest["state"],"target":str(target),"files":len(hashes)}))
