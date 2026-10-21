# Plan 03 — GitHub Actions HTO source-response reliability follow-up

Date: 2026-10-21. Scope: public HTO source read/validation only. No native HTO edits, workbook changes, publication overrides or external account actions.

## Trigger and evidence
The merged historical-data QA package [PR #31](https://github.com/adambrutto-maker/brave-hc/pull/31) published successfully to GitHub Pages, but the dependent [record-source refresh run 39620536026](https://github.com/adambrutto-maker/brave-hc/actions/runs/39620536026) failed during `Read public HTO results and published records`. Unit tests passed first; the exception was `ValueError: Unexpected HTO response`, raised by `fetch` on the first current-season schedule request before parsing.

This message by itself proves only that GitHub Actions received an unaccepted response status or content type, **not** that the HTO schedule changed, that records were removed, or that the host returned a particular HTTP code. The earlier run [39612057995](https://github.com/adambrutto-maker/brave-hc/actions/runs/39612057995) passed on the prior code. A later same-day read-only check from BRUTTECH 1 received HTTP 200, `Content-Type: text/html`, and a 64,462-byte schedule body. The difference may be intermittent or environment-specific; it is not explained by the unit tests.

## Bounded mitigation
- Validate **HTTPS + exact `www.htosports.com/teams/default.asp`** and preserve `allow_redirects=False`.
- Retry a maximum of **three** times for connection exceptions, temporary 429/5xx statuses, or a 200 response that is not HTML; 1- and 2-second delays; **never** retry/accept redirect or 401/403/404 denial.
- Return only nonempty **HTTP 200 HTML bytes** from the official HTO host, preserving the page's own charset for existing BeautifulSoup validation.
- If all attempts fail, throw with status, content type (bounded), response length, SHA-256 fingerprint and attempt count. **Do not record or upload response bodies, invent cached results, synchronize a partial record book, or relax source parsing.**
- Six synthetic tests cover temporary non-HTML then valid HTML, persistent non-HTML rejection, redirect denial, 403 denial, retry limits, and non-HTTPS rejection. The complete `test_record_source_refresh.py` suite passed **17/17** in an isolated BRUTTECH 1 checkout.

## Independent UTF-8 portability finding on BRUTTECH 1

An isolated live read-only rehearsal then reached record comparison and correctly stopped because two accented rental-goalie lines falsely appeared to have been revised. This was independently traced to `json.loads(path.read_text())` on Windows, where Python's default locale decoded an on-disk UTF-8 JSON file as CP1252 (e.g., `Rènt Goaliê` becoming mojibake `RÃ¨nt GoaliÃª`). The official HTO public records page itself declares UTF-8 and returned properly encoded names; no historical HTO record was actually removed. GitHub Actions uses UTF-8 by default, so this is **a separate local portability bug**, not a proven explanation of its earlier invalid-HTTP-response failure.

All source JSON input and report output in this refresh script now specify `encoding='utf-8'`. Regression checks assert the two exact historical accented source lines and a fresh UTF-8 file round trip. No generic normalization, fuzzy identity match, source entry deletion or silent rebasing has been introduced.

## Acceptance and rollback
1. Review code diff; tests pass; no HTO or workbook mutation.
2. Merge only the bounded fetch hardening with its regression tests; run the affected workflow in GitHub Actions to observe the *actual* runner response.
3. If it still fails, use the new safe failure metadata to establish cause. Do **not** substitute laptop-fetched HTML for CI's current source or publish unverified records.
4. Record source snapshot and candidate counts, original record entries and newest-first player profiles unchanged unless approved new native records actually appear.
5. Revert this isolated fetch change if retrying creates failures or contaminates the accepted source contract.
