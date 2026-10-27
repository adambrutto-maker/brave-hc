# HockeyOS — Verified 2016–17 Sports Village Historical Archive Extension
**Date:** October 26, 2026  
**Scope:** Read-only published official league standings, corroborated with privately held Brave H.C. season records

## Extension implemented
The published Sports Village source at `https://leagues.sportsvillage.ca/Leagues.aspx?leagueid=375&page_type=Adult&sc=HOCKEY` was parsed with the existing independently reviewed archive parser. This adds **Sunday Winter 2016/17** to the prior 2018/19 and 2021/22–2025/26 coverage.

After source-hash verification, the released historical archive covers:
- **7 official winter seasons** with fixed season/league IDs;
- **54 division tables**;
- **195 competitive team-season entries**; and
- original division labels and archived source references preserved without assuming that repeated team names refer to identical franchises.

The **2017/18, 2019/20 and 2020/21** official Sunday Winter seasons are still missing from the admitted archive. Do not fabricate those standings or source IDs.

## Brave H.C. Master reconciliation
- Original immutable Master source remains **358 completed games** across 17 source-labelled seasons from 2013–2026.
- Extending the source archive increased the exact same-season name-candidate pool from **41 to 47** distinct season-team comparisons.
- Every newly identified candidate was tested against the historical official TeamInfo game schedule and Master game date, opponent identity and reverse-perspective score.
- The independently admitted set remains **79** verified historical Brave H.C. games across **35** team-season source groups. The number of held game comparisons increases from **24 to 43** (including 2016–17), because no additional older game observation met the full date-and-score admission rule.
- The new held records are retained in the local **private** evidence audit. The public `brave-historical-verified-games.json` is privacy-minimal; its accepted results still contain only the 79 previously approved game observations and a truthful held-count update.
- Do **not** infer roster continuity from those old opponents' names, or add their performance to a current team strength index.

## Production compatibility
- Updates `scripts/collect_svhl_historical_standings.py`, `widgets/historical-svhl-standings.json`, independently checked public game-link metadata, source dynamic tests and dashboard archive gap description.
- No new scheduled task or source publisher; these historical league-season snapshots remain separately source-pinned.
- Weekly 2026/27 league strengths continue from the previously admitted October 26 baseline using the existing 10:15 daily BRUTTECH 1 publisher.
- Existing Division Fit Lab calculations remain descriptive, unaffected by a historical same-name expansion.

## Review and release gates
Independent archive parser checks, public historical game parity, current source validation, Node historical model tests, desktop/mobile Chromium and the new Division Fit Lab scenario tests must all pass before production merge. Old source captures have no private roster IDs published. Deployment must preserve the canonical Master Workbook, HTO admin and league source systems unchanged.
