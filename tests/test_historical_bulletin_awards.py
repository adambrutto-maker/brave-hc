"""Preserved public HTO Bulletin awards claims against the official Awards snapshot.

Claims are transcribed from four dated public HTO Bulletin award articles;
original bodies are retained in a separate private BRUTTECH 1 archive.
No source fetching, HTO edits, vote assertions or public publication.
"""
import json
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
CLAIMS=[
    # Winter 2013/14 announcement, 2014-04-27 — archive season-start year 2013.
    ("W2013/14",2013,"James Norris Trophy - Winter","Damian Aidemirski"),
    ("W2013/14",2013,"Conn Smythe Award Playoff MVP - Winter","Stephen Logue"),
    ("W2013/14",2013,"Lady Byng Award for Sportsmanship - Winter","Michael Congiusti"),
    ("W2013/14",2013,"Most Improved Player - Winter","Stefano Ardizzi"),
    ("W2013/14",2013,"Maurice 'Rocket' Richard Trophy - Winter","Ben Sherritt"),
    ("W2013/14",2013,"Hart Award - Winter Team MVP","Ben Sherritt"),
    ("W2013/14",2013,"Rookie of the Year - Winter","Ben Sherritt"),
    # Summer 2014 awards announcement, 2014-08-26.
    ("S2014",2014,"Conn Smythe Award Playoff MVP - Summer","Ryan Logue"),
    ("S2014",2014,"James Norris Trophy - Summer","Adam Brutto"),
    ("S2014",2014,"Lady Byng Award for Sportsmanship - Summer","Michael Congiusti"),
    ("S2014",2014,"Rookie of the Year - Summer","Justin Carosi"),
    ("S2014",2014,"Most Improved Player - Summer","Stefano Ardizzi"),
    ("S2014",2014,"Maurice 'Rocket' Richard Trophy - Summer","Ben Sherritt"),
    ("S2014",2014,"Hart Award - Summer Team MVP","Ben Sherritt"),
    # Winter 2014/15 awards announcement, 2015-05-06 — archive year 2014.
    ("W2014/15",2014,"Lady Byng Award for Sportsmanship - Winter","Marco Congiusti"),
    ("W2014/15",2014,"James Norris Trophy - Winter","Alex Pagnotta"),
    ("W2014/15",2014,"Rookie of the Year - Winter","Justin Carosi"),
    ("W2014/15",2014,"Most Improved Player - Winter","Stefano Ardizzi"),
    ("W2014/15",2014,"Maurice 'Rocket' Richard Trophy - Winter","Mark Pastore"),
    ("W2014/15",2014,"Hart Award - Winter Team MVP","Mark Pastore"),
    ("W2014/15",2014,"Conn Smythe Award Playoff MVP - Winter","Mark Pastore"),
    # Winter 2023/24 awards announcement, 2024-04-14 — archive year 2023.
    ("W2023/24",2023,"Maurice 'Rocket' Richard Trophy - Winter","Stephane Saindon"),
    ("W2023/24",2023,"Conn Smythe Award Playoff MVP - Winter","Stephane Saindon"),
    ("W2023/24",2023,"Lady Byng Award for Sportsmanship - Winter","Keith Pearsoll"),
    ("W2023/24",2023,"Most Improved Player - Winter","Andrew Cristillo"),
    ("W2023/24",2023,"James Norris Trophy - Winter","Mark Arruda"),
    ("W2023/24",2023,"Rookie of the Year - Winter","Mark Arruda"),
    ("W2023/24",2023,"Art Ross Award - Winter","Justin Carosi"),
    ("W2023/24",2023,"Hart Award - Winter Team MVP","Justin Carosi"),
    ("W2023/24",2023,"Andrew Cristillo Award for Dedication - Winter","Justin Carosi"),
    ("W2023/24",2023,"Brave H.C. Hall of Fame","Mark Pastore"),
    ("W2023/24",2023,"Brave H.C. Hall of Fame","Ben Sherritt"),
]


class HistoricalBulletinAwardCrosscheck(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        history=json.loads((ROOT/"widgets/history-awards.json").read_text(encoding="utf-8"))
        assert history["entryCount"]==sum(len(g["items"]) for g in history["groups"])
        cls.groups={g["category"]:g["items"] for g in history["groups"]}

    def test_claim_count_and_unique_source_claims(self):
        self.assertEqual(len(CLAIMS),32)
        self.assertEqual(len(set(CLAIMS)),32)

    def test_all_32_recipient_year_category_claims_have_official_archive_match(self):
        for season,year,category,name in CLAIMS:
            with self.subTest(season=season,category=category,name=name):
                entries=self.groups[category]
                matches=[x for x in entries if x.startswith(f"{year} - ")
                         and name.casefold() in x.casefold()]
                self.assertTrue(matches,(season,year,category,name))

    def test_winter_archive_uses_season_start_not_announcement_year(self):
        self.assertEqual({year for season,year,_,_ in CLAIMS if season=="W2023/24"},{2023})
        self.assertEqual({year for season,year,_,_ in CLAIMS if season=="W2014/15"},{2014})
        self.assertEqual({year for season,year,_,_ in CLAIMS if season=="W2013/14"},{2013})


if __name__=="__main__":
    unittest.main()
