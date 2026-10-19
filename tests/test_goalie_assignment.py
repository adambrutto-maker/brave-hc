import importlib.util
import unittest
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "scripts" / "set_goalie.py"
spec = importlib.util.spec_from_file_location("set_goalie", path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

NOW = datetime(2026, 10, 19, 20, 0, tzinfo=timezone.utc)
FEED = {"schema": "brave-hc-svhl-schedule/v1", "checkedAt": NOW.isoformat(),
        "games": [{"date": "2026-10-25", "opponent": "Big Bastones",
                   "assignmentKey": "hto:3375682", "requiresGoalieReconfirmation": False}]}
DATA = {"schema": "brave-hc-goalie-assignments/v1",
        "assignments": {"hto:3375682": "Stephen Logue"}}


class GoalieUpdateTests(unittest.TestCase):
    def test_stable_assignment_no_rewrite(self):
        result, changed = module.update_assignment(deepcopy(FEED), deepcopy(DATA),
                                                    "hto:3375682", "Stephen Logue", "manager", NOW)
        self.assertFalse(changed)
        self.assertNotIn("lastChange", result)

    def test_valid_change_with_audit(self):
        result, changed = module.update_assignment(deepcopy(FEED), deepcopy(DATA),
                                                    "hto:3375682", "Dev Leong", "adambrutto-maker", NOW)
        self.assertTrue(changed)
        self.assertEqual(result["assignments"]["hto:3375682"], "Dev Leong")
        self.assertEqual(result["lastChange"]["previous"], "Stephen Logue")

    def test_unknown_key_denied(self):
        with self.assertRaises(ValueError):
            module.update_assignment(deepcopy(FEED), deepcopy(DATA),
                                     "hto:9999999", "Dev Leong", "manager", NOW)

    def test_stale_feed_denied(self):
        bad = deepcopy(FEED)
        bad["checkedAt"] = (NOW-timedelta(days=4)).isoformat()
        with self.assertRaises(ValueError):
            module.update_assignment(bad, deepcopy(DATA),
                                     "hto:3375682", "Dev Leong", "manager", NOW)

    def test_duplicate_key_denied(self):
        bad = deepcopy(FEED)
        bad["games"].append(deepcopy(bad["games"][0]))
        with self.assertRaises(ValueError):
            module.update_assignment(bad, deepcopy(DATA),
                                     "hto:3375682", "Dev Leong", "manager", NOW)

    def test_custom_goalie_requires_name(self):
        with self.assertRaises(ValueError):
            module.safe_goalie("Other / rental", "")
        self.assertEqual(module.safe_goalie("Other / rental", "Alex  McExample"), "Alex McExample")
        with self.assertRaises(ValueError):
            module.safe_goalie("Dev Leong", "Injected")

    def test_reconfirmation_marker(self):
        feed = deepcopy(FEED)
        feed["games"][0]["requiresGoalieReconfirmation"] = True
        result, changed = module.update_assignment(feed, deepcopy(DATA),
                                                    "hto:3375682", "Adam Carlyle", "manager", NOW)
        self.assertTrue(changed)
        self.assertIn("reconfirmation", result["lastChange"]["reason"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
