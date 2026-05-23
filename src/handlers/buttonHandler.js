'use strict';

const fs   = require('fs');
const path = require('path');

/**
 * Load every .js file from src/buttons/.
 * Each file must export { customId, execute }.
 */
function loadButtons(client) {
  const buttonsDir = path.join(__dirname, '..', 'buttons');
  const files      = fs.readdirSync(buttonsDir).filter((f) => f.endsWith('.js'));
  let loaded       = 0;

  for (const file of files) {
    try {
      const btn = require(path.join(buttonsDir, file));
      if (!btn?.customId || !btn?.execute) {
        console.warn(`[Buttons] Skipping ${file} – missing customId or execute`);
        continue;
      }
      client.buttons.set(btn.customId, btn);
      loaded++;
    } catch (err) {
      console.error(`[Buttons] Failed to load ${file}:`, err.message);
    }
  }

  console.log(`[Buttons] ✅ Loaded ${loaded} button handler(s)`);
}

module.exports = { loadButtons };
