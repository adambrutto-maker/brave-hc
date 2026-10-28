"""2023/24 HTO Bulletin milestone claims vs corrected native Records snapshot.

Eight source-derived claims from native HTO Bulletin dated 2024-04-14.
This proves agreement with published record book, not independently complete
historical appearances or whether a milestone occurred *during* that season.
"""
import json
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
CLAIMS=[
    ("200 Game Club","Career","Mario Provenzano","March 24, 2024"),
    ("50 Point Club","Career","Stephane Saindon","March 10, 2024"),
    ("Winter - Game Winning Goals","Season","Stephane Saindon","2023/24"),
    ("200 Point Club","Career","Keith Pearsoll","February 19, 2023"),
    ("50 Game Club","Career","Andrew Cristillo","December 10, 2023"),
    ("50 Game Club","Career","Mark Arruda","March 10, 2024"),
    ("300 Point Club","Career","Justin Carosi","January 14, 2024"),
    ("200 Game Club","Career","Stefano Ardizzi","February 4, 2024"),
]


class BulletinMilestoneReconciliation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        data=json.loads((ROOT/"widgets/history-records-legacy-558.json").read_text(encoding="utf-8"))
        assert data["entryCount"]==sum(len(x["items"]) for x in data["groups"])
        cls.groups={(x["category"],x["period"]):x["items"] for x in data["groups"]}

    def test_eight_claims_match_exact_dates_in_native_record_snapshot(self):
        self.assertEqual(len(CLAIMS),8)
        for category,period,name,date in CLAIMS:
            with self.subTest(category=category,name=name,date=date):
                exact=[item for item in self.groups.get((category,period),[])
                       if name in item and item.endswith("("+date+")")]
                self.assertEqual(len(exact),1,(category,period,name,date))

    def test_prior_year_milestone_remains_flagged_in_editorial_review(self):
        # Do NOT revise the 2023 entry to 2024 merely because it appeared
        # in an April 2024 post describing 2023/24 achievements.
        self.assertIn(("200 Point Club","Career","Keith Pearsoll","February 19, 2023"),CLAIMS)


if __name__=="__main__":unittest.main()
