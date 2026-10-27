# HockeyOS — Even-Team Division Architect

**Status:** Implementation of flexible, unapproved research proposals.  
**Source:** Sports Village Sunday Winter, Brave H.C. HockeyOS adult-only League Intelligence, as of October 26, 2026.

## User-approved structural rule

**Every proposed division must contain an even number of teams.** HockeyOS currently supports exactly **4, 6, or 8 clubs per division**, never 3, 5, 7 or any other odd number. This is a rule about how many teams are **inside** each division; the total number of divisions can be three, four or five.

No teams from the separate VAHL or playoff-placeholder record are admitted. The 22 official adult Sunday team IDs and three original official divisions remain unchanged in source files.

## Exhaustive division-capacity configurations for 22 adult clubs

| Number of divisions | Available size patterns |
|---|---|
| Three | 6 + 8 + 8 |
| Four | 4 + 4 + 6 + 8; 4 + 6 + 6 + 6 |
| Five | 4 + 4 + 4 + 4 + 6 |

No layout omits or duplicates a club. All distinct ways to order capacities within each valid pattern are evaluated against the accepted source and only contiguous score-ranked groupings are considered. **This is not a proven global assignment optimum.**

## Three ranking approaches

- **Tightest rating balance:** chooses minimum descriptive index dispersion among legal layouts. This may favour more smaller divisions mechanically.
- **Balanced plus league operations:** weighs index spread with explicit research penalties for creating more divisions, moving teams, and missing direct head-to-head evidence.
- **Least disruptive design:** penalizes hypothetical team moves and added administrative divisions more heavily.

Coefficients are editorial research assumptions, not Sports Village rules or fitted game probability models. The UI separates the canonical size combination (e.g. `4+4+4+4+6`) from the selected ordering of research bands and shows every team name, original division and context index. The proposed layout's label does not mean an official division is renamed or a team transferred.

The existing 43 source-verified adult completed games, 79 independently admitted Brave historical games and weekly ledger supply evidence and uncertainty disclosures. **Only one current weekly observation exists.** Therefore no grouping is considered proven, no future game result is simulated, and no proposal is ready for league submission.

## Validation & no mutation

- Optimizer rejects odd overall adult team counts, odd division sizes, duplicate or omitted official team IDs, unsupported capacities and unqualified existing source data.
- Browser action rejects any selected candidate with odd division size or fewer than all 22 source clubs.
- Independent Node regression tests cover all capacity partitions, all legal ordering permutations, parity, deterministic best-scoring selection, proof limits, source invariants and no user authorization for actual league changes.
- Desktop and phone Chromium tests cover all four layout choices, focus selection, complete memberships, copy controls and no script errors or horizontal overflow.
- GitHub PR/main CI enforces source and even-size admission. Live original workbook, HTO, SVHL assignments and scheduled publisher are untouched.
- User-triggered **Copy proposed division layout** produces a plainly marked *provisional, not approved or submitted* internal briefing.

**Rollback:** Revert the scoped optimizer/UX pull request and leave existing completed games, weekly source history and official records intact.
