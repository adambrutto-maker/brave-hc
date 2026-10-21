# Award Races browser verification

Date: 2026-10-20 (Toronto)
UI code commit: 9224b5619328caec40a9326bcdafd10e346a5f06
JavaScript SHA-256: a17bb366255f650874cf8162828923dbe3d17cfbb45a37d00e045dd72736a708

## Environment
Connected Chrome extension browser. An isolated loopback preview was staged on BRUTTECH 1 from the pinned public repository files and its JavaScript hash verified, but the connected browser could not reach that machine's loopback address. The temporary server was stopped. Browser verification instead used raw.githack.com as a public proxy of the exact pinned repository URL. This is a third-party preview, not deployment or proof of the production origin's behavior. No workbook/private data was transmitted; only already-public review-branch assets were used.

## Results
All eleven observed dropdown options were exercised in both current and saved modes at 390x844 and 1280x900: 44 rendered combinations. No horizontal document overflow was observed. No NaN text appeared in saved views, and every current view retained the held-score message. No JavaScript console errors were recorded.

Screenshots inspected: mobile current Rookie view and desktop historical Rolaids view with the first CONS attribute detail expanded. The historical detail showed 81.6 x 0.18 = 14.688, source-field attribution and the explicit historical-not-current qualification. These are rendered saved examples, not newly calculated scores.

Temporary viewport overrides were reset. No ballot submitted, HTO administration edited, live website deployed, workbook opened or scheduled task changed. Navigation outside the award widget and production-origin integration were not tested.

## Remaining
This closes the final-code browser layout/interaction check in the isolated public preview environment. It does not prove current scoring, workbook array/table fidelity, original formula replay or all eleven award-model parity. Those remain required before releasing current rankings.
