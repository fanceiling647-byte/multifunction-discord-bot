const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");
const { getWarnings } = require("../lib/storage");

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName("ping")
      .setDescription("Check whether the bot is responding."),
    async execute(interaction) {
      await interaction.reply({ content: `Pong! 🏓 API latency: ${Math.round(interaction.client.ws.ping)}ms`, ephemeral: true });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("help")
      .setDescription("Show the bot's available commands."),
    async execute(interaction) {
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("Multifunction Bot — Commands")
        .setDescription([
          "**General**",
          "`/ping` — Check bot latency",
          "`/help` — Show this help menu",
          "`/serverinfo` — Show server details",
          "`/userinfo` — Show information about a member",
          "`/avatar` — Show a member's avatar",
          "",
          "**Moderation**",
          "`/kick` — Kick a member",
          "`/ban` — Ban a member",
          "`/timeout` — Timeout a member",
          "`/warn` — Issue a recorded warning",
          "`/warnings` — View a member's warnings",
          "`/purge` — Delete recent messages"
        ].join("\n"))
        .setFooter({ text: "More systems will be added as the bot develops." });
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("serverinfo")
      .setDescription("Show information about this server."),
    async execute(interaction) {
      const guild = interaction.guild;
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(guild.name)
        .setThumbnail(guild.iconURL({ size: 256 }))
        .addFields(
          { name: "Server ID", value: guild.id, inline: true },
          { name: "Members", value: String(guild.memberCount), inline: true },
          { name: "Created", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true }
        );
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("userinfo")
      .setDescription("Show information about a server member.")
      .addUserOption(option => option.setName("user").setDescription("Member to inspect").setRequired(false)),
    async execute(interaction) {
      const user = interaction.options.getUser("user") ?? interaction.user;
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(user.tag)
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: "User ID", value: user.id, inline: true },
          { name: "Account created", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true },
          { name: "Joined server", value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>` : "Not available", inline: true }
        );
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("avatar")
      .setDescription("Display a member's avatar.")
      .addUserOption(option => option.setName("user").setDescription("Member whose avatar to show").setRequired(false)),
    async execute(interaction) {
      const user = interaction.options.getUser("user") ?? interaction.user;
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`${user.username}'s avatar`)
        .setImage(user.displayAvatarURL({ size: 1024 }));
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("warnings")
      .setDescription("View recorded warnings for a member.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption(option => option.setName("user").setDescription("Member to inspect").setRequired(true)),
    async execute(interaction) {
      const user = interaction.options.getUser("user", true);
      const warnings = getWarnings(interaction.guildId, user.id);
      const description = warnings.length
        ? warnings.slice(-10).map((item, index) => `**${Math.max(1, warnings.length - 10) + index + 1}.** ${item.reason} — <@!${item.moderatorId}>`).join("\n")
        : "No warnings recorded.";
      await interaction.reply({ content: `Warnings for **${user.tag}** (total: ${warnings.length})\n${description}`, ephemeral: true });
    }
  }
];
