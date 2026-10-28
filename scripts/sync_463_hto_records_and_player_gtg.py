"""Verified native HTO 463 latest records (three new source-proven records) to
existing history and 230-player-stat feeds. No HTO mutation, no fabricated
name/date, original 558 milestone archive and Awards untouched."""
from pathlib import Path
from collections import Counter
import json,requests,hashlib,datetime,sys
from refresh_record_sources import read_json,parse_records,sync_published,inventory,RECORDS,ROOT
H=ROOT/'widgets/history-records.json'
B=ROOT/'widgets/player-record-book.json'
SOURCE=ROOT/'widgets/history-records-legacy-558.json'
oldH=H.read_bytes();oldB=B.read_bytes();archive=SOURCE.read_bytes()
before=read_json(H);book=read_json(B)
assert before["entryCount"]==460 and len(before['groups'])==109
assert sum(len(p["entries"]) for p in book['players'].values())==229
assert read_json(SOURCE)['entryCount']==558
r=requests.get(RECORDS,timeout=28,headers={"Cache-Control":"no-cache"})
r.raise_for_status();parsed=parse_records(r.content)
assert len(parsed)==112 and sum(len(g['items']) for g in parsed)==463
missing=list((inventory(before['groups'])-inventory(parsed)).elements())
extra=list((inventory(parsed)-inventory(before['groups'])).elements())
assert not missing
assert len(extra)==3,extra
def fetch(cat,section,scope):
 groups=[g for g in parsed if g['category']==cat and g['section']==section and g['period']==scope]
 assert len(groups)==1,(cat,section,scope)
 assert len(groups[0]['items'])==1
 return groups[0]['items'][0]
gtg=fetch('Summer - Game Tying Goals','Individual Records','Season')
win=fetch('All Seasons - Longest Winning Streak','Team Records','Career')
pts=fetch('All Seasons - Longest Point Streak','Team Records','Career')
assert gtg.replace('\xa0',' ').replace('  ',' ')== '2 - Ben Sherritt (2014)'
assert win.replace('\xa0',' ').startswith('7 - Brave H.C. ') and 'Jul 10 - Sep 25, 2016' in win
assert pts.replace('\xa0',' ').startswith('14 - Brave H.C. ') and 'Oct 29, 2017 - Feb 11, 2018' in pts
assert set(extra)=={(g['section'],g['category'],g['period'],value) for g in parsed if g['category'] in
 ('Summer - Game Tying Goals','All Seasons - Longest Winning Streak','All Seasons - Longest Point Streak') for value in g['items']}
names={g['category']:i for i,g in enumerate(parsed) if g['section']=='Team Records'}
assert names['All Seasons - Longest Winning Streak']<names['All Seasons - Longest Point Streak']<names['Summer - Total Points/Record']
i_names=[g['category'] for g in parsed if g['section']=='Individual Records']
assert i_names.index('Summer - Game Tying Goals')==i_names.index('Summer - Game Winning Goals')+1
newhist,newbook=sync_published(before,book,parsed,datetime.datetime.now(datetime.timezone.utc).isoformat())
assert newhist['entryCount']==463 and len(newhist['groups'])==112
assert sum(len(p['entries']) for p in newbook['players'].values())==230
ben=newbook['players']['354285']
assert ben['name']=='Ben Sherritt'
extra_record=[x for x in ben['entries'] if x['category']=='Summer - Game Tying Goals']
assert len(extra_record)==1 and extra_record[0]['sourceText'].replace('\xa0',' ')=='2 - Ben Sherritt (2014)'
assert set(newbook['players'])==set(book['players'])
for pid,b in book['players'].items():
 original=[(e["category"],e["scope"],e["sourceText"],e["value"],e["dateLabel"]) for e in b['entries']]
 updated=[(e["category"],e["scope"],e["sourceText"],e["value"],e["dateLabel"]) for e in newbook['players'][pid]['entries']]
 assert Counter(original)<=Counter(updated)
# Source identity is unique, do not impute uncertain goalie records.
assert not any('Goali' in e['sourceText'] for p in newbook['players'].values() for e in p['entries'])
newhist['stalePolicy']='Official HTO 463-record current statistical source. Original 558-entry milestone-era source remains archived; values, readable dates and scopes preserved. Source-governed order-only changes reflected without changing verified player identities.'
newbook['interpretation']='230 verified source-mapped individual statistical records for 109 players. Summer GTG Ben Sherritt is HTO-ID-sourced. The two historical rental-goalie records remain in complete Records without speculative player attribution.'
assert SOURCE.read_bytes()==archive
H.write_text(json.dumps(newhist,indent=2,ensure_ascii=False)+"\n",encoding='utf-8')
B.write_text(json.dumps(newbook,indent=2,ensure_ascii=False)+"\n",encoding='utf-8')
receipt={"status":"NATIVE_HTO_463_RECORDS_AND_230_PLAYER_STATS_SOURCE_PARITY_PASS",
 "old_records":460,"current_records":463,"original_honours_and_milestones_archive":558,
 "additional_native":[gtg,win,pts],"player_record_count_before":229,"player_record_count_after":230,
 "source_only":True,"original_history_sha256":hashlib.sha256(oldH).hexdigest(),
 "updated_history_sha256":hashlib.sha256(H.read_bytes()).hexdigest(),
 "original_playerbook_sha256":hashlib.sha256(oldB).hexdigest(),
 "updated_playerbook_sha256":hashlib.sha256(B.read_bytes()).hexdigest(),
 "original_archive_sha256":hashlib.sha256(archive).hexdigest(),
 "source_html_sha256":hashlib.sha256(r.content).hexdigest()}
(ROOT/'docs/261028_RCD05_Source463_ThreeNewRecords_Receipt.json').write_text(json.dumps(receipt,indent=2,ensure_ascii=False),encoding="utf-8")
print(json.dumps(receipt,indent=2,ensure_ascii=False))
