# Brave H.C. Trophy Room — Unified Medal and Award Styling

Date: October 28, 2026
Lead department: Engineering · HockeyOS / Brave H.C.
Authorized source computer: BRUTTECH 1 (AdamPCDesktop)
Release boundary: UI/artwork only; HTO native Records and Awards not modified

## Founder-requested design

Unify the previously inconsistent milestone medals, cards and award presentation into one professional video-game-style collection. Every milestone must use the same underlying authentic Brave H.C. crest, centered numeric milestone and metric label with **identical** typography dimensions. Each milestone's medal ring, card border, card background and tier pill correspond to bronze, silver, gold or platinum.

All Awards-view cards and historical honour cards in All have a consistent gold background and gold border. Their authentic approved trophies, medals, silver nomination stars, championship crests and leadership art are unchanged; a gold collection surface **does not grant an award or relabel a nomination**. Three disciplinary records remain neutral under All only. Statistical records retain the existing Records styling.

## Source and migration

- Published/source-verified original player history: 343 Highlights across 43 published profiles; 134 milestone events, 206 other honours, 3 disciplinary entries. Player Record Book: 230 mapped statistical records for 109 identities; original HTO statistical Records: 463, Awards: 281 (unchanged). Do not infer recipients.
- All 29 *template thresholds* in six families (Games, Points, Wins, Goals, Assists, Shutouts) now use a single 200×200 full-crest WebP treatment, generated from the authentic Brave H.C. 1000px logo (SHA `d27f74ca6c64ebcd1cd7d1a7f4758315987c10ad0ef2f7da5f99e8757568d51e`), with source attestation to the authentic 5000px archived logo (SHA `e245640bd0c1f3c3c8e3caea89e69a446d465f97724d9c6878992670229730b5`).
- Older 22 Game/Point/Win original image files and source manifest remain **byte-identical** as source-history/rollback evidence. The display uses 22 newer matching full-crest alternatives alongside the previously introduced seven Goal/Assist/Shutout thresholds.
- New artifact source manifest: `widgets/assets/full-crest-clubs/source-manifest.json` schema v2, explicitly records matching original image provenance and 134 source-earned milestones.
- Static badge design at 600px working resolution: **118px bold number** and **51px bold category** for every family and threshold; center x=300, overlay plate, no special-case font-size reduction for 1000 values. Runtime-only future badges use matching 39px / 17px canvas equivalent at 200px.
- Production source: `widgets/player-highlights-v2.js?v=20`, HTML scoped CSS in `widgets/player-highlights.html`. Tab structure unchanged (Milestones / Awards / All / Records). The exact 29 new full-crest source files display in Milestones, All, and the complete history under All.
- Template regeneration: `python scripts/build_unified_milestone_art.py --write` on BRUTTECH 1; `--check` confirms deterministic files. Previous `build_fullcrest_milestones.py` delegates to it to prevent accidental reversion to only seven designs. 22 originals are never overwritten.

## Typography and responsive rules

Common badge card label: 11px, center-aligned, normal inline flow (preserves linked honoree name text). Card dates 10px; kicker and tier chip 9px. One 96px image footprint for milestones, awards and All (88px on narrow screens). No font-size shrinkage across categories.

Awards use a shared gold gradient and border without recolouring approved artwork. Milestones have independent bronze/silver/gold/platinum card gradients and matching medal rims, while Records remain statistical and discipline remains neutral. Avoid stacked decorative boxes or unnecessary navigation.

## Acceptance criteria

1. All 29 medallion templates source-authentic, source-hashed, no new earned badges invented; old 22 assets unchanged and available as rollback source.
2. 109 identities, 343 Highlights, 134 milestones, 206 honour items, 3 discipline records and 230 player-mapped official statistical records unchanged.
3. Browser checks at 320/355/810/1280 widths show no horizontal overflow; four in-place tabs, All pagination, empty-state, and historic date details remain functional.
4. All medal cards have exact tier colour; all award/honour cards gold; discipline/statistical records excluded from gold.
5. All visible badge labels show 11px typography centered in normal inline flow (linked names don't separate into extra columns); dates 10px, medal number+category exactly centered and consistent at source.
6. Historical image, transparent alpha, native source, source refresh, and independent QA gates pass. CI required before merge, Pages deployment readback after merge; HTO embedded player profile must show v20 without reinstalling iframe.

## Rollback

Revert only the UI/artwork commit (or restore previous verified v19 HTML and JS) and keep original `round-clubs` artwork and all authoritative HTO/Awards/Records data. Never treat visual styling as authority to create, certify or update an award or milestone.
