"""Canonical team identities from *Brave H.C.* historical workbook and official HTO.

The Sports Village league team strings are fixture/standings aliases, not
authoritative identities. This adapter preserves exact source game rows and
only joins historically corroborated orthographic variants (Mohawks), while
linking Michelob Morts to the *one certified 2026/27* Sugo game.

Never rewrites workbook, standings source, HTO game sheet or original ledger.
"""
from __future__ import annotations
from collections import Counter
from datetime import datetime,timezone
from hashlib import sha256
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile
import json,os,sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_dynamic_exact_opponent_feed import build as build_exact, load, stats, Hold, require, SourceHold, MASTER_SHA

N="{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
AUDITED={
    "Mohawks HC":{
        "canonicalName":"Mohawks H.C.","historicalExact":"Mohawks HC",
        "htoExact":"Mohawks H.C.","proofGameId":3356178,
        "date":"2026-09-27","gf":3,"ga":6,
        "verification":"VERIFIED_HISTORICAL_NAME_VARIANT",
        "historyScope":"WORKBOOK_HISTORY_AND_HTO_CURRENT_GAME",
        "workbookEditorialCell":"Master Schedule!J317"
    },
    "Sugo Sundays":{
        "canonicalName":"Michelob Morts","historicalExact":None,
        "htoExact":"Michelob Morts","proofGameId":3369564,
        "date":"2026-10-04","gf":2,"ga":3,
        "verification":"VERIFIED_CURRENT_NAME_ALIAS_ONLY",
        "historyScope":"HTO_CURRENT_GAME_ONLY",
        "workbookEditorialCell":None
    }
}
def workbook_editorial_verified(book):
    book=Path(book)
    require(book.is_file() and sha256(book.read_bytes()).hexdigest()==MASTER_SHA,
            "CANONICAL_BRAVE_MASTER_HASH_NOT_ACCEPTED")
    with ZipFile(book) as z:
        root=ET.fromstring(z.read("xl/worksheets/sheet12.xml"))
        row=next((r for r in root.findall(".//"+N+"row") if r.get("r")=="317"),None)
        require(row is not None,"MASTER_HISTORIC_EDITORIAL_ROW_MISSING")
        c=next((c for c in row.findall(N+"c") if c.get("r")=="J317"),None)
        require(c is not None and c.get("t")=="s","MASTER_EDITORIAL_CELL_NOT_A_SOURCE_STRING")
        v=c.find(N+"v")
        require(v is not None and v.text,"MASTER_HISTORIC_EDITORIAL_STRING_ID_MISSING")
        wanted=int(v.text)
        strings=ET.fromstring(z.read("xl/sharedStrings.xml"))
        si=strings.findall(N+"si")
        require(0<=wanted<len(si),"MASTER_EDITORIAL_SHARED_STRING_INVALID")
        text="".join(x.text or "" for x in si[wanted].iter(N+"t"))
        require("Brave H.C. Triumphs" in text and "Against Mohawks H.C." in text and
                "September 22, 2024" in text,"MASTER_EDITORIAL_CANONICAL_NAME_NOT_CONFIRMED")
        return {"sheet":"Master Schedule","cell":"J317",
                "historicalHTOStyleName":"Mohawks H.C.","date":"2024-09-22"}
def source_records(master,scores):
    past=[{"date":g["date"],"type":g["type"],"result":g["result"],
           "bravesGF":g["bravesGF"],"bravesGA":g["bravesGA"],
           "name":g["opponentExact"],"source":"MASTER","key":"WB:"+str(g["workbookGame"])}
          for g in master["games"]]
    now=[{"date":g["date"],"type":g["gameType"],"result":g["result"],
          "bravesGF":g["gf"],"bravesGA":g["ga"],
          "name":g["opponentExact"],"source":"HTO","key":"HTO:"+str(g["htoGameId"])}
         for g in scores["games"]]
    keys=[g["key"] for g in past+now]
    require(len(keys)==len(set(keys)),"CANONICAL_COMBINED_SOURCE_DUPLICATE_GAME_KEY")
    return past,now
def certify_proof(proof,scores):
    require(proof.get("schema")=="brave-hc-2026-single-game-identity-proof/v1"
            and proof.get("status")=="OFFICIAL_SAME_GAME_PROOF_VERIFIED"
            and proof.get("franchiseHistoryMerged") is False,"HTO_SVHL_GAME_PROOF_NOT_CERTIFIED")
    rows=proof.get("sameGamePairs",[])
    require(len(rows)==2 and
            {r.get("divisionName") for r in rows}==set(AUDITED),
            "SOURCE_PROOF_TWO_GAMES_NOT_UNIQUE")
    source={g["htoGameId"]:g for g in scores["games"]}
    require(len(source)==len(scores["games"]),"HTO_COMPLETED_GAME_ID_DUPLICATED")
    for row in rows:
        cfg=AUDITED[row["divisionName"]]
        gid=cfg["proofGameId"]
        game=source.get(gid)
        require(game and row.get("scope")=="THIS_COMPLETED_GAME_ONLY" and
                row.get("historicalFranchiseMergeAuthorized") is False and
                row.get("htogameId")==gid and row.get("htoRecordedOpponent")==cfg["htoExact"] and
                row.get("date")==cfg["date"] and row.get("bravesGoals")==cfg["gf"] and
                row.get("opponentGoals")==cfg["ga"] and
                (game["opponentExact"],game["date"],game["gf"],game["ga"])==
                (cfg["htoExact"],cfg["date"],cfg["gf"],cfg["ga"]) and
                game["result"]=="L","HTO_SVHL_SAME_GAME_EVIDENCE_CHANGED_"+cfg["canonicalName"])
        require(row.get("svhlSource","").startswith("https://leagues.sportsvillage.ca/TeamInfo.aspx?") and
                row.get("htoSource","").startswith("https://www.htosports.com/teams/default.asp?"),
                "HTO_SVHL_CANONICAL_LINK_MISSING")
    return {r["divisionName"]:r for r in rows}
def merge_opponent(cfg,history,now,proof):
    historical=[g for g in history if g["name"]==cfg["historicalExact"]] if cfg["historicalExact"] else []
    current=[g for g in now if g["name"]==cfg["htoExact"]]
    # The first game establishes the cross-system alias. After admission,
    # HTO itself is primary for identity: additional OFFICIAL HTO boxscores
    # under the SAME canonical HTO name need no repeat SVHL punctuation proof.
    # The upstream operational and private ledger gates still require unique
    # game IDs, original Master calendar dates and HTO Stats/game parity.
    known_alias={cfg["canonicalName"],cfg["historicalExact"],
                 next(k for k,v in AUDITED.items() if v is cfg)}
    divergent=[g for g in now if g["name"] in known_alias
               and g["name"]!=cfg["htoExact"]]
    require(not divergent,"NEW_HTO_OPPONENT_NAME_CHANGE_NEEDS_SOURCE_REVIEW_"+cfg["canonicalName"])
    require(any(g["key"]=="HTO:"+str(cfg["proofGameId"]) for g in current),
            "ORIGINAL_CROSS_SYSTEM_GAME_PROOF_MISSING_"+cfg["canonicalName"])
    require(len(current)==len({g["key"] for g in current}) and
            all(g["date"]>=cfg["date"] and g["type"]=="Regular Season" and
                g["source"]=="HTO" for g in current),
            "HTO_CANONICAL_NAME_SOURCE_SCOPE_CHANGED_"+cfg["canonicalName"])
    if cfg["historicalExact"]:
        require(len(historical)==49 and sum(g["type"]=="Regular Season" for g in historical)==42,
                "MOHAWKS_HISTORICAL_WORKBOOK_49_GAME_BASELINE_CHANGED")
        require(all(g["date"]<cfg["date"] for g in historical),
                "OVERLAPPING_MASTER_HTO_OPPONENT_MATCH_DATE")
    else:
        require(len(historical)==0,"UNEXPECTED_OLD_FRANCHISE_HISTORY_SUGO")
    games=sorted(historical+current,key=lambda x:(x["date"],x["key"]))
    require(len(games)==len(historical)+len(current),"CANONICAL_SOURCE_EVENT_COVERAGE_UNEXPECTED")
    rs=stats([g for g in games if g["type"]=="Regular Season"])
    alltime=stats(games)
    playoffs=stats([g for g in games if g["type"]=="Playoffs"])
    last=[{"date":g["date"],"result":g["result"],"gf":g["bravesGF"],"ga":g["bravesGA"]}
          for g in games[-5:]]
    return {"name":next(k for k,v in AUDITED.items() if v is cfg),
            "canonicalName":cfg["canonicalName"],
            "leagueDisplayAlias":next(k for k,v in AUDITED.items() if v is cfg),
            "sourceNames":{"workbook":cfg["historicalExact"],
                           "hto":cfg["htoExact"]},
            "verification":cfg["verification"],"identityScope":cfg["historyScope"],
            "regularSeason":rs,"allTime":alltime,"playoffs":playoffs,
            "lastFive":last,"sourceHTOGames":len(current),
            "sourceLinks":{"svhl":proof["svhlSource"],"hto":proof["htoSource"]},
            "historicalWorkbookReport":cfg["workbookEditorialCell"],
            "historicalRecordsAreLimited":not bool(cfg["historicalExact"]),
            "notice":("Consolidated historical Brave H.C. workbook record and current HTO spelling."
                      if cfg["historicalExact"] else
                      ("One source-verified current game only. No older Sugo/Michelob franchise history is asserted."
                       if len(current)==1 else
                       str(len(current))+" source-verified current-season HTO games only. No older Sugo/Michelob franchise history is asserted."))}
def build(master,scores,official_stats,prior_four,league,proof,book):
    baseline=build_exact(master,scores,official_stats,prior_four,league)
    editorial=workbook_editorial_verified(book)
    source_proofs=certify_proof(proof,scores)
    past,current=source_records(master,scores)
    byname={x["name"]:x for x in baseline["teams"]}
    division_names={x["name"] for x in baseline["teams"]}
    require(all(byname[x]["verification"]=="ALIAS_REVIEW_REQUIRED"
                for x in AUDITED if x in division_names),
            "BASELINE_PRE_CANONICAL_HOLD_SCHEMA_CHANGED")
    for name,cfg in AUDITED.items():
        admitted=merge_opponent(cfg,past,current,source_proofs[name])
        admitted["membershipStatus"]=("CURRENT_DIVISION" if name in division_names
                                       else "SEASON_OPPONENT_ARCHIVE")
        if name not in division_names:
            require(admitted["sourceHTOGames"]>=1,
                    "UNVERIFIED_ARCHIVED_CURRENT_SEASON_OPPONENT")
        byname[name]=admitted
    entries=[byname[x["name"]] for x in baseline["teams"]]
    # A current-season opponent may leave the division after league
    # rebalancing. Preserve its HTO-verified matchup in a separate archive,
    # without claiming it occupies one of the current seven SVHL slots.
    archives=[byname[k] for k in AUDITED if k not in division_names]
    entries.extend(archives)
    require(len({x["name"] for x in entries})==len(entries) and
            len(entries)==len(division_names)+len(archives) and
            len(division_names)==7,
            "QUALIFIED_DIVISION_AND_SEASON_ARCHIVE_DUPLICATE")
    for x in entries:
        x.setdefault("membershipStatus","CURRENT_DIVISION")
    metadata=dict(baseline["coverage"])
    metadata.update(sourceQualifiedOpponents=sum(x["verification"]!="NO_EXACT_HISTORY" for x in entries),
                    aliasesNeedingReview=0,
                    canonicalHistoricalLinks=1,verifiedCurrentGameAliases=1,
                    historicalContinuityNotEstablished=1,
                    currentDivisionOpponents=len(division_names),
                    seasonOpponentArchives=len(archives))
    baseline.update(status="PUBLIC_VERIFIED_SOURCE_IDENTITY",
        sourceTeamCanonical="Brave H.C.",sourceLeagueTeamAlias="Braves HC",
        releaseScope="DYNAMIC_SVHL_DIVISION_KEYS; WORKBOOK_HTO_HISTORICAL_NAME_LINK; VERIFIED_HTO_SEASON_ARCHIVE",
        source="Original Brave H.C. Master Schedule and its historical reports, plus verified HTO completed boxscores. SVHL names are display aliases, not master franchise identities.",
        canonicalEvidence=editorial,coverage=metadata,teams=entries)
    return baseline
def stage(master,scores,stats_source,verified,standings,proof,workbook,output):
    j=build(*(load(p) for p in (master,scores,stats_source,verified,standings,proof)),workbook)
    out=Path(output);out.parent.mkdir(parents=True,exist_ok=True)
    tmp=out.with_suffix(out.suffix+".tmp")
    tmp.write_text(json.dumps(j,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
    os.replace(tmp,out)
    return {"state":j["status"],"coverage":j["coverage"],
            "mohawksAllTime":next(x["allTime"] for x in j["teams"] if x["name"]=="Mohawks HC"),
            "sugoScope":next(x["identityScope"] for x in j["teams"] if x["name"]=="Sugo Sundays"),
            "written":str(out),"originalWorkbookWritten":False}
if __name__=="__main__":
    from argparse import ArgumentParser
    p=ArgumentParser()
    for key in ("master","scores","stats","verified","standings","proof","workbook","output"):
        p.add_argument("--"+key,required=True)
    a=p.parse_args()
    try:print(json.dumps(stage(a.master,a.scores,a.stats,a.verified,a.standings,
                               a.proof,a.workbook,a.output)))
    except (Hold,SourceHold,OSError,ValueError,TypeError,KeyError) as exc:
        print(json.dumps({"state":"HOLD","reason":str(exc),"publicChanged":False}),file=sys.stderr)
        sys.exit(2)
