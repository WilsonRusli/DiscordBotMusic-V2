'use strict';
require('dotenv').config();

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { Player }                                 = require('discord-player');
const express                                    = require('express');
const { loadCommands }                           = require('./src/handlers/commandHandler');
const { loadButtons }                            = require('./src/handlers/buttonHandler');
const { loadEvents }                             = require('./src/handlers/eventHandler');

// ─── Discord Client ────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Attach collections for commands & buttons
client.commands = new Collection();
client.buttons  = new Collection();

// ─── Discord-Player Setup ──────────────────────────────────────────────────────
const player = new Player(client, {
  skipFFmpeg: false,
  useLegacyFFmpeg: false,
});
client.player = player;   // expose globally via client

(async () => {
  // Load all default extractors (YouTube, Spotify, SoundCloud, etc.)
  try {
    const { DefaultExtractors } = require('@discord-player/extractor');
    await player.extractors.loadMulti(DefaultExtractors);
    console.log('[Player] ✅ Extractors loaded');
  } catch (err) {
    console.error('[Player] ❌ Extractor load failed:', err.message);
  }

  // ─── @snazzah/davey – DAVE Protocol (Discord E2EE Voice Encryption) ──────────
  // DAVE is Discord's end-to-end encryption for voice channels.  Without this
  // patch the bot can be forcibly disconnected from channels that have DAVE
  // enabled.  The library hooks into discord.js's WebSocket to complete the
  // MLS (Messaging Layer Security) handshake transparently.
  try {
    const davey = require('@snazzah/davey');
    const patchFn =
      davey.patchDiscordJS       ??   // preferred export name
      davey.default?.patchDiscordJS ??
      davey.patchVoiceManager    ??
      davey.default?.patchVoiceManager;

    if (typeof patchFn === 'function') {
      patchFn(client);
      console.log('[Davey] ✅ DAVE protocol patch applied');
    } else {
      // Some releases export a class; instantiate and attach manually
      const DaveSession = davey.DaveSession ?? davey.default?.DaveSession;
      if (DaveSession) {
        client._daveSession = new DaveSession(client);
        console.log('[Davey] ✅ DAVE session attached (class mode)');
      } else {
        console.warn('[Davey] ⚠️  Could not detect patch API – skipping (non-fatal)');
      }
    }
  } catch (err) {
    // Non-fatal: bot still works in channels where DAVE isn't enforced
    console.warn('[Davey] ⚠️  Load failed (non-fatal):', err.message);
  }

  // ─── Load Handlers ────────────────────────────────────────────────────────────
  loadCommands(client);
  loadButtons(client);
  loadEvents(client, player);
})();

// ─── Express Keep-Alive Server ─────────────────────────────────────────────────
// Render (and similar platforms) will spin down a free service after inactivity.
// Expose a tiny HTTP endpoint and point an external cron/uptime-monitor at it.
const app  = express();
const PORT = process.env.PORT || 3000;

app.get('/', (_req, res) => {
  res.json({
    status : '✅ Online',
    bot    : client.user?.tag   ?? 'Connecting…',
    guilds : client.guilds?.cache.size ?? 0,
    uptime : `${Math.floor(process.uptime())}s`,
  });
});

app.get('/health', (_req, res) => res.sendStatus(200));

app.listen(PORT, () =>
  console.log(`[Express] 🌐 Keep-alive server on port ${PORT}`),
);

// ─── Global Process Error Handlers ────────────────────────────────────────────
process.on('unhandledRejection', (err) => {
  console.error('[Process] UnhandledRejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('[Process] UncaughtException:', err);
  // Do NOT exit – let the bot keep running for minor errors.
  // Add `process.exit(1)` here only if you want strict crash-restart behavior.
});

// ─── Login ────────────────────────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error('[Fatal] Discord login failed:', err);
  process.exit(1);
});
