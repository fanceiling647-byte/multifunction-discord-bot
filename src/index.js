require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const {
  Client,
  Collection,
  Events,
  ActivityType,
  GatewayIntentBits,
  Partials
} = require("discord.js");

if (!process.env.DISCORD_TOKEN) {
  console.error("Missing DISCORD_TOKEN. Add it to your hosting provider's environment variables.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember, Partials.User]
});

client.commands = new Collection();

const commandDirectory = path.join(__dirname, "commands");
for (const file of fs.readdirSync(commandDirectory).filter(name => name.endsWith(".js"))) {
  const commands = require(path.join(commandDirectory, file));
  for (const command of commands) {
    client.commands.set(command.data.name, command);
  }
}

client.once(Events.ClientReady, readyClient => {
  console.log(`✅ Logged in as ${readyClient.user.tag}`);
  console.log(`📡 Connected to ${readyClient.guilds.cache.size} server(s)`);
  console.log(`🧩 Loaded ${client.commands.size} slash command(s)`);
  readyClient.user.setPresence({
    activities: [{ name: "Westhaven RP", type: ActivityType.Watching }],
    status: "online"
  });
  console.log("👀 Presence set to Watching Westhaven RP");
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    return interaction.reply({ content: "That command is not available.", ephemeral: true }).catch(() => {});
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Command /${interaction.commandName} failed:`, error);
    const response = { content: "Something went wrong while running that command. The error has been logged.", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(response).catch(() => {});
    } else {
      await interaction.reply(response).catch(() => {});
    }
  }
});

client.on(Events.GuildCreate, guild => {
  console.log(`➕ Joined server: ${guild.name} (${guild.id})`);
});

client.on(Events.GuildDelete, guild => {
  console.log(`➖ Left server: ${guild.name} (${guild.id})`);
});

client.on(Events.Error, error => console.error("Discord client error:", error));
process.on("unhandledRejection", error => console.error("Unhandled promise rejection:", error));
process.on("uncaughtException", error => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

client.login(process.env.DISCORD_TOKEN);
