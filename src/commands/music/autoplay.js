'use strict'

const { SlashCommandBuilder } = require('discord.js');
const { useMainPlayer, QueueRepeatMode } = require('discord-player');
const { updateDashboard } = require('../../utils/musicDashboard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoplay')
        .setDescription('Toggles the Autoplay feature.'),

    async execute(interaction){
        await interaction.deferReply();

        const player = useMainPlayer();
        const queue = player.nodes.get(interaction.guildId);

        if (!queue || !queue.currentTrack) {
            return interaction.editReply({ content: '❌ No song is currently playing.'
            });
        }

        const isAutoplay = queue.repeatMode === QueueRepeatMode.AUTOPLAY;

        const newMode = isAutoplay ? QueueRepeatMode.OFF : QueueRepeatMode.AUTOPLAY;
        queue.setRepeatMode(newMode);

        await updateDashboard(queue);

        const statusText = isAutoplay ? '🔴 **OFF**' : '🟢 **ONN**';

        return interaction.editReply({
            content: `♾️ Autoplay turned ${statusText}. Bot automatically find related song.`
        });
    },
};