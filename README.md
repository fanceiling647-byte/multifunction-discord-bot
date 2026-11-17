# Multifunction Discord Bot

A multifunction Discord bot built with Node.js and discord.js v14. The recommended mode is the **persistent Discord Gateway client**, which makes the bot show as online and supports a custom presence.

## Run as an online bot (Windows / Node.js)

1. Install Node.js 20 or newer from https://nodejs.org/.
2. Download or clone this repository to your computer.
3. Open a terminal in the repository folder and run:
   `npm install`
4. Copy `.env.example` to a file named `.env`.
5. Fill in `DISCORD_TOKEN` and `CLIENT_ID` in `.env`. Never share or commit this file.
6. In the Discord Developer Portal → your application → **General Information**, clear the **Interactions Endpoint URL** field and save. This makes Discord deliver slash-command interactions through the Gateway connection instead of the old Cloudflare HTTP endpoint.
7. In the terminal, run:
   `npm run deploy`
8. Start the bot:
   `npm start`

When it connects, the bot logs in and sets its presence to **Watching Westhaven RP**. Keep the terminal window and computer running to keep it online. If the computer sleeps, shuts down, or loses internet, the bot goes offline.

## Commands

### General
- `/ping` — Check bot response
- `/help` — Show the command list
- `/serverinfo` — Show server details
- `/userinfo [user]` — Show member information
- `/avatar [user]` — Display an avatar

### Moderation
- `/kick user [reason]`
- `/ban user [reason]`
- `/timeout user minutes [reason]`
- `/warn user reason`
- `/warnings user`
- `/purge amount`

Moderation commands require the relevant moderator permissions. The bot itself must also have the required permissions and a role high enough to moderate the target.

## Environment variables

See `.env.example`:
- `DISCORD_TOKEN` — bot token (secret)
- `CLIENT_ID` — Discord application ID
- `GUILD_ID` — optional test server ID for faster command updates

If the bot token was ever exposed, reset it in the Discord Developer Portal before using it again.

## Optional Cloudflare Worker mode

The repository also retains `src/worker.js` and `wrangler.jsonc` for HTTP-interaction deployments. That mode can respond to slash commands but **does not maintain a Gateway connection or show the bot as online**. Do not set the Discord Interactions Endpoint URL to the Worker if you want to use the online Gateway mode above.

Cloudflare Workers have platform limits and are not a general-purpose always-on Node.js host. See the [official limits](https://developers.cloudflare.com/workers/platform/limits/).

## Project layout

```
src/
  commands/
    general.js
    moderation.js
  lib/
    storage.js
  worker.js                # optional Cloudflare HTTP interactions handler
  index.js                 # persistent discord.js Gateway entry point
  deploy-commands.js       # one-time slash-command registration
migrations/
  0001_create_warnings.sql # used by optional Cloudflare D1 mode
wrangler.jsonc
```
