# Additional records — publication and refresh rules

The calculation produces 36 additional scoped definitions plus 20 player-game/hat-trick comparisons. Summer and Winter, regular season and playoffs remain distinct. A category definition is not an adopted official record.

| Family | Scoped definitions | Recommended use |
|---|---:|---|
| Most team goals in a game | 4 | Public team record |
| Largest winning margin | 4 | Public team record |
| Largest losing margin | 4 | Team history and analysis; omit from celebratory player highlights |
| Most combined goals in a game | 4 | Public team history |
| Most team penalty minutes in a game | 4 | Record archive; never describe penalties as positive performance |
| Most two-goal games in one season | 4 | Player highlights and record archive |
| Most three-point games in one season | 4 | Player highlights and record archive |
| Most three-assist games in one season | 4 | Player highlights and record archive |
| Longest regular-season winning/point streak | 4 | Public team record; within one season |

## Definitions

- Count every tied holder. Keep the date or season and a direct game source for each record and every game contributing to an aggregate.
- Count a hat trick as one game with at least three recorded goals; a six-goal game remains one hat-trick game. Existing HTO HAT fields are a comparison source, not the definition.
- Count a point streak as consecutive W/T results. A tie ends a winning streak; a loss ends both. Administrative defaults break these played-game streaks rather than adding unplayed wins. A season boundary also breaks the streak.
- Exclude possible standalone overtime and shootout deciding entries from new game highs and achievement-game counts. Preserve their underlying HTO records. Playoff sequence stitching needs a separately documented rule.
- Use the published team final score for team scoring records. Do not adjust a player's goals to force agreement with that score. Label historical scoring conflicts explicitly if they affect a proposed holder.
- Team PIM includes assessed skater and goalie PIM. The skater serving a goalie penalty does not receive the penalty again. PIM is not powerplay duration or the number of shorthanded situations.
- Display current-season totals as provisional. Keep COVID-shortened season notes attached to any affected result and identify schedules with fewer games when comparing season totals.
- Describe individual achievements as recorded-stat records. Four Summer 2013 games were not tracked, and the June 9 2013 score/player-goal discrepancy is a separate known issue. Never infer missing participation or represent untracked fields as independently verified zeros.

## Refresh implementation

The proposed GitHub workflow recalculates candidates when the captured boxscores or their complete index change on main. It also checks pull requests and supports a manual run. It has read-only repository permission, stores a review artifact, and cannot change HTO or publish official records.

The calculator fails if captured evidence and the index do not cover exactly the same games, preventing a partial ledger from silently producing new records. Both evidence and index must be refreshed together for new games.

This workflow does not retrieve fresh HTO boxscores. A source-capture refresh is still required. Re-running unchanged historical evidence does not make it current. The workflow remains a draft until the stacked audit dependencies and this proposal are merged and a successful hosted run is observed.

## Deferred records

Goalie save percentage and minutes-based GAA need reliable shots/minutes and a qualifying workload. Player scoring and attendance streaks need complete participation coverage. Call-up/full-time comparisons need verified historical status. Opponent records need historical name identity reconciliation. Those categories should follow the ongoing attendance and article reconciliation rather than guessing from present-day roster status.
