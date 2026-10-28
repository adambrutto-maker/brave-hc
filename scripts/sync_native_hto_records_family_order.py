"""Adopt user-approved native HTO category order into existing history widget
only if all 463 approved statistical source rows and player-book rows agree.
Uses existing public read-only HTO source; no native HTO writes."""
from pathlib import Path
from collections import Counter
import hashlib,json,datetime,requests
from refresh_record_sources import ROOT,RECORDS,parse_records,read_json,inventory,sync_published
SPEC=ROOT/"docs/261028_RCD05_Records_Stat_Family_Order_Spec.json"
TARGET=ROOT/"widgets/history-records.json"
BOOK=ROOT/"widgets/player-record-book.json"
def unique_category_order(groups,section):
 out=[]
 for g in groups:
  if g["section"]==section and g["category"] not in out:out.append(g["category"])
 return out
def run():
 spec=read_json(SPEC)
 assert spec["schema"]=="brave-hc-hto-records-stat-family-order/v1"
 assert spec["source_record_count"]==463
 original=TARGET.read_bytes()
 previous=read_json(TARGET);book=read_json(BOOK)
 assert previous["entryCount"]==463 and len(previous["groups"])==112
 assert sum(len(p["entries"]) for p in book["players"].values())==230
 response=requests.get(RECORDS,timeout=30,headers={"Cache-Control":"no-cache"});response.raise_for_status()
 groups=parse_records(response.content)
 assert len(groups)==112 and sum(len(g["items"]) for g in groups)==463
 assert unique_category_order(groups,"Individual Records")==spec["individual_order"]
 assert unique_category_order(groups,"Team Records")==spec["team_order"]
 assert inventory(groups)==inventory(previous["groups"]),"Statistical HTO records changed: do not approve mere reorder"
 assert sum(len(g["items"]) for g in groups if g["section"]=="Individual Records")==232
 assert sum(len(g["items"]) for g in groups if g["section"]=="Team Records")==231
 new,unchangedbook=sync_published(previous,book,groups,datetime.datetime.now(datetime.timezone.utc).isoformat())
 assert unchangedbook==book,"Player book source unexpectedly changed"
 assert new["groups"]==groups and new["entryCount"]==463
 changed=(new!=previous)
 if changed:TARGET.write_text(json.dumps(new,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
 result={"status":"SOURCE_EXACT_CATEGORY_ORDER_RECONCILED" if changed else "ALREADY_MATCHES_NATIVE_ORDER",
  "reordered":changed,"source_records":463,"category_groups":112,
  "individual_categories":len(spec["individual_order"]),"team_categories":len(spec["team_order"]),
  "individual_rows":232,"team_rows":231,"player_record_rows_preserved":230,
  "legacy_history_file_untouched":True,"awards_file_untouched":True,
  "no_native_hto_writes":True,
  "public_html_sha256":hashlib.sha256(response.content).hexdigest(),
  "old_widget_sha256":hashlib.sha256(original).hexdigest(),
  "new_widget_sha256":hashlib.sha256(TARGET.read_bytes()).hexdigest()}
 (ROOT/"docs/261028_RCD05_Records_FamilyOrder_Widget_Adoption_Receipt.json").write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
 print(json.dumps(result,indent=2))
if __name__=="__main__":run()
