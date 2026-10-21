# Marco current-season correction — QA receipt

Adam confirmed that Marco Congiusti was mistakenly entered for September 27, 2026 and has deleted those statistics from HTO. This supersedes the unresolved disposition in 261020_Awards_Identity_Game_Attribution_Hold.md. Johnny's separately sourced September 20 observation remains excluded as an unidentified entry; no identities or game histories were substituted.

Reviewed implementation commit: 787543c9ce4b09c180e8e4e2efa433e1e8fdfd86.

- Exactly Marco's erroneous current row removed; all other 22 rows unchanged. Original row and superseded metadata retained in 261020_Awards_Marco_Erroneous_Entry_Archive.json.
- Fresh source comparison: 481 checks passed, no differences, across 22 named participants. Scope is in the source receipt; event completeness, roster roles, and workbook scores were not reverified.
- Corrected counts: 19 named skaters, three goalies; 53 named skater appearances plus four goalie appearances. Six goals, 10 assists, 16 points retained.
- Local tests: 71 passed. GitHub Actions run 39531705295 succeeded for the implementation commit: https://github.com/adambrutto-maker/brave-hc/actions/runs/39531705295
- Randy AI independently accepted the correction and reran 71 tests. Scope: row preservation, metadata consistency, display and publication gates; not source retrieval authenticity or workbook formulas.
- Connected Chrome browser checked all 11 award selections in the exact-commit public preview. Marco and Johnny absent, obsolete identity mismatch notice absent, corrected 22-player count present, official model ratings held in every category. No console errors. Participation and statistical watches restore; final award eligibility and normalized OVR remain held.

No production site, operational feed, or workbook changed. This receipt records review-branch containment and source correction, not scoring release.
