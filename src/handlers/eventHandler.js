'use strict';

const fs   = require('fs');
const path = require('path');

/**
 * Load all events from src/events/discord/ (client events)
 * and src/events/player/ (discord-player events).
 */
function loadEvents(client, player) {
  // ── Discord client events ──────────────────────────────────────────────────
  const discordDir = path.join(__dirname, '..', 'events', 'discord');
  _loadDir(discordDir, (event) => {
    const method = event.once ? 'once' : 'on';
    client[method](event.name, (...args) => event.execute(...args, client, player));
    return event.name;
  });

  // ── discord-player events ──────────────────────────────────────────────────
  const playerDir = path.join(__dirname, '..', 'events', 'player');
  _loadDir(playerDir, (event) => {
    const method = event.once ? 'once' : 'on';
    player.events[method](event.name, (...args) => event.execute(...args, client));
    return event.name;
  });
}

function _loadDir(dir, register) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
  let loaded  = 0;

  for (const file of files) {
    try {
      const event = require(path.join(dir, file));
      if (!event?.name || !event?.execute) {
        console.warn(`[Events] Skipping ${file} – missing name or execute`);
        continue;
      }
      const evName = register(event);
      loaded++;
      // debug: console.log(`[Events] Registered "${evName}" from ${file}`);
    } catch (err) {
      console.error(`[Events] Failed to load ${file}:`, err.message);
    }
  }

  const label = dir.split(path.sep).slice(-2).join('/');
  console.log(`[Events] ✅ Loaded ${loaded} event(s) from ${label}`);
}

module.exports = { loadEvents };
