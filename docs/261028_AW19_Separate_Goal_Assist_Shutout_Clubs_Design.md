# HockeyOS AW-19 — Future source-verified individual milestone club categories

Status: source-only implementation in draft review; **not native HTO deployment**. User-approved existing Awards page only, no aggregate Milestones wall and no new navigation page.

## Scope

Use separate distinct native HTO Awards categories such as 50 Goal Club, 50 Assist Club, 5 Shutout Club, and subsequent threshold categories. The existing 98 historical Game/Point/Win entries in ten original source categories are a separate native migration under AW-16. Existing 146 nonmilestone historical honours and 460 statistical Records entries must remain unchanged.

Engine: `scripts/aw19_verified_club_engine.py`. Required source event: official player ID, official game ID and date, previous/new career cumulative stat, verified official game source URL and immutable SHA256 evidence receipt, plus independent player identity/source validation.

Provisional configurable thresholds: Goal/Assist 50, 100, 200, 300, then each +100; Shutout 5, 10, 20, 30, then each +10. Existing Game/Point/Win use 50/100/200/300+100; tier progression bronze/silver/gold/platinum, platinum retained above the maximum tier.

Do not create an empty category. Create the category in the native Awards editor only upon the first fully verified dated threshold crossing. Deduplicate per exact player ID + category, preserve the official game date in Notes, and independently read back the public Awards page. The existing independent player Highlights badge pathway must have matching icon assets or an explicit safe fallback before claiming badge installation.

## Historical source holds

A read-only comparison of 103 sum-verified player profiles produced 37 potential source-level goal/assist/shutout threshold candidates: 21 assists, 14 goals, 2 shutouts, spread over seven earned-level candidate categories. The cumulative season at which a threshold was first exceeded is known, but **the exact official game date is not**. The private held source register remains only on authorized BRUTTECH 1 in the AW-19 implementation candidate and must not be published as awarded achievements.

An HTO player career total alone is not proof of an achievement date. The scorer/goalie event stream must verify the crossing at game level before an award row is created; goalie shutout is awarded only for a validated completed 0-goals-against game, not by generic goalie-name matching.

The current hourly HockeyOS implementation task has been updated to include AW-19, preserving its previous schedule and protections. It should source-check and prepare eligible new awards but must not claim unattended HTO admin mutation without authenticated UI/source parity checks.

## Acceptance

CI source validation: six tests prove correct family thresholds, correct date, required exact source URL/hash, no phantom grants, no duplicates, and rejection of future/invalid events. Deployment remains blocked until integrated with authenticated native HTO Awards category/record authoring and public readback. Never merge an aggregate Awards Milestones gallery for this project; PR #142 was closed as superseded.

## October 28 founder-approved category presentation order

Keep the existing native Awards page's established award/honour categories first, in their existing relative order. Below them, milestone categories must be **goalie-first, lowest threshold to highest**, then **player/game milestones grouped by threshold 50s, 100s, 200s, 300s, 400s, etc.** Within each player/game threshold group, use Game, Goal, Assist, Point (only types with evidenced achievements will appear). Goalie categories consist of Shutout and Win Clubs, sorted by numeric threshold; equal numeric thresholds have Shutout before Win. E.g., future 5 Shutout, 10 Shutout, 20 Shutout, 30 Shutout, 50 Win, 100 Win; then 50 Game, 50 Goal, 50 Assist, 50 Point, 100 Game, 100 Goal, 100 Assist, 100 Point, and so forth.

The native HTO Awards page was reordered October 28 through first-party Save_Order after 244 unique IDs, 21 exact titles and source row counts passed browser preflight. Independent public-page verification PASS: the existing 11 honour headings untouched, 10 existing milestone headings now 50 Win, 100 Win, 50 Game, 50 Point, 100 Game, 100 Point, 200 Game, 200 Point, 300 Game, 300 Point. All 244 award entries and within-category row order unchanged; native Records 460 preserved. Evidence: PlayerCoaching/261028_HTO_Awards_Milestones_Embed_CANDIDATE/261028_AW16_CategoryOrder_Live_Acceptance.json.

AW-19 source engine now includes deterministic club_category_sort_key and order_native_awards_categories; no out-of-order category name suggestions on future verified threshold crossing. Native publisher must invoke source-parity-gated HTO category Save_Order following a first-achieved category creation, then check exact published order. Do not run that action outside authenticated approved HTO editing or award new milestones without official single-game date proof. Existing earned entries remain latest-first within each category.
