'use strict';

const fs   = require('fs');
const path = require('path');

/**
 * Recursively walk a directory and require every .js file that exports
 * { data, execute }.  Registers each command on client.commands.
 */
function loadCommands(client) {
  const commandsDir = path.join(__dirname, '..', 'commands');
  let loaded = 0;

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        try {
          const command = require(fullPath);
          if (!command?.data || !command?.execute) {
            console.warn(`[Commands] Skipping ${entry.name} – missing data or execute`);
            continue;
          }
          client.commands.set(command.data.name, command);
          loaded++;
        } catch (err) {
          console.error(`[Commands] Failed to load ${entry.name}:`, err.message);
        }
      }
    }
  }

  walk(commandsDir);
  console.log(`[Commands] ✅ Loaded ${loaded} command(s)`);
}

module.exports = { loadCommands };
