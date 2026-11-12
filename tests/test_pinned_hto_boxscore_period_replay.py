"""Pure synthetic QA for pinned old-boxscore-versus-current-Scores period replay.

Does not load private sources, fetch the HTO web site, or publish stats.
"""
from __future__ import annotations
from copy import deepcopy
from datetime import datetime,timezone
from pathlib import Path
import contextlib,hashlib,io,json,sys,tempfile,unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
sys.path.insert(0,str(ROOT/"tests"))
import audit_pinned_hto_boxscore_period_replay as replay
import audit_saved_hto_sixgame_identity_join as joined
import test_saved_hto_sixgame_identity_join as identity

NOW=datetime(2026,11,8,4,0,tzinfo=timezone.utc)


def fake():
    scores,proof=identity.fake()
    score_table=scores["pages"][0]["tables"]
    source_by_id={x["htoGameId"]:x for x in proof["sourceScoreEvidence"]["games"]}
    priorboxes=[]
    review=[]
    for link,table in zip(scores["pages"][0]["links"],score_table[1:]):
        gid=joined.boxid(link["url"])
        source=source_by_id[gid]
        rows=table["rows"]
        lines=["SCORE BOARD","REGULAR SEASON","\t".join(rows[0][1:])]
        for team in rows[1:]:
            lines.extend((team[0],"\t".join(team[1:])))
        priorboxes.append({"url":source["sourceUrl"],"heading":"\n".join(lines),
                           "tables":[],"schedule":{"text":"Box Score"}})
        review.append({"htoGameId":gid,"sourceUrl":source["sourceUrl"],
                       "sourceHtmlSHA256":source["officialSourceGamePageSHA256"]})
    return scores,proof,{"sourceAuthority":"PUBLIC_HTO_HTTP_READBACK",
        "capturedAt":proof["sourceScoreEvidence"]["capturedAt"],
        "games":priorboxes},{"state":"VERIFIED_COMPLETE_PLAYER_APPEARANCES",
        "pinnedBaselineMatchesLiveOfficial":True,
        "sixGameSourceTotals":{"GP":6,"GF":14,"GA":30,"players":22},
        "appearanceCertification":{"status":"VERIFIED_COMPLETE_PLAYER_APPEARANCES",
                                   "verifiedSkaterAppearances":80},
        "gameHtmlSources":review}


class PinnedNativeReplayQA(unittest.TestCase):
    def run_case(self,mutate=None,now=NOW):
        parts=deepcopy(fake())
        if mutate:mutate(*parts)
        return replay.replay(*parts,now=now)

    def test_all_six_periods_replay_with_original_master_game_id_join(self):
        r=self.run_case()
        self.assertEqual(r["status"],"PRIVATE_PINNED_SIX_GAME_TWO_SOURCE_PERIOD_REPLAY_PASS")
        self.assertEqual(len(r["periodMatches"]),6)
        self.assertEqual(r["teamTotals"],{"gp":6,"gf":14,"ga":30})
        self.assertEqual([x["originalMasterGameNumber"] for x in r["periodMatches"]],list(range(364,358,-1)))

    def test_five_column_big_bastones_is_original_game_363(self):
        r=self.run_case()
        x=next(x for x in r["periodMatches"] if x["scorePageColumns"]==5)
        self.assertEqual((x["htoGameId"],x["originalMasterGameNumber"],
                          x["opponent"],x["boxscoreColumns"]), (3375682,363,"Big Bastones",5))

    def test_other_five_boxscores_have_seven_columns(self):
        r=self.run_case()
        self.assertEqual(r["scorePageFiveColumnGames"],1)
        self.assertEqual(r["boxscoreFiveColumnGames"],1)
        self.assertEqual(sum(x["boxscoreColumns"]==7 for x in r["periodMatches"]),5)

    def test_real_source_state_is_source_only_not_current_certification(self):
        x=self.run_case()
        for k in ("newLiveBoxscoreFetchPerformed","individualPlayerRowsRevalidatedNow",
                  "publishedAwardsRecalculated","operationalCollectorModified",
                  "originalWorkbookWritten","officialHTODataWritten","releaseAuthorized"):
            self.assertIs(x[k],False,k)
        self.assertEqual(x["priorReviewedSkaterAppearances"],80)

    def test_source_game_order_does_not_depend_on_raw_archive_array_order(self):
        def edit(s,p,boxes,review):
            boxes["games"].reverse()
            review["gameHtmlSources"].reverse()
        self.assertEqual(len(self.run_case(edit)["periodMatches"]),6)

    def test_source_period_change_on_boxscore_is_held_even_if_final_stays_same(self):
        def edit(s,p,boxes,review):
            b=next(x for x in boxes["games"] if joined.boxid(x["url"])==3375683)
            b["heading"]=b["heading"].replace("0\t0\t2\t0\t0\t2","1\t0\t1\t0\t0\t2")
        with self.assertRaisesRegex(joined.SourceHold,"PINNED_BOX_VS_SCORES_PERIOD_MISMATCH"):
            self.run_case(edit)

    def test_saved_scorecard_period_change_is_held_against_original_box(self):
        def edit(s,p,boxes,review):
            braves=next(t for t in s["pages"][0]["tables"] if t.get("index")==2)["rows"][2]
            braves[1]="1";braves[3]="1"
        with self.assertRaises(joined.SourceHold):
            self.run_case(edit)

    def test_gameid_swapped_between_boxscore_pages_is_held(self):
        def edit(s,p,boxes,review):
            a=boxes["games"]
            a[0]["url"],a[1]["url"]=a[1]["url"],a[0]["url"]
        with self.assertRaisesRegex(joined.SourceHold,"PINNED_BOX_VS_SCORES_PERIOD_MISMATCH"):
            self.run_case(edit)

    def test_boxscore_duplicate_id_or_missing_game_is_held(self):
        for kind in ("duplicate","missing"):
            def edit(s,p,boxes,review):
                if kind=="duplicate":boxes["games"].append(deepcopy(boxes["games"][0]))
                else:boxes["games"].pop()
            with self.assertRaises(joined.SourceHold):
                self.run_case(edit)

    def test_unverified_review_fails_closed(self):
        for key,value in (("state","PROVISIONAL"),("pinnedBaselineMatchesLiveOfficial",False)):
            def edit(s,p,boxes,review):review[key]=value
            with self.assertRaisesRegex(joined.SourceHold,"PREVIOUS_INDEPENDENT_BOXSCORE_REVIEW_NOT_QUALIFIED"):
                self.run_case(edit)

    def test_verified_skater_count_cannot_be_dropped_or_invented(self):
        for count in (79,81,None):
            def edit(s,p,boxes,review):
                review["appearanceCertification"]["verifiedSkaterAppearances"]=count
            with self.assertRaisesRegex(joined.SourceHold,"PREVIOUS_INDEPENDENT_BOXSCORE_REVIEW_NOT_QUALIFIED"):
                self.run_case(edit)

    def test_original_review_source_sha_mismatch_is_held(self):
        def edit(s,p,boxes,review):
            review["gameHtmlSources"][0]["sourceHtmlSHA256"]="0"*64
        with self.assertRaisesRegex(joined.SourceHold,"PREVIOUS_BOX_SOURCE_HASH_OR_URL_NOT_SAME_GAME"):
            self.run_case(edit)

    def test_missing_or_duplicate_historical_review_id_is_held(self):
        for kind in ("duplicate","missing"):
            def edit(s,p,boxes,review):
                if kind=="duplicate":
                    review["gameHtmlSources"][1]["htoGameId"]=review["gameHtmlSources"][0]["htoGameId"]
                else:review["gameHtmlSources"].pop()
            with self.assertRaises(joined.SourceHold):
                self.run_case(edit)

    def test_wrong_boxscore_heading_title_or_regulation_header_fails(self):
        for old,bad in (("SCORE BOARD","UNVERIFIED BOARD"),("REGULAR SEASON","PLAYOFFS")):
            def edit(s,p,boxes,review):
                b=boxes["games"][0]
                b["heading"]=b["heading"].replace(old,bad)
            with self.assertRaisesRegex(joined.SourceHold,"BOXSCORE_HEADING_STRUCTURE_CHANGED"):
                self.run_case(edit)

    def test_bad_period_header_and_unknown_width_hold(self):
        for old,new in (("1\t2\t3\tOT\t2OT\tF","1\t2\t4\tOT\t2OT\tF"),
                        ("1\t2\t3\tOT\t2OT\tF","1\t2\t3\tOT\tF")):
            def edit(s,p,boxes,review):
                boxes["games"][0]["heading"]=boxes["games"][0]["heading"].replace(old,new)
            with self.assertRaises(joined.SourceHold):
                self.run_case(edit)

    def test_change_boxscore_opponent_name_is_detected(self):
        def edit(s,p,boxes,review):
            boxes["games"][0]["heading"]=boxes["games"][0]["heading"].replace("Mid Ice Crisis","Fake Team")
        with self.assertRaisesRegex(joined.SourceHold,"PINNED_BOX_VS_SCORES_PERIOD_MISMATCH"):
            self.run_case(edit)

    def test_boxscore_source_capture_timestamp_cannot_be_reshaped(self):
        def edit(s,p,boxes,review):
            boxes["capturedAt"]="2026-11-04T00:00:00Z"
        with self.assertRaisesRegex(joined.SourceHold,"PREVIOUS_BOX_READBACK_SCOPE_CHANGED"):
            self.run_case(edit)

    def test_previous_official_team_totals_must_not_change(self):
        def edit(s,p,boxes,review):
            review["sixGameSourceTotals"]["GF"]=13
        with self.assertRaisesRegex(joined.SourceHold,"PREVIOUS_INDEPENDENT_BOXSCORE_REVIEW_NOT_QUALIFIED"):
            self.run_case(edit)

    def test_boxscore_heading_unknown_empty_or_invalid_rows_hold(self):
        for text in ("",None,"SCORE BOARD\nREGULAR SEASON\n1 2 3 F",
                     "SCORE BOARD\nREGULAR SEASON\n1 2 3 F\nTeam\n1 2 3 4\nMore\n0 0 0 0\nExtra"):
            with self.assertRaises(joined.SourceHold):
                replay.heading_to_rows(text)

    def test_no_mutation_to_previous_or_current_source_documents(self):
        saved,prior,boxes,review=fake()
        before=deepcopy((saved,prior,boxes,review))
        replay.replay(saved,prior,boxes,review,now=NOW)
        self.assertEqual((saved,prior,boxes,review),before)

    def test_missing_source_cli_fails_closed_with_no_output_file(self):
        with tempfile.TemporaryDirectory(prefix="hockeyos_native_") as temp:
            missing=Path(temp)/"missing.json"
            out=io.StringIO()
            with contextlib.redirect_stdout(out):
                rc=replay.run(["--saved-scores",str(missing),
                    "--previously-verified-date-proof",str(missing),
                    "--previously-verified-boxes",str(missing),
                    "--previously-verified-review",str(missing),"--strict"])
            self.assertEqual(rc,2)
            x=json.loads(out.getvalue())
            self.assertEqual(x["status"],"HOLD")
            self.assertFalse(x["releaseAuthorized"])
            self.assertFalse(missing.exists())

if __name__=="__main__":
    unittest.main(verbosity=2)
