# Hand-Foot-Toe Scorekeeper

A scorekeeper and game-history tracker for Hand-Foot-Toe, a six-deck,
four-player partnership variant of Hand and Foot. It replaces the
`hand-foot-toe.xlsm` spreadsheet.

The whole application is one self-contained HTML file. No server, no
install, no network access, no build step, no subscription.

## Files

| File | Purpose |
|---|---|
| `hand-foot-toe.html` | The application. Open it in a browser. |
| `rules.md` | Game rules, including house rules. Also shown in the app's Rules tab. |
| `scoring-spec.md` | Scoring and data specification the app implements. |
| `test-core.js` | Test suite for the scoring core embedded in the HTML. |
| `scoring.txt` | Original rules and scoring notes. Authoritative source for the spec. |
| `hand-foot-toe.xlsm` | Original Excel spreadsheet. Retained for reference; history was not imported. |
| `LICENSE` | MIT license. |

## Using it

1. Open `hand-foot-toe.html` in Safari, Chrome, Edge or Firefox (Mac or Windows).
2. Set team names and location in **Settings**.
3. On the **Game** tab, start a new game and enter each team's results per round,
   rounds 1 through 4 in order. Meld requirements are computed and shown per team.
4. **Finish round** after each round; **Record game** after round 4.
   A trailing team may **Forfeit**; **Discard** abandons a game without recording it.
5. **History** shows past games, win counts, streaks, averages, high game and
   cumulative totals, filterable by location.

Data is saved automatically in the browser's local storage (key `hft.v1`) on
every edit. Storage is per browser and per file location: a different browser,
a private window, or a moved file sees an empty history.

While a game is in progress the Game tab hides the top tab bar; the column
beside the score grid holds the round buttons and links to the other tabs.

### Entry order

Enter and Tab move the cursor in scoring order (Shift goes back). In the
current round:

1. Deal bonus for each team.
2. The first team to report: unplayed cards, clean canastas through red threes,
   then went out. Went out comes last so the team going out declares its red
   threes and then "and we went out".
3. The other team: the same sequence.
4. Count on table for each team, then **Finish round**.

Either team can report first: after a team's went out, the cursor goes to the
other team's unplayed cards if they are still empty, otherwise to the counts.
In finished rounds, corrections move straight down each team's column. Space
toggles a checkbox; Enter and Tab pass it without changing it. Arriving in a
cell selects its value, so typing replaces it.

## Sharing and merging

- **Emailing the page** gives the recipient a clean copy. It opens with no
  history and they start their own.
- **Export** (Import / Export tab) downloads `hft-<location>-YYYYMMDD.json`
  with settings, history and any game in progress. Keep these as backups.
- **Import** merges another file's history into the local one. Games are keyed
  by a unique id, so merging is idempotent and order-independent: repeated
  cross-imports between two households never duplicate a game. Teams are
  matched by name; if names differ the app asks how to map them.
- Importing settings or a game in progress are separate, explicit actions.
- **Erase all data** requires typing `ERASE`. Export first.

## Scoring summary

Per team per round:

```
deal*200 + clean*500 + dirty*300 + sevens*2000 + fives*1500 + wilds*1000
  + red3*100 + out*500 + count - |penalty|
```

Meld requirement by game score at the start of the round:
0 → 50, 7,500 → 90, 15,000 → 120, 22,500 → 150, 30,000 → 180, 37,500 → 220.
All constants and the meld table are editable in Settings; changes take effect
with the next game. Full details in `scoring-spec.md`.

## Development

The HTML holds two script blocks:

- `<script id="core">`: pure scoring, validation, merge and migration functions,
  exposed as global `HFT`. No DOM access.
- `<script id="ui">`: rendering and event handling.

Edit the file directly. Run the tests with Node:

```
node test-core.js hand-foot-toe.html
```

The test harness extracts the core block from the HTML and runs assertions
against it, including a row taken from the original spreadsheet.

Stored data carries a schema version; newer versions of the page migrate older
data. A page refuses to import a file written by a newer schema.

## Possible future work

- iPad app.

## Credits

- **Rick** (rick@neverslow.com): the game as played, the original
  `hand-foot-toe.xlsm` spreadsheet and its scoring logic, `scoring.txt`,
  requirements, design decisions and review.
- **Claude** (Anthropic), working with Rick in Claude Cowork, October 2026:
  - Wrote the application, `hand-foot-toe.html`: scoring core, validation,
    meld tracking, history statistics, export / import / merge, schema
    migration and the user interface.
  - Wrote the test suite, `test-core.js`.
  - Composed `rules.md`, the written rules, from Rick's `scoring.txt`, the
    spreadsheet and his clarifications.
  - Wrote `scoring-spec.md` and this README.

## License

MIT. See `LICENSE`. Covers the application, tests, rules and documentation.
Derivatives must retain the copyright notice and license text.
