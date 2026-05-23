'use strict';

const {
  createDashboardEmbed,
  createDashboardComponents,
} = require('../../utils/musicDashboard');

module.exports = {
  name    : 'playerStart',
  once    : false,

  /**
   * Fires when a new track starts playing.
   * We update the persistent dashboard message – or send a fresh one if it
   * was somehow lost (e.g. message deleted by a moderator).
   *
   * @param {import('discord-player').GuildQueue} queue
   * @param {import('discord-player').Track}      track
   */
  async execute(queue, track) {
    const meta = queue.metadata;
    if (!meta?.channel) return;

    const embed      = createDashboardEmbed(queue);
    const components = createDashboardComponents(queue);

    try {
      if (meta.dashboardMessage?.editable) {
        // Reuse existing dashboard message
        await meta.dashboardMessage.edit({ embeds: [embed], components });
      } else {
        // Send a fresh one
        const msg = await meta.channel.send({ embeds: [embed], components });
        meta.dashboardMessage = msg;
      }
    } catch (err) {
      console.error('[Event:playerStart] Dashboard update failed:', err.message);
    }
  },
};
