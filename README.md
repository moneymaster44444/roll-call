# RollCall

A locally running squad-sheet builder for Guild Wars 2 WvW raids.

Guild members sign up for a raid by clicking class emojis on a Discord post.
RollCall reads those reactions and turns them into a drag-and-drop roster
builder, ending with a spreadsheet-style PNG you can post back to Discord.

## Features

- **One-link fetch** — paste the message link of the first signup post;
  follow-up posts by the same author are found and merged automatically.
- **Player pool** — every signed-up member as a draggable chip with their
  classes and confirmed/maybe status. Filter by class (organized by the
  groupings from the signup posts) and sort alphabetically, unassigned-first,
  by attendance, or by flexibility.
- **Party grid** — drag players into party slots; a class picker appears
  whenever the choice is ambiguous, and Cancel fully undoes the move.
- **Auto-fill** — one click fills the remaining slots, scarce roles first,
  least-flexible players first. Manual placements are never touched.
- **Configurable comp** — add/remove/reorder columns, set allowed classes per
  column, change party count; save any layout as the new default.
- **In-app config** — edit the emoji-to-class mapping, colors, and attendance
  emojis from the UI. Renames propagate everywhere automatically.
- **PNG export** — download the finished sheet (with title line) styled like
  a spreadsheet, with a warning if anyone is still unassigned.

## Requirements

- Windows with [Node.js](https://nodejs.org) 18+
- A Discord bot token with read-only access to your server
  (one-time, ~10 min — full walkthrough in [SETUP.md](SETUP.md))

## Quick start

1. Download/clone this repository.
2. Double-click **`setup.bat`** (installs dependencies, builds, creates `.env`).
3. Put your Discord bot token in **`.env`** (see [SETUP.md](SETUP.md)).
4. Double-click **`start.bat`** — the app opens in your browser.

## Configuration

Everything can be configured from the UI (⚙ Columns & parties → edit columns,
🏷️ Edit classes). The underlying files, if you ever want to edit them by hand:

| File | Contents |
| --- | --- |
| `config/classes.json` | Discord emoji name → class label/tag/color, plus the Yes/Maybe attendance emoji names |
| `config/columns.json` | Default columns (allowed classes per column) and party count |
| `.env` | Bot token and port — **never share or commit this file** |

## Development

```
npm install
npm run build   # build the UI into dist/
npm start       # serve on http://localhost:3117
npm run dev     # rebuild the UI on change
```

Express backend in `server/` (Discord REST calls, config read/write, static
hosting), React frontend in `client/src/`.

## Roadmap

- Check-for-updates button (pull latest GitHub release)
- Post the finished sheet directly to Discord

## License

[MIT](LICENSE)
