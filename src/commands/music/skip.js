'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { useMainPlayer } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Melewati (skip) lagu yang sedang diputar saat ini.'),

    async execute(interaction) {
        await interaction.deferReply();

        const player = useMainPlayer();
        const queue = player.nodes.get(interaction.guildId);

        if (!queue || !queue.currentTrack) {
            return interaction.editReply({
                content: '❌ Tidak ada lagu yang sedang diputar saat ini.'
            });
        }

        const skippedTrack = queue.currentTrack.title;

        queue.node.skip();

        return interaction.editReply({
            content: `⏭️ Berhasil melewati lagu: **${skippedTrack}**`
        });
    },
};