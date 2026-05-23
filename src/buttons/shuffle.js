'use strict';

module.exports = {
  customId: 'music_shuffle',

  async execute(interaction, _client, queue) {
    await interaction.deferUpdate();

    if (queue.tracks.size < 2) {
      return interaction.followUp({
        content  : '❌ Need at least 2 songs in the queue to shuffle.',
        ephemeral: true,
      });
    }

    queue.tracks.shuffle();

    await interaction.followUp({
      content  : '🔀 Queue shuffled!',
      ephemeral: true,
    });
  },
};
