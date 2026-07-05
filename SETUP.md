# RollCall — Setup Guide

RollCall reads the emoji reactions from your raid signup post and gives you a
drag-and-drop sheet builder, ending with a PNG you can post to Discord.

You need three things, all one-time:

1. Node.js (you likely already have it)
2. A Discord "bot" — really just an API key that lets the app read reactions
3. Run `setup.bat`

---

## 1. Node.js

If you already run GW2 Automated Raid Summaries, you have this. Otherwise
install the LTS version from https://nodejs.org (Node 18 or newer).

## 2. Create the Discord bot (~10 minutes, one time only)

The "bot" never posts, never talks, and doesn't run anywhere — it's just a
key that lets RollCall ask Discord "who clicked these emojis?"

1. Go to https://discord.com/developers/applications and log in with your
   Discord account.
2. Click **New Application**, name it `RollCall` (any name works), click **Create**.
3. In the left sidebar click **Bot**.
   - Click **Reset Token**, confirm, then **Copy** the token that appears.
     ⚠ This token is shown only once — paste it somewhere safe for step 3 below.
   - You do NOT need to enable any of the "Privileged Gateway Intents" toggles.
4. In the left sidebar click **OAuth2**.
   - Under **OAuth2 URL Generator → Scopes**, check `bot`.
   - Under **Bot Permissions** (appears below), check only:
     - `View Channels`
     - `Read Message History`
   - Copy the **Generated URL** at the bottom, paste it into your browser,
     and add the bot to your guild's server. (You need the *Manage Server*
     permission on that server — or send the URL to an admin who has it.)

The bot will appear in your server's member list, offline forever. That's normal.

## 3. Install RollCall

1. Double-click **`setup.bat`**. It installs everything and creates a `.env` file.
2. Open **`.env`** with Notepad. Replace `paste-your-bot-token-here` with the
   token you copied in step 2, so it looks like:

   ```
   DISCORD_BOT_TOKEN=MTAxMjM0NTY3ODkwMTIzNDU2Nzg.XxXxXx.abcdefg...
   ```

3. Save and close Notepad.

⚠ Never share the `.env` file or your token with anyone. If it leaks, go back
to the Developer Portal → Bot → Reset Token, and paste the new one into `.env`.

## 4. Using RollCall

1. Double-click **`start.bat`** — the app opens in your browser.
   Keep the black window open while you use it.
2. In Discord, right-click the **first** raid signup post (the one with the
   Yes/Maybe emojis) → **Copy Message Link**.
3. Paste the link into RollCall and click **Fetch signups**. If the signup
   spans several posts, RollCall automatically includes the follow-up posts
   made by the same person. (You can also paste all the links at once,
   separated by spaces, to pick the posts yourself.)
4. Build the sheet:
   - Drag player chips from the left onto the grid.
   - Click **✨ Auto-fill** to fill remaining slots automatically
     (it never moves people you placed by hand).
   - Click a placed player's class label to change their class.
   - Drag a player back to the left panel (or click ×) to remove them.
   - **⚙ Columns & parties** lets you add/remove columns and party rows.
5. Type the raid title/date in the title box, then click **⬇ Download PNG**
   and post the image in Discord.

## Configuration files (optional)

- **`config/classes.json`** — maps Discord emoji names to class labels and
  colors, and lists the Yes/Maybe attendance emoji names. If the guild adds
  or renames an emoji, update it here. If RollCall shows a yellow
  "unmapped emojis" warning after fetching, the names it lists belong here.
- **`config/columns.json`** — the default columns (allowed classes per
  column) and default number of parties.

Both files can be edited with Notepad while the app is running — just fetch
again afterwards.

## Troubleshooting

- **"No bot token configured"** — edit `.env` (step 3) and restart via `start.bat`.
- **"Could not read that message"** — the bot isn't in the server yet, or it
  can't see that channel. Re-do step 2.4, and check the channel's permission
  overrides allow the bot (or give the bot's role access).
- **Wrong names showing** — RollCall uses server nicknames when available,
  otherwise Discord display names.
