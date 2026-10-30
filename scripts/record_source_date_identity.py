"""Strict semantic comparison for HTO date-display-only record revisions.

Only explicit valid calendar-date renderings are canonicalized. Section, category,
period, record value, opponent, score, player identity, tie and season stay exact.
This is not a broad text or punctuation similarity heuristic.
"""
from __future__ import annotations
import calendar
import datetime as dt
import re

_MONTHS={}
for i in range(1,13):
    for name in (calendar.month_abbr[i],calendar.month_name[i]):
        _MONTHS[name.lower()]=i
_MONTHS["sept"]=9
_TOKEN="(?:"+"|".join(sorted(map(re.escape,_MONTHS),key=len,reverse=True))+")"
_RANGE=re.compile(
    rf"\b(?P<m1>{_TOKEN})[ ]+(?P<d1>[0-9]{{1,2}})[ ]*-[ ]*"
    rf"(?P<m2>{_TOKEN})[ ]+(?P<d2>[0-9]{{1,2}}),[ ]*(?P<year>20[0-9]{{2}})\b",
    re.IGNORECASE)
_SINGLE=re.compile(
    rf"\b(?P<month>{_TOKEN})[ ]+(?P<day>[0-9]{{1,2}}),[ ]*(?P<year>20[0-9]{{2}})\b",
    re.IGNORECASE)
_ISO=re.compile(r"\b20[0-9]{2}-[0-9]{2}-[0-9]{2}\b")


def canonical_record_text(value):
    if not isinstance(value,str):
        raise ValueError("RECORD_SOURCE_TEXT_INVALID")
    value=" ".join(value.split())
    for m in _ISO.finditer(value):
        try:dt.date.fromisoformat(m.group())
        except ValueError as e:raise ValueError("RECORD_ISO_DATE_INVALID") from e
    def normalize_range(m):
        year=int(m["year"])
        start=dt.date(year,_MONTHS[m["m1"].lower()],int(m["d1"]))
        finish=dt.date(year,_MONTHS[m["m2"].lower()],int(m["d2"]))
        if start>finish:
            raise ValueError("RECORD_DATE_RANGE_YEAR_AMBIGUOUS")
        return start.isoformat()+" to "+finish.isoformat()
    def normalize_single(m):
        date=dt.date(int(m["year"]),_MONTHS[m["month"].lower()],int(m["day"]))
        return date.isoformat()
    try:
        value=_RANGE.sub(normalize_range,value)
        return _SINGLE.sub(normalize_single,value)
    except (ValueError,KeyError) as e:
        raise ValueError("RECORD_DATE_RENDER_UNQUALIFIED") from e
