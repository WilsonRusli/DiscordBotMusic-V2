'use strict';

module.exports = {
  customId: 'music_skip',

  async execute(interaction, _client, queue) {
    await interaction.deferUpdate();
    queue.node.skip();
    // Dashboard update is handled by the playerStart event for the next track
  },
};
