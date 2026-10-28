"""Stage native HTO Records 460-stat rows and identity-exact 229 existing
individual player statistical records. The original 98 legacy club milestone
entries are now Awards, not Records. Unknown legacy goalie identity remains
on the HTO Records page, not assigned to a wrong player.
Does not modify native HTO or any player milestone badges.
"""
from pathlib import Path
from collections import Counter,defaultdict
import requests,bs4,datetime,hashlib,json,csv,re,sys
from refresh_record_sources import parse_records,RECORDS,clean
ROOT=Path(__file__).resolve().parents[1]
out=ROOT/"docs"
historypath=ROOT/"widgets"/"history-records.json"
bookpath=ROOT/"widgets"/"player-record-book.json"
legacy=json.loads(historypath.read_text(encoding="utf-8"))
book=json.loads(bookpath.read_text(encoding="utf-8"))
original_history=historypath.read_bytes();original_book=bookpath.read_bytes()
assert legacy["entryCount"]==558
assert sum(len(p["entries"]) for p in book["players"].values())==327
club=re.compile(r"^\d+\s+(?:Game|Point|Win|Goal|Assist|Shutout)\s+Club$")
original_nonclub=[g for g in legacy['groups'] if not club.fullmatch(g['category'])]
assert sum(len(g['items']) for g in original_nonclub)==460
response=requests.get(RECORDS,timeout=30,headers={'Cache-Control':'no-cache'})
response.raise_for_status()
current=parse_records(response.content)
assert sum(len(g["items"]) for g in current)==460 and len(current)==109
def season(name):
 return "Summer" if name.startswith('Summer') else "Winter" if name.startswith('Winter') else "Career/Other"
def value_key(g,v):
 return (g['section'],season(g['category']),g['period'],clean(v))
assert Counter(value_key(g,v) for g in original_nonclub for v in g['items'])==Counter(value_key(g,v) for g in current for v in g['items']),"Original statistical row/period/season not preserved"
# Human-reviewed heading change manifest, including scope-aware 2+/3+ leaders.
mapping_csv=Path(r"D:\BruTTech\Products\HockeyOS\Implementation Control\PlayerCoaching\261028_Records_Structure_Independent_QA\record_heading_change_manifest.csv")
with mapping_csv.open(encoding="utf-8-sig",newline="") as f:rows=list(csv.DictReader(f))
lookup=defaultdict(list)
for row in rows:
 lookup[(row['Section'].lower(),row['Current heading'])].append(row['Proposed concise heading'])
def new_categories(old_category,scope,source):
 side='individual'
 opts=[]
 for title in lookup.get((side,old_category),[]):
  if title!='MILESTONE_ONLY' and title not in opts:opts.append(title)
 if old_category not in opts:opts.append(old_category)
 # Only existing live record rows with the exact source value and scope qualify.
 relevant=[g for g in current if g['section']=='Individual Records' and g['period']==scope and clean(source) in [clean(s) for s in g['items']] and season(g['category'])==season(old_category)]
 matched=[g for g in relevant if g['category'] in opts]
 if len(matched)==1:return matched[0]['category'],None
 if len(matched)>1:return None,'MULTIPLE_MAPPED_CATEGORIES'
 if len(relevant)==1:return relevant[0]['category'],'FALLBACK_SINGLE_EXACT_ROW_CATEGORY'
 return None,'NO_UNIQUE_NATIVE_RECORD_CATEGORY'
new_book=json.loads(json.dumps(book))
for p in new_book["players"].values():p["entries"]=[]
port=[];holds=[];migrated_milestone_rows=0
for pid,player in book['players'].items():
 for e in player['entries']:
  if club.fullmatch(e['category']):
   migrated_milestone_rows+=1
   continue
  target,note=new_categories(e['category'],e['scope'],e['sourceText'])
  if not target:
   holds.append({"id":pid,"player":player['name'],"old_category":e['category'],"scope":e['scope'],"text":e['sourceText'],"reason":note})
   continue
  newer=dict(e);newer['category']=target
  # Entry string/value/date remain immutable; only the approved concise heading changes.
  new_book['players'][pid]['entries'].append(newer)
  port.append({"player_id":pid,"name":player['name'],"previous_category":e['category'],"current_category":target,"scope":e['scope'],"sourceText":e['sourceText'],"mapping":note or 'EXACT_MANIFEST'})
assert migrated_milestone_rows==98
new_book_count=sum(len(p['entries']) for p in new_book['players'].values())
assert new_book_count+len(holds)==229
# Other public individual records may be unattributable to the 109 HTO profiles.
individual_public=[(g,v) for g in current if g['section']=='Individual Records' for v in g['items']]
result_rows=Counter((r['current_category'],r['scope'],clean(r['sourceText'])) for r in port)
unknown_live=[]
for g,v in individual_public:
 key=(g['category'],g['period'],clean(v))
 if result_rows[key]:result_rows[key]-=1
 else:unknown_live.append({"category":g['category'],"scope":g['period'],"sourceText":v})
assert new_book_count+len(unknown_live)==len(individual_public) if not holds else new_book_count+len(holds)+len(unknown_live)==len(individual_public)
updated_time=datetime.datetime.now(datetime.timezone.utc).isoformat()
new_history=json.loads(json.dumps(legacy))
new_history['groups']=current;new_history['entryCount']=460;new_history['capturedAt']=updated_time
new_history['stalePolicy']='Exact 460 individual/team HTO statistical entries after sourced 98 milestone clubs moved to native Awards; preserve game/season/playoffs, Summer/Winter and source values on refresh; do not reinsert milestone clubs into Records.'
new_book['capturedAt']=updated_time
new_book['interpretation']='Native HTO Records statistical entries only (individual players); source values and scope retained, with concise approved public heading aliases. Historic milestone clubs now belong under native HTO Awards and the earned player Achievement Locker. Unattributable legacy goalie records remain on the complete HTO Records feed rather than being assigned a player ID.'
report={"schema":"brave-hc-hto-native-statistical-records-widget-port/v1",
 "status":"READY_FOR_RELEASE" if not holds and new_book_count==229 and len(unknown_live)==2 else "REVIEW_HELD",
 "original_hto_records":558,"new_hto_statistical_records":460,"milestone_club_rows_moved_to_awards":98,
 "original_player_book_rows":327,"original_player_statistical_rows":229,
 "ported_player_entries":new_book_count,"mapping_holds":holds,
 "source_public_individual_rows":len(individual_public),"source_public_team_rows":229,
 "unattributed_public_individual_rows":unknown_live,
 "heading_aliases":sum(r['previous_category']!=r['current_category'] for r in port),
 "original_history_sha256":hashlib.sha256(original_history).hexdigest(),
 "original_book_sha256":hashlib.sha256(original_book).hexdigest(),
 "public_records_sha256":hashlib.sha256(response.content).hexdigest(),
 "capturedAt":updated_time,"native_hto_writes":0}
(out/"261028_Records_Widget_460_Release_Manifest.json").write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding="utf-8")
if report['status']=="READY_FOR_RELEASE":
 historypath.write_text(json.dumps(new_history,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
 bookpath.write_text(json.dumps(new_book,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
print(json.dumps({k:v for k,v in report.items() if k not in ('mapping_holds','unattributed_public_individual_rows')},indent=2))
print('UNATTRIBUTED',unknown_live[:10],'HELD',holds[:10])
