"""Extend deployed player Highlights LEDGER from 97 to 134 milestones.
Accept only the 37 unique official HTO-dated Goal/Assist/Shutout awards
that exist on live native HTO Awards. Exact player IDs and source receipts.
Original 306 historic Highlights items preserved verbatim, originalCount untouched.
Usage:
python scripts/build_aw19_verified_historical_player_badges.py --verified-source PATH
No HTO native editing, no fabricated dates or award grants.
"""
import argparse,collections,datetime,hashlib,json,pathlib,re,requests,bs4
def iso(v):return datetime.date.fromisoformat(v)
def build(repo,sourcepath):
 ledgerpath=repo/"widgets"/"player-highlights-ledger.json"
 orig=ledgerpath.read_bytes()
 doc=json.loads(orig.decode("utf-8-sig"))
 assert doc["schema"]=="brave-hc-player-highlights/v1" and len(doc["players"])==43
 assert sum(len(p["items"]) for p in doc["players"].values())==306
 assert sum(x["category"]=="milestone" for p in doc["players"].values() for x in p["items"])==97
 source=json.loads(sourcepath.read_text(encoding="utf-8"))
 assert source["schema"]=="brave-hc-aw19-official-dated-native-backfill/v1"
 assert source["source_count"]==37 and len(source["source_categories"])==7
 url="https://www.htosports.com/teams/default.asp?p=awards&s=hockey&u=BRAVESHOCKEY"
 rsp=requests.get(url,timeout=25,headers={"Cache-Control":"no-cache"});rsp.raise_for_status()
 soup=bs4.BeautifulSoup(rsp.content,"html.parser")
 groups={g.select_one(".modGroupHeading").get_text(" ",strip=True):
         [x.get_text(" ",strip=True) for x in g.select(".modGroupItem")]
         for g in soup.select(".modGroupWrapper") if g.select_one(".modGroupHeading")}
 assert sum(len(r) for r in groups.values())==281 and len(groups)==28,"All verified new native milestones must be installed before widget publish"
 assert len(groups["Brave H.C. Hall of Fame"])==5
 added=[]
 existingids={x["id"] for p in doc["players"].values() for x in p["items"]}
 for e in source["source_entries"]:
  pid=str(e['source_player_id'])
  p=doc["players"].get(pid)
  assert p and p["name"]==e["player"],("HTO player identity mismatch",e)
  club=e["club"]
  assert re.fullmatch(r"(?:50|100|200)\s+(Goal|Assist)\s+Club|(?:5|10)\s+Shutout\s+Club",club)
  iso(e["achievement_date"])
  line=e["award_year"]+" - "+p["name"]+" - "+e["intended_native_notes"]
  assert groups[club].count(line)==1,("Native historical source date/recipient not published",line)
  assert re.fullmatch(r"[0-9a-f]{64}",e["source_sha256"])
  assert e["source_url"].startswith("https://www.htosports.com/teams/default.asp?")
  text=club+" - "+e["display_date"]
  assert not any(x["sourceText"]==text for x in p["items"]),"Duplicate profile achievement"
  eid="hto-aw19-"+pid+"-"+e["club"].lower().replace(" ","-")+"-"+e["source_game_id"]
  assert eid not in existingids
  existingids.add(eid)
  p["items"].append({
    "id":eid,"category":"milestone","sourceText":text,"displayText":text,
    "sourceEmphasis":False,"sourceRuns":[{"text":text,"strong":False,"italic":False}],
    "summaryCounts":{"championship":0,"award":0,"milestone":1},
    "sourceOrder":len(p["items"]),
    "sortDate":e["achievement_date"],
    "provenance":"OFFICIAL_DATED_HTO_AWARDS_PARITY",
    "publication":"VERIFIED_NATIVE_HTO_AWARD",
    "awardCategory":club,"officialPlayerId":pid,
    "sourceGameId":e["source_game_id"],"sourceGameURL":e["source_url"],
    "sourceGameSHA256":e["source_sha256"],
    "evidenceTier":e["evidence_tier"]})
  added.append({"player":p["name"],"id":pid,"award":club,"date":e["achievement_date"],"game":e["source_game_id"]})
 assert len(added)==37
 assert sum(len(p["items"]) for p in doc["players"].values())==343
 assert sum(x["category"]=="milestone" for p in doc["players"].values() for x in p["items"])==134
 assert sum(p["originalCount"] for p in doc["players"].values())==306
 doc["supplementalSourceAuthority"]="EXACT_VERIFIED_HTO_GAME_DATES_AND_PUBLIC_NATIVE_AWARDS_37"
 doc["supplementalPublishedAt"]=datetime.datetime.now(datetime.timezone.utc).isoformat()
 doc["supplementalEvidencePublicAwardsSHA256"]=hashlib.sha256(rsp.content).hexdigest()
 ledgerpath.write_text(json.dumps(doc,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
 report={"status":"37_NEW_PLAYER_BADGES_CREATED_FROM_PUBLIC_HTO_DATE_EVIDENCE",
  "original_sha256":hashlib.sha256(orig).hexdigest(),"final_sha256":hashlib.sha256(ledgerpath.read_bytes()).hexdigest(),
  "original_legacy_rows":306,"original_legacy_milestones":97,"new_source_verified":37,
  "total_rows":343,"total_milestones":134,"affected_players":len(set(x["id"] for x in added)),
  "public_awards_entries":281,"public_awards_sha256":hashlib.sha256(rsp.content).hexdigest(),
  "achievements":added,"native_hto_writes":0}
 (repo/"docs"/"261028_AW19_Verified_Historical_Milestones_Player_Badge_Receipt.json").write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding="utf-8")
 print(json.dumps({k:v for k,v in report.items() if k!="achievements"},indent=2))
if __name__=="__main__":
 parser=argparse.ArgumentParser()
 parser.add_argument("--verified-source",required=True,type=pathlib.Path)
 args=parser.parse_args()
 build(pathlib.Path(__file__).resolve().parents[1],args.verified_source)
