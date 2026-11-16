const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { addWarning } = require("../lib/storage");

const commands = [
  {
    data: new SlashCommandBuilder()
      .setName("kick").setDescription("Kick a member from the server.")
      .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
      .addUserOption(o => o.setName("user").setDescription("Member to kick").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("Reason for the kick").setMaxLength(500)),
    async execute(interaction) {
      const user = interaction.options.getUser("user", true);
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      const reason = interaction.options.getString("reason") || "No reason provided";
      if (!member) return interaction.reply({ content: "That member is not in this server.", ephemeral: true });
      if (!member.kickable) return interaction.reply({ content: "I cannot kick that member. Check my role position and permissions.", ephemeral: true });
      await member.kick(`${reason} | Moderator: ${interaction.user.tag}`);
      await interaction.reply({ content: `👢 Kicked **${user.tag}**. Reason: ${reason}`, ephemeral: true });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("ban").setDescription("Ban a member from the server.")
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addUserOption(o => o.setName("user").setDescription("Member to ban").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("Reason for the ban").setMaxLength(500)),
    async execute(interaction) {
      const user = interaction.options.getUser("user", true);
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      const reason = interaction.options.getString("reason") || "No reason provided";
      if (member && !member.bannable) return interaction.reply({ content: "I cannot ban that member. Check my role position and permissions.", ephemeral: true });
      await interaction.guild.members.ban(user.id, { reason: `${reason} | Moderator: ${interaction.user.tag}` });
      await interaction.reply({ content: `🔨 Banned **${user.tag}**. Reason: ${reason}`, ephemeral: true });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("timeout").setDescription("Timeout a member.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption(o => o.setName("user").setDescription("Member to timeout").setRequired(true))
      .addIntegerOption(o => o.setName("minutes").setDescription("Duration in minutes (1–40320)").setRequired(true).setMinValue(1).setMaxValue(40320))
      .addStringOption(o => o.setName("reason").setDescription("Reason for timeout").setMaxLength(500)),
    async execute(interaction) {
      const user = interaction.options.getUser("user", true);
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      const minutes = interaction.options.getInteger("minutes", true);
      const reason = interaction.options.getString("reason") || "No reason provided";
      if (!member) return interaction.reply({ content: "That member is not in this server.", ephemeral: true });
      if (!member.moderatable) return interaction.reply({ content: "I cannot timeout that member. Check role hierarchy and permissions.", ephemeral: true });
      await member.timeout(minutes * 60 * 1000, `${reason} | Moderator: ${interaction.user.tag}`);
      await interaction.reply({ content: `⏱️ Timed out **${user.tag}** for ${minutes} minute(s). Reason: ${reason}`, ephemeral: true });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("warn").setDescription("Record a warning for a member.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption(o => o.setName("user").setDescription("Member to warn").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("Reason for warning").setRequired(true).setMaxLength(500)),
    async execute(interaction) {
      const user = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason", true);
      const warnings = addWarning(interaction.guildId, user.id, {
        reason,
        moderatorId: interaction.user.id,
        createdAt: new Date().toISOString()
      });
      await interaction.reply({ content: `⚠️ Warned **${user.tag}**. They now have ${warnings.length} recorded warning(s). Reason: ${reason}`, ephemeral: true });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("purge").setDescription("Delete between 1 and 100 recent messages.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addIntegerOption(o => o.setName("amount").setDescription("Number of messages to delete").setRequired(true).setMinValue(1).setMaxValue(100)),
    async execute(interaction) {
      const amount = interaction.options.getInteger("amount", true);
      const deleted = await interaction.channel.bulkDelete(amount, true);
      await interaction.reply({ content: `🧹 Deleted ${deleted.size} message(s). Messages older than 14 days cannot be bulk-deleted.`, ephemeral: true });
    }
  }
];

module.exports = commands;
