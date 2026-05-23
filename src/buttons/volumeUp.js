'use strict';

const { updateDashboard } = require('../utils/musicDashboard');

const STEP = 10;
const MAX  = 100;

module.exports = {
  customId: 'music_vol_up',

  async execute(interaction, _client, queue) {
    await interaction.deferUpdate();

    const current = queue.node.volume;
    if (current >= MAX) {
      return interaction.followUp({ content: '🔊 Already at maximum volume (100%).', ephemeral: true });
    }

    const newVol = Math.min(current + STEP, MAX);
    queue.node.setVolume(newVol);
    await updateDashboard(queue);
  },
};
