'use strict';

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');

module.exports = {
  name : 'emptyQueue',
  once : false,

  /**
   * Fires when the queue is exhausted and playback ends.
   * @param {import('discord-player').GuildQueue} queue
   */
  async execute(queue) {
    const meta = queue.metadata;
    if (!meta?.dashboardMessage?.editable) return;

    // Disable every button
    const disabledRows = meta.dashboardMessage.components.map((row) =>
      ActionRowBuilder.from(row).setComponents(
        row.components.map((btn) => ButtonBuilder.from(btn).setDisabled(true)),
      ),
    );

    const endEmbed = new EmbedBuilder()
      .setColor(0x95A5A6)
      .setAuthor({ name: '⏹  Queue Finished' })
      .setDescription('All tracks have been played. Use `/play` to start a new session!')
      .setTimestamp();

    try {
      await meta.dashboardMessage.edit({
        embeds    : [endEmbed],
        components: disabledRows,
      });
    } catch (err) {
      if (!err.message?.includes('Unknown Message')) {
        console.error('[Event:emptyQueue] Edit failed:', err.message);
      }
    }
  },
};
