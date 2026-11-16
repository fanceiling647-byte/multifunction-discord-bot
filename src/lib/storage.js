const fs = require("node:fs");
const path = require("node:path");

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "database.json");

function readDatabase() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ guilds: {} }, null, 2));
  }

  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (error) {
    console.error("Could not read data/database.json:", error);
    throw new Error("The bot database is unreadable. Back up the file before repairing it.");
  }
}

function writeDatabase(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temporaryFile = DATA_FILE + ".tmp";
  fs.writeFileSync(temporaryFile, JSON.stringify(data, null, 2));
  fs.renameSync(temporaryFile, DATA_FILE);
}

function getGuildData(guildId) {
  const db = readDatabase();
  if (!db.guilds[guildId]) {
    db.guilds[guildId] = { warnings: {}, settings: {} };
    writeDatabase(db);
  }
  return db.guilds[guildId];
}

function addWarning(guildId, userId, warning) {
  const db = readDatabase();
  db.guilds[guildId] ??= { warnings: {}, settings: {} };
  db.guilds[guildId].warnings ??= {};
  db.guilds[guildId].warnings[userId] ??= [];
  db.guilds[guildId].warnings[userId].push(warning);
  writeDatabase(db);
  return db.guilds[guildId].warnings[userId];
}

function getWarnings(guildId, userId) {
  const guild = getGuildData(guildId);
  return guild.warnings?.[userId] ?? [];
}

module.exports = { getGuildData, addWarning, getWarnings };
