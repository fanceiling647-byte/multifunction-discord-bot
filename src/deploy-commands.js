require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const { REST, Routes } = require("discord.js");

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;
if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error("Missing DISCORD_TOKEN or CLIENT_ID environment variable.");
  process.exit(1);
}

const commands = [];
const commandDirectory = path.join(__dirname, "commands");

for (const file of fs.readdirSync(commandDirectory).filter(name => name.endsWith(".js"))) {
  for (const command of require(path.join(commandDirectory, file))) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Refreshing ${commands.length} application command(s)...`);
    const route = GUILD_ID
      ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
      : Routes.applicationCommands(CLIENT_ID);

    await rest.put(route, { body: commands });
    console.log(`✅ Successfully registered ${commands.length} command(s) ${GUILD_ID ? "to test guild" : "globally"}.`);
  } catch (error) {
    console.error("Failed to register commands:", error);
    process.exitCode = 1;
  }
})();
