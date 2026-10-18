# Hand-Foot-Toe scoring spec (v4, 2026-10-18)

Source: scoring.txt (authoritative), hand-foot-toe.xlsm (Game/Scoring sheets, new_game macro), plus clarifications from Rick. Game rules are in rules.md.

## Decisions
- Two fixed teams, editable names (default "girls", "guys").
- Entry per team per round, mirroring the sheet.
- Old spreadsheet history is not imported; start fresh.
- Scoring constants and meld table are editable settings.

## Implementation
- Single self-contained HTML file (hand-foot-toe.html), opened as a local file (file://). No server, no network, no CDN.
- Target: desktop Mac/Windows browsers (Safari, Chrome, Edge, Firefox). iPad app is a possible later goal.
- Persistence: localStorage, single namespaced key `hft.v1`, saved on every edit. Cookies rejected (unreliable on file://).
- Emailed copy starts with empty storage → recipient starts own history.
- Source form: one hand-edited HTML file, no build step. Scoring core in `<script id="core">` (pure functions, global `HFT`); UI in `<script id="ui">`.
- Tests: `node test-core.js hand-foot-toe.html` extracts the core block and runs assertions.
- Stored schema version; newer page versions migrate older data.
- Tabs: Game, History, Settings, Import / Export, Rules.

## Game
- 4 rounds, entered strictly in order 1..4.
- game_total[t] = sum of round_score[t][r] over entered rounds.
- Winner = higher game_total; equal = tie (no tiebreak).
- Forfeit: game may end early; current round is scored as of the moment of forfeit (no team went out). Forfeiting team is always the trailing team; winner = higher total; game flagged forfeit.
- Discard: abandons the in-progress game without recording it.
- Once saved to history a game is immutable (no reopen, no edit).
- A game in progress snapshots team names, location, points and meld table at start; settings changes apply to the next game.

## Round inputs (per team)
| field   | type        | constant |
|---------|-------------|----------|
| deal    | bool (0/1)  | 200 — at most one per team per round (hand and foot dealers only; toe ineligible) |
| clean   | int >= 0    | 500 |
| dirty   | int >= 0    | 300 |
| sevens  | int >= 0    | 2000 |
| fives   | int >= 0    | 1500 |
| wilds   | int >= 0    | 1000 |
| red3    | int >= 0    | 100 (tabled only) |
| out     | bool        | 500 — exactly one team per completed round; zero teams allowed only in a forfeit round |
| count   | int         | x1, card points on table (including cards in canastas) |
| penalty | int         | -abs(x), all unplayed cards incl. unreached foot/toe and held red 3s (-100 each) |

round_score[t] = deal*200 + clean*500 + dirty*300 + sevens*2000 + fives*1500 + wilds*1000 + red3*100 + out*500 + count - abs(penalty)

Stock exhaustion has no scoring effect (discard pile is reshuffled).

## Meld requirement
- Per team. Round 1 = base (50).
- Round r>1: look up game_total[t] after rounds 1..r-1 in table; highest threshold <= total.
- Table: 0→50, 7500→90, 15000→120, 22500→150, 30000→180, 37500→220. Negative total → 50.
- meld_original[t][r] is frozen when round r-1 is completed (r=1: base at game start).
- Earlier rounds of the in-progress game may be edited. meld_current is recomputed from current totals.
- Display: "original" if equal, else "original / current". Only original and latest are kept. Edits never change meld_original.

## Validation
- Integer fields must be whole numbers; canasta and red-3 counts >= 0.
- Finished rounds must have exactly one team out; the current round at most one.
- "Finish round" enabled only when exactly one team is out and no errors; "Record game" only after round 4 with no errors.

## History record (per finished game)
- id (random v4 UUID, generated at game start), started/finished timestamps (ISO), site label (from settings), team names, final total per team, red-3 count total per team, forfeit flag, rounds played.
- Derived: winner, margin, win counts, ties, cumulative points, points lead, cumulative red 3s, average game, high game, current streak, forfeits. History tab can filter by location.
- Game tab shows the last 4 games below the score sheet.
- Settings changes do not affect history (totals stored, not inputs).

## Export / import / merge
- Export: downloads hft-<location>-YYYYMMDD.json containing app id, schema, settings, history, and current game if any.
- Import history = merge: set union keyed by game id. Idempotent and commutative; repeated cross-imports never duplicate.
- History has no delete, so union is sufficient (no tombstones).
- Team mapping on import: matched by name (case-insensitive, either order); if names differ, user maps incoming teams to local teams before merge. Merged records take local team names.
- Settings are not overwritten by a merge; separate explicit "Use this file's settings" action.
- Loading a current game from a file is a separate explicit action, only when no local game is in progress.
- "Erase all data" requires typing ERASE.
