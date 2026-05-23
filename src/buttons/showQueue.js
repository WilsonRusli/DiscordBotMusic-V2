'use strict';

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const { formatDuration } = require('../utils/musicDashboard');

const PAGE_SIZE = 10;

module.exports = {
  customId: 'music_queue',

  async execute(interaction, _client, queue) {
    await interaction.deferReply({ ephemeral: true });

    const tracks  = queue.tracks.toArray();
    const current = queue.currentTrack;

    if (!current) {
      return interaction.editReply({ content: '❌ Nothing is playing.' });
    }

    const totalPages = Math.max(1, Math.ceil(tracks.length / PAGE_SIZE));
    let page         = 0;

    const buildEmbed = (p) => {
      const start  = p * PAGE_SIZE;
      const slice  = tracks.slice(start, start + PAGE_SIZE);

      const list = slice.length
        ? slice
            .map((t, i) => {
              const num  = start + i + 1;
              const dur  = formatDuration(t.durationMS);
              const name = t.title.length > 50 ? `${t.title.slice(0, 47)}…` : t.title;
              return `\`${String(num).padStart(2, ' ')}.\` **${name}** — \`${dur}\``;
            })
            .join('\n')
        : '*No more tracks*';

      return new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📋  Current Queue')
        .setDescription(
          `**▶ Now Playing:**\n[${current.title}](${current.url})\n\n**Up Next:**\n${list}`,
        )
        .addFields({
          name  : '📊 Stats',
          value : `${tracks.length} tracks | ~${formatDuration(tracks.reduce((a, t) => a + (t.durationMS ?? 0), 0))} remaining`,
        })
        .setFooter({ text: `Page ${p + 1} / ${totalPages}` })
        .setTimestamp();
    };

    const buildNav = (p) =>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('queue_prev')
          .setEmoji('◀️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(p === 0),
        new ButtonBuilder()
          .setCustomId('queue_page')
          .setLabel(`${p + 1} / ${totalPages}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('queue_next')
          .setEmoji('▶️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(p >= totalPages - 1),
      );

    const reply = await interaction.editReply({
      embeds    : [buildEmbed(page)],
      components: totalPages > 1 ? [buildNav(page)] : [],
    });

    if (totalPages <= 1) return;

    // ── Collector for pagination buttons ─────────────────────────────────────
    const collector = reply.createMessageComponentCollector({
      filter : (i) => i.user.id === interaction.user.id,
      time   : 60_000,   // 60 seconds
    });

    collector.on('collect', async (i) => {
      if (i.customId === 'queue_prev') page = Math.max(0, page - 1);
      if (i.customId === 'queue_next') page = Math.min(totalPages - 1, page + 1);

      await i.update({
        embeds    : [buildEmbed(page)],
        components: [buildNav(page)],
      });
    });

    collector.on('end', async () => {
      // Disable navigation when collector expires
      await reply.edit({
        components: [buildNav(page)].map((row) =>
          ActionRowBuilder.from(row).setComponents(
            row.components.map((btn) => ButtonBuilder.from(btn).setDisabled(true)),
          ),
        ),
      }).catch(() => {});
    });
  },
};
