"""Synthetic no-network tests: never confuse a green HockeyOS task with full release."""
import copy
from datetime import datetime, timezone, timedelta
import json
from pathlib import Path
import sys
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from audit_hockeyos_plan03_release_health import classify, EvidenceHold, STAGES, AUDITED_FIVE

ROOT=Path(__file__).resolve().parents[1]
NOW=datetime(2026, 10, 26, 16, 40, tzinfo=timezone.utc)


def source():
    watch=json.loads((ROOT/"widgets/watch.json").read_text(encoding="utf-8"))
    records=json.loads((ROOT/"widgets/history-records.json").read_text(encoding="utf-8"))
    stages={name:{"outcome":"PASS","returnCode":0,"stdoutTail":""} for name in STAGES}
    stages["projections"]["stdoutTail"]="HTO_MODEL_RECONCILIATION_PENDING"
    stages["record_watch"]["stdoutTail"]="WATCH_UNCHANGED"
    report={
        "started":"2026-10-26T16:31:00+00:00",
        "finished":"2026-10-26T16:31:30+00:00",
        "allStagesSuccessful":True,
        "stages":stages
    }
    games=[{"htoGameId":gid,"date":row[0],"teamGoals":row[1],
             "teamGoalsAgainst":row[2],"workbookGameNumber":row[3]}
           for gid,row in AUDITED_FIVE.items()]
    feed={
        "schema":"brave-hc-hto-verified-game-feed/v1",
        "allGamesDiscovered":True,"playerAggregateParity":True,
        "sourceReadback":"2026-10-26T16:31:15+00:00",
        "teamGP":5,"teamG":12,
        "sourceValidationState":"PASS_COMPLETE_FIELDS_WITH_EXPLICIT_UNKNOWNS",
        "games":games
    }
    return report,feed,watch,records


class Plan03HealthGateTests(unittest.TestCase):
    def test_eight_green_stages_do_not_imply_current_workbook(self):
        r=classify(*source(),now=NOW)
        self.assertEqual(r["processing"],"PASS")
        self.assertEqual(r["status"],"PROCESSING_PASS_RELEASE_HELD")
        self.assertEqual(r["workbookRelease"],"HOLD_STALE_WORKBOOK_FINALS")
        self.assertEqual(r["projectionRelease"],"HOLD_MODEL_RECONCILIATION_PENDING")
        self.assertEqual(r["watchPublisher"],"UNCHANGED_SNAPSHOT")
        self.assertFalse(r["fullLiveRecordWatchAuthorized"])
        self.assertEqual(r["verifiedExistingMilestoneCount"],2)
        self.assertEqual(r["unreachedCountdownArithmeticChecks"],2)
        self.assertEqual(r["officialScores"],{"GF":12,"GA":23})

    def test_failed_child_stage_is_reported_degraded(self):
        report,feed,watch,records=source()
        report["stages"]["standings"]["outcome"]="FAILED"
        report["stages"]["standings"]["returnCode"]=2
        report["allStagesSuccessful"]=False
        r=classify(report,feed,watch,records,now=NOW)
        self.assertEqual(r["processing"],"DEGRADED")
        self.assertEqual(r["status"],"PROCESSING_DEGRADED_RELEASE_HELD")

    def test_inconsistent_task_green_summary_is_rejected(self):
        report,feed,watch,records=source()
        report["stages"]["record_watch"]["outcome"]="FAILED"
        with self.assertRaisesRegex(EvidenceHold,"SCHEDULED_TASK_SUMMARY_CONFLICT"):
            classify(report,feed,watch,records,now=NOW)

    def test_missing_stage_is_rejected(self):
        report,feed,watch,records=source()
        report["stages"].pop("record_watch")
        with self.assertRaisesRegex(EvidenceHold,"UNEXPECTED_TASK_STAGE_SET"):
            classify(report,feed,watch,records,now=NOW)

    def test_stale_cycle_is_rejected(self):
        with self.assertRaisesRegex(EvidenceHold,"SCHEDULED_TASK_RECEIPT_STALE_OR_FUTURE"):
            classify(*source(),now=NOW+timedelta(hours=4))

    def test_future_source_time_is_rejected(self):
        report,feed,watch,records=source()
        feed["sourceReadback"]="2026-10-26T16:50:00+00:00"
        with self.assertRaisesRegex(EvidenceHold,"TASK_HTO_OBSERVATION_SEQUENCE_INVALID"):
            classify(report,feed,watch,records,now=NOW)

    def test_unverified_sixth_game_cannot_bypass_source_admission(self):
        report,feed,watch,records=source()
        feed["games"].append(dict(htoGameId=3375683,workbookGameNumber=364,date="2026-11-01",teamGoals=1,teamGoalsAgainst=1))
        feed["teamGP"]=6
        feed["sourceValidationState"]="NOT_YET_VERIFIED"
        with self.assertRaisesRegex(EvidenceHold,"HTO_FEED_SOURCE_VALIDATION_NOT_ACCEPTED"):
            classify(report,feed,watch,records,now=NOW)

    def test_score_mutation_hold(self):
        report,feed,watch,records=source()
        feed["games"][0]["teamGoalsAgainst"]=0
        with self.assertRaisesRegex(EvidenceHold,"HTO_GAME_SOURCE_MAPPING_OR_SCORE_DRIFT"):
            classify(report,feed,watch,records,now=NOW)

    def test_fake_live_watch_status_hold(self):
        report,feed,watch,records=source()
        watch["dataStatus"]="VERIFIED_CURRENT"
        with self.assertRaisesRegex(EvidenceHold,"WATCH_HISTORICAL_RELEASE_CONTRACT_CHANGED"):
            classify(report,feed,watch,records,now=NOW)

    def test_false_workbook_parity_cannot_upgrade_release(self):
        report,feed,watch,records=source()
        watch["workbookScoreParity"]=True
        with self.assertRaisesRegex(EvidenceHold,"WATCH_HISTORICAL_RELEASE_CONTRACT_CHANGED"):
            classify(report,feed,watch,records,now=NOW)

    def test_unknown_native_record_change_requires_review(self):
        report,feed,watch,records=source()
        records["entryCount"]=559
        with self.assertRaisesRegex(EvidenceHold,"HISTORICAL_RECORD_AUTHORITY_OR_BASELINE_CHANGED"):
            classify(report,feed,watch,records,now=NOW)

    def test_changed_milestone_date_requires_review(self):
        report,feed,watch,records=source()
        next(x for x in watch["records"] if x["type"]=="reached")["eventDate"]="2026-09-21"
        with self.assertRaisesRegex(EvidenceHold,"UNVERIFIED_OR_DUPLICATE_MILESTONE"):
            classify(report,feed,watch,records,now=NOW)

    def test_missing_native_milestone_rejected(self):
        report,feed,watch,records=source()
        group=next(g for g in records["groups"] if g["category"]=="300 Game Club")
        group["items"]=[s for s in group["items"] if "Justin Carosi" not in s]
        records["entryCount"]-=1
        with self.assertRaisesRegex(EvidenceHold,"HISTORICAL_RECORD_AUTHORITY_OR_BASELINE_CHANGED"):
            classify(report,feed,watch,records,now=NOW)

    def test_watch_later_than_task_is_invalid(self):
        report,feed,watch,records=source()
        watch["exportedAt"]="2026-10-26T18:00:00+00:00"
        with self.assertRaisesRegex(EvidenceHold,"WATCH_EXPORT_NEWER_THAN_TASK"):
            classify(report,feed,watch,records,now=NOW)

    def test_unreached_countdown_cannot_be_false_milestone(self):
        report,feed,watch,records=source()
        event=next(x for x in watch["records"] if x["type"]=="countdown")
        event["type"]="reached"
        event["eventDate"]="2026-10-25"
        with self.assertRaisesRegex(EvidenceHold,"UNVERIFIED_OR_DUPLICATE_MILESTONE"):
            classify(report,feed,watch,records,now=NOW)

    def test_countdown_arithmetic_source_mismatch_hold(self):
        report,feed,watch,records=source()
        event=next(x for x in watch["records"] if x["type"]=="countdown")
        event["remaining"]+=1
        with self.assertRaisesRegex(EvidenceHold,"INVALID_OR_DUPLICATE_COUNTDOWN"):
            classify(report,feed,watch,records,now=NOW)

    def test_first_five_official_game_results_immutable(self):
        report,feed,watch,records=source()
        row=next(x for x in feed["games"] if x["htoGameId"]==3375682)
        row["teamGoals"]=7
        feed["teamG"]=13
        with self.assertRaisesRegex(EvidenceHold,"HTO_GAME_SOURCE_MAPPING_OR_SCORE_DRIFT"):
            classify(report,feed,watch,records,now=NOW)

    def test_publisher_not_claimed_from_standings_stage(self):
        r=classify(*source(),now=NOW)
        self.assertEqual(r["websitePublication"],"NOT_VERIFIED_BY_SCHEDULED_TASK")
        self.assertEqual(r["nextGameAdmission"],"HTO_3375682_SOURCE_VERIFIED")
        self.assertTrue(r["nextFutureGameStillRequiresOfficialSource"])
        self.assertFalse(r["newHistoricalRecordsPublished"])
        self.assertFalse(r["originalWorkbookModified"])


if __name__ == "__main__":
    unittest.main()
