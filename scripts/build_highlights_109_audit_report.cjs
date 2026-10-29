'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
const r=require('../docs/261028_Highlights_109_Profile_Parity_Register.json'),c=r.counts;
const lines=[];
function add(...items){lines.push(...items);}
add('# Brave H.C. — 109-player Highlights source-parity audit','',
'**Audit baseline:** October 28, 2026. **Lead:** BruTTech Engineering. **Current assessment:** source-reconciled across available public HTO snapshots, with open publication holds. This is not proof that every achievement across every season has been recovered.','',
'## Verified source coverage','',
'- **109/109** HTO player identities crossmatch their official player profiles and career source names.',
'- **43** players have captured native Highlights; **306** native source rows and **37** separately source-qualified supplemental club entries give **343** recorded Highlights items. **66** player profiles have no native Highlights captures; lack of a capture is not evidence that a trophy was earned or missed.',
'- The public historical Awards & Honors source has **'+c.officialHistoricalAwardWinnerRows+' explicit award-winner rows** (excluding '+c.officialNoRookieRows+' no-rookie seasons). **'+c.awardEventsMatchedNative+'** crossmatch their native Highlight entries, **'+c.awardEventsMissingNative+'** is absent, **'+c.awardNativePeriodConflicts+'** has inconsistent season wording, and **'+c.awardMetricDisagreements+'** crossmatched entries have discrepant reported point totals.',
'- The captured historical Individual Records source matches **'+c.recordRowsSourceMatched+'/'+c.publishedRecordRows+'** player record entries exactly.',
'- Leadership audit: **'+c.leadershipServiceRows+'** source-qualified service periods across **'+c.leadershipPlayers+'** players, including Dylan Brennan Team Captain 2018–2019, displayed as service history rather than new awards.',
'- The separate season-membership source covers '+c.partialSeasonEvidencePlayers+' players and is explicitly incomplete relative to the 109-profile archive. It cannot be used to infer attendance, eligibility or missing milestones.',
'- Independent live read-only HTO profile HTML readback completed October 29, 2026 at 02:51 UTC: **109/109** pages returned HTTP 200 and each contained the correct playerID in both the official Bio and Highlights embedded widget URLs. Bio embeds use embed=1; Highlights embeds do not. The detailed receipt is preserved locally on BRUTTECH 1 and is not an award-evidence source.','',
'## Review holds: public award rows that must not be silently rewritten','',
'**1. Mark Pastore — Art Ross Summer 2016.** The official public HTO Awards page lists: “2016 - Mark Pastore - 10G, 13A, 23PTS, 0PIM”. The captured native Highlights ledger does not contain an Art Ross entry for Summer 2016. Reconfirmed against the live public Awards webpage. **Hold** for exact source scope and manager authorization before adding a supplementary historical award display. Preserve the native ledger.','',
'**2. Mark Arruda — Lady Byng Winter 2024/25.** The official historical Awards listing says 2024 and identifies Mark Arruda, corresponding to Winter 2024/25. The captured native Highlights text says “Lady Byng Award for Sportsmanship - Winter 2025/25”, an invalid span. **Hold** for approval of a display-only date correction, preserving original sourceText.','',
'## Source-specific Art Ross point disagreements','',
'| Player | Season | Public HTO historical Awards | Native Highlights source |','|:--|:--|--:|--:|');
for(const row of r.rows)for(const x of row.conflictingAwardMetrics){
 add('| '+row.playerName+' | '+x.period+' | '+x.publishedMetric+' points | '+x.nativeMetric+' points |');
}
add('',
'These are verified discrepancies between two published source strings, not proof that a particular total is wrong. Regular-season versus playoffs scope, historical transcription and recording differences are plausible but not verified. Do not replace either count until source game evidence reconciles the distinction.','',
'## Source provenance, definitions and repeatable validation','',
'- Official Awards: '+r.officialAwardProvenance.source+'; saved source snapshot '+r.officialAwardProvenance.capturedAt+'.',
'- Official Records: https://www.htosports.com/teams/default.asp?u=BRAVESHOCKEY&s=hockey&p=records; captured source from October 28, 2026.',
'- Original HTO Highlights ledger: captured '+r.sourceInputs.find(x=>x.file==='player-highlights-ledger.json').capturedAt+'. Original source counts, awards, milestone dates and formatting remain untouched.',
'- Standing leadership presentation from live PR #159 is separate from awarded trophies and native achievement counts.',
'- See the accompanying JSON register (261028_Highlights_109_Profile_Parity_Register.json) for all 109 ID/name pairs, source hashes, per-player award match statuses, team-service observations, record parity and explicit holds.',
'- Reproduce offline: node scripts/audit_highlights_complete_109.cjs --check and node --test tests/test_highlights_109_source_parity.cjs.',
'- On-demand live public iframe identity readback: node scripts/audit_hto_109_profile_iframes.cjs RECEIPT_PATH. Unlike the deterministic 109 JSON register, this check must not be used to modify the source or automatically grant award status.','',
'## Per-player public source reconciliation','',
'The Award History field is “official winner rows matched to native Highlights / all known official winner rows”. It is NOT a complete awarded trophy count. Native Highlights includes more categories than the historical awards list. “None captured” does not mean no real achievement.','',
'| Player | HTO ID | Native Highlights | Award History | Leadership periods | Player records | Open holds |',
'|:--|--:|--:|:--|--:|--:|:--|');
for(const row of [...r.rows].sort((a,b)=>a.playerName.localeCompare(b.playerName))){
 const matched=row.publicAwardHistoryEvents.filter(x=>x.matchStatus==='NATIVE_LEDGER_MATCH').length;
 const all=row.publicAwardHistoryEvents.length;
 const holds=[
  ...row.openAwardSourceHolds.map(x=>'MISSING '+x.type+' '+x.period),
  ...row.duplicateAwardSourceHolds.map(x=>'CONFLICT '+x.type+' '+x.period),
  ...row.unmatchedRecordSourceRows.map(x=>'RECORD '+x.category)
 ];
 const clean=s=>String(s).replace(/\|/g,'\\|');
 add('| ['+clean(row.playerName)+']('+row.publicHTOProfile+') | '+row.htoPlayerID+' | '+
  row.nativeHighlights.count+' | '+matched+'/'+all+' | '+row.teamServiceTenures.length+
  ' | '+row.nativeRecordRows+' | '+(holds.join('; ')||'—')+' |');
}
add('','## Release decision and remaining requirements','',
'- [x] 109 official identities and exact profile URL joins reviewed.',
'- [x] 145 public historical winner rows matched or explicitly flagged; no unstated winner inferred.',
'- [x] All 230 captured individual Records crossmatch source; all 13 documented service periods included.',
'- [x] 3 HTO historic-vs-native point-count discrepancies remain visible as separate source values.',
'- [ ] The missing Mark Pastore Summer 2016 award and malformed Mark Arruda season label require publication approval and a separate source-qualified correction.',
'- [ ] Evidence from every actual game/snapshot across all seasons is not yet proven complete. Do not claim universal lifetime award completeness from the available source snapshot.','',
'**No native HTO CMS editor changes, unapproved new awards, source-workbook mutations, emails, private video uploads or projections were performed by this audit.**','');
const output=lines.join('\n'),file=path.join(root,'docs/261028_Highlights_109_Profile_Source_Parity_Audit.md');
if(process.argv.includes('--check')){
 if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==output){console.error('HIGHLIGHTS_REPORT_STALE');process.exit(2);}
 console.log('HIGHLIGHTS_109_REPORT_REPRODUCIBLE',r.rows.length);process.exit(0);
}
fs.writeFileSync(file,output,'utf8');
console.log('HIGHLIGHTS_109_AUDIT_REPORT_WRITTEN',output.length,'characters');
