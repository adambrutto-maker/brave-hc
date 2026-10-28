# brave-hc
Brave H.C. Analytics by Brutech Sports &amp; Analytics

## Standing HockeyOS engineering requirements

Before changing the Player Bio, league-normalization settings, statistics, Records or Awards, read [AGENTS.md](AGENTS.md) and the [October 28 Bio normalization product contract](docs/261028_HockeyOS_Bio_Normalization_Product_Contract.md). The reusable source-gated conversion engine is [player-performance-normalization.js](widgets/player-performance-normalization.js); verified reference settings are [league-game-formats.json](widgets/league-game-formats.json). Run `node --test tests/test_player_performance_normalization.cjs` before review. The 18-source-season crosswalk is verified and the redesigned Bio candidate is staged on a review branch. The new Bio uses actual G/A bars with an adjustable game-duration Pts/GP line and a native view of the existing provisional skater model. Goalie projections remain held pending a verified source adapter. Neither this branch nor the candidate updates the live Bio or official records until release review and publication.
