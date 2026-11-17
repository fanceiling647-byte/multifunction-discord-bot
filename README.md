# Multifunction Discord Bot

A multifunction Discord bot deployed as a **Cloudflare Worker** using Discord's HTTP Interactions endpoint. It does not keep a permanent Discord Gateway connection, so it can run on the Cloudflare Workers Free plan within that plan's limits.

## Commands

### General
- `/ping` — Worker response time
- `/help` — command list
- `/serverinfo` — server details
- `/userinfo [user]` — account and membership details
- `/avatar [user]` — display an avatar

### Moderation
- `/kick user [reason]`
- `/ban user [reason]`
- `/timeout user minutes [reason]`
- `/warn user reason` — persistent D1 warning record
- `/warnings user` — view recorded warnings
- `/purge amount` — delete up to 100 recent messages

Moderation commands require the relevant moderator permissions. The bot itself must also have the required permissions and a role high enough to moderate the target.

## Cloudflare deployment

The repository is configured for the existing Worker name `federal-assistant-bot-one`.

1. In Cloudflare Workers & Pages, open **federal-assistant-bot-one**.
2. If the project is connected to GitHub, set the deployment command to `npx wrangler deploy`. Do not configure it as a Pages static site and do not set a static output directory.
3. Make sure the build/install step installs dependencies (for example, `npm install` or `bun install`). Wrangler reads `wrangler.jsonc` and deploys `src/worker.js`.
4. In the Worker settings, add these three secrets (use **Settings → Variables and Secrets**):
   - `DISCORD_TOKEN` — your bot token
   - `DISCORD_PUBLIC_KEY` — the Public Key shown on your Discord Developer Portal application's **General Information** page
   - `DISCORD_APPLICATION_ID` — your Discord Application ID
5. Deploy the Worker. The Wrangler configuration declares a D1 database binding named `DB`; Cloudflare may provision the database when deploying this config.
6. Apply the warning-table migration from the repository root using Wrangler:
   `npx wrangler d1 migrations apply federal-assistant-bot-one-db --remote`
7. In the Discord Developer Portal, open your application → **General Information** and set **Interactions Endpoint URL** to the Worker URL shown in the Cloudflare dashboard (the public `workers.dev` URL, not the dashboard URL). Discord will validate the endpoint.
8. Register slash commands once from a trusted local computer:
   - Install dependencies with `npm install`
   - Copy `.env.example` to `.env`
   - Set `DISCORD_TOKEN` and `CLIENT_ID` locally (the application ID)
   - Run `npm run deploy`
   - Never commit `.env` or paste the bot token into chat.

If the D1 database was not automatically created during deployment, create a D1 database named `federal-assistant-bot-one-db` in Cloudflare and add its database ID to the `d1_databases` entry in `wrangler.jsonc`, then redeploy and apply the migration.

## Important limitations

This Worker uses Discord HTTP interactions, not the Gateway WebSocket client. Slash commands work when Discord sends an interaction to the endpoint. It does **not** receive arbitrary message events, member join/leave events, presence updates, or ordinary Gateway events. Features that depend on those events need a separate always-on Gateway host.

Cloudflare Workers Free has usage and execution limits. It is not an unlimited VPS. Check Cloudflare's current [Workers pricing and limits](https://developers.cloudflare.com/workers/platform/pricing/) before adding high-volume features.

## Local command registration

The `src/deploy-commands.js` script uses discord.js command builders to register the commands with Discord. It is a one-time/admin task and is not run inside the Worker.

## Project layout

```
src/
  commands/
    general.js
    moderation.js
  lib/
    storage.js             # legacy JSON storage for the old Gateway version
  worker.js                # Cloudflare HTTP interactions handler
  index.js                 # legacy Node.js Gateway entry point
  deploy-commands.js       # slash-command registration
migrations/
  0001_create_warnings.sql
wrangler.jsonc
```

Never commit bot tokens or other secrets. If a token was ever exposed, reset it in the Discord Developer Portal before deploying.
