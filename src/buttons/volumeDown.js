'use strict';

const { updateDashboard } = require('../utils/musicDashboard');

const STEP = 10;
const MIN  = 0;

module.exports = {
  customId: 'music_vol_down',

  async execute(interaction, _client, queue) {
    await interaction.deferUpdate();

    const current = queue.node.volume;
    if (current <= MIN) {
      return interaction.followUp({ content: '🔇 Already at minimum volume (0%).', ephemeral: true });
    }

    const newVol = Math.max(current - STEP, MIN);
    queue.node.setVolume(newVol);
    await updateDashboard(queue);
  },
};
