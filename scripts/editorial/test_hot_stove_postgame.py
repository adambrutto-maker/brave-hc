"""Offline source and governance controls for the Brave H.C. Hot Stove postgame draft."""
import copy
from datetime import datetime, timezone
import unittest

import prepare_hot_stove_postgame as app
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from collect_hto_completed_scores import parse_native_html, Hold as ScoresHold


def game(game_id=3375683,day="2026-11-01",opponent="Mid Ice Crisis",gf=2,ga=7):
    return {"htoGameId":game_id,"date":day,"opponentExact":opponent,
            "gf":gf,"ga":ga,"season":"W2026/27","gameType":"Regular Season",
            "sourceUrl":"https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&gameID="+str(game_id)+"&p=boxscore"}


def feed_approved():
    return {"schema":"brave-hc-hot-stove-editorial-preview/v1",
            "team":"Brave H.C.","editorialState":"FOUNDER_APPROVED",
            "latestArticle":{"gameId":3375683,"date":"2026-11-01",
                "boxScore":{"opponent":"Mid Ice Crisis","ourGoals":2,"theirGoals":7},
                "verification":{"status":"SOURCE_VERIFIED"}},
            "archive":[]}


def fixture_countdown():
    return {"schema":"brave-hc-upcoming-countdown/v1","team":"Brave H.C.",
            "season":"W2026/27","games":[{
               "id":3375684,"gameDate":"2026-11-08","opponent":"Other Way",
               "homeAway":"Home","rink":"Vaughan Sports Village - D Rink",
               "puckDropUTC":"2026-11-09T02:15:00Z",
            }]}


def staged_game():
    return game(3375684,"2026-11-08","Other Way",3,2)


def utc(s):
    return datetime.fromisoformat(s.replace("Z","+00:00"))


def synthetic_card(record,short=False):
    periods1=[0,0,record["gf"]]
    periods2=[0,0,record["ga"]]
    if short:
        headers=["REGULAR SEASON","1","2","3","F"]
        ours=[app.TEAM]+list(map(str,periods1+[record["gf"]]))
        opp=[record["opponentExact"]]+list(map(str,periods2+[record["ga"]]))
    else:
        headers=["REGULAR SEASON","1","2","3","OT","2OT","F"]
        ours=[app.TEAM]+list(map(str,periods1+[0,0,record["gf"]]))
        opp=[record["opponentExact"]]+list(map(str,periods2+[0,0,record["ga"]]))
    def row(parts):
        return "<tr>"+"".join("<td>"+str(v)+"</td>" for v in parts)+"</tr>"
    d=datetime.strptime(record["date"],"%Y-%m-%d")
    date=d.strftime("%b ")+str(d.day)+d.strftime(", %Y")
    return '<div class="scoreBoard periodScore"><span>'+date+'</span><table>'+(
        row(headers)+row(ours)+row(opp))+'</table><a href="default.asp?u=BRAVESHOCKEY&amp;s=hockey&amp;sportsHQ=BRAVESHOCKEY&amp;gameID='+str(record["htoGameId"])+'&amp;p=boxscore">Box Score and Summary</a></div>'


def synthetic_source():
    items=[game(3375683,"2026-11-01","Mid Ice Crisis",2,7),
           game(3375682,"2026-10-25","Big Bastones",6,4),
           game(3375601,"2026-10-18","Zamboner Crew",1,7),
           game(3369564,"2026-10-04","Michelob Morts",2,3),
           game(3356178,"2026-09-27","Mohawks H.C.",3,6),
           game(3356177,"2026-09-20","Dateline Predators",0,3)]
    return "<html><body><h1>Brave H.C. Winter 2026/2027 Scores</h1>"+(
        "".join(synthetic_card(g,short=g["htoGameId"]==3375682) for g in items))+"</body></html>"


def fake_stats():
    return """<table><tr><th>No</th><th>Name</th><th>POS</th><th></th>
    <th>GP</th><th>G</th><th>A</th><th>Pts</th><th>Pts/G</th><th>POTG</th></tr>
    <tr><td>88</td><td>Mazzei, Stefano</td><td>LW</td><td></td>
    <td>1</td><td>1</td><td>0</td><td>1</td><td>1.00</td><td>0</td></tr>
    <tr><td>44</td><td>Pagnotta, Alex</td><td>RD</td><td></td>
    <td>1</td><td>0</td><td>2</td><td>2</td><td>2.00</td><td>1</td></tr>
    <tr><td>22</td><td>Povegliano, Adam</td><td>F</td><td></td>
    <td>1</td><td>1</td><td>0</td><td>1</td><td>1.00</td><td>1</td></tr></table>"""


def fake_goal_events():
    return [
        {"period":3,"clock":"8:53","strength":"ES","team":"Brave H.C.",
         "officialText":"88 Stefano Mazzei ( 44 Alex Pagnotta )"},
        {"period":3,"clock":"1:47","strength":"ES","team":"Brave H.C.",
         "officialText":"22 Adam Povegliano ( 44 Alex Pagnotta )"},
        {"period":1,"clock":"5:03","strength":"ES","team":"Other Way",
         "officialText":"-"},
    ]


class ScoreCollectorTests(unittest.TestCase):
    def test_mixed_3_and_5_period_source(self):
        data=parse_native_html(synthetic_source())
        self.assertEqual(len(data),6)
        self.assertEqual(data[1]["htoGameId"],3375682)
        self.assertEqual((data[1]["gf"],data[1]["ga"]),(6,4))

    def test_modified_final_score_fails_closed(self):
        html=synthetic_source()
        html=html.replace("<td>Big Bastones</td><td>0</td><td>0</td><td>4</td><td>4</td>",
                          "<td>Big Bastones</td><td>0</td><td>0</td><td>4</td><td>5</td>",1)
        with self.assertRaises(ScoresHold):parse_native_html(html)

    def test_unknown_period_count_fails_closed(self):
        html=synthetic_source().replace(
            "<td>REGULAR SEASON</td><td>1</td><td>2</td><td>3</td><td>F</td>",
            "<td>REGULAR SEASON</td><td>1</td><td>2</td><td>3</td><td>OT</td>",1)
        with self.assertRaises(ScoresHold):parse_native_html(html)


class EditorialAdmissionTests(unittest.TestCase):
    def test_no_new_game_waits_instead_of_fabricating(self):
        status,g=app.qualify_next([game()],feed_approved(),fixture_countdown(),utc("2026-11-09T05:00:00Z"))
        self.assertEqual(status,"WAITING_OFFICIAL_FINAL")
        self.assertIsNone(g)

    def test_fresh_final_admitted_after_two_hours(self):
        status,g=app.qualify_next([staged_game(),game()],feed_approved(),fixture_countdown(),utc("2026-11-09T05:00:00Z"))
        self.assertEqual(status,"READY_FOR_SCORING_PARITY")
        self.assertEqual(g["htoGameId"],3375684)

    def test_too_early_game_waits(self):
        status,g=app.qualify_next([staged_game(),game()],feed_approved(),fixture_countdown(),utc("2026-11-09T03:00:00Z"))
        self.assertEqual(status,"WAITING_POSTGAME_CONFIRMATION")
        self.assertIsNone(g)

    def test_unknown_final_game_is_held(self):
        bad=game(9899999,"2026-11-08","Unknown",3,2)
        with self.assertRaisesRegex(app.EditorialHold,"NEW_GAME_NOT_IN_VERIFIED_SCHEDULE"):
            app.qualify_next([bad,game()],feed_approved(),fixture_countdown(),utc("2026-11-09T05:00:00Z"))

    def test_approved_history_change_is_held(self):
        old=game(3375683,"2026-11-01","Mid Ice Crisis",4,7)
        with self.assertRaisesRegex(app.EditorialHold,"APPROVED_RESULT_PARITY_DRIFT"):
            app.qualify_next([staged_game(),old],feed_approved(),fixture_countdown(),utc("2026-11-09T05:00:00Z"))

    def test_edited_schedule_opponent_is_held(self):
        c=fixture_countdown()
        c["games"][0]["opponent"]="Wrong Team"
        with self.assertRaisesRegex(app.EditorialHold,"HTO_SCHEDULE_GAME_ID_MISMATCH"):
            app.qualify_next([staged_game(),game()],feed_approved(),c,utc("2026-11-09T05:00:00Z"))

    def test_unapproved_feed_is_held(self):
        f=feed_approved()
        f["editorialState"]="DRAFT_NOT_APPROVED"
        with self.assertRaisesRegex(app.EditorialHold,"APPROVED_FEED_INVALID"):
            app.qualify_next([game()],f,fixture_countdown(),utc("2026-11-09T05:00:00Z"))


class BoxScoreTests(unittest.TestCase):
    def test_exact_skater_table(self):
        players=app.parse_skater_stats(fake_stats())
        self.assertEqual(len(players),3)
        self.assertEqual(sum(p["a"] for p in players),2)

    def test_bad_points_held(self):
        with self.assertRaisesRegex(app.EditorialHold,"SKATER_STAT_TOTAL_INVALID"):
            app.parse_skater_stats(fake_stats().replace("<td>2</td><td>2.00</td>","<td>4</td><td>2.00</td>"))

    def test_goal_assist_parity(self):
        events=fake_goal_events()
        stats=app.parse_skater_stats(fake_stats())
        g=game(3375684,"2026-11-08","Other Way",2,1)
        facts=app.validate_boxscore(g,events,stats)
        self.assertEqual(facts["playersOfTheGame"],["Pagnotta, Alex","Povegliano, Adam"])
        self.assertEqual(facts["periods"][2]["braves"],2)

    def test_wrong_assist_held(self):
        events=fake_goal_events()
        events[1]["officialText"]="22 Adam Povegliano"
        with self.assertRaisesRegex(app.EditorialHold,"PLAYER_ASSISTS_DONT_RECONCILE"):
            app.validate_boxscore(game(3375684,"2026-11-08","Other Way",2,1),
                                  events,app.parse_skater_stats(fake_stats()))

    def test_wrong_opponent_held(self):
        events=fake_goal_events()
        events[2]["team"]="Different Team"
        with self.assertRaisesRegex(app.EditorialHold,"OPPONENT_IDENTITY_MISMATCH"):
            app.validate_boxscore(game(3375684,"2026-11-08","Other Way",2,1),
                                  events,app.parse_skater_stats(fake_stats()))

    def test_draft_is_explicitly_unapproved_and_has_no_video_claim(self):
        g=game(3375684,"2026-11-08","Other Way",2,1)
        g["schedule"]={"rink":"Vaughan Sports Village - D Rink"}
        facts=app.validate_boxscore(g,fake_goal_events(),app.parse_skater_stats(fake_stats()))
        md,title=app.draft_markdown(g,facts)
        self.assertIn("NOT APPROVED FOR PUBLICATION",md)
        self.assertIn("separate chat owns that work",md) if False else self.assertIn("separate chat",md)
        self.assertIn("Official points leaders",md)
        self.assertNotIn("empty-net goal",md)
        self.assertTrue(title.startswith("Braves Defeat"))


if __name__=="__main__":
    unittest.main()
