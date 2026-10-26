"""Read-only evidence archive of historical SVHL Sunday Winter division standings.

Historical season IDs are explicit. Official team IDs are season-scoped; identical
display names are NEVER treated as continuing franchises across seasons.
No HTO, private Master Workbook, roster/player records or source systems are written.
"""
from __future__ import annotations
from argparse import ArgumentParser
from datetime import datetime,timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse,parse_qs
import hashlib,json,re,sys
from collect_svhl_league_intelligence import BASE,get,url_league,Parsed,HEAD
SCHEMA="brave-hc-svhl-historical-divisions/v1"
SEASONS=((420,"2018/19"),(476,"2021/22"),(494,"2022/23"),
         (512,"2023/24"),(531,"2024/25"),(547,"2025/26"))
SEASON_IDS={i for i,_ in SEASONS}
TABLE=re.compile(r'(?is)<b\s+class="blue">\s*([^<]+)\s*</b>\s*<br\s*/?>\s*(?:<img\b[^>]*>\s*)?<div>\s*<table\s+class="Grid"[^>]*>(.*?)</table>')
class HistoricalHold(ValueError): pass
def need(test,message):
 if not test:raise HistoricalHold("HISTORY_HOLD:"+message)
def category(label):
 text=label.lower().replace(" ","")
 if "playoff" in text:return "PLAYOFF_PLACEHOLDER"
 if "oldtimer" in text or text in ("xnyo","yot","xnyohockey"):return "OTHER_LEAGUE_CATEGORY"
 return "COMPETITIVE_SUNDAY_DIVISION"
def parse_season(league_id,season,html,sha):
 need(league_id in SEASON_IDS,"LEAGUE_ID_NOT_ALLOWLISTED")
 matches=list(TABLE.finditer(html))
 need(4<=len(matches)<=20,"DIVISION_STANDINGS_NOT_COMPLETE")
 divs=[];team_count=0
 for match in matches:
  label=" ".join(match.group(1).split())
  body=match.group(2)
  section="<table>"+body+"</table>"
  parsed=Parsed();parsed.feed(section)
  rows=parsed.rows
  need(rows and rows[0]==HEAD,"STANDINGS_HEADER_CHANGED_"+label)
  names_to_ids={}
  for link in parsed.refs:
   u=urlparse(link["url"])
   if u.path.lower().lstrip("/")!="teaminfo.aspx":continue
   q=parse_qs(u.query)
   if q.get("leagueid")!=[str(league_id)] or not q.get("teamid"):continue
   value=q["teamid"][0]
   need(value.isdigit(),"HISTORICAL_TEAM_ID_MALFORMED")
   key=link["label"]
   if key in names_to_ids:need(names_to_ids[key]==int(value),"DUPLICATED_HISTORICAL_NAME_ID")
   names_to_ids[key]=int(value)
  entries=[]
  for row in rows[1:]:
   need(len(row)==len(HEAD),"MALFORMED_STANDINGS_ROW_"+label)
   name=row[0]
   need(bool(name),"NAME_EMPTY")
   try:rec={k.lower():int(val) for k,val in zip(HEAD[1:],row[1:])}
   except ValueError as err:raise HistoricalHold("HISTORY_HOLD:INVALID_RECORD_"+name) from err
   need(all(x>=0 for x in rec.values()) and
        rec["w"]+rec["l"]+rec["t"]==rec["gp"] and
        rec["pts"]==rec["w"]*2+rec["t"],"HISTORICAL_WLT_POINTS_INVALID_"+name)
   entries.append({"name":name,"seasonTeamId":names_to_ids.get(name),
                   "gp":rec["gp"],"w":rec["w"],"l":rec["l"],"t":rec["t"],
                   "pts":rec["pts"],"gf":rec["gf"],"ga":rec["ga"]})
  divs.append({"name":label,"category":category(label),"teams":entries,
               "teamCount":len(entries)})
  team_count+=len(entries)
 need(len({d["name"] for d in divs})==len(divs),"DUPLICATE_DIVISION_TITLE")
 return {"leagueId":league_id,"season":"Sunday Winter "+season,
         "source":url_league(league_id),"sourceSHA256":sha,
         "divisions":divs,"divisionCount":len(divs),"teamEntries":team_count,
         "competitiveTeamEntries":sum(len(d["teams"]) for d in divs
                     if d["category"]=="COMPETITIVE_SUNDAY_DIVISION")}
def build(captures,now=None):
 now=now or datetime.now(timezone.utc)
 years=[]
 for ident,season in SEASONS:
  need(ident in captures,"MISSING_ARCHIVE_SEASON_"+str(ident))
  html,sha=captures[ident]
  years.append(parse_season(ident,season,html,sha))
 return {"schema":SCHEMA,"status":"OFFICIAL_SVHL_STANDINGS_ARCHIVE_SOURCE_QUALIFIED",
         "capturedUTC":now.isoformat(),"seasons":years,
         "seasonsCollected":len(years),
         "competitiveTeamSeasonEntries":sum(x["competitiveTeamEntries"] for x in years),
         "sourceScope":"OFFICIAL_SEASON_STANDINGS_NOT_CROSS_SEASON_TEAM_IDENTITY",
         "missingSeasonsNotInferred":["2019/20","2020/21"],
         "identityRule":"Sports Village team IDs identify a single league season. Matching names across years are search candidates, not verified roster/franchise continuity.",
         "publishedPersonalRosterData":False}
def validate(data):
 need(data.get("schema")==SCHEMA and
      data.get("status")=="OFFICIAL_SVHL_STANDINGS_ARCHIVE_SOURCE_QUALIFIED" and
      data.get("sourceScope")=="OFFICIAL_SEASON_STANDINGS_NOT_CROSS_SEASON_TEAM_IDENTITY" and
      data.get("publishedPersonalRosterData") is False,"ARCHIVE_PROVENANCE_INVALID")
 year=data.get("seasons")
 need(isinstance(year,list) and len(year)==len(SEASONS) and
      data.get("seasonsCollected")==len(SEASONS),"HISTORICAL_SEASON_LIST_INVALID")
 for item,(ident,season) in zip(year,SEASONS):
  need(item.get("leagueId")==ident and item.get("season")=="Sunday Winter "+season and
       item.get("source")==url_league(ident) and
       re.fullmatch(r"[0-9a-f]{64}",item.get("sourceSHA256","")) is not None,
       "HISTORICAL_SEASON_PROOF_INVALID")
  divs=item.get("divisions")
  need(isinstance(divs,list) and len(divs)==item.get("divisionCount") and
       4<=len(divs)<=20,"HISTORICAL_DIVISION_COUNT_CHANGED")
  for div in divs:
   need(div.get("category")==category(div.get("name","")) and
        len(div.get("teams",[]))==div.get("teamCount"),"HISTORICAL_DIVISION_CATEGORY_BAD")
   for t in div["teams"]:
    need(t["w"]+t["l"]+t["t"]==t["gp"] and
         t["pts"]==2*t["w"]+t["t"] and
         all(type(t[k]) is int and t[k]>=0 for k in ("gp","w","l","t","pts","gf","ga")),
         "HISTORICAL_PUBLIC_RECORD_INVALID")
  need(sum(len(x["teams"]) for x in divs)==item["teamEntries"] and
       sum(len(x["teams"]) for x in divs if x["category"]==
           "COMPETITIVE_SUNDAY_DIVISION")==item["competitiveTeamEntries"],
       "HISTORICAL_ENTRY_COUNTS_BAD")
 need(data.get("competitiveTeamSeasonEntries")==sum(x["competitiveTeamEntries"]
      for x in year),"HISTORICAL_TOTAL_MISMATCH")
 return True
def main():
 ap=ArgumentParser()
 ap.add_argument("--out",required=True)
 opts=ap.parse_args()
 try:
  captures={ident:get(url_league(ident)) for ident,_ in SEASONS}
  doc=build(captures)
  validate(doc)
  target=Path(opts.out);target.parent.mkdir(parents=True,exist_ok=True)
  temp=target.with_suffix(".tmp")
  temp.write_text(json.dumps(doc,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
  temp.replace(target)
  print(json.dumps({"state":"HISTORICAL_STANDINGS_SOURCE_PASS",
   "seasons":len(doc["seasons"]),"divisions":sum(x["divisionCount"] for x in doc["seasons"]),
   "competitiveTeamSeasonEntries":doc["competitiveTeamSeasonEntries"],
   "unresolvedSeasons":doc["missingSeasonsNotInferred"]}))
  return 0
 except (HistoricalHold,ValueError,KeyError,OSError) as err:
  print(json.dumps({"state":"HOLD","reason":str(err),"published":False}),file=sys.stderr);return 2
if __name__=="__main__":sys.exit(main())
