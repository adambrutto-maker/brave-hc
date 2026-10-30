"""Build a player-centric last-N HTO Brave H.C. appearance timeline across seasons.

No season reset: current HTO GP=1 rows plus source-qualified historical
skater boxscore rows from earlier seasons, including playoffs and (where
game-duration evidence permits) Summer. For every historical player-season,
all indexed official games and published GP/G/A/PTS must reconcile.

Never treat a goal/assist event as proof of attendance, silently skip a
missing archived boxscore, or cross a player's unqualified intervening season.
No writes to original HTO files, workbook, scorecards or season totals.
"""
from __future__ import annotations
import argparse,collections,datetime as dt,hashlib,json,re
from pathlib import Path
from urllib.parse import parse_qs,urlparse
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/"docs/hto-highlights-rollout"
BOX=BASE/"game-audit-evidence"
CURRENT=ROOT/"widgets/player-form-appearances-v364.json"
FORMAT=ROOT/"widgets/league-game-formats.json"
CAREER=ROOT/"widgets/player-career-insights.json"
INDEX=BASE/"261020_Historical_Boxscore_Index.json"
MAIN=BASE/"261020_Game_Level_Readbacks.json"
OUT=ROOT/"widgets/player-form-cross-season-v367.json"
SCHEMA="brave-hc-hto-cross-season-player-appearances/v1"
STATUS="VERIFIED_SEASON_SCOPED_CROSS_SEASON_APPEARANCES"
ARCHIVE_PROOF="OFFICIAL_HISTORICAL_BOX_SCORE_ROW_AND_SEASON_GP_PARITY_VERIFIED"
LIVE_PROOF="OFFICIAL_APPEARANCE_AND_BOX_SCORE_VERIFIED"
NO_DATA="SOURCE_GAP_OR_UNVERIFIED_SEASON"
SOURCE_SEASON="W2026/27"
SUPPORTED_MINUTES={32,48}

def check(ok,reason):
 if not ok:raise ValueError(reason)
def load(p):return json.loads(p.read_text(encoding="utf-8"))
def sha(p):
 # GitHub checkout uses LF; Windows worktrees can use CRLF for the same
 # read-only HTO evidence. Canonical hashes must be platform invariant.
 return hashlib.sha256(p.read_bytes().replace(b"\r\n",b"\n").replace(b"\r",b"\n")).hexdigest()
def url_id(url,kind="boxscore"):
 u=urlparse(url or "");q=parse_qs(u.query)
 check(u.scheme=="https" and u.hostname in ("www.htosports.com","htosports.com") and
       u.path=="/teams/default.asp" and q.get("u")==["BRAVESHOCKEY"] and
       q.get("p")==[kind],"ARCHIVE_OFFICIAL_HTO_URL_AUTHORITY_INVALID")
 num=q.get("gameID" if kind=="boxscore" else "playerID",[""])[0]
 check(re.fullmatch(r"[1-9][0-9]*",num) is not None,"HTO_ARCHIVE_GAME_OR_PROFILE_ID_INVALID")
 return num
def local_time(schedule):
 s=" ".join((schedule or "").replace("\xa0"," ").split())
 d=re.search(r"\b(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat),\s*([0-9]{1,2}/[0-9]{1,2}/[0-9]{2})\b",s)
 check(d is not None,"ARCHIVED_GAME_DATE_INVALID")
 day=dt.datetime.strptime(d.group(1),"%m/%d/%y").date()
 t=re.search(r"\b([0-9]{1,2}):([0-9]{2})\s*([ap])\.?m\.?\b",s,re.I)
 check(t is not None,"ARCHIVED_GAME_TIME_INVALID")
 hour=int(t.group(1))%12+(12 if t.group(3).lower()=="p" else 0)
 minute=int(t.group(2))
 check(0<=hour<24 and 0<=minute<60,"ARCHIVED_GAME_CLOCK_INVALID")
 return day.isoformat(),f"{hour:02d}:{minute:02d}"
def season_code(label):
 m=re.fullmatch(r"(Winter|Summer) (20[0-9]{2})(?:/(20[0-9]{2}))?",label or "")
 check(m and ((m[1]=="Winter" and m[3] and int(m[3])==int(m[2])+1) or
              (m[1]=="Summer" and not m[3])),"ARCHIVE_SEASON_CODE_INVALID")
 return ("W" if m[1]=="Winter" else "S")+m[2]+("/"+m[3][-2:] if m[3] else "")
def score_and_phase(heading):
 m=re.search(r"\bSCORE BOARD\n(REGULAR SEASON|PLAYOFFS)\n",heading or "")
 check(m is not None,"ARCHIVED_GAME_PHASE_UNVERIFIED")
 scope=(heading or "")[m.end():]
 matches=list(re.finditer(r"(?:^|\n)Brave H\.C\.\n([0-9\t]+)(?:\n|$)",scope))
 check(len(matches)==1,"ARCHIVED_TEAM_SCORE_NOT_UNIQUE")
 nums=matches[0].group(1).split("\t")
 check(len(nums)>=4 and all(x.isdecimal() for x in nums),"ARCHIVED_TEAM_FINAL_SCORE_INVALID")
 cells=[int(x) for x in nums]
 check(sum(cells[:-1])==cells[-1],"ARCHIVED_TEAM_PERIOD_SCORE_MISMATCH")
 return cells[-1],"Playoffs" if m.group(1)=="PLAYOFFS" else "Regular Season"
def source_matches_name(raw,profile):
 check(isinstance(raw,str) and raw and isinstance(profile,str) and profile,
       "ARCHIVED_SKATER_IDENTITY_UNQUALIFIED")
 if ", " not in raw:return False
 last,first=raw.split(", ",1)
 return (first+" "+last)==profile
def season_bindings(formats,label):
 b=formats.get("seasonBindings",{}).get(label+"::ALL_HTO_GAME_TYPES")
 f=formats.get("formats",{}).get(b.get("formatId")) if b else None
 check(b and b.get("verificationStatus")=="VERIFIED" and
       f and f.get("verificationStatus")=="VERIFIED" and
       type(f.get("regulationGameMinutes"))==int and
       f["regulationGameMinutes"] in SUPPORTED_MINUTES,
       "UNVERIFIED_HISTORICAL_GAME_DURATION_"+label)
 return f["regulationGameMinutes"]
def season_indexed_games(raw):
 check(raw.get("status")=="PUBLIC_SCHEDULE_INDEX_18_SEASONS" and
       isinstance(raw.get("seasons"),list),"HISTORICAL_HTO_INDEX_INVALID")
 result={}
 for s in raw["seasons"]:
  label=s["season"];season_code(label)
  ids=[url_id(x) for x in s["boxscoreURLs"]]
  check(len(ids)==len(set(ids)) and ids,"DUPLICATE_OR_EMPTY_HISTORICAL_HTO_INDEX")
  check(label not in result,"DUPLICATE_HISTORICAL_HTO_SEASON")
  result[label]=ids
 return result
def archived_games():
 files=[MAIN]+sorted(BOX.glob("261020_Continued_Boxscores_*.json"))
 check(len(files)>=20 and MAIN.exists(),"HISTORICAL_HTO_GAME_ARCHIVE_INCOMPLETE")
 items={};digest={}
 for file in files:
  data=load(file);games=data.get("games")
  check(isinstance(games,list),"ARCHIVE_GAME_FILE_SCHEMA_INVALID_"+file.name)
  digest[str(file.relative_to(ROOT)).replace("\\","/")]=sha(file)
  for game in games:
   gid=url_id(game.get("url"))
   check(gid not in items or game==items[gid],"DUPLICATE_HTO_GAME_CONFLICT_"+gid)
   items[gid]=game
 return items,digest
def archive_season(label,ids,archive,mins):
 season=season_code(label)
 totals=collections.defaultdict(lambda:{"gp":0,"g":0,"a":0,"pts":0,"games":[]})
 checks=[];reasons=[]
 for gid in ids:
  game=archive.get(gid)
  if not game:
   reasons.append("ARCHIVE_BOX_SCORE_ID_MISSING_"+gid);continue
  if (url_id(game.get("url"))!=gid or
      url_id(game.get("schedule",{}).get("href"))!=gid or
      game.get("schedule",{}).get("season")!=label):
   reasons.append("ARCHIVE_GAME_SCHEDULE_ID_OR_SEASON_MISMATCH_"+gid);continue
  date,clock=local_time(game["schedule"].get("text",""))
  forfeit=bool(re.search(r"\bForfeit\b",game["schedule"].get("text",""),re.I))
  tables=[t for t in game.get("tables",[]) if t.get("rows") and
          all(key in t["rows"][0].get("cells",[]) for key in ("Name","POS"))]
  if forfeit and not tables:
   checks.append({"id":int(gid),"date":date,"time":clock,"forfeit":True,"players":0})
   continue
  if len(tables)!=1:
   reasons.append("ARCHIVED_SKATER_TABLE_UNVERIFIED_"+gid);continue
  gf,phase=score_and_phase(game.get("heading"))
  hdr=tables[0]["rows"][0]["cells"]
  check(len([x for x in hdr if x])==len(set(x for x in hdr if x)),
        "ARCHIVED_PLAYER_GAME_STAT_HEADER_DUPLICATE")
  scoring=all(x in hdr for x in ("G","A","Pts"))
  if not scoring and not (gf==0 and not any(x in hdr for x in ("G","A","Pts"))):
   reasons.append("ARCHIVED_NONZERO_GAME_SCORING_MISSING_"+gid);continue
  gameplayers=set();gamegoals=0;gameassists=0
  for row in tables[0]["rows"][1:]:
   values=row.get("cells",[]);links=row.get("players",[])
   check(len(values)==len(hdr),"ARCHIVED_PLAYER_ROW_LENGTH_INVALID_"+gid)
   cells=dict(zip(hdr,values))
   if cells.get("Name")=="Team Stats":continue
   check(len(links)==1 and cells.get("POS") and
         isinstance(cells.get("Name"),str),"ARCHIVED_PLAYER_ATTENDANCE_ROW_AMBIGUOUS_"+gid)
   pid=url_id(links[0].get("href"),"profile")
   check(pid not in gameplayers,"ARCHIVED_DUPLICATED_GAME_PLAYER_ID_"+gid)
   gameplayers.add(pid)
   if scoring:
    check(all(re.fullmatch(r"[0-9]+",cells.get(x,"")) for x in ("G","A","Pts")),
          "ARCHIVED_SCORING_STAT_NOT_NUMERIC_"+gid)
    G,A,PTS=(int(cells[x]) for x in ("G","A","Pts"))
    check(G+A==PTS,"ARCHIVED_PLAYER_SCORING_ARITHMETIC_INVALID_"+gid)
   else:G=A=PTS=0
   gamegoals+=G;gameassists+=A
   rec=totals[pid]
   rec["gp"]+=1;rec["g"]+=G;rec["a"]+=A;rec["pts"]+=PTS
   rec["games"].append({"gameId":int(gid),"date":date,"time":clock,
    "season":season,"phase":phase,"minutes":mins,"appeared":True,
    "verification":"OFFICIAL_HISTORICAL_BOX_SCORE_ROW_AND_SEASON_GP_PARITY_VERIFIED",
    "sourceUrl":game["url"],"g":G,"a":A,"pts":PTS,"publishedName":cells["Name"]})
  if gamegoals!=gf:
   reasons.append("ARCHIVED_TEAM_GOALS_NOT_MATCHED_"+gid);continue
  checks.append({"id":int(gid),"date":date,"time":clock,"phase":phase,
    "players":len(gameplayers),"teamGoals":gf,"playerGoals":gamegoals,
    "assists":gameassists,"forfeit":False})
 if len(checks)!=len(ids) or reasons:
  return {"status":"HELD","season":season,"reason":";".join(reasons[:5]),
          "indexGames":len(ids),"verifiedGames":len(checks)},{}
 return {"status":"VERIFIED_INDEX_COMPLETE","season":season,
         "formatMinutes":mins,"indexGames":len(ids),
         "playedGames":sum(not g["forfeit"] for g in checks),
         "forfeits":sum(g["forfeit"] for g in checks),
         "skaterRows":sum(g["players"] for g in checks),
         "playedGameSources":[{"id":g["id"],"date":g["date"],
                                "time":g["time"],"phase":g["phase"]}
                               for g in checks if not g["forfeit"]],
         "forfeitIds":[g["id"] for g in checks if g["forfeit"]],
         "indexAndBoxscoreCoverage":True},dict(totals)
def personal_seasons(career,pid,sourceLabels):
 p=career.get("players",{}).get(pid)
 if p is None:return {},False
 if p.get("status")!="VERIFIED_PROFILE_CAREER_SUM_PARITY":return {},False
 rows={}
 for seg in p.get("segments",[]):
  if seg.get("kind")!="skater":continue
  for row in seg.get("seasons",[]):
   label=row.get("Season")
   if row.get("Team")!="Brave H.C." or label not in sourceLabels:continue
   check(label not in rows,"DUPLICATE_PLAYER_SEASON_ROWS_"+pid)
   rows[label]=row
 return rows,True
def verify_player_season(pid,seasonRow,captured,profile):
 if captured is None:return False
 if not seasonRow:return False
 if not all(type(seasonRow.get(k))==int and seasonRow[k]>=0
            for k in ("GP","G","A","Pts")):return False
 if not (seasonRow["G"]+seasonRow["A"]==seasonRow["Pts"]):return False
 if any(captured[k]!=seasonRow[src] for k,src in
        (("gp","GP"),("g","G"),("a","A"),("pts","Pts"))):return False
 return all(source_matches_name(g["publishedName"],profile["name"])
            for g in captured["games"])
def build(current,index,career,formats,archived,digest,currentReadbacks):
 check(current.get("schema")=="brave-hc-individual-verified-appearances/v1"
       and current.get("status")=="VERIFIED_COMPLETE_PLAYER_APPEARANCES"
       and current.get("season")==SOURCE_SEASON
       and isinstance(current.get("players"),dict),"CURRENT_HTO_APPEARANCES_UNVERIFIED")
 check(career.get("schema")=="brave-hc-player-career-insights/v1"
       and career.get("sourceAuthority")=="NATIVE_HTO_PROFILE_STATS_PUBLIC_READBACK",
       "HISTORICAL_PLAYER_PROFILE_SOURCE_INVALID")
 check(formats.get("schema")=="hockeyos-league-game-formats/v1","GAME_FORMAT_CONFIG_INVALID")
 indexed=season_indexed_games(index)
 currentLabel=next((x for x in indexed if season_code(x)==SOURCE_SEASON),None)
 check(currentLabel is not None and
       set(indexed[currentLabel])==set(map(str,current["coverage"]["verifiedGameIds"])),
       "CURRENT_INDEX_NOT_MATCHED_TO_SEASON_FEED")
 current_min=season_bindings(formats,currentLabel)
 histLabels=[x for x in indexed if x!=currentLabel]
 sourceBlocks={};seasonMeta={}
 for label in histLabels:
  mins=season_bindings(formats,label)
  try:status,captured=archive_season(label,indexed[label],archived,mins)
  except (ValueError,KeyError,TypeError,IndexError) as exc:
   status={"status":"HELD","season":season_code(label),
           "reason":str(exc),"indexGames":len(indexed[label]),"verifiedGames":0}
   captured={}
  seasonMeta[label]=status
  sourceBlocks[label]=captured
 # Current HTO schedule time is also qualified for same-day doubleheaders.
 check(currentReadbacks.get("sourceAuthority")=="PUBLIC_HTO_HTTP_READBACK" and
       isinstance(currentReadbacks.get("games"),list),
       "CURRENT_HTO_TIME_SOURCE_NOT_VERIFIED")
 currentClock={}
 for game in currentReadbacks["games"]:
  gid=url_id(game.get("url"))
  check(gid not in currentClock and gid in indexed[currentLabel] and
        url_id(game.get("schedule",{}).get("href"))==gid,
        "CURRENT_HTO_CLOCK_SOURCE_ID_MISMATCH")
  day,clock=local_time(game["schedule"].get("text",""))
  currentClock[gid]=(day,clock)
 check(set(currentClock)==set(indexed[currentLabel]),
       "CURRENT_HTO_CLOCK_GAME_COVERAGE_INCOMPLETE")
 # Current game tuples are all explicitly source-verified GP=1 per the v3.6.6 contract.
 currentByID={}
 for pid,person in current["players"].items():
  games=[]
  for g in person["games"]:
   check(g["verification"]==LIVE_PROOF and g["appeared"] is True and
         url_id(g["sourceUrl"])==str(g["gameId"]),"CURRENT_PLAYER_GAME_SOURCE_UNQUALIFIED")
   check(currentClock[str(g["gameId"])][0]==g["date"],
         "CURRENT_PLAYER_APPEARANCE_DATE_VS_SCHEDULE_MISMATCH")
   games.append({"gameId":g["gameId"],"date":g["date"],"time":currentClock[str(g["gameId"])][1],
    "season":SOURCE_SEASON,"phase":"Regular Season","minutes":current_min,
    "appeared":True,"verification":LIVE_PROOF,"sourceUrl":g["sourceUrl"],
    "g":g["g"],"a":g["a"],"pts":g["pts"]})
  currentByID[pid]=games
 included={}
 seasonDetails=[]
 eligible=collections.Counter()
 for pid in sorted(set(career["players"])|set(currentByID),key=lambda s:int(s)):
  historyProfile=career["players"].get(pid)
  expected,haveProfile=personal_seasons(career,pid,set(histLabels))
  if not haveProfile and pid not in currentByID:continue
  allGames=list(currentByID.get(pid,[]))
  represented=[];holds=[];seen=set(x["gameId"] for x in allGames)
  for label in histLabels:
   if not haveProfile: # No trusted historical identity to extend the timeline.
    holds.append("HISTORICAL_PROFILE_UNVERIFIED");break
   if label not in expected:continue
   block=seasonMeta[label]
   individual=sourceBlocks[label].get(pid) if block["status"]=="VERIFIED_INDEX_COMPLETE" else None
   if block["status"]!="VERIFIED_INDEX_COMPLETE" or not verify_player_season(
       pid,expected[label],individual,historyProfile):
    holds.append("PLAYER_SEASON_PARITY_OR_SOURCE_HELD_"+season_code(label))
    break
   for game in individual["games"]:
    check(game["gameId"] not in seen,"CROSS_SEASON_GAME_ID_REPEATED_"+pid)
    seen.add(game["gameId"])
    entry={k:v for k,v in game.items() if k!="publishedName"}
    allGames.append(entry)
   represented.append(season_code(label))
  # Same-day doubleheaders must respect the actual HTO start time, not gameID order.
  allGames.sort(key=lambda g:(g["date"],g["time"],g["gameId"]),reverse=True)
  for a,b in zip(allGames,allGames[1:]):
   check((a["date"],a["time"],a["gameId"])!=(b["date"],b["time"],b["gameId"]),
         "AMBIGUOUS_PLAYER_GAME_CHRONOLOGY_"+pid)
  allGames=allGames[:10]
  if not allGames and not holds:continue
  for n in (3,5,10):
   if len(allGames)>=n:eligible[str(n)]+=1
  included[pid]={"playerId":pid,"name":historyProfile["name"] if haveProfile
       else current["players"][pid]["name"],
       "games":allGames,"currentVerifiedGP":len(currentByID.get(pid,[])),
       "verifiedPriorSeasons":represented,
       "coverageStatus":"COMPLETE_UP_TO_LAST_VERIFIED" if not holds else "HOLD_BEFORE_EARLIER_SEASONS",
       "firstUnqualifiedOlderSource":holds[0] if holds else None}
 return {"schema":SCHEMA,"status":STATUS,"version":"3.6.7",
  "asOf":current["asOf"],"season":SOURCE_SEASON,
  "currentSource":{"status":current["status"],"asOf":current["asOf"],
   "gameIds":current["coverage"]["verifiedGameIds"],"players":len(current["players"]),
   "verifiedGP":current["coverage"]["verifiedSkaterAppearances"]},
  "sourceHashSHA256":digest,
  "scoringBasis":{"rawRate":"Raw sum of points divided by actual player appearances.",
    "winterEquivalentRate":"Sum of points scaled by verified 32 / season game-minute format, divided by actual appearances; only for category comparison.",
    "scope":"Official Brave H.C. completed skater appearances, including source-qualified playoffs and seasons.",
    "noRosterAttendanceInference":True,
    "noSeasonBoundary":True},
  "sourceSeasons":seasonMeta,"players":included,
  "qualification":{"playerTimelinesWithAtLeast10":eligible["10"],
   "playerTimelinesWithAtLeast5":eligible["5"],
   "playerTimelinesWithAtLeast3":eligible["3"],
   "verifiedCurrentPlayersWithAtLeast10":sum(len(included.get(pid,{}).get("games",[]))>=10 for pid in current["players"]),
   "verifiedPlayerTimelines":len(included),
   "currentPlayers":len(current["players"])},
  "governance":{"noInferredAppearances":True,
    "historicalGPRecoveredOnlyWithFullSeasonOfficialProfileParity":True,
    "forfeitsCountAsZeroPlayedAppearances":True,
    "lastTenAreChronologicalPlayerAppearancesNotTeamGames":True,
    "crossSeasonScoringRateComparisonWinterEquivalentOnly":True,
    "previousSourceDataEdited":False,
    "sourceGapsBlockEarlierSeasons":True}}
def run(argv=None):
 parser=argparse.ArgumentParser()
 parser.add_argument("--write",action="store_true")
 parser.add_argument("--check",action="store_true")
 parser.add_argument("--output",type=Path,default=OUT)
 args=parser.parse_args(argv)
 check(not (args.write and args.check),"WRITE_AND_CHECK_MUTUALLY_EXCLUSIVE")
 a,d=archived_games()
 currentSchedule=BOX/"live_boxscores.json"
 d[str(currentSchedule.relative_to(ROOT)).replace("\\","/")]=sha(currentSchedule)
 result=build(load(CURRENT),load(INDEX),load(CAREER),load(FORMAT),a,d,load(currentSchedule))
 if args.check:
  check(args.output.exists() and load(args.output)==result,
        "CROSS_SEASON_PUBLISHED_SOURCE_NOT_REPRODUCIBLE")
 if args.write:
  args.output.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
 print(json.dumps({"status":result["status"],
   "qualifiedPlayers":result["qualification"]["verifiedPlayerTimelines"],
   "currentPlayersWithLast10":result["qualification"]["verifiedCurrentPlayersWithAtLeast10"],
   "eligible":{k:result["qualification"][k] for k in
      ("playerTimelinesWithAtLeast3","playerTimelinesWithAtLeast5",
       "playerTimelinesWithAtLeast10")},
   "sourceSeasons":{k:v["status"] for k,v in result["sourceSeasons"].items()},
   "currentAsOf":result["currentSource"]["asOf"],
   "wrote":args.write}))
if __name__=="__main__":
 try:run()
 except (ValueError,TypeError,KeyError,IndexError,OverflowError) as exc:
  print(json.dumps({"status":"HELD_CROSS_SEASON_SOURCE_INSUFFICIENT",
                    "reason":str(exc),"originalHTOOrWorkbookEdits":0}))
  raise SystemExit(2)
