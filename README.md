# brave-hc
Brave H.C. Analytics by Brutech Sports &amp; Analytics

## Standing HockeyOS engineering requirements

Before changing the Player Bio, league-normalization settings, statistics, Records or Awards, read [AGENTS.md](AGENTS.md) and the [October 28 Bio normalization product contract](docs/261028_HockeyOS_Bio_Normalization_Product_Contract.md). The reusable source-gated conversion engine is [player-performance-normalization.js](widgets/player-performance-normalization.js); verified reference settings are [league-game-formats.json](widgets/league-game-formats.json). Run `node --test tests/test_player_performance_normalization.cjs` before review. The conversion module is currently staged for source mapping and Bio integration; it does not itself change the live widget or official records.
