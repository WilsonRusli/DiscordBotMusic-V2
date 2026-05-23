'use strict';

const { QueueRepeatMode }  = require('discord-player');
const { updateDashboard }  = require('../utils/musicDashboard');

// Cycle order
const LOOP_CYCLE = [
  QueueRepeatMode.OFF,
  QueueRepeatMode.TRACK,
  QueueRepeatMode.QUEUE,
  QueueRepeatMode.AUTOPLAY,
];

module.exports = {
  customId: 'music_loop',

  async execute(interaction, _client, queue) {
    await interaction.deferUpdate();

    const current = queue.repeatMode;
    const nextIdx = (LOOP_CYCLE.indexOf(current) + 1) % LOOP_CYCLE.length;
    queue.setRepeatMode(LOOP_CYCLE[nextIdx]);

    await updateDashboard(queue);
  },
};
