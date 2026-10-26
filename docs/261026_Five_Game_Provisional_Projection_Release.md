# 261026 — Five-game HTO projection scenario release

## Scope and authority
Data & AI lead; independent QA and Engineering support. User-requested advance of the Brave H.C. homepage. This changes **only the provisional workbook-derived projection JSON** used by the existing full-roster widget. No Master Workbook, original formula definitions, historical records, native HTO page or public verified current-player actuals are modified.

## Evidence and methodology
- Original canonical workbook SHA256: 0002fd9f06596af8d0a00fc1b53a618ef15479f941ad5c1e6265b27002a65154. The source workbook remains unchanged.
- Verified isolated HTO operational source now reconciles five completed game IDs including 3375682 (Oct 25, 6-4 win over Big Bastones); HTO totals are 5 GP, 12 G, 19 A and 23 GA.
- Disposable formula bridge: D:\BruTTech\Products\HockeyOS\Implementation Control\Opponent Intelligence\261026_Five_Game_Projection_Disposable. Its evidence/data and output are private. It reads the real original workbook and formulas but writes model data only to its own isolated directory.
- Independent workbook-formula replay: **21 historical rows, zero mismatches**.
- Scenario includes 22 players (20 HTO current + two workbook players not currently on HTO). Pavaday's explicitly accepted DI fallback remains in the model. No unclassified HTO players.
- Projected team player scoring points changed from previous 171 (four-game snapshot) to **181** (five-game scenario).
- Forecast top sources: Justin Carosi 13 G / 11 A / 24 PTS, Stephane Saindon 11 / 13 / 24, Michael Provenzano 11 / 12 / 23. These are scenario predictions, not actuals.
- Published current player GP/G/A/PTS in parentheses remain separately sourced from widgets/player-actuals.json (HTO source verified for 20 skaters through five games).
- Career trends use original workbook model and the exact five threshold source formulas: AB100=-2*STDEV(X6:X93), AB99=-STDEV(X6:X93), AB97=0.5*STDEV(X6:X93), AB96=STDEV(X6:X93). On-screen thick red/white/blue SVG arrows remain presentation only.

## Disclosure and hold
The candidate deliberately retains publicationStatus=HTO_MODEL_RECONCILIATION_PENDING, modelCurrent=false, projectionComplete=false. The two workbook player names absent from the current HTO report are Mazzei, Stefano and Congiusti, Marco. Their current actuals show unavailable, not invented zero. The scenario is not a certified new Excel workbook or a fully reconciled operational source.
The original pinned production HTO collector is still four-game-only. A disposable five-game operational collector passed check-only, atomic write and rollback; no live collector promotion is authorized by this scenario JSON update.

## Gates and tests
- scripts/verify_hto_five_game_scenario.py requires original workbook hash parity, five-game independently verified HTO source, current official HTO player GP/G/A/PTS, all 21 historical formula rows, 22-player model/known exceptions, modelCurrent false, source-freshness and complete conditional-formatting threshold fidelity.
- tests/test_hto_five_game_provisional_model.py has six source/mutation checks, PASS on BRUTTECH 1.
- Existing premium homepage browser QA PASS: all 22 rows, all eight standings rows, SVG trend colours and interactive scroll on narrow viewport.
- Do not deploy if modelCurrent is silently set true or formula/source metadata change without new independent QA.

## Release and rollback
Proposed release changes widgets/projection.json only in the public widget data layer; the included validator and tests/documentation are additive. The existing website will label the model as a provisional scenario. This is a first-source-admitted forecast refresh, not automatic forecast recalc.
Rollback the GitHub PR squash commit to restore the earlier provisional 171-point model. Private original workbook and current actuals feed are unaffected.

## Next engineering step
Promote independently verified five-game operational collector to a new versioned runtime only after full downstream consumer compatibility checks and rollback. Then schedule weekly HTO-to-provisional-model recalculation through one serialized publisher, preventing divergent GitHub pushes. No forced update to the original Master Workbook is allowed.
