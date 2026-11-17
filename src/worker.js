const DISCORD_API = "https://discord.com/api/v10";
const EPHEMERAL = 64;
const DAY = 24 * 60 * 60 * 1000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function hexToBytes(hex) {
  if (!/^[0-9a-f]{64}$/i.test(hex || "")) throw new Error("Invalid Discord public key.");
  return Uint8Array.from(hex.match(/.{2}/g), byte => parseInt(byte, 16));
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function verifyDiscordRequest(request, body, publicKey) {
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  if (!signature || !timestamp || !publicKey) return false;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      hexToBytes(publicKey),
      { name: "Ed25519" },
      false,
      ["verify"]
    );
    return await crypto.subtle.verify(
      { name: "Ed25519" },
      key,
      base64ToBytes(signature),
      new TextEncoder().encode(timestamp + body)
    );
  } catch (error) {
    console.error("Discord signature verification failed:", error);
    return false;
  }
}

async function discord(env, path, options = {}) {
  const response = await fetch(`${DISCORD_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bot ${env.DISCORD_TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.message || `Discord API returned HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

async function editOriginal(env, interaction, content, embeds) {
  const payload = {};
  if (content !== undefined) payload.content = content;
  if (embeds !== undefined) payload.embeds = embeds;
  await fetch(
    `${DISCORD_API}/webhooks/${env.DISCORD_APPLICATION_ID}/${interaction.token}/messages/@original`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );
}

function optionsOf(interaction) {
  const result = {};
  for (const option of interaction.data?.options || []) result[option.name] = option.value;
  return result;
}

function hasPermission(interaction, bit) {
  try {
    const permissions = BigInt(interaction.member?.permissions || "0");
    const administrator = (permissions & 8n) === 8n;
    return administrator || (permissions & bit) === bit;
  } catch {
    return false;
  }
}

function userTag(user) {
  return user.discriminator && user.discriminator !== "0"
    ? `${user.username}#${user.discriminator}`
    : user.username;
}

function avatarUrl(user, size = 1024) {
  const extension = user.avatar?.startsWith("a_") ? "gif" : "png";
  return user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}?size=${size}`
    : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.id) >> 22n) % 6}.png`;
}

function embed(title, description, fields = [], thumbnail, image) {
  const value = { title, color: 0x5865F2, fields };
  if (description) value.description = description;
  if (thumbnail) value.thumbnail = { url: thumbnail };
  if (image) value.image = { url: image };
  return [value];
}

async function runCommand(interaction, env) {
  const name = interaction.data.name;
  const options = optionsOf(interaction);
  const guildId = interaction.guild_id;
  const actor = interaction.member?.user || interaction.user;
  const userId = options.user;

  if (name === "ping") {
    return { content: "Pong! 🏓" };
  }

  if (name === "help") {
    return {
      embeds: embed("Multifunction Bot — Commands", [
        "**General**",
        "`/ping` — Check bot response",
        "`/help` — Show this help menu",
        "`/serverinfo` — Show server details",
        "`/userinfo [user]` — Show member information",
        "`/avatar [user]` — Display an avatar",
        "",
        "**Moderation**",
        "`/kick user [reason]` — Kick a member",
        "`/ban user [reason]` — Ban a member",
        "`/timeout user minutes [reason]` — Timeout a member",
        "`/warn user reason` — Record a warning",
        "`/warnings user` — View recorded warnings",
        "`/purge amount` — Delete recent messages"
      ].join("\n"))
    };
  }

  if (!guildId) return { content: "This command can only be used inside a server." };

  if (name === "serverinfo") {
    const guild = await discord(env, `/guilds/${guildId}?with_counts=true`);
    const created = Math.floor(Number(BigInt(guildId) >> 22n) / 1000 + 1420070400000 / 1000);
    return {
      embeds: embed(guild.name, null, [
        { name: "Server ID", value: guild.id, inline: true },
        { name: "Members", value: String(guild.approximate_member_count ?? "Unavailable"), inline: true },
        { name: "Created", value: `<t:${created}:D>`, inline: true }
      ], guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256` : undefined)
    };
  }

  if (name === "avatar") {
    const user = options.user
      ? await discord(env, `/users/${options.user}`)
      : interaction.user;
    return { embeds: embed(`${user.username}'s avatar`, null, [], undefined, avatarUrl(user)) };
  }

  if (name === "userinfo") {
    const user = options.user
      ? await discord(env, `/users/${options.user}`)
      : interaction.user;
    const member = await discord(env, `/guilds/${guildId}/members/${user.id}`).catch(() => null);
    const created = Math.floor(Number(BigInt(user.id) >> 22n) / 1000 + 1420070400000 / 1000);
    const joined = member?.joined_at ? Math.floor(Date.parse(member.joined_at) / 1000) : null;
    return {
      embeds: embed(userTag(user), null, [
        { name: "User ID", value: user.id, inline: true },
        { name: "Account created", value: `<t:${created}:D>`, inline: true },
        { name: "Joined server", value: joined ? `<t:${joined}:D>` : "Not available", inline: true }
      ], avatarUrl(user, 256))
    };
  }

  if (name === "kick") {
    if (!hasPermission(interaction, 2n)) return { content: "You need the **Kick Members** permission." };
    const reason = options.reason || "No reason provided";
    await discord(env, `/guilds/${guildId}/members/${userId}`, {
      method: "DELETE",
      headers: { "X-Audit-Log-Reason": encodeURIComponent(`${reason} | Moderator: ${userTag(actor)}`) }
    });
    return { content: `👢 Kicked <@${userId}>. Reason: ${reason}` };
  }

  if (name === "ban") {
    if (!hasPermission(interaction, 4n)) return { content: "You need the **Ban Members** permission." };
    const reason = options.reason || "No reason provided";
    await discord(env, `/guilds/${guildId}/bans/${userId}`, {
      method: "PUT",
      headers: { "X-Audit-Log-Reason": encodeURIComponent(`${reason} | Moderator: ${userTag(actor)}`) },
      body: JSON.stringify({ delete_message_seconds: 0 })
    });
    return { content: `🔨 Banned <@${userId}>. Reason: ${reason}` };
  }

  if (name === "timeout") {
    if (!hasPermission(interaction, 1099511627776n)) return { content: "You need the **Moderate Members** permission." };
    const minutes = options.minutes;
    const reason = options.reason || "No reason provided";
    const until = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    await discord(env, `/guilds/${guildId}/members/${userId}`, {
      method: "PATCH",
      headers: { "X-Audit-Log-Reason": encodeURIComponent(`${reason} | Moderator: ${userTag(actor)}`) },
      body: JSON.stringify({ communication_disabled_until: until })
    });
    return { content: `⏱️ Timed out <@${userId}> for ${minutes} minute(s). Reason: ${reason}` };
  }

  if (name === "warn") {
    if (!hasPermission(interaction, 1099511627776n)) return { content: "You need the **Moderate Members** permission." };
    const reason = options.reason;
    await env.DB.prepare(
      "INSERT INTO warnings (guild_id, user_id, reason, moderator_id, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(guildId, userId, reason, actor.id, new Date().toISOString()).run();
    const row = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM warnings WHERE guild_id = ? AND user_id = ?"
    ).bind(guildId, userId).first();
    return { content: `⚠️ Warned <@${userId}>. They now have ${row.total} recorded warning(s). Reason: ${reason}` };
  }

  if (name === "warnings") {
    if (!hasPermission(interaction, 1099511627776n)) return { content: "You need the **Moderate Members** permission." };
    const rows = await env.DB.prepare(
      "SELECT reason, moderator_id, created_at FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY id DESC LIMIT 10"
    ).bind(guildId, userId).all();
    const count = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM warnings WHERE guild_id = ? AND user_id = ?"
    ).bind(guildId, userId).first();
    const lines = (rows.results || []).reverse().map((row, index) =>
      `**${Math.max(0, count.total - rows.results.length) + index + 1}.** ${row.reason} — <@!${row.moderator_id}>`
    );
    return { content: `Warnings for <@${userId}> (total: ${count.total})\n${lines.length ? lines.join("\n") : "No warnings recorded."}` };
  }

  if (name === "purge") {
    if (!hasPermission(interaction, 8192n)) return { content: "You need the **Manage Messages** permission." };
    const channelId = interaction.channel_id;
    const messages = await discord(env, `/channels/${channelId}/messages?limit=${options.amount}`);
    const cutoff = Date.now() - 14 * DAY;
    const ids = messages.filter(message => Date.parse(message.timestamp) > cutoff).map(message => message.id);
    if (ids.length === 0) return { content: "No messages within the last 14 days were eligible for bulk deletion." };
    if (ids.length === 1) {
      await discord(env, `/channels/${channelId}/messages/${ids[0]}`, { method: "DELETE" });
    } else {
      await discord(env, `/channels/${channelId}/messages/bulk-delete`, {
        method: "POST",
        body: JSON.stringify({ messages: ids })
      });
    }
    return { content: `🧹 Deleted ${ids.length} message(s). Messages older than 14 days cannot be bulk-deleted.` };
  }

  return { content: "That command is not available." };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return json({ status: "online", service: "Multifunction Discord Bot", mode: "Discord HTTP Interactions" });
    }

    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
    if (!env.DISCORD_PUBLIC_KEY || !env.DISCORD_TOKEN || !env.DISCORD_APPLICATION_ID || !env.DB) {
      console.error("Missing one or more required Worker bindings/secrets.");
      return new Response("Worker is not configured.", { status: 503 });
    }

    const body = await request.text();
    const valid = await verifyDiscordRequest(request, body, env.DISCORD_PUBLIC_KEY);
    if (!valid) return new Response("Invalid request signature.", { status: 401 });

    let interaction;
    try {
      interaction = JSON.parse(body);
    } catch {
      return new Response("Invalid JSON.", { status: 400 });
    }

    if (interaction.type === 1) return json({ type: 1 });

    if (interaction.type !== 2) {
      return json({ type: 4, data: { content: "Unsupported interaction type.", flags: EPHEMERAL } });
    }

    // Acknowledge within Discord's three-second deadline, then edit the deferred reply.
    const started = Date.now();
    const deferred = json({ type: 5, data: { flags: EPHEMERAL } });
    const task = (async () => {
      try {
        const result = await runCommand(interaction, env);
        if (interaction.data.name === "ping") {
          result.content = `Pong! 🏓 Worker processing: ${Date.now() - started}ms`;
        }
        await editOriginal(env, interaction, result.content, result.embeds);
      } catch (error) {
        console.error(`Command /${interaction.data?.name} failed:`, error);
        await editOriginal(env, interaction, `⚠️ The command failed: ${error.message || "Unknown error"}. Check the bot's permissions and role hierarchy.`);
      }
    })();

    // Cloudflare keeps this short task alive after the initial interaction response.
    // waitUntil is attached through the execution context below.
    ctx.waitUntil(task);
    return deferred;
  }
};
