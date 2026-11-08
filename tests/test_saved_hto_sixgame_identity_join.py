"""Synthetic negative/positive tests for independent six-game HTO identity replay.

Does not ship or load the real November 4 private source receipt in CI.
"""
from __future__ import annotations
from copy import deepcopy
from datetime import datetime,timezone,timedelta
from pathlib import Path
import contextlib,hashlib,io,json,tempfile,sys,unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
sys.path.insert(0,str(ROOT/"tests"))
import audit_saved_hto_sixgame_identity_join as join
import audit_saved_hto_scorecard_widths as shapes
import test_saved_hto_scorecard_widths as prior

NOW=datetime(2026,11,8,4,0,tzinfo=timezone.utc)
GAMES=[
 (3356177,359,"2026-09-20","Dateline Predators",0,3),
 (3356178,360,"2026-09-27","Mohawks H.C.",3,6),
 (3369564,361,"2026-10-04","Michelob Morts",2,3),
 (3375601,362,"2026-10-18","Zamboner Crew",1,7),
 (3375682,363,"2026-10-25","Big Bastones",6,4),
 (3375683,364,"2026-11-01","Mid Ice Crisis",2,7),
]
HID=list(reversed(GAMES))


def fake():
    saved=prior.build()
    scores=saved["pages"][0]
    scores["tables"][0]["rows"]=[["Navigation"]]
    links=[]
    for card, (gid,n,dt,opp,gf,ga) in zip(scores["tables"][1:],HID):
        r=card["rows"]
        target=next(row for row in r[1:] if row[0]!="Brave H.C.")
        target[0]=opp
        links.append({"title":"Box Score and Summary",
            "url":f"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&sportsHQ=BRAVESHOCKEY&gameID={gid}&p=boxscore"})
    # Saved HTO capture table indexes equal their actual position in the
    # page-level table array. Preserve this source shaped index invariant.
    for index,table in enumerate(scores["tables"]):
        table["index"]=index
    scores["links"]=links
    mapped=[]
    source=[]
    for gid,n,dt,opp,gf,ga in GAMES:
        url=f"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=boxscore&sportsHQ=BRAVESHOCKEY&gameID={gid}"
        source.append({"htoGameId":gid,"date":dt,"season":"W2026/27",
           "gameType":"Regular Season","opponentExact":opp,"gf":gf,"ga":ga,
           "result":"W" if gf>ga else "L" if gf<ga else "T",
           "sourceUrl":url,"officialSourceGamePageSHA256":"a"*64})
        mapped.append({"htoGameId":gid,"masterGameNumber":n,"date":dt,
            "opponentExact":opp,"gf":gf,"ga":ga,
            "sourceWorkbookRow":n+11,"workbookCompletedFlag":False})
    proof={
      "schema":join.SOURCE_SCHEMA,
      "status":"SIX_COMPLETED_GAME_DATES_RECONCILED_SOURCE_ONLY",
      "sixGames":6,"season":"W2026/27",
      "sourceScoreEvidence":{
        "schema":join.SCORE_STAGE_SCHEMA,"status":"PRIVATE_SOURCE_ONLY",
        "publicationAuthorized":False,"sourceGamesCount":6,"games":source,
        "capturedAt":"2026-11-03T17:58:52Z",
        "sourceAuthority":"PUBLIC_HTO_HTTP_READBACK",
        "originalSixBoxscoreReadbackSHA256":"b"*64,
        "sourceScoreReviewSHA256":"c"*64,
      },
      "authoritativeOriginalWorkbookSHA256":join.ORIGINAL_MASTER_SHA,
      "original24SeasonScheduleSlots":24,
      "exactDateAndGameNumberMapping":mapped,
      "sixthGameProved":deepcopy(mapped[-1]),
      "modelledCurrentAwardScores":False,"currentAwardEligibilityApproved":False,
      "sourceCorrectionDecisionsApproved":False,"sourceAcceptanceRequiresIndependentHumanReview":True
    }
    return saved,proof

class SixGameJoinQA(unittest.TestCase):
    def qa(self,change=None,now=NOW):
        s,p=fake()
        if change:change(s,p)
        return join.fixed_current_source(s,p,now=now)

    def test_exact_all_six_pinned_ids_dates_source_calendars_and_scores(self):
        r=self.qa()
        self.assertEqual(r["status"],"PRIVATE_PRIOR_GAME_ID_JOIN_REPLAY_PARITY_PASS")
        self.assertEqual(set(r["qualifiedSixPriorGameIDs"]),{g[0] for g in GAMES})
        self.assertEqual([g["masterGameNumber"] for g in r["mapping"]],list(range(364,358,-1)))
        self.assertEqual([(g["goalsFor"],g["goalsAgainst"]) for g in r["mapping"]],
            [(gf,ga) for _,_,_,_,gf,ga in HID])

    def test_supported_five_and_seven_columns_are_kept_game_specific(self):
        r=self.qa()
        self.assertEqual(r["savedScorecards"],6)
        self.assertEqual(r["fiveColumnScorecards"],1)
        self.assertEqual(r["sevenColumnScorecards"],5)
        self.assertEqual(next(x for x in r["mapping"] if x["scorecardWidth"]==5)["gameId"],3375682)

    def test_game_364_is_the_previously_proven_november_1_result(self):
        row=next(x for x in self.qa()["mapping"] if x["masterGameNumber"]==364)
        self.assertEqual((row["gameId"],row["date"],row["opponent"],row["goalsFor"],row["goalsAgainst"]),
             (3375683,"2026-11-01","Mid Ice Crisis",2,7))

    def test_previous_boxscore_proof_must_remain_preexisting_and_offline(self):
        r=self.qa()
        self.assertFalse(r["liveOfficialBoxscorePagesFetched"])
        self.assertFalse(r["individualPlayerGameRowsRevalidated"])
        self.assertFalse(r["releaseAuthorized"])
        self.assertFalse(r["currentModelAndAwardsReleased"])
        self.assertFalse(r["liveCollectorModified"])
        self.assertFalse(r["originalMasterWorkbookWritten"])
        self.assertFalse(r["publicPublisherUpdated"])

    def test_boxscore_link_reorder_without_card_reorder_is_held(self):
        def changes(s,p):
            s["pages"][0]["links"][0],s["pages"][0]["links"][1]=s["pages"][0]["links"][1],s["pages"][0]["links"][0]
        with self.assertRaisesRegex(join.SourceHold,"CURRENT_SCORES_LINK_DOES_NOT_MATCH_HISTORICAL_GAME"):
            self.qa(changes)

    def test_card_and_link_reorder_both_are_held_as_source_order_changed(self):
        def changes(s,p):
            t=s["pages"][0]["tables"]
            t[1],t[2]=t[2],t[1]
            for i,v in enumerate(t):v["index"]=i
            x=s["pages"][0]["links"]
            x[0],x[1]=x[1],x[0]
        with self.assertRaisesRegex(join.SourceHold,"SCORES_PAGE_MOST_RECENT_FIRST_SOURCE_ORDER_CHANGED"):
            self.qa(changes)

    def test_duplicate_or_out_of_order_table_indexes_hold(self):
        for kind in ("duplicate","wrong"):
            def changes(s,p):
                tables=s["pages"][0]["tables"]
                tables[2]["index"]=tables[1]["index"] if kind=="duplicate" else 99
            with self.assertRaisesRegex(join.SourceHold,"CURRENT_HTO_SCORE_TABLE_INDEX_OR_COUNT_INVALID"):
                self.qa(changes)

    def test_missing_boxscore_link_array_does_not_invent_game_ids(self):
        def changes(s,p):
            del s["pages"][0]["links"]
        with self.assertRaisesRegex(join.SourceHold,"CURRENT_HTO_BOXSCORE_LINKS_MISSING"):
            self.qa(changes)
    def test_extra_or_missing_boxscore_link_held(self):
        for drop in (True,False):
            def changes(s,p):
                a=s["pages"][0]["links"]
                a.pop() if drop else a.append(deepcopy(a[0]))
            with self.assertRaisesRegex(join.SourceHold,"CURRENT_HTO_SCORES_LINK_CARD_COVERAGE_CHANGED"):
                self.qa(changes)

    def test_duplicate_or_unknown_htogame_link_id_held(self):
        for new in (3356178,9998888):
            def changes(s,p):
                a=s["pages"][0]["links"]
                a[0]["url"]=a[0]["url"].replace("3375683",str(new))
            with self.assertRaisesRegex(join.SourceHold,"CURRENT_HTO_BOXSCORE_LINK_SET_MISMATCH"):
                self.qa(changes)

    def test_wrong_host_wrong_team_wrong_boxscore_page_wrong_schema_held(self):
        for original,bad in (("www.htosports.com","other.example"),
                ("u=BRAVESHOCKEY","u=NOTBRAVES"),
                ("p=boxscore","p=scores"),
                ("sportsHQ=BRAVESHOCKEY","sportsHQ=OTHER")):
            def changes(s,p):
                a=s["pages"][0]["links"][0]
                a["url"]=a["url"].replace(original,bad)
            with self.assertRaisesRegex(join.SourceHold,"BOXSCORE_LINK_SOURCE_INVALID"):
                self.qa(changes)

    def test_missing_link_gameid_held(self):
        def changes(s,p):
            a=s["pages"][0]["links"][0]
            a["url"]=a["url"].replace("&gameID=3375683","")
        with self.assertRaisesRegex(join.SourceHold,"BOXSCORE_LINK_SOURCE_INVALID"):
            self.qa(changes)

    def test_current_scorecard_opponent_changed_cannot_join_prior_boxsource(self):
        def changes(s,p):
            s["pages"][0]["tables"][1]["rows"][2][0]="Unverified Opponent"
        with self.assertRaisesRegex(join.SourceHold,"CURRENT_SCORES_LINK_DOES_NOT_MATCH_HISTORICAL_GAME"):
            self.qa(changes)

    def test_current_scorecard_scoring_change_fails_official_team_parity(self):
        def changes(s,p):
            s["pages"][0]["tables"][1]["rows"][1][3]="3"
            s["pages"][0]["tables"][1]["rows"][1][-1]="3"
        with self.assertRaisesRegex(join.SourceHold,"OFFICIAL_TEAM_SCORE_TOTALS_MISMATCH"):
            self.qa(changes)

    def test_unlisted_scorecard_and_covered_count_increase_held(self):
        def changes(s,p):
            s["pages"][0]["tables"].append(deepcopy(s["pages"][0]["tables"][1]))
        with self.assertRaisesRegex(join.SourceHold,"GAME_COUNT_AND_SCORECARDS_MISMATCH"):
            self.qa(changes)

    def test_previous_boxscore_id_url_fingerprint_change_is_not_accepted(self):
        for field in ("sourceUrl","officialSourceGamePageSHA256"):
            def changes(s,p):
                a=p["sourceScoreEvidence"]["games"][0]
                a[field]="https://bad.example/anything" if field=="sourceUrl" else "INVALID"
            reason="BOXSCORE_LINK_SOURCE_INVALID" if field=="sourceUrl" else "ARCHIVED_BOXSCORE_PAGE_FINGERPRINT_UNQUALIFIED"
            with self.assertRaisesRegex(join.SourceHold,reason):
                self.qa(changes)

    def test_previous_master_slot_date_and_opponent_mismatch_is_held(self):
        for field,value in (("masterGameNumber",355),("date","2026-10-12"),
                            ("opponentExact","Wrong Opponent"),("gf",9),("sourceWorkbookRow",9)):
            def changes(s,p):
                p["exactDateAndGameNumberMapping"][0][field]=value
            with self.assertRaises(join.SourceHold):
                self.qa(changes)

    def test_previous_original_workbook_source_sha_mismatch_held(self):
        def changes(s,p):p["authoritativeOriginalWorkbookSHA256"]="0"*64
        with self.assertRaisesRegex(join.SourceHold,"PREVIOUS_PRIVATE_SIXGAME_CALENDAR_PROOF_NOT_QUALIFIED"):
            self.qa(changes)

    def test_duplicate_previous_htogame_id_held(self):
        def changes(s,p):
            p["sourceScoreEvidence"]["games"][1]["htoGameId"]=p["sourceScoreEvidence"]["games"][0]["htoGameId"]
        with self.assertRaisesRegex(join.SourceHold,"ARCHIVED_GAME_ID_NOT_UNIQUE_OR_INCOMPLETE"):
            self.qa(changes)

    def test_previous_sixth_game_must_match_verified_saved_date(self):
        def changes(s,p):
            p["sixthGameProved"]["date"]="2026-11-02"
        with self.assertRaisesRegex(join.SourceHold,"SIXTH_ORIGINAL_HTO_GAME_SOURCE_NOT_PROVEN"):
            self.qa(changes)

    def test_previous_awards_status_cannot_be_secretly_promoted(self):
        for field in ("modelledCurrentAwardScores","currentAwardEligibilityApproved",
                      "sourceCorrectionDecisionsApproved"):
            def changes(s,p):p[field]=True
            with self.assertRaisesRegex(join.SourceHold,"PREVIOUS_PRIVATE_SIXGAME_CALENDAR_PROOF_NOT_QUALIFIED"):
                self.qa(changes)

    def test_sixgame_prior_independent_source_review_must_have_valid_hashes(self):
        def changes(s,p):
            p["sourceScoreEvidence"]["originalSixBoxscoreReadbackSHA256"]="tampered"
        with self.assertRaisesRegex(join.SourceHold,"ARCHIVED_HTO_BOXSCORE_SOURCE_PROOF_NOT_VERIFIED"):
            self.qa(changes)

    def test_future_or_expired_saved_readback_never_joins(self):
        for when in (datetime(2026,12,1,tzinfo=timezone.utc),
                     datetime(2026,11,7,tzinfo=timezone.utc)):
            with self.assertRaisesRegex(join.SourceHold,"SAVED_READBACK_EXPIRED_OR_FROM_FUTURE"):
                self.qa(now=when)

    def test_incomplete_prior_game_coverage_blocks_source_admission(self):
        def changes(s,p):
            p["sourceScoreEvidence"]["games"].pop()
        with self.assertRaisesRegex(join.SourceHold,"SOURCE_GAME_AND_MASTER_MAPPING_LENGTH_CHANGED"):
            self.qa(changes)

    def test_private_proof_identity_and_source_must_match_exact_expected_hashes(self):
        self.assertEqual(len(join.PINNED_PRIOR_PROOF_SHA),64)
        self.assertEqual(len(join.PINNED_SAVED_READBACK_SHA),64)
        self.assertEqual(join.SCHEMA,"hockeyos-previously-qualified-sixgame-link-join-review/v1")

    def test_cli_bad_proof_hash_fails_closed_without_rewriting_inputs(self):
        s,p=fake()
        with tempfile.TemporaryDirectory(prefix="hockeyos_join_qa_") as td:
            a=Path(td)/"current.json"
            b=Path(td)/"archive.json"
            a.write_text(json.dumps(s),encoding="utf8")
            b.write_text(json.dumps(p),encoding="utf8")
            before=(hashlib.sha256(a.read_bytes()).hexdigest(),hashlib.sha256(b.read_bytes()).hexdigest())
            output=io.StringIO()
            with contextlib.redirect_stdout(output):
                rc=join.run(["--current-saved",str(a),"--prior-private-proof",str(b),"--strict"])
            self.assertEqual(rc,2)
            x=json.loads(output.getvalue())
            self.assertEqual(x["status"],"HOLD")
            self.assertEqual(x["reason"],"PINNED_PRIVATE_SOURCE_HASHES_NOT_MATCHED")
            self.assertFalse(x["releaseAuthorized"])
            self.assertEqual(before,(hashlib.sha256(a.read_bytes()).hexdigest(),
                                      hashlib.sha256(b.read_bytes()).hexdigest()))
            self.assertEqual({x.name for x in Path(td).iterdir()},{"current.json","archive.json"})

if __name__=="__main__":
    unittest.main(verbosity=2)
