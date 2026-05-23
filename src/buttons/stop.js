'use strict';

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');

module.exports = {
  customId: 'music_stop',

  async execute(interaction, _client, queue) {
    await interaction.deferUpdate();

    const msg = queue.metadata?.dashboardMessage;

    // Delete the queue (stops audio + disconnects)
    queue.delete();

    // Disable all buttons on the dashboard
    if (msg?.editable) {
      const disabledRows = msg.components.map((row) =>
        ActionRowBuilder.from(row).setComponents(
          row.components.map((btn) => ButtonBuilder.from(btn).setDisabled(true)),
        ),
      );

      await msg.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF4444)
            .setAuthor({ name: '⏹  Stopped' })
            .setDescription(`Playback stopped by <@${interaction.user.id}>. Disconnected from voice.`)
            .setTimestamp(),
        ],
        components: disabledRows,
      }).catch(() => {});
    }
  },
};
