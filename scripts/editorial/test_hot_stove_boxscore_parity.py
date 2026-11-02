#!/usr/bin/env python3
"""Synthetic, offline regression tests for the read-only Hot Stove HTO parity audit."""
import copy
import unittest
from unittest.mock import patch

import requests

import hot_stove_boxscore_parity as qa


def html_score(period=3, clock="0:10", team="Brave H.C.",
               scorer="18 Jamie Rosenberg ( 67 Francesco Triumbari )",
               strength="ES"):
    return """<html><body><table><tr><td>Unrelated</td></tr></table>
    <table>
    <tr><th>Per Period</th><th>Time</th><th>Str Strength</th>
    <th>Team</th><th>Scorer (Assisted by)</th><th>Total</th></tr>
    <tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td>
    <td>%s</td><td>0-1 Brave H.C.</td></tr>
    </table></body></html>""" % (period, clock, strength, team, scorer)


class Response:
    def __init__(self, text="", payload=None, status=200, url="https://www.htosports.com/score"):
        self.text, self.payload, self.status_code, self.url = text, payload, status, url

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError("Upstream HTTP %s" % self.status_code)

    def json(self):
        return self.payload


class Session:
    def __init__(self, html=None, feed=None, status=200):
        self.html = html if html is not None else html_score()
        self.feed = feed
        self.status = status
        self.headers = {}

    def get(self, url, params=None, timeout=25):
        if url == qa.HTO_ENDPOINT:
            return Response(text=self.html, status=self.status, url=url)
        return Response(payload=self.feed, status=self.status, url=url)


def article():
    return {
        "date": "2026-10-25",
        "gameId": 3375682,
        "boxScore": {
            "opponent": "Big Bastones", "ourGoals": 1, "theirGoals": 0,
            "ourPeriods": [0, 0, 1, 0, 0], "theirPeriods": [0, 0, 0, 0, 0],
        },
        "goalEvents": [{
            "period": 3, "clock": "0:10", "strength": "ES", "teamGoalOrdinal": 1,
            "officialText": "18 Jamie Rosenberg ( 67 Francesco Triumbari )",
            "gameId": 3375682, "gameDate": "2026-10-25",
        }],
        "verification": {"status": "SOURCE_VERIFIED"},
    }


class ParityTests(unittest.TestCase):
    def test_valid_goal_and_assist_is_accepted(self):
        result = qa.goal_parity(Session(), article())
        self.assertTrue(result["scoreAndEventParity"], result["issues"])

    def test_extra_whitespace_is_not_a_false_mismatch(self):
        result = qa.goal_parity(
            Session(html=html_score(scorer="18 Jamie  Rosenberg ( 67 Francesco Triumbari )")),
            article())
        self.assertTrue(result["scoreAndEventParity"], result["issues"])

    def test_wrong_assist_is_held(self):
        a = article()
        a["goalEvents"][0]["officialText"] = "18 Jamie Rosenberg ( 44 Alex Pagnotta )"
        self.assertFalse(qa.goal_parity(Session(), a)["scoreAndEventParity"])

    def test_wrong_scoring_clock_is_held(self):
        a = article()
        a["goalEvents"][0]["clock"] = "0:11"
        self.assertFalse(qa.goal_parity(Session(), a)["scoreAndEventParity"])

    def test_wrong_period_total_is_held(self):
        a = article()
        a["boxScore"]["ourPeriods"] = [0, 1, 0, 0, 0]
        self.assertFalse(qa.goal_parity(Session(), a)["scoreAndEventParity"])

    def test_overtime_period_is_audited(self):
        a = article()
        a["goalEvents"][0]["period"] = 4
        a["boxScore"]["ourPeriods"] = [0, 0, 0, 0, 0]
        result = qa.goal_parity(Session(html=html_score(period=4)), a)
        self.assertFalse(result["scoreAndEventParity"])
        self.assertTrue(any("period 4" in s for s in result["issues"]))

    def test_no_scoring_table_fails_closed(self):
        with self.assertRaises(ValueError):
            qa.official_scoring_rows(Session(html="<html>No verified goals here</html>"), 1)

    def test_upstream_error_is_not_treated_as_zero_goals(self):
        with self.assertRaises(requests.HTTPError):
            qa.official_scoring_rows(Session(status=502), 1)

    def test_even_strength_does_not_claim_empty_net_status(self):
        feed = {"archive": [], "latestArticle": article(),
                "season": {"goalsFor": 1, "goalsAgainst": 0}}
        with patch.object(qa.requests, "Session", return_value=Session(feed=feed)):
            output = qa.audit("https://example.invalid/approved.json")
        self.assertEqual(output["status"], "PASS")
        self.assertEqual(output["rosenbergOct25"]["officialStrength"], "ES")
        self.assertEqual(output["rosenbergOct25"]["emptyNetFromHTO"], "NOT_REPORTED")

    def test_unverified_article_is_a_hold(self):
        a = article()
        a["verification"]["status"] = "UNVERIFIED"
        feed = {"archive": [], "latestArticle": a,
                "season": {"goalsFor": 1, "goalsAgainst": 0}}
        with patch.object(qa.requests, "Session", return_value=Session(feed=feed)):
            output = qa.audit("https://example.invalid/approved.json")
        self.assertEqual(output["status"], "HOLD")


if __name__ == "__main__":
    unittest.main(verbosity=2)
