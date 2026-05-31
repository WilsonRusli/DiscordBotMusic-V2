'use strict';

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const { QueueRepeatMode } = require('discord-player');

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Converts milliseconds → "m:ss" or "h:mm:ss" */
function formatDuration(ms) {
  if (!ms || ms === Infinity) return '🔴 LIVE';
  const s  = Math.floor(ms / 1000);
  const h  = Math.floor(s / 3600);
  const m  = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${ss}`
    : `${m}:${ss}`;
}

/** Unicode progress bar */
function buildProgressBar(current, total, size = 22) {
  if (!total || total === Infinity) return '`🔴 ─────────────────── LIVE`';
  const pct    = Math.min(current / total, 1);
  const filled = Math.round(size * pct);
  const empty  = size - filled;
  const bar    = '▬'.repeat(filled) + '🔘' + '▬'.repeat(empty);
  return `\`${bar}\``;
}

const LOOP_META = {
  [QueueRepeatMode.OFF     ]: { emoji: '➡️',  label: 'No Loop',    style: ButtonStyle.Secondary },
  [QueueRepeatMode.TRACK   ]: { emoji: '🔂',  label: 'Loop Track', style: ButtonStyle.Success   },
  [QueueRepeatMode.QUEUE   ]: { emoji: '🔁',  label: 'Loop Queue', style: ButtonStyle.Success   },
  [QueueRepeatMode.AUTOPLAY]: { emoji: '♾️',  label: 'Autoplay',   style: ButtonStyle.Primary   },
};

function loopMeta(mode) {
  return LOOP_META[mode] ?? LOOP_META[QueueRepeatMode.OFF];
}

// ─── Embed Builder ─────────────────────────────────────────────────────────────

/**
 * Build the "Now Playing" embed from the current queue state.
 * @param {import('discord-player').GuildQueue} queue
 */
function createDashboardEmbed(queue) {
  const track    = queue.currentTrack;
  const isPaused = queue.node.isPaused();
  const volume   = queue.node.volume;
  const loop     = loopMeta(queue.repeatMode);
  const position = queue.node.playbackTime ?? 0;      // ms elapsed
  const total    = track.durationMS;

  const statusIcon  = isPaused ? '⏸' : '▶';
  const statusLabel = isPaused ? 'Paused' : 'Now Playing';
  const accentColor = isPaused ? 0xFFA500 : 0x1DB954; // orange vs Spotify-green

  const embed = new EmbedBuilder()
    .setColor(accentColor)
    .setAuthor({
      name    : `${statusIcon}  ${statusLabel}`,
      iconURL : 'https://i.imgur.com/Zrba2Rx.gif',   // animated music note gif
    })
    .setTitle(
      track.title.length > 256
        ? `${track.title.slice(0, 253)}…`
        : track.title,
    )
    .setURL(track.url)
    .setThumbnail(track.thumbnail || null)
    .addFields(
      {
        name   : '👤 Requested by',
        value  : track.requestedBy ? `<@${track.requestedBy.id}>` : 'Unknown',
        inline : true,
      },
      {
        name   : '🎵 Source',
        value  : capitalise(track.source ?? 'unknown'),
        inline : true,
      },
      {
        name   : '🔊 Volume',
        value  : `${volume}%`,
        inline : true,
      },
      {
        name   : '⏱ Duration',
        value  : `\`${formatDuration(position)} / ${formatDuration(total)}\``,
        inline : true,
      },
      {
        name   : `${loop.emoji} Loop`,
        value  : loop.label,
        inline : true,
      },
      {
        name   : '🎶 In Queue',
        value  : `${queue.tracks.size} track(s)`,
        inline : true,
      },
      {
        name   : '⏳ Progress',
        value  : buildProgressBar(position, total),
        inline : false,
      },
    );

  // ── Field filter aktif (hanya tampil jika ada) ───────────────────────────
  const activeFilters = queue.filters?.ffmpeg?.filters ?? [];
  if (activeFilters.length > 0) {
    try {
      const { getFilter } = require('./filtersList');
      const filterText = activeFilters
        .map((id) => {
          const meta = getFilter(id);
          return meta ? `${meta.emoji} ${meta.label}` : id;
        })
        .join('  •  ');

      embed.addFields({
        name   : '🎛️ Active Filters',
        value  : filterText.length > 1024 ? filterText.slice(0, 1021) + '…' : filterText,
        inline : false,
      });
    } catch (e) {
      console.error('[Dashboard] Failed to load filtersList:', e.message);
    }
  }

  return embed
    .setFooter({ text: 'Use the buttons below to control playback' })
    .setTimestamp();
}

// ─── Button Rows ───────────────────────────────────────────────────────────────

/**
 * Build both ActionRows with all control buttons.
 * @param {import('discord-player').GuildQueue} queue
 * @returns {ActionRowBuilder[]}
 */
function createDashboardComponents(queue) {
  const isPaused  = queue.node.isPaused();
  const loop      = loopMeta(queue.repeatMode);

  /* Row 1 – Playback controls */
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('music_pause')
      .setEmoji(isPaused ? '▶️' : '⏸️')
      .setLabel(isPaused ? 'Resume' : 'Pause')
      .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId('music_skip')
      .setEmoji('⏭️')
      .setLabel('Skip')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('music_stop')
      .setEmoji('⏹️')
      .setLabel('Stop')
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId('music_loop')
      .setEmoji(loop.emoji)
      .setLabel(loop.label)
      .setStyle(loop.style),
  );

  /* Row 2 – Extra controls */
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('music_shuffle')
      .setEmoji('🔀')
      .setLabel('Shuffle')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId('music_vol_up')
      .setEmoji('🔊')
      .setLabel('Vol +')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId('music_vol_down')
      .setEmoji('🔉')
      .setLabel('Vol -')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId('music_lyrics')
      .setEmoji('📜')
      .setLabel('Lyrics')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId('music_queue')
      .setEmoji('📋')
      .setLabel('Queue')
      .setStyle(ButtonStyle.Secondary),
  );

  return [row1, row2];
}

/**
 * Update (edit) the persistent dashboard message stored in queue.metadata.
 * Safe to call from player events – silently swallows errors.
 * @param {import('discord-player').GuildQueue} queue
 */
async function updateDashboard(queue) {
  const msg = queue.metadata?.dashboardMessage;
  if (!msg?.editable) return;

  if (!queue.currentTrack) {
    if (queue.metadata.progressInterval) {
      clearInterval(queue.metadata.progressInterval);
      queue.metadata.progressInterval = null;
    }
    
    try {
      const disabledRows = _disableAllButtons(msg.components);
      await msg.edit({ components: disabledRows });
    } catch { /* ignore */ }
    return;
  }

  try {
    await msg.edit({
      embeds     : [createDashboardEmbed(queue)],
      components : createDashboardComponents(queue),
    });
  } catch (err) {
    if (!err.message?.includes('Unknown Message')) {
      console.error('[Dashboard] Edit failed:', err.message);
    }
  }

  // ─── SISTEM AUTO-UPDATE PROGRESS BAR (10 DETIK) ────────────────────────────
  if (!queue.node.isPaused() && !queue.metadata.progressInterval) {
    queue.metadata.progressInterval = setInterval(async () => {
      if (!queue.currentTrack || queue.node.isPaused()) {
        clearInterval(queue.metadata.progressInterval);
        queue.metadata.progressInterval = null;
        return;
      }

      try {
        await msg.edit({
          embeds: [createDashboardEmbed(queue)],
        });
      } catch {
        clearInterval(queue.metadata.progressInterval);
        queue.metadata.progressInterval = null;
      }
    }, 10_000); 
  } 
  else if (queue.node.isPaused() && queue.metadata.progressInterval) {
    clearInterval(queue.metadata.progressInterval);
    queue.metadata.progressInterval = null;
  }
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Returns clones of the existing ActionRows with every button disabled */
function _disableAllButtons(existingComponents) {
  return existingComponents.map((row) =>
    ActionRowBuilder.from(row).setComponents(
      row.components.map((btn) => ButtonBuilder.from(btn).setDisabled(true)),
    ),
  );
}

module.exports = {
  createDashboardEmbed,
  createDashboardComponents,
  updateDashboard,
  formatDuration,
  loopMeta,
};