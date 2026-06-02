'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useMainPlayer, QueryType }                     = require('discord-player');
const {
  createDashboardEmbed,
  createDashboardComponents,
  updateDashboard,
} = require('../../utils/musicDashboard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('🎵 Play a song or playlist from YouTube, Spotify, SoundCloud, etc.')
    .addStringOption((opt) =>
      opt
        .setName('query')
        .setDescription('Song name, URL, or playlist link')
        .setRequired(true)
        .setAutocomplete(false),
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    await interaction.deferReply();

    const query   = interaction.options.getString('query', true);
    const member  = interaction.member;
    const channel = member?.voice?.channel;

    // ── Guard: must be in a voice channel ──────────────────────────────────
    if (!channel) {
      return interaction.editReply({
        embeds: [errorEmbed('You must join a voice channel first! 🔇')],
      });
    }

    // ── Guard: bot needs permissions ────────────────────────────────────────
    const perms = channel.permissionsFor(interaction.guild.members.me);
    if (!perms.has(['Connect', 'Speak'])) {
      return interaction.editReply({
        embeds: [errorEmbed('I don\'t have permission to join or speak in that channel.')],
      });
    }

    const player = useMainPlayer();

    try {
      // ── Search ─────────────────────────────────────────────────────────────
      const searchResult = await player.search(query, {
        requestedBy: interaction.user,
      });

      if (!searchResult.hasTracks()) {
        return interaction.editReply({
          embeds: [errorEmbed(`No results found for: **${query}**`)],
        });
      }

      // ── Play / Enqueue ──────────────────────────────────────────────────────
      const { track, queue } = await player.play(channel, searchResult, {
        nodeOptions: {
          // Metadata is accessible anywhere via queue.metadata
          metadata: {
            channel         : interaction.channel,
            dashboardMessage: null,        // filled in after we send the embed
          },
          selfDeaf               : true,
          volume                 : 80,
          leaveOnEmpty           : true,
          leaveOnEmptyCooldown   : 300_000,  // 5 min
          leaveOnEnd             : true,
          leaveOnEndCooldown     : 300_000,
          bufferingTimeout       : 3_000,
        },
      });

      // ── Already playing? Just confirm enqueue ───────────────────────────────
      if (queue.isPlaying() && queue.tracks.size > 0 && track !== queue.currentTrack) {
        const pos = queue.tracks.toArray().findIndex((t) => t.id === track.id) + 1;
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865F2)
              .setTitle('📥 Added to Queue')
              .setDescription(`**[${track.title}](${track.url})**`)
              .setThumbnail(track.thumbnail)
              .addFields(
                { name: '👤 Requested by', value: `<@${track.requestedBy?.id}>`, inline: true },
                { name: '📍 Position',     value: `#${pos}`,                      inline: true },
              )
              .setTimestamp(),
          ],
        });
      }

      // ── First track – send the full interactive dashboard ───────────────────
      const embed      = createDashboardEmbed(queue);
      const components = createDashboardComponents(queue);

      const dashboardMsg = await interaction.editReply({
        embeds    : [embed],
        components,
      });

      // Store the message ref so player events can update it
      queue.metadata.dashboardMessage = dashboardMsg;
      await updateDashboard(queue);

    } catch (err) {
      console.error('[/play] Error:', err);
      const msg = err.message?.includes('no results')
        ? `No results found for: **${query}**`
        : `Something went wrong: \`${err.message}\``;

      return interaction.editReply({
        embeds: [errorEmbed(msg)],
      }).catch(() => {});
    }
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function errorEmbed(description) {
  return new EmbedBuilder()
    .setColor(0xFF4444)
    .setDescription(`❌  ${description}`);
}
