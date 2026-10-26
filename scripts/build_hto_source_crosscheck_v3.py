"""Build a separately versioned cross-checked dynamic HTO collector.
Never mutate the active v2 runtime, pinned Master Workbook or public feeds.
"""
from pathlib import Path
from hashlib import sha256
from shutil import copytree,ignore_patterns
from datetime import datetime,timezone
import ast,json
H=Path(r"D:\BruTTech\Products\HockeyOS")
V2=H/"Runtime"/"HTOCollector"/"dynamic-date-bound-v2-261026"
V3=H/"Runtime"/"HTOCollector"/"dynamic-source-crosscheck-v3-261026"
if V3.exists():raise SystemExit("V3_CANDIDATE_EXISTS_REFUSE_OVERWRITE")
source=json.loads((V2/"manifest.json").read_text(encoding="utf8"))
for name,expected in source["sourceFiles"].items():
 f=V2/name
 if not f.is_file() or sha256(f.read_bytes()).hexdigest()!=expected:
  raise SystemExit("ACTIVE_V2_SOURCE_HASH_DRIFT:"+name)
copytree(V2,V3,ignore=ignore_patterns("__pycache__","*.pyc","manifest.json","activation_receipt.json"))
file=V3/"scripts"/"hockeyos_dynamic_admission.py"
code=file.read_text(encoding="utf8")
needle='''    collector.adapter.review.GAME_IDS=tuple(sorted(mapping))
    return plan'''
addition='''    collector.adapter.review.GAME_IDS=tuple(sorted(mapping))
    # Independent HTO evidence parity: the public Scores card used to discover
    # each completed game must agree with the actual canonical HTO boxscore.
    # A correct date, player stat aggregate or URL alone is not enough.
    observed={game["htoGameId"]:game for game in games}
    for gid in sorted(mapping):
        card=observed[gid]
        url=card["sourceUrl"]
        source=collector.adapter.review.fetch_html(url)
        proof=collector.adapter.review.verify_content(source,url,game_id=gid)
        if proof["gameDate"]!=game_dates[gid]:
            raise ReviewHold("SCORECARD_BOXSCORE_DATE_CONFLICT:"+str(gid))
        tables=collector.adapter.review.parse_tables(source)
        score=collector.adapter.review.unique_table(
            tables,lambda h:h and h[0]=="REGULAR SEASON")
        if len(score)!=3 or len(score[0])!=7 or any(len(r)!=7 for r in score[1:]):
            raise ReviewHold("HTO_CANONICAL_GAME_SCOREBOARD_FORMAT_CHANGED:"+str(gid))
        ours=[r for r in score[1:] if r[0]=="Brave H.C."]
        theirs=[r for r in score[1:] if r[0]!="Brave H.C."]
        if len(ours)!=1 or len(theirs)!=1:
            raise ReviewHold("HTO_CANONICAL_GAME_OPPONENT_NOT_UNIQUE:"+str(gid))
        try:
            values=[[int(x) for x in row[1:]] for row in (ours[0],theirs[0])]
        except (TypeError,ValueError) as error:
            raise ReviewHold("HTO_CANONICAL_GAME_SCORE_NON_NUMERIC:"+str(gid)) from error
        if any(n<0 for pair in values for n in pair):
            raise ReviewHold("HTO_CANONICAL_GAME_NEGATIVE_SCORE:"+str(gid))
        if any(sum(pair[:5])!=pair[-1] for pair in values):
            raise ReviewHold("HTO_CANONICAL_GAME_PERIOD_SUM_INVALID:"+str(gid))
        if (theirs[0][0],values[0][-1],values[1][-1]) != (
                card["opponentExact"],card["gf"],card["ga"]):
            raise ReviewHold("HTO_SCORES_VS_BOX_SAME_GAME_CONFLICT:"+str(gid))
    return plan'''
if code.count(needle)!=1:raise SystemExit("DYNAMIC_CONFIG_PATCH_POINT_DRIFT")
code=code.replace(needle,addition,1)
ast.parse(code)
file.write_text(code,encoding="utf8")
# Overwrite two changed source modules with the exact independently
# validated and source-hashed runtime files in this repository. This retains
# the independently tested HTO GP/GF/GA skater/goalie footer consistency gate.
templates=Path(__file__).resolve().parent/"runtime_v3"
pinned={
  "hockeyos_dynamic_admission.py":"21b6142cd1b3ddeccb65d7d5b28f96d53979b5cca70cf978fc530b405d72aacd",
  "hockeyos_operational_collector.py":"fb3fd36c52a6a85e484e2d87fc326ccd5f4a96e08cfe5a5b55e83a28fea487c3"
}
for name,expected_hash in pinned.items():
    audited=templates/name
    if not audited.is_file() or sha256(audited.read_bytes()).hexdigest()!=expected_hash:
        raise SystemExit("AUDITED_V3_SOURCE_REFERENCE_MISSING_OR_CHANGED:"+name)
    ast.parse(audited.read_text(encoding="utf8"),filename=name)
    (V3/"scripts"/name).write_bytes(audited.read_bytes())
hashes={str(p.relative_to(V3)).replace("\\","/"):sha256(p.read_bytes()).hexdigest()
 for sub in ("scripts","tests") for p in (V3/sub).rglob("*.py")}
manifest={
 "schema":"hockeyos-collector-crosschecked-v3/private-candidate-v1",
 "status":"QA_ONLY_NOT_ACTIVATED",
 "previousRuntime":str(V2),"candidateRuntime":str(V3),
 "goal":"Exact same official game in HTO Scores and canonical individual boxscore must agree on opponent/date/final totals and both period sums",
 "sourceFiles":hashes,"currentHourlyLauncherChanged":False,
 "protectedMasterWorkbookWritten":False,"productionHTOFeedWritten":False,
 "publicSitePublished":False,"generatedUTC":datetime.now(timezone.utc).isoformat()
}
(V3/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf8")
print(json.dumps({"state":manifest["status"],"candidate":str(V3),
 "sourceFileCount":len(hashes),"originalV2Unchanged":True}))
