const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ChannelType, PermissionFlagsBits
} = require("discord.js");
const { resolveRobloxUser, acceptPendingGroupRequest } = require("../lib/roblox");

const divisions = [
  "Executive Staff", "Department of State", "Central Intelligence Agency",
  "Appeals Team", "Moderation Department", "Judicial Department",
  "National Guard", "Metropolitan Police Department", "2nd Federal Engineering Corps"
];
const subDivisions = ["UD", "TD", "DSS", "OFA", "BDA", "OCI", "372nd Military Police Company", "34th Infantry Division", "RTI", "113th Air Wing"];
const allowedSubs = {
  "Executive Staff": ["UD", "TD"],
  "Department of State": ["DSS", "OFA", "BDA", "OCI"],
  "National Guard": ["372nd Military Police Company", "34th Infantry Division", "RTI", "113th Air Wing"]
};
const txt = (i, n) => i.options.getString(n);

function makeEmbed(title, description, color = "5865F2") {
  const clean = String(color || "5865F2").replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) throw new Error("Color must be a six-digit HEX value, e.g. 5865F2.");
  const embed = new EmbedBuilder().setColor(parseInt(clean, 16));
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}
function getDestination(i) {
  const channel = i.options.getChannel("channel", true);
  if (![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) throw new Error("Choose a text or announcement channel.");
  const perms = channel.permissionsFor(i.guild.members.me);
  if (!perms?.has(PermissionFlagsBits.SendMessages) || !perms?.has(PermissionFlagsBits.EmbedLinks)) throw new Error("I need Send Messages and Embed Links permissions in that channel.");
  return channel;
}
function getApplication(i) {
  const division = txt(i, "division");
  const sub = txt(i, "subdivision");
  if (sub && !(allowedSubs[division] || []).includes(sub)) throw new Error("That sub-division does not belong to the selected division. Choose a matching sub-division or leave it blank.");
  return {
    division, sub, discordUser: i.options.getUser("user", true),
    reason: txt(i, "reason"), groupId: txt(i, "group_id"),
    robloxUsername: txt(i, "roblox_username")
  };
}
function applicationEmbed(d, approved, robloxId, actor) {
  return new EmbedBuilder()
    .setColor(approved ? 0x57F287 : 0xED4245)
    .setTitle(approved ? "Application Approved" : "Application Denied")
    .setDescription(approved ? "Congratulations <@" + d.discordUser.id + ">! Your application has been approved." : "Your application for **" + d.division + "** has been denied.")
    .addFields(
      { name: "Division", value: d.division, inline: true },
      { name: "Sub-Division", value: d.sub || "Not applicable", inline: true },
      { name: "Discord User", value: "<@" + d.discordUser.id + ">", inline: true },
      { name: "Roblox Account", value: "[" + d.robloxUsername + "](https://www.roblox.com/users/" + robloxId + "/profile)", inline: true },
      { name: "Reason", value: d.reason },
      { name: "Group ID", value: d.groupId, inline: true }
    )
    .setFooter({ text: "Decision by " + actor })
    .setTimestamp();
}

const commands = [
  {
    data: new SlashCommandBuilder().setName("embed").setDescription("Create and send a custom embed with link buttons.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addChannelOption(o => o.setName("channel").setDescription("Where to send the embed").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true))
      .addStringOption(o => o.setName("title").setDescription("Embed title").setMaxLength(256))
      .addStringOption(o => o.setName("description").setDescription("Embed description").setMaxLength(4000))
      .addStringOption(o => o.setName("color").setDescription("HEX color, e.g. 5865F2"))
      .addStringOption(o => o.setName("footer").setDescription("Footer text").setMaxLength(2048))
      .addStringOption(o => o.setName("footer_icon").setDescription("Footer icon URL"))
      .addStringOption(o => o.setName("author").setDescription("Author name").setMaxLength(256))
      .addStringOption(o => o.setName("author_url").setDescription("Author hyperlink URL"))
      .addStringOption(o => o.setName("image_url").setDescription("Large image URL"))
      .addStringOption(o => o.setName("thumbnail_url").setDescription("Thumbnail image URL"))
      .addBooleanOption(o => o.setName("timestamp").setDescription("Add the current timestamp"))
      .addStringOption(o => o.setName("field_name").setDescription("Field 1 name").setMaxLength(256))
      .addStringOption(o => o.setName("field_value").setDescription("Field 1 value").setMaxLength(1024))
      .addBooleanOption(o => o.setName("field_inline").setDescription("Display field 1 inline"))
      .addStringOption(o => o.setName("field2_name").setDescription("Field 2 name").setMaxLength(256))
      .addStringOption(o => o.setName("field2_value").setDescription("Field 2 value").setMaxLength(1024))
      .addBooleanOption(o => o.setName("field2_inline").setDescription("Display field 2 inline"))
      .addStringOption(o => o.setName("field3_name").setDescription("Field 3 name").setMaxLength(256))
      .addStringOption(o => o.setName("field3_value").setDescription("Field 3 value").setMaxLength(1024))
      .addBooleanOption(o => o.setName("field3_inline").setDescription("Display field 3 inline"))
      .addStringOption(o => o.setName("button1_label").setDescription("First link button label").setMaxLength(80))
      .addStringOption(o => o.setName("button1_url").setDescription("First link button URL"))
      .addStringOption(o => o.setName("button2_label").setDescription("Second link button label").setMaxLength(80))
      .addStringOption(o => o.setName("button2_url").setDescription("Second link button URL")),
    async execute(i) {
      const channel = getDestination(i);
      const embed = makeEmbed(txt(i, "title"), txt(i, "description"), txt(i, "color"));
      if (txt(i, "footer")) embed.setFooter({ text: txt(i, "footer"), iconURL: txt(i, "footer_icon") || undefined });
      if (txt(i, "author")) embed.setAuthor({ name: txt(i, "author"), url: txt(i, "author_url") || undefined });
      else if (txt(i, "author_url")) throw new Error("Provide an author name when using author_url.");
      if (txt(i, "image_url")) embed.setImage(txt(i, "image_url"));
      if (txt(i, "thumbnail_url")) embed.setThumbnail(txt(i, "thumbnail_url"));
      if (i.options.getBoolean("timestamp")) embed.setTimestamp();
      for (let n = 1; n <= 3; n++) {
        const suffix = n === 1 ? "" : String(n);
        const fn = txt(i, "field" + suffix + "_name"), fv = txt(i, "field" + suffix + "_value");
        if (fn || fv) {
          if (!fn || !fv) throw new Error("Provide both name and value for embed field " + n + ".");
          embed.addFields({ name: fn, value: fv, inline: i.options.getBoolean("field" + suffix + "_inline") ?? false });
        }
      }
      const buttons = [];
      for (let n = 1; n <= 2; n++) {
        const label = txt(i, "button" + n + "_label"), url = txt(i, "button" + n + "_url");
        if (label || url) {
          if (!label || !url || !/^https?:\/\/\S+$/i.test(url)) throw new Error("Each link button needs a label and valid http(s) URL.");
          buttons.push(new ButtonBuilder().setLabel(label).setStyle(ButtonStyle.Link).setURL(url));
        }
      }
      await channel.send({ embeds: [embed], components: buttons.length ? [new ActionRowBuilder().addComponents(buttons)] : [] });
      await i.reply({ content: "Embed sent to " + channel + ".", ephemeral: true });
    }
  },
  {
    data: new SlashCommandBuilder().setName("rolebutton").setDescription("Post a button that adds, removes, or toggles a role.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .addChannelOption(o => o.setName("channel").setDescription("Destination text channel").addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption(o => o.setName("label").setDescription("Button label").setRequired(true).setMaxLength(80))
      .addRoleOption(o => o.setName("role").setDescription("Role affected").setRequired(true))
      .addStringOption(o => o.setName("action").setDescription("Button action").setRequired(true).addChoices({ name: "Toggle role", value: "toggle" }, { name: "Add role", value: "add" }, { name: "Remove role", value: "remove" }))
      .addStringOption(o => o.setName("title").setDescription("Optional embed title").setMaxLength(256))
      .addStringOption(o => o.setName("description").setDescription("Optional embed description").setMaxLength(4000)),
    async execute(i) {
      const channel = getDestination(i), role = i.options.getRole("role", true), action = txt(i, "action");
      if (role.managed || role.position >= i.guild.members.me.roles.highest.position) throw new Error("I cannot manage that role. Move my bot role above it.");
      const embed = makeEmbed(txt(i, "title") || "Role Selection", txt(i, "description") || "Click below to " + action + " **" + role.name + "**.");
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("role:" + action + ":" + role.id).setLabel(txt(i, "label")).setStyle(ButtonStyle.Primary));
      await channel.send({ embeds: [embed], components: [row] });
      await i.reply({ content: "Role button posted in " + channel + ".", ephemeral: true });
    }
  },
  {
    data: new SlashCommandBuilder().setName("replybutton").setDescription("Post a button that privately replies with a configured message.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addChannelOption(o => o.setName("channel").setDescription("Destination text channel").addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption(o => o.setName("label").setDescription("Button label").setRequired(true).setMaxLength(80))
      .addStringOption(o => o.setName("response").setDescription("Private response").setRequired(true).setMaxLength(1800))
      .addStringOption(o => o.setName("title").setDescription("Optional embed title").setMaxLength(256))
      .addStringOption(o => o.setName("description").setDescription("Optional embed description").setMaxLength(4000)),
    async execute(i) {
      const channel = getDestination(i), token = Buffer.from(txt(i, "response"), "utf8").toString("base64url");
      if (token.length > 85) throw new Error("Shorten the response; it is too long for a button.");
      const embed = makeEmbed(txt(i, "title") || "More Information", txt(i, "description") || "Click below for more information.");
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("reply:" + token).setLabel(txt(i, "label")).setStyle(ButtonStyle.Secondary));
      await channel.send({ embeds: [embed], components: [row] });
      await i.reply({ content: "Reply button posted in " + channel + ".", ephemeral: true });
    }
  }
];

for (const commandName of ["approveapplication", "denyapplication"]) {
  commands.push({
    data: new SlashCommandBuilder().setName(commandName)
      .setDescription(commandName === "approveapplication" ? "Approve a division application." : "Deny a division application.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addStringOption(o => o.setName("division").setDescription("Division applied for").setRequired(true).addChoices(...divisions.map(v => ({ name: v, value: v }))))
      .addUserOption(o => o.setName("user").setDescription("Discord applicant").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("Reason for decision").setRequired(true).setMaxLength(1000))
      .addStringOption(o => o.setName("group_id").setDescription("Roblox group ID").setRequired(true).setMaxLength(30))
      .addStringOption(o => o.setName("roblox_username").setDescription("Applicant's Roblox username").setRequired(true).setMaxLength(20))
      .addChannelOption(o => o.setName("channel").setDescription("Channel where this decision embed will be posted").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true))
      .addStringOption(o => o.setName("subdivision").setDescription("Optional; must match the selected division").addChoices(...subDivisions.map(v => ({ name: v, value: v })))),
    async execute(i) {
      const d = getApplication(i);
      const channel = getDestination(i);
      if (!/^\d{1,20}$/.test(d.groupId)) throw new Error("Group ID must contain only digits.");
      await i.deferReply({ ephemeral: true });
      const robloxUser = await resolveRobloxUser(d.robloxUsername);
      const approved = commandName === "approveapplication";
      const embed = applicationEmbed(d, approved, robloxUser.id, i.user.tag);
      const payload = { embeds: [embed] };
      if (approved) {
        const groupUrl = "https://www.roblox.com/communities/" + d.groupId;
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel("Request the Roblox Group").setStyle(ButtonStyle.Link).setURL(groupUrl),
          new ButtonBuilder().setLabel("Accept Me").setStyle(ButtonStyle.Primary).setCustomId("appaccept:" + d.groupId + ":" + robloxUser.id + ":" + d.discordUser.id)
        );
        payload.components = [row];
      }
      await channel.send(payload);
      await i.editReply((approved ? "Approved" : "Denied") + " application for " + d.discordUser + " (" + robloxUser.name + ") in " + channel + ".");
    }
  });
}

async function handleButton(i) {
  if (!i.isButton()) return false;
  const [kind, ...parts] = i.customId.split(":");
  if (kind === "role") {
    const [action, roleId] = parts;
    const member = await i.guild.members.fetch(i.user.id);
    const role = await i.guild.roles.fetch(roleId);
    if (!role || role.managed || role.position >= i.guild.members.me.roles.highest.position) {
      await i.reply({ content: "That role is unavailable or above my highest role.", ephemeral: true }); return true;
    }
    const has = member.roles.cache.has(roleId);
    if ((action === "add" && has) || (action === "remove" && !has)) {
      await i.reply({ content: has ? "You already have that role." : "You do not have that role.", ephemeral: true }); return true;
    }
    const remove = action === "remove" || (action === "toggle" && has);
    if (remove) await member.roles.remove(role); else await member.roles.add(role);
    await i.reply({ content: (remove ? "Removed " : "Added ") + "**" + role.name + "**.", ephemeral: true });
    return true;
  }
  if (kind === "reply") {
    await i.reply({ content: Buffer.from(parts.join(":"), "base64url").toString("utf8"), ephemeral: true }); return true;
  }
  if (kind === "appaccept") {
    const [groupId, robloxUserId, discordUserId] = parts;
    if (i.user.id !== discordUserId) {
      await i.reply({ content: "This acceptance button belongs to the applicant named in the approval.", ephemeral: true }); return true;
    }
    await i.deferReply({ ephemeral: true });
    try {
      const result = await acceptPendingGroupRequest(groupId, robloxUserId);
      await i.editReply(result);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel("Request the Roblox Group").setStyle(ButtonStyle.Link).setURL("https://www.roblox.com/communities/" + groupId),
        new ButtonBuilder().setLabel("Accepted").setStyle(ButtonStyle.Success).setCustomId("appdone:" + groupId + ":" + robloxUserId + ":" + discordUserId).setDisabled(true)
      );
      await i.message.edit({ components: [row] }).catch(() => {});
    } catch (error) {
      await i.editReply("I couldn't accept the Roblox group request: " + error.message);
    }
    return true;
  }
  if (kind === "appdone") {
    await i.reply({ content: "This application has already been processed.", ephemeral: true }); return true;
  }
  return false;
}

module.exports = commands;
module.exports.handleButton = handleButton;
