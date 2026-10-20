"""Produce an evidence-linked disposition for every team-record difference.

No native records or widget data are changed. Captured zeros are not proof of
historical zero activity when a statistic was not tracked.
"""
import collections
import json
from reconcile_record_book import DIR, load_evidence, observations, date_of


def run():
    audit = json.loads((DIR / '261020_Team_Record_Book_Audit.json').read_text())
    games = load_evidence()['games']
    ledgers = {g['sourceURL']: g for g in audit['gameLedger']}
    details = []
    for game in games:
        item = dict(ledgers[game['url']])
        rows = list(observations(game))
        item['skaterPIM'] = sum(float(r.get('PIM') or 0) for _, r in rows if 'POS' in r)
        item['goaliePIM'] = sum(float(r.get('PIM') or 0) for _, r in rows if 'POS' not in r)
        item['goalieGA'] = sum(float(r.get('GA') or 0) for _, r in rows if 'POS' not in r)
        item['shootout'] = '\tSO\t' in game['heading']
        item['goaliePenalties'] = [r for _, r in rows if 'POS' not in r and float(r.get('PIM') or 0)]
        item['scoreVersusSkaterGoalDifference'] = item['GF'] - item['publishedSkaterGoals']
        item['scoreVersusGoalieGADifference'] = item['GA'] - item['goalieGA']
        details.append(item)
    reviews = []
    for entry in audit['entries']:
        if entry['status'] == 'MATCH':
            continue
        row = dict(entry)
        scope = [g for g in details if (g['season'], g['scope']) == (row['season'], row['scope'])]
        row['evidenceGames'] = scope
        stat, season, period = row['stat'], row['season'], row['scope']
        key = (season, period, stat)
        if season == 'Summer 2013':
            decision = 'RETAIN_QUALIFIED_HISTORICAL_ENTRY'
            reason = ('Owner confirms four games were never tracked; no further search for their player stats. '
                      'Keep the original entry as a historical claim. Team scoreboard totals remain usable '
                      'separately; do not convert missing player/penalty fields to verified zero.')
            if stat == 'GF':
                reason += (' The June 9 regular-season game also has an existing 8-to-5 scoreboard/credited-goal mismatch; the four untracked games do not explain every 2013 discrepancy. The scoreboard total is %s; the recorded skater total is %s. '
                           'These are different measures and cannot be equated.' %
                           (row['calculatedValue'], sum(g['publishedSkaterGoals'] for g in scope)))
        elif stat == 'GF' and season in ('Summer 2017', 'Winter 2015/2016'):
            decision = 'RETAIN_SOURCE_CONFLICT'
            reason = ('Legacy value equals recorded skater goals. Summer 2017 June 25 is 9 team goals '
                      'versus 8 credited; Winter 2015/16 February 21 is 13 team goals versus 14 credited. '
                      'The period scores corroborate the scoreboard, but no source identifies the player '
                      'whose goal is missing or duplicated. Preserve individual stats; publish team and '
                      'credited-player totals separately until a source correction is possible.')
        elif season == 'Winter 2016/2017' and stat in ('GF', 'Points2W1T'):
            decision = 'RETAIN_PLAYED_GAME_CONVENTION'
            reason = ('Difference is entirely administrative defaults: one regular-season 1-0 default '
                      'and two playoff 1-0 defaults. Existing GF excludes default goals; existing playoff '
                      'record excludes two default wins. Retain these historical played-game figures, '
                      'and expose administrative results separately rather than silently redefining them.')
        elif key == ('Winter 2013/2014', 'Playoffs', 'GA'):
            decision = 'RETAIN_SHOOTOUT_EXCLUSION'
            reason = ('The extra team goal against is the standalone April 27 shootout-decider entry '
                      '(0-1 final, 1-2 shootout). Excluding its deciding goal yields 8 GA. April 6 also '
                      'contains a goalie GA error in the 1-0 overtime entry, which must not be propagated. '
                      'Retain 8 for on-ice GA, keep the shootout result in W/L, and keep GAA separate.')
        elif stat == 'PIM':
            decision = 'PROPOSE_TEAM_PIM_NORMALIZATION'
            reason = ('Use recorded skater plus goalie PIM for a consistently defined team total. '
                      'The legacy figure normally includes skaters only. Winter 2023/24 playoffs is '
                      'also missing the April 7 skater minor: 16 old, 18 skater, 2 goalie, 20 combined. '
                      'The July 26 2015 and April 19 2015 recaps explicitly identify goalie penalties '
                      'served by skaters; those servers are not charged again in the player tables. '
                      'This proposal sums personal PIM, not powerplay minutes or penalty opportunities.')
        elif stat == 'GA' and key not in (('Summer 2015', 'Season', 'GA'), ('Winter 2018/2019', 'Playoffs', 'GA')):
            decision = 'PROPOSE_TEAM_GA_NORMALIZATION'
            reason = ('Legacy value equals aggregate goalie GA; team scoreboard GA includes goals '
                      'not charged to a goalie. Use the scoreboard for team GA, preserving goalie GA/GAA. '
                      'The difference alone is not proof of an empty-net goal; individual game evidence '
                      'is attached and undocumented cases remain labelled unattributed. April 14 2024 '
                      'game notes explicitly document two empty-net powerplay goals.')
        else:
            decision = 'PROPOSE_LEDGER_CORRECTION'
            reason = {
                ('Summer 2015', 'Season', 'GA'): 'Ten game scoreboards total 36 GA, and goalie season totals independently sum to 36. Published 48 has no support in either captured ledger.',
                ('Winter 2018/2019', 'Playoffs', 'GA'): 'The three losses allow 6, 4 and 5 goals: total 15. Goalie season totals also sum to 15. Published 14 is unsupported.',
                ('Winter 2018/2019', 'Playoffs', 'Points2W1T'): 'All three schedules explicitly show losses. Correct W-L-T from 0-0-3 to 0-3-0; points stay 0 and the bronze-final placement note is preserved without claiming independent placement verification.',
                ('Winter 2013/2014', 'Season', 'PPG'): 'Published individual season PPG and the game-by-game skater ledger both total 7, not 13. This reconciles recorded PPG; it cannot independently prove that every historical goal strength was tracked.',
                ('Winter 2014/2015', 'Season', 'PPG'): 'Published individual season PPG and the game-by-game skater ledger both total 3, not 9. This reconciles recorded PPG; it cannot independently prove that every historical goal strength was tracked.',
            }[key]
        row.update(reviewDisposition=decision, rationale=reason)
        if decision.startswith('PROPOSE_'):
            row['proposedValue'] = row['calculatedValue']
            row['proposedRecord'] = row['calculatedRecord'] if stat == 'Points2W1T' else None
        reviews.append(row)
    counts = dict(collections.Counter(r['reviewDisposition'] for r in reviews))
    assert len(reviews) == 32 and sum(counts.values()) == 32
    assert len(details) == 370 and len({g['sourceURL'] for g in details}) == 370
    result = {
        'status': 'FULL_32_DIFFERENCE_REVIEW_COMPLETE_PROPOSALS_NOT_APPLIED',
        'scope': 'All 192 existing team archive entries screened; all 32 numerical/record differences reviewed.',
        'ownerClarification': 'Adam confirms the four Summer 2013 games were never tracked. Permanent historical limitation, not a source-recovery task. Recorded-stat milestone dates remain in place.',
        'dispositionCounts': counts,
        'coverageCaution': 'The other 160 entries match captured comparison values, not an independent completeness certification. In particular Summer 2013 PPG/SHG zeros and playoff PIM 8 reflect incomplete tracking.',
        'nativeEditsThisReview': 0,
        'entries': reviews,
        'missingScopes': audit['missingScopes'],
    }
    (DIR / '261020_Team_Record_Full_Review.json').write_text(json.dumps(result, indent=2) + '\n')
    lines = ['# Brave H.C. — full team-record review', '',
             'All 192 existing archive entries screened; all 32 differences reviewed. No backend or widget values changed in this review.', '',
             '## Findings', '']
    lines += [f'- {v}: {k}' for k, v in counts.items()]
    lines += ['', '## Record-by-record disposition', '',
              '| Category | Season / scope | Archive | Comparison | Disposition |',
              '|---|---|---:|---:|---|']
    for r in reviews:
        lines.append(f"| {r['category']} | {r['season']} / {r['scope']} | {r['sourceText']} | {r['calculatedValue']:g}" +
                     (f" ({r['calculatedRecord']})" if r['stat'] == 'Points2W1T' else '') +
                     f" | {r['reviewDisposition']} |")
    for i, r in enumerate(reviews, 1):
        lines += ['', f"## {i}. {r['category']} — {r['season']} {r['scope']}", '', r['rationale'], '']
        relevant = r['evidenceGames']
        if r['stat'] == 'PIM':
            relevant = [g for g in relevant if g['goaliePIM'] or (r['season'] == 'Winter 2023/2024' and g['skaterPIM'])]
        elif r['stat'] in ('GF', 'GA') and r['reviewDisposition'] not in ('PROPOSE_LEDGER_CORRECTION', 'RETAIN_QUALIFIED_HISTORICAL_ENTRY'):
            relevant = [g for g in relevant if g['defaultForfeit'] or g['shootout'] or g['scoreVersusSkaterGoalDifference'] or g['scoreVersusGoalieGADifference']]
        for g in relevant:
            lines.append(f"- [{g['date']}]({g['sourceURL']}): {g['result']}, score {g['GF']}-{g['GA']}; credited G {g['publishedSkaterGoals']:g}, goalie GA {g['goalieGA']:g}, skater/goalie PIM {g['skaterPIM']:g}/{g['goaliePIM']:g}.")
    lines += ['', '## Scope and counting rules', '',
              '- Retain historical played-game default exclusions and shootout-goal exclusions; track administrative outcomes and shootout results separately.',
              '- Team GA and goalie GA are separate measures. Never overwrite goalie statistics to force agreement with team scores.',
              '- Team PIM normalization includes assessed goalie PIM, without assigning the same penalty to its server. It is not elapsed shorthanded time.',
              '- Four Summer 2013 player-stat gaps are owner-confirmed and permanent. Do not infer player appearances or treat unavailable penalty/strength data as verified zero.',
              '- Keep historical placement and COVID notes intact. No independent certification of every playoff placement or leadership claim is asserted.',
              '- Winter 2020/21 is missing from the archive: 3 games, 2-1-0, 13 GF, 13 GA, 2 recorded PIM. Add only as a clearly identified abbreviated season.',
              '- Winter 2026/27 is ongoing: keep current statistics separate from completed-season records.',
              '', '## Publication state', '',
              '23 proposed value/record updates: five direct ledger corrections and eighteen team-total normalizations. Nine entries retained with explicit explanations. No proposals applied yet. Source conflicts and historical limitations are documented rather than declared resolved facts.',
              'New record categories are a subsequent phase; this report does not create or certify new records.', '']
    (DIR / '261020_Team_Record_Full_Review.md').write_text('\n'.join(lines))
    print(json.dumps({'reviewed': len(reviews), 'counts': counts}, indent=2))


if __name__ == '__main__':
    run()
