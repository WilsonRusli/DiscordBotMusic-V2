'use strict';

const { updateDashboard } = require('../utils/musicDashboard');

module.exports = {
  customId: 'music_pause',

  async execute(interaction, _client, queue) {
    await interaction.deferUpdate();

    if (queue.node.isPaused()) {
      queue.node.resume();
    } else {
      queue.node.pause();
    }

    await updateDashboard(queue);
  },
};
