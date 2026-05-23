'use strict';

const { ActivityType } = require('discord.js');

module.exports = {
  name : 'ready',
  once : true,

  execute(client) {
    console.log(`[Bot] ✅ Logged in as ${client.user.tag}`);
    console.log(`[Bot] Serving ${client.guilds.cache.size} guild(s)`);

    client.user.setPresence({
      activities: [{
        name : '/play',
        type : ActivityType.Listening,
      }],
      status: 'online',
    });
  },
};
