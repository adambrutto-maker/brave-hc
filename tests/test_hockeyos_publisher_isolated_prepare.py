"""Local-only unit tests for nonpublishing publisher review preparation."""
from __future__ import annotations
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "hockeyos_publisher_prepare_isolated_review.py"
SPEC = importlib.util.spec_from_file_location("hockeyos_publisher_prepare_isolated_review", SCRIPT)
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


class PreparationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.a = Path(self.tmp.name) / "hosted"
        self.b = Path(self.tmp.name) / "publisher"
        for base in (self.a, self.b):
            (base / "widgets").mkdir(parents=True)

    def write(self, folder, name, payload):
        (folder / "widgets" / (name + ".json")).write_text(json.dumps(payload), encoding="utf8")

    def test_timestamp_only_countdown_does_not_become_material_change(self):
        base = {"schema": "brave-hc-upcoming-countdown/v1",
                "games": [{"id": 3375682, "gameDate": "2026-10-25"}]}
        self.write(self.a, "countdown", {**base, "generatedAt": "2026-10-19T04:12:47Z"})
        self.write(self.b, "countdown", {**base, "generatedAt": "2026-10-20T04:31:13Z"})
        self.write(self.a, "projection", {"modelCurrent": False, "publicationStatus": "HTO_MODEL_RECONCILIATION_PENDING"})
        self.write(self.b, "projection", {"modelCurrent": False, "publicationStatus": "HTO_MODEL_RECONCILIATION_PENDING",
                                           "sourceInputs": {"htoRecordedTeamGP": 4, "verifiedHTOBoxscoreGP": 4}})
        self.write(self.a, "standings", {"braveGP": 3})
        self.write(self.b, "standings", {"braveGP": 4, "capturedAt": "2026-10-20T00:31:20Z"})
        outcome = mod.inspect_data(self.a, self.b)
        self.assertEqual(outcome["countdown"]["decision"], "NO_MATERIAL_UPDATE")
        self.assertEqual(outcome["projection"]["decision"], "HOLD_MODEL_RECONCILIATION")
        self.assertEqual(outcome["standings"]["decision"], "HOLD_SOURCE_FRESHNESS_AND_LEAGUE_PARITY")
        self.assertFalse(all(v["releasePermission"] for v in outcome.values()))

    def test_schedule_change_not_suppressed_as_timestamp(self):
        first = {"schema": "brave-hc-upcoming-countdown/v1",
                 "games": [{"id": 100}], "generatedAt": "2026-10-20T01:00:00Z"}
        other = {"**": "no"}
        self.write(self.a, "countdown", first)
        self.write(self.b, "countdown", {**first, "games": [{"id": 101}]})
        self.assertNotEqual(mod.signature_countdown(first),
                            mod.signature_countdown(json.loads((self.b / "widgets" / "countdown.json").read_text())))

    def test_missing_or_unknown_schema_never_approved(self):
        with self.assertRaises(mod.Hold):
            mod.signature_countdown({"schema": "unverified", "games": []})

    def test_missing_backup_or_existing_destination_holds_without_cloning(self):
        from argparse import Namespace
        old = self.a
        (old / ".git").mkdir()
        bundle = Path(self.tmp.name) / "missing.bundle"
        candidate = Path(self.tmp.name) / "candidate"
        report = Path(self.tmp.name) / "receipt.json"
        args = Namespace(old_repo=str(old), bundle=str(bundle), candidate=str(candidate),
                         expected_local="a"*40, expected_remote="b"*40, report=str(report))
        with self.assertRaisesRegex(mod.Hold, "bundle absent"):
            mod.prepare(args)
        self.assertFalse(candidate.exists())


if __name__ == "__main__":
    unittest.main()
