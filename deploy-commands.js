'use strict';
require('dotenv').config();

const { REST, Routes } = require('discord.js');
const path = require('path');
const fs   = require('fs');

const commands = [];

// Recursively collect all command data from src/commands/**
function collectCommands(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectCommands(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const cmd = require(fullPath);
      if (cmd?.data?.toJSON) {
        commands.push(cmd.data.toJSON());
        console.log(`[Deploy] Loaded command: ${cmd.data.name}`);
      }
    }
  }
}

collectCommands(path.join(__dirname, 'src', 'commands'));

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`[Deploy] Registering ${commands.length} command(s)…`);
    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );
    console.log(`[Deploy] ✅ Successfully registered ${data.length} command(s) globally.`);
  } catch (err) {
    console.error('[Deploy] ❌ Registration failed:', err);
  }
})();
