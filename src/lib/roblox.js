const API_ROOT = "https://apis.roblox.com/cloud/v2";

async function resolveRobloxUser(username) {
  const response = await fetch("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: true })
  });
  if (!response.ok) throw new Error("Roblox username lookup failed (HTTP " + response.status + ").");
  const body = await response.json();
  const user = body.data?.[0];
  if (!user) throw new Error('Roblox could not find the username "' + username + '". Check the spelling.');
  return { id: String(user.id), name: user.name };
}

async function robloxRequest(url, options = {}) {
  const apiKey = process.env.ROBLOX_OPEN_CLOUD_API_KEY;
  if (!apiKey) throw new Error("Roblox Open Cloud is not configured. Add ROBLOX_OPEN_CLOUD_API_KEY to your .env file.");
  const response = await fetch(url, {
    ...options,
    headers: { "x-api-key": apiKey, "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const raw = await response.text();
  let body = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch {}
  if (!response.ok) {
    const detail = body.message || body.error || raw || ("HTTP " + response.status);
    throw new Error(detail + " (HTTP " + response.status + ")");
  }
  return body;
}

async function acceptPendingGroupRequest(groupId, userId) {
  if (!/^\d{1,20}$/.test(groupId) || !/^\d{1,20}$/.test(userId)) throw new Error("Invalid Roblox group or user ID.");
  const url = new URL(API_ROOT + "/groups/" + groupId + "/join-requests");
  url.searchParams.set("maxPageSize", "20");
  url.searchParams.set("filter", "user == 'users/" + userId + "'");
  const body = await robloxRequest(url.toString());
  const requests = body.groupJoinRequests || [];
  const pending = requests.find(item => {
    const userPath = typeof item.user === "string" ? item.user : (item.user?.path || item.user?.name || "");
    return userPath === "users/" + userId || String(item.user?.userId ?? item.user?.id ?? item.userId ?? "") === String(userId);
  });
  if (!pending) throw new Error("No pending join request for that Roblox account was found. Ask the applicant to request to join the group first.");
  const requestPath = pending.path || pending.name || "";
  const requestId = requestPath.split("/").pop();
  if (!requestId) throw new Error("Roblox returned a join request without a resource path.");
  await robloxRequest(API_ROOT + "/groups/" + groupId + "/join-requests/" + encodeURIComponent(requestId) + ":accept", {
    method: "POST", body: JSON.stringify({})
  });
  return "Successfully accepted Roblox user " + userId + " into group " + groupId + ".";
}

module.exports = { resolveRobloxUser, acceptPendingGroupRequest };
