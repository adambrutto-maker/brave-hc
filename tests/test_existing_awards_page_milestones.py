"""Awards-page embedded milestone source and preservation tests; standard library only."""
from pathlib import Path
import collections
import json
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
W = ROOT / "widgets"

def parsed_published_milestones():
    records = json.loads((W / "history-records.json").read_text(encoding="utf-8"))
    official = []
    for group in records["groups"]:
        if not re.search(r"\b(Game|Point|Win) Club$", group["category"]):
            continue
        for line in group["items"]:
            match = re.search(r"[-–]\s*(.*?)\s*\((.*?)\)\s*$", line.replace("\xa0", " "))
            if not match:
                raise ValueError("Unparseable official Records milestone: " + line)
            official.append((match[1].strip(), group["category"].strip(), match[2].strip()))
    return records, official

def approved_profile_milestones():
    ledger = json.loads((W / "player-highlights-ledger.json").read_text(encoding="utf-8"))
    corrections = json.loads((W / "player-highlights-display-corrections.json").read_text(encoding="utf-8"))
    assert ledger["schema"] == "brave-hc-player-highlights/v1"
    assert corrections["status"] == "MANAGER_APPROVED_DISPLAY_CORRECTIONS"
    approved = {(c["playerID"], c["itemID"]): c for c in corrections["corrections"]}
    assert len(approved) == len(corrections["corrections"])
    used = set()
    output = []
    for pid, player in ledger["players"].items():
        for item in player["items"]:
            if item["category"] != "milestone":
                continue
            entry = item["displayText"]
            key = (pid, item["id"])
            if key in approved:
                c = approved[key]
                assert c["playerName"] == player["name"]
                assert c["sourceText"] == item["sourceText"]
                assert c["expectedDisplayText"] == item["displayText"]
                entry = c["displayText"]
                used.add(key)
            entry = entry.replace("\ufffd", " ").replace("\xa0", " ")
            match = re.fullmatch(r"(\d+\s+(?:Game|Point|Win)\s+Club)\s*[-–]\s*(.+)", entry.strip())
            if not match:
                raise ValueError("Unparseable approved milestone: " + entry)
            output.append((player["name"], match[1], match[2].strip()))
    assert used == set(approved)
    return corrections,output

def canon(row):
    return tuple(re.sub(r"\s+", " ",part).strip().casefold() for part in row)

class ExistingAwardsMilestonesTests(unittest.TestCase):
    def test_only_existing_hto_page_assets_added(self):
        js = (W / "awards-milestones.js").read_text(encoding="utf-8")
        css = (W / "awards-milestones.css").read_text(encoding="utf-8")
        self.assertIn("brave-hc-awards-milestones", js)
        self.assertIn("params.get('p') !== 'awards'", js)
        self.assertIn("player-highlights-ledger.json", js)
        self.assertIn("player-highlights-display-corrections.json", js)
        self.assertIn("3*60*1000", js)
        self.assertIn("bhma-section", css)
        self.assertNotIn("window.location=",js)

    def test_published_awards_unchanged(self):
        native = json.loads((W / "history-awards.json").read_text(encoding="utf-8"))
        self.assertGreaterEqual(native["entryCount"],146)
        self.assertGreaterEqual(len(native["groups"]),20)

    def test_verified_badges_dates_and_historical_record_parity(self):
        records,original = parsed_published_milestones()
        corrections,visible = approved_profile_milestones()
        self.assertGreaterEqual(records["entryCount"],460)
        self.assertGreaterEqual(len(visible),97)
        self.assertEqual(len(corrections["corrections"]),4)
        # Both pre-migration (98 source clubs) and post-migration (zero Records clubs)
        # are valid. Never accept a partial removal of a club category.
        if original:
            self.assertEqual(len(original),98)
            diff = collections.Counter(map(canon,original))-collections.Counter(map(canon,visible))
            self.assertEqual(list(diff.elements()),[canon(("Daniel Buzzelli","50 Game Club","September 23, 2018"))])
            self.assertEqual(sum((collections.Counter(map(canon,original)) & collections.Counter(map(canon,visible))).values()),97)

    def test_all_existing_badges_have_authorized_art(self):
        _, milestone_rows = approved_profile_milestones()
        for _,club,_ in milestone_rows:
            match=re.match(r"(\d+) (Game|Point|Win) Club",club)
            self.assertIsNotNone(match)
            count=int(match[1]);metric={"Game":"games","Point":"points","Win":"wins"}[match[2]]
            tier="bronze" if count < 100 else "silver" if count < 200 else "gold" if count < 300 else "platinum"
            self.assertTrue((W/"assets"/"round-clubs"/f"{count}_{metric}_{tier}_200.webp").is_file(),club)

if __name__=="__main__":
    unittest.main(verbosity=2)
