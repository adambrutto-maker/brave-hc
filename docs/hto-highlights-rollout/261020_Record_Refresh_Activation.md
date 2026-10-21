# Record refresh activation — October 20, 2026

The public record source refresh is installed on main. It runs after successful Brave H.C. SVHL schedule reconciliation, can be started manually, and validates its own implementation changes.

It reads the latest published HTO season selector and schedule, captures completed current-season boxscores, preserves the historical ledger, recalculates the 56 record comparisons, and synchronizes new already-published HTO entries into the history and player feeds. Verified changes are committed and published to Pages. It does not write native HTO records or promote calculated candidates into official records.

The first capture verified four completed Winter 2026/2027 games against all 558 published record entries. Complete-ledger recalculation covered 370 indexed games, with eight administrative exclusions and five possible standalone deciding entries. All 109 profile rendering checks passed, including 327 mapped record entries. Ten source parsing and preservation tests passed. A repeated refresh produced no changed files.

The encoding regression found in the first hosted test was corrected by parsing the response bytes using the HTML charset rather than Requests' Latin-1 fallback. Accented rental-goalie entries remain unchanged and unmapped.

Incomplete responses, missing captured results, historical record removals or revisions, and new individual records without a unique verified player identity stop the refresh before feeds are written. The owner-confirmed four untracked Summer 2013 games remain a recorded-statistics limitation. Existing newest-first widget ordering and game source links are preserved.

Verification run: https://github.com/adambrutto-maker/brave-hc/actions/runs/39523051144
