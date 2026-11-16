"""Synthetic regression matrix for saved HTO regulation and extended scorecard shapes.

No network, HTO readback data, player names or real match IDs in test fixtures.
"""
from __future__ import annotations
import contextlib
from copy import deepcopy
from datetime import datetime,timezone,timedelta
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import audit_saved_hto_scorecard_widths as audit

NOW=datetime(2026,11,8,4,0,tzinfo=timezone.utc)


def build():
    # Fictional opponent identifiers; these are ONLY source-shaped test rows.
    scores=[
      ([2,7],7),
      ([6,4],5),
      ([1,7],7),
      ([2,3],7),
      ([3,6],7),
      ([0,3],7),
    ]
    rows=[]
    for i,((gf,ga),width) in enumerate(scores):
        if width==7:
            h=list(audit.EXTENDED)
            a=["Brave H.C.","0","0",str(gf),"0","0",str(gf)]
            b=["QA OPPO "+str(i),"0","0",str(ga),"0","0",str(ga)]
        else:
            h=list(audit.REGULATION)
            a=["Brave H.C.","0","0",str(gf),str(gf)]
            b=["QA OPPO "+str(i),"0","0",str(ga),str(ga)]
        rows.append({"index":i+2,"rows":[h,a,b]})
    return {
       "date":"2026-11-08T03:31:01.066Z",
       "readOnly":True,
       "pages":[
         {"name":"hto_scores",
          "url":"https://www.htosports.com/teams/default.asp?p=scores&s=hockey&u=BRAVESHOCKEY",
          "tables":[{"index":0,"rows":[["Menu"]]},*rows]},
         {"name":"hto_stats",
          "url":"https://www.htosports.com/teams/default.asp?p=stats&s=hockey&u=BRAVESHOCKEY",
          "tables":[{"index":4,"rows":[list(audit.OFFICIAL_STATS),["6","14","30","2","75%"]]}]}
       ]
    }


def check(doc,now=NOW):
    return audit.evaluate(doc,now=now)


class SavedHTOWidthQA(unittest.TestCase):

 def test_one_valid_five_column_and_five_extended_seven_column_tables(self):
    x=check(build())
    self.assertEqual(x["scorecardCount"],6)
    self.assertEqual(x["regulationOnlyFiveColumn"],1)
    self.assertEqual(x["extendedSevenColumn"],5)
    self.assertEqual((x["teamGP"],x["goalsFor"],x["goalsAgainst"]),(6,14,30))

 def test_allowed_period_sums_match_final_only_for_real_table_widths(self):
    x=check(build())
    self.assertEqual([(r["width"],r["goalsFor"],r["goalsAgainst"]) for r in x["scorecards"]],
                     [(7,2,7),(5,6,4),(7,1,7),(7,2,3),(7,3,6),(7,0,3)])
    self.assertEqual(x["scorecards"][1]["kind"],"REGULATION_3_PERIODS")

 def test_reverse_host_and_opponent_order_remains_valid(self):
    doc=build()
    for t in doc["pages"][0]["tables"][1:]:
        t["rows"][1],t["rows"][2]=t["rows"][2],t["rows"][1]
    self.assertEqual(check(doc)["teamGP"],6)

 def test_header_with_six_columns_fails_closed(self):
    doc=build()
    t=doc["pages"][0]["tables"][2]["rows"]
    t[0]=["REGULAR SEASON","1","2","3","OT","F"]
    with self.assertRaisesRegex(audit.SourceHold,"UNSUPPORTED_SCORECARD_HEADER"):
        check(doc)

 def test_header_with_wrong_regulation_semantics_fails_closed(self):
    doc=build()
    doc["pages"][0]["tables"][2]["rows"][0]=["REGULAR SEASON","1","2","4","F"]
    with self.assertRaisesRegex(audit.SourceHold,"UNSUPPORTED_SCORECARD_HEADER"):
        check(doc)

 def test_row_count_or_width_wrong_fails_closed(self):
    for kind in ("width","rows"):
        doc=build()
        t=doc["pages"][0]["tables"][2]["rows"]
        if kind=="width":t[1].pop()
        else:t.pop()
        with self.assertRaisesRegex(audit.SourceHold,"SCORECARD_ROW_WIDTH_OR_COUNT_INVALID"):
            check(doc)

 def test_duplicate_or_missing_team_row_is_rejected(self):
    for name in ("Brave H.C.","Fictional X"):
        doc=build()
        doc["pages"][0]["tables"][2]["rows"][2][0]=name if name=="Brave H.C." else "Fictional X"
        if name!="Brave H.C.":doc["pages"][0]["tables"][2]["rows"][1][0]="Fictional Y"
        with self.assertRaisesRegex(audit.SourceHold,"BRAVES_OPPONENT_IDENTITY_NOT_UNIQUE"):
            check(doc)

 def test_blank_opponent_name_is_not_attributed(self):
    doc=build();doc["pages"][0]["tables"][2]["rows"][2][0]="  "
    with self.assertRaisesRegex(audit.SourceHold,"BRAVES_OPPONENT_IDENTITY_NOT_UNIQUE"):
        check(doc)

 def test_noninteger_score_and_negative_score_are_rejected(self):
    for val in ("-1","3.5","nan",0,None):
        doc=build();doc["pages"][0]["tables"][2]["rows"][2][1]=val
        with self.assertRaisesRegex(audit.SourceHold,"INVALID_SCORE_VALUE"):
            check(doc)

 def test_nonmatching_periods_and_final_are_rejected(self):
    doc=build();doc["pages"][0]["tables"][2]["rows"][1][-1]="99"
    with self.assertRaisesRegex(audit.SourceHold,"PERIOD_SCORE_DOES_NOT_MATCH_FINAL"):
        check(doc)

 def test_team_total_gp_must_match_number_of_cards(self):
    doc=build();doc["pages"][1]["tables"][0]["rows"][1][0]="5"
    with self.assertRaisesRegex(audit.SourceHold,"GAME_COUNT_AND_SCORECARDS_MISMATCH"):
        check(doc)

 def test_goals_for_and_against_must_match_independent_team_stats(self):
    for idx in (1,2):
        doc=build()
        doc["pages"][1]["tables"][0]["rows"][1][idx]="999"
        with self.assertRaisesRegex(audit.SourceHold,"OFFICIAL_TEAM_SCORE_TOTALS_MISMATCH"):
            check(doc)

 def test_official_team_stats_header_is_not_guessed(self):
    doc=build();doc["pages"][1]["tables"][0]["rows"][0][2]="Unknown"
    with self.assertRaisesRegex(audit.SourceHold,"OFFICIAL_TEAM_STATS_NOT_UNIQUE"):
        check(doc)

 def test_unexpected_duplicates_in_team_stats_table_fail(self):
    doc=build();doc["pages"][1]["tables"].append(deepcopy(doc["pages"][1]["tables"][0]))
    with self.assertRaisesRegex(audit.SourceHold,"OFFICIAL_TEAM_STATS_NOT_UNIQUE"):
        check(doc)

 def test_source_origin_scoping_rejects_wrong_host_and_wrong_team(self):
    for change in ("host","team"):
        doc=build()
        link=doc["pages"][0]
        if change=="host":link["url"]=link["url"].replace("www.htosports.com","other.example")
        else:link["url"]=link["url"].replace("BRAVESHOCKEY","OTHERTEAM")
        with self.assertRaisesRegex(audit.SourceHold,"OFFICIAL_SCORES_SOURCE_NOT_MATCHED"):
            check(doc)

 def test_readback_must_be_readonly_and_has_required_scoped_pages(self):
    doc=build();doc["readOnly"]=False
    with self.assertRaisesRegex(audit.SourceHold,"NOT_SOURCE_ATTESTED_READ_ONLY"):
        check(doc)
    doc=build();doc["pages"].pop()
    with self.assertRaisesRegex(audit.SourceHold,"REQUIRED_HTO_PAGES_NOT_UNIQUE"):
        check(doc)

 def test_future_and_stale_capture_are_not_fresh_evidence(self):
    for iso in ("2027-01-01T00:00:00Z","2026-10-01T00:00:00Z"):
        doc=build();doc["date"]=iso
        with self.assertRaisesRegex(audit.SourceHold,"SAVED_READBACK_EXPIRED_OR_FROM_FUTURE"):
            check(doc)

 def test_future_publisher_check_does_not_consider_python_bytecode_a_source_edit(self):
    # This tests a portable project ignore rule, not a blanket clean/force.
    import subprocess
    cached="scripts/__pycache__/track_svhl_division_movements.cpython-312.pyc"
    result=subprocess.run(["git","check-ignore","--no-index","-v",cached],
                          cwd=ROOT,text=True,capture_output=True,check=False)
    self.assertEqual(result.returncode,0,result.stderr)
    self.assertIn("/scripts/__pycache__/",result.stdout)
    for protected in ("widgets/league-intelligence.json",
                      "widgets/game-centre-lineup-public.json",
                      "scripts/new-legitimate-source.py"):
        r=subprocess.run(["git","check-ignore","--no-index",protected],
                         cwd=ROOT,text=True,capture_output=True,check=False)
        self.assertEqual(r.returncode,1,protected+" unexpectedly ignored")
 def test_team_ids_and_player_attribution_remain_explicitly_unverified(self):
    x=check(build())
    self.assertEqual(x["gameIdentityMapping"],"NOT_VERIFIED_BY_SAVED_SCORECARD_TABLES")
    self.assertEqual(x["perPlayerBoxscoreParity"],"NOT_EVALUATED")
    self.assertFalse(x["releaseAuthorized"])
    self.assertFalse(x["liveCollectorModified"])
    self.assertFalse(x["MasterWorkbookWritten"])
    self.assertFalse(x["officialHTOWritten"])

 def test_json_cli_accepts_qualified_saved_fixture_without_writing_back(self):
    sample=build()
    with tempfile.TemporaryDirectory(prefix="hockeyos_width_qa_") as t:
        source=Path(t)/"saved-hto.json"
        source.write_text(json.dumps(sample),encoding="utf-8")
        before=hashlib.sha256(source.read_bytes()).hexdigest()
        out=io.StringIO()
        with contextlib.redirect_stdout(out):
            rc=audit.run(["--readback",str(source),"--as-of","2026-11-08T04:00:00Z","--strict"])
        self.assertEqual(rc,0)
        record=json.loads(out.getvalue())
        self.assertEqual(record["scorecardCount"],6)
        self.assertEqual(record["sourceReadbackSHA256"],before)
        self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(),before)
        self.assertEqual({p.name for p in Path(t).iterdir()},{"saved-hto.json"})

 def test_missing_saved_readback_is_held_and_does_not_create_source_file(self):
    with tempfile.TemporaryDirectory(prefix="hockeyos_width_qa_") as t:
        missing=Path(t)/"no-source.json"
        out=io.StringIO()
        with contextlib.redirect_stdout(out):
            rc=audit.run(["--readback",str(missing),"--strict"])
        self.assertEqual(rc,2)
        report=json.loads(out.getvalue())
        self.assertEqual(report["state"],"HOLD")
        self.assertEqual(report["holdReason"],"FileNotFoundError")
        self.assertFalse(report["releaseAuthorized"])
        self.assertFalse(missing.exists())
 def test_json_cli_returns_hold_code_on_wrong_scorecards(self):
    sample=build()
    sample["pages"][0]["tables"][2]["rows"][0][1]="WRONG"
    with tempfile.TemporaryDirectory(prefix="hockeyos_width_qa_") as t:
        source=Path(t)/"saved-hto.json"
        source.write_text(json.dumps(sample),encoding="utf-8")
        out=io.StringIO()
        with contextlib.redirect_stdout(out):
            rc=audit.run(["--readback",str(source),"--as-of","2026-11-08T04:00:00Z","--strict"])
        self.assertEqual(rc,2)
        result=json.loads(out.getvalue())
        self.assertEqual(result["state"],"HOLD")
        self.assertEqual(result["holdReason"],"UNSUPPORTED_SCORECARD_HEADER")
        self.assertFalse(result["releaseAuthorized"])


if __name__=="__main__":
    unittest.main(verbosity=2)
