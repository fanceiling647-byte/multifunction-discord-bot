# Multifunction Discord Bot

A modular Discord bot built with **Node.js**, **discord.js v14**, and a small persistent JSON data store. Designed for deployment on Quaxly or another Node.js host.

## Included commands

### General
- `/ping` — bot/API latency
- `/help` — command list
- `/serverinfo` — server details
- `/userinfo [user]` — account and membership details
- `/avatar [user]` — display an avatar

### Moderation
- `/kick user [reason]`
- `/ban user [reason]`
- `/timeout user minutes [reason]`
- `/warn user reason` — recorded warning
- `/warnings user` — view recorded warnings
- `/purge amount` — bulk-delete up to 100 recent messages

Moderation commands have Discord default permission requirements and also check the bot's role hierarchy/API permissions.

## Requirements
- Node.js 20.11 or newer
- A Discord application and bot
- A host that supports persistent storage if you want warning data to survive redeployments

## Discord application setup
1. Create an application at https://discord.com/developers/applications.
2. Open **Bot** and create/reset the bot token if necessary.
3. Under **Bot → Privileged Gateway Intents**, enable **Server Members Intent** and **Message Content Intent** if you plan to add features that need them. This starter does not read ordinary message content, so Message Content can remain disabled until needed.
4. Under **OAuth2 → URL Generator**, select scopes `bot` and `applications.commands`.
5. Select only the permissions the bot needs: View Channels, Send Messages, Embed Links, Read Message History, Kick Members, Ban Members, Moderate Members, and Manage Messages.
6. Invite the bot to your server.

Never share your bot token. If it has been exposed, reset it in the Developer Portal immediately.

## Run locally
1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env`.
3. Fill in `DISCORD_TOKEN`, `CLIENT_ID`, and optionally `GUILD_ID` in the local `.env`.
4. Register commands: `npm run deploy`
5. Start the bot: `npm start`

When `GUILD_ID` is set, commands register to that test server and update quickly. Without it, commands register globally and may take time to appear.

## Quaxly deployment
1. Create a Node.js bot/service in your Quaxly dashboard.
2. Connect this GitHub repository or upload the project.
3. Set the install/build command to `npm install` (if the panel asks).
4. Set the start command to `npm start`.
5. Add environment variables in the host's secret/environment-variable settings:
   - `DISCORD_TOKEN` — newly reset bot token
   - `CLIENT_ID` — Discord application/bot ID
   - `GUILD_ID` — optional test server ID
6. Deploy/start the bot.
7. Run `npm run deploy` once from the host console or locally with the same environment variables to register slash commands.

Do not commit `.env`, tokens, or other secrets.

## Data and backups
Warnings are stored in `data/database.json`. The `data/` folder is intentionally ignored by Git because it may contain server data. Configure persistent storage on your host if available and periodically download a backup. If the host does not provide persistent storage, data may be lost on rebuild/redeploy.

## Project layout
```
src/
  commands/
    general.js
    moderation.js
  lib/
    storage.js
  deploy-commands.js
  index.js
.env.example
.gitignore
package.json
README.md
```

## Development
Add new feature modules under `src/commands/` and export an array of command objects. Each object should contain a discord.js SlashCommandBuilder as `data` and an async `execute(interaction)` function. The loader discovers command files automatically.
