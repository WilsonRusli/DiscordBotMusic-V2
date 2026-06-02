'use strict';

const { ActivityType, EmbedBuilder } = require('discord.js');

module.exports = {
  name : 'clientReady',
  once : true,

  async execute(client) {
    // 1. Log ke terminal
    console.log(`[Bot] ✅ Logged in as ${client.user.tag}`);
    console.log(`[Bot] Serving ${client.guilds.cache.size} guild(s)`);

    // 2. Set status bot (Listening to /play)
    client.user.setPresence({
      activities: [{
        name : '/play',
        type : ActivityType.Listening,
      }],
      status: 'online',
    });

    // 3. Kirim pesan Embed ke channel status
    const channelId = process.env.CHANNEL_STATUS_ID;
    
    // Pastikan channel ID ada di file .env
    if (channelId) {
      try {
        // Cari channel di cache, jika tidak ada coba fetch langsung dari Discord API
        const channel = client.channels.cache.get(channelId) || await client.channels.fetch(channelId).catch(() => null);

        if (channel) {
          const embed = new EmbedBuilder()
            .setColor(0x00FF00) // Warna hijau
            .setTitle('🟢 Bot Online & Ready!')
            .setDescription(`**${client.user.tag}** berhasil dihidupkan ulang dan siap digunakan.`)
            .addFields(
              { name: '📊 Server Count', value: `${client.guilds.cache.size} Server`, inline: true },
              { name: '⚙️ Status', value: 'Listening to `/play`', inline: true }
            )
            .setTimestamp();

          await channel.send({ embeds: [embed] });
        } else {
          console.warn(`[Bot] ⚠️ Tidak dapat menemukan channel status dengan ID: ${channelId}`);
        }
      } catch (error) {
        console.error('[Bot] Gagal mengirim pesan status online:', error.message);
      }
    }
  },
};