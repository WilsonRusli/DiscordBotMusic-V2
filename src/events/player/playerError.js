'use strict';

const { EmbedBuilder } = require('discord.js');

module.exports = {
  name : 'playerError',
  once : false,

  /**
   * @param {import('discord-player').GuildQueue} queue
   * @param {Error}                               error
   * @param {import('discord-player').Track}      track
   */
  async execute(queue, error, track) {
    console.error(`[Player Error] Guild: ${queue.guild.id} | Track: ${track?.title}`, error);

    const channel = queue.metadata?.channel;
    if (!channel) return;

    try {
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFF4444)
            .setTitle('⚠️ Player Error')
            .setDescription(
              `An error occurred while playing **${track?.title ?? 'Unknown Track'}**.\n\`\`\`${error.message}\`\`\``,
            )
            .setTimestamp(),
        ],
      });
    } catch { /* ignore – channel may be unavailable */ }
  },
};
