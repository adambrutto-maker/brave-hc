# Actual consumer expression review

Input: isolated live adapter output at code d1853d7eabdf5de241b775a6c3b0ad7cca7ea280. On BRUTTECH1, read actual local consumer source through Python AST and evaluated only12 selected entry assert expressions. No complete consumer script was imported or executed.

Result:12/12 selected checks PASS.

|Consumer|Lines|Checks|
|---|---|---|
|Projection model bridge|42–44|schema/parity,GP/G/A,count/discovery|
|Bounded record watch|48–49,51|schema,parity/discovery,game count|
|Hot Stove drafts|174,176|schema/parity,count|
|Roster-context drafts|18–20|GP/discovery/parity,season,projection source GP|
|Independent widget publisher|42|schema/parity|

Critical qualification: actual candidate schema remains operational-contract-candidate/v1. Test used a deep-copied in-memory view assigning its proposedConsumerSchema to schema. It was never written as a verified feed. Projection count/season context used explicit contract fixtures GP4,G6,A10,W2026/27; no projection model was recalculated or verified. These checks are contract-shape simulation against actual expressions, not end-to-end consumer runtime QA or release acceptance. No freshness acceptance is claimed for archived adapter data. Source observation time remains the actual earlier GET start, not current test time.

Actual local source SHA256:
-Projection bridge1ca4d033a378b6852aba1a40c9ac0261a49a6a56e4bf82f3770755c17ddeee57
-Bounded watcheb4905c2fcae92915dba3309b5547d8294346766ac4f89640aaa3a81cb1f04bd
-Hot Stove drafts1a62756a0c9896e32d0f0b17515f54fec4796174f88a8e775bab894bbbd2a50b
-Roster context4f1b8aca2c03e5ebcbeb4fee706786862737961edef033eaa7507f5c6a26544e
-Widget publisherb9cbd97dc94b2c96b310d7875216fdbd4847301497680be95b64767b602297e4

Remaining requirements before collector activation: separately reviewed guarded output integration/rollback and actual isolated consumer runtime checks. No deployment writer exists in these candidate tools. Do not relabel the review files or replace the active feed to obtain a green task. Original workbook recalculation and divergent publisher recovery remain separate held dependencies; no previously blocked operation retried.
