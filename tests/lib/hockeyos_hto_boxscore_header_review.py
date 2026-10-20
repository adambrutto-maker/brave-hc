"""HockeyOS HTO boxscore column compatibility review. NO network, Excel or writes.

Read-only parser-design helper for captured, authorized HTMLParser table ROWS.
This file is not imported by BRUTTECH 1's active hourly collector.
A sheet with missing mandatory columns fails rather than fabricating scores.

Observed 2026-10-20: HTO goalie headers have a decorative blank column
between Name and GP. One game omits goalie POTG; it remains None.
Skater score columns can be after another decorative blank column, so
fixed positional G/A/PTS detection is invalid.
"""
from __future__ import annotations
import re

class BoxscoreSchemaHold(ValueError):
    pass

def _fail(reason):
    raise BoxscoreSchemaHold(reason)

def _headers(table, prefix, required, optional=()):
    if not isinstance(table, list) or len(table) < 2 or not isinstance(table[0], list):
        _fail("MISSING_HEADER_OR_PLAYER_ROWS")
    header = table[0]
    if len(header) < len(prefix) or header[:len(prefix)] != list(prefix):
        _fail("INCORRECT_TABLE_IDENTITY")
    # Ignore only blank presentation columns, not unfamiliar named columns.
    recognized = set(prefix) | set(required) | set(optional)
    nonempty = [h for h in header if h != ""]
    if any(not isinstance(h, str) or h not in recognized for h in nonempty):
        _fail("UNRECOGNIZED_NAMED_COLUMN")
    if len(nonempty) != len(set(nonempty)):
        _fail("DUPLICATE_NAMED_COLUMN")
    if any(col not in nonempty for col in required):
        _fail("MISSING_REQUIRED_COLUMN")
    # A nonempty data cell in a decorative column means our map is untrusted.
    empties = [i for i,h in enumerate(header) if h == ""]
    if len(empties) > 1:
        _fail("UNEXPECTED_MULTIPLE_BLANK_COLUMNS")
    if empties and empties[0] != len(prefix):
        _fail("UNEXPECTED_BLANK_COLUMN_POSITION")
    return {col: header.index(col) for col in nonempty}, empties

def _value(row, index, field, allow_signed=False):
    if not isinstance(row,list) or index>=len(row):
        _fail("SHORT_PLAYER_ROW:"+field)
    t = row[index]
    if not isinstance(t,str):
        _fail("NON_TEXT_PLAYER_CELL:"+field)
    stripped = t.strip()
    if not re.fullmatch(r"[+-]?\d+" if allow_signed else r"\d+", stripped):
        _fail("NON_NUMERIC_PLAYER_CELL:"+field)
    number=int(stripped)
    if number<0 and not allow_signed:
        _fail("NEGATIVE_NON_SIGNED_STAT:"+field)
    return number

def _player_identity(row,columns):
    if not isinstance(row,list) or len(row) <= columns["Name"]:
        _fail("INVALID_PLAYER_IDENTITY")
    name=row[columns["Name"]]
    if not isinstance(name,str) or not name.strip() or name=="Team Stats":
        _fail("MISSING_PLAYER_NAME_OR_TEAM_TOTAL")
    return name.strip()

def skater_rows(table, *, verified_team_goals):
    """Return read-only skater facts from captured HTMLParser rows.

    For scoreless verified official games the scoring block may be omitted.
    Explicitly known GF=0 permits zeros only in that narrow case.
    """
    if not isinstance(verified_team_goals,int) or verified_team_goals<0:
        _fail("MISSING_OFFICIAL_GAME_GF")
    prefix=("No","Name","POS")
    required=("+/-","POTG")
    optional=("G","A","Pts","PIM")
    columns,blanks=_headers(table,prefix,required,optional)
    present=[s in columns for s in ("G","A","Pts")]
    if any(present) and not all(present):
        _fail("PARTIAL_SCORING_COLUMNS")
    if not all(present) and verified_team_goals != 0:
        _fail("MISSING_SCORING_COLUMNS_IN_SCORING_GAME")
    result=[]
    for row in table[1:]:
        if len(row)!=len(table[0]):
            _fail("SKATER_ROW_LENGTH_DRIFT")
        if row[columns["Name"]]=="Team Stats":
            continue
        name=_player_identity(row,columns)
        if blanks and row[blanks[0]].strip():
            _fail("NONEMPTY_DECORATIVE_SKATER_CELL")
        g=_value(row,columns["G"],"G") if all(present) else 0
        a=_value(row,columns["A"],"A") if all(present) else 0
        pts=_value(row,columns["Pts"],"Pts") if all(present) else 0
        if g+a!=pts:
            _fail("PLAYER_POINTS_ARITHMETIC_MISMATCH")
        result.append({
            "name":name,"g":g,"a":a,"pts":pts,
            "plusminus":_value(row,columns["+/-"],"+/-",True),
            "potg":_value(row,columns["POTG"],"POTG"),
            "pim":_value(row,columns["PIM"],"PIM") if "PIM" in columns else None,
            "scoringColumnsFromHTO":all(present),
            "sourceKind":"HTO_BOXSCORE_OBSERVATION_ONLY_NOT_AWARD_SCORE"
        })
    if sum(p["g"] for p in result)!=verified_team_goals:
        _fail("TEAM_GOALS_DO_NOT_MATCH_OFFICIAL_SCORE")
    if not result:
        _fail("NO_SKATER_ATTENDANCE_ROWS")
    return result

def goalie_rows(table):
    columns,blanks=_headers(table,("No","Name"),("GP","L","GA","GAA","+/-"),("POTG",))
    if not blanks and table[0][2]!="GP":
        _fail("UNEXPECTED_GOALIE_POSITION")
    results=[]
    for row in table[1:]:
        if len(row)!=len(table[0]):
            _fail("GOALIE_ROW_LENGTH_DRIFT")
        if row[columns["Name"]]=="Team Stats":
            continue
        name=_player_identity(row,columns)
        if blanks and row[blanks[0]].strip():
            _fail("NONEMPTY_DECORATIVE_GOALIE_CELL")
        results.append({
            "name":name,"gp":_value(row,columns["GP"],"GP"),
            "losses":_value(row,columns["L"],"L"),
            "goalsAgainst":_value(row,columns["GA"],"GA"),
            "potg":_value(row,columns["POTG"],"POTG") if "POTG" in columns else None,
            "potgPublishedInBoxscore":"POTG" in columns,
            "sourceKind":"HTO_BOXSCORE_OBSERVATION_ONLY_NOT_AWARD_SCORE"
        })
    if not results:
        _fail("NO_GOALIE_APPEARANCE_ROWS")
    return results

def check_game_observations(*, hto_game_id, official_goals_for,
                            official_goals_against, skaters, goalies):
    """Read-only same-game parity gate; never awards scoring.

    Requires independently observed official scoreboard values as inputs.
    It does NOT fetch, authenticate or infer those totals itself.
    """
    if not isinstance(hto_game_id, int) or isinstance(hto_game_id, bool) or hto_game_id < 1:
        _fail("INVALID_OFFICIAL_HTO_GAME_ID")
    for label, value in (("GF", official_goals_for), ("GA", official_goals_against)):
        if not isinstance(value, int) or isinstance(value, bool) or value < 0:
            _fail("INVALID_OFFICIAL_GAME_" + label)
    if not isinstance(skaters, list) or not skaters or not isinstance(goalies, list) or not goalies:
        _fail("MISSING_CURRENT_GAME_PLAYER_ROWS")
    seen_skaters, seen_goalies = set(), set()
    goals=assists=0
    for player in skaters:
        if not isinstance(player, dict) or player.get("sourceKind") != "HTO_BOXSCORE_OBSERVATION_ONLY_NOT_AWARD_SCORE":
            _fail("INVALID_SKATER_SOURCE_PROVENANCE")
        name=player.get("name")
        if not isinstance(name, str) or not name.strip() or name.casefold() in seen_skaters:
            _fail("DUPLICATE_OR_MISSING_SKATER_IDENTITY")
        seen_skaters.add(name.casefold())
        g, a, pts=player.get("g"), player.get("a"), player.get("pts")
        if any(not isinstance(x,int) or isinstance(x,bool) or x < 0 for x in (g,a,pts)) or g+a!=pts:
            _fail("UNVERIFIED_GAME_SKATER_POINTS")
        goals+=g
        assists+=a
    goalie_ga=0
    missing_potg=[]
    for player in goalies:
        if not isinstance(player, dict) or player.get("sourceKind") != "HTO_BOXSCORE_OBSERVATION_ONLY_NOT_AWARD_SCORE":
            _fail("INVALID_GOALIE_SOURCE_PROVENANCE")
        name=player.get("name")
        if not isinstance(name,str) or not name.strip() or name.casefold() in seen_goalies:
            _fail("DUPLICATE_OR_MISSING_GOALIE_IDENTITY")
        seen_goalies.add(name.casefold())
        gp, ga, losses, potg=(player.get(k) for k in ("gp","goalsAgainst","losses","potg"))
        if any(not isinstance(x,int) or isinstance(x,bool) or x<0 for x in (gp,ga,losses)):
            _fail("UNVERIFIED_GOALIE_GAME_NUMBERS")
        if gp != 1 or losses > 1:
            _fail("UNEXPECTED_GOALIE_APPEARANCE_OR_LOSS_COUNT")
        if potg is None:
            if player.get("potgPublishedInBoxscore") is not False:
                _fail("GOALIE_POTG_MISSING_WITHOUT_SOURCE_OMISSION_EVIDENCE")
            missing_potg.append(name)
        elif not isinstance(potg,int) or isinstance(potg,bool) or potg not in (0,1):
            _fail("INVALID_PER_GAME_GOALIE_POTG")
        goalie_ga+=ga
    if goals!=official_goals_for:
        _fail("GAME_SCORER_TOTAL_NOT_OFFICIAL_GF")
    if goalie_ga!=official_goals_against:
        _fail("GAME_GOALIE_TOTAL_NOT_OFFICIAL_GA")
    return {
        "state":"FOUR_SOURCE_CATEGORIES_RECONCILED_GAME_ONLY_AWARD_OVR_HELD",
        "htoGameId":hto_game_id,
        "skaters":len(skaters),"goalieAppearances":len(goalies),
        "goalsFor":goals,"assists":assists,"points":goals+assists,
        "goalieGoalsAgainst":goalie_ga,
        "unknownGoaliePOTG":missing_potg,
        "awardModelRecalculated":False,"workbookWritten":False,
        "messagesSent":0,"publisherUpdated":False
    }
