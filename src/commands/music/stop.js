'use strict'

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const { useMainPlayer } = require('discord-player')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stops the playback and disconnects the bot.'),

    async execute(interaction) {
        await interaction.deferReply();

        const player = useMainPlayer();
        const queue = player.nodes.get(interaction.guildId);

        if (!queue || !queue.currentTrack) {
            return interaction.editReply({
                content: '❌ No song is currently playing.'
            });
        }

        const msg = queue.metadata?.dashboardMessage;

        queue.delete();

        if (msg?.editable) {
            const disabledRows = msg.components.map((row) =>
                ActionRowBuilder.from(row).setComponents(
                    row.components.map((btn) => ButtonBuilder.from(btn).setDisabled(true)),
                ),
            );

            await msg.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF4444)
                        .setAuthor({ name: '⏹  Stopped' })
                        .setDescription(`Playback stopped by <@${interaction.user.id}>. Disconnected from voice.`)
                        .setTimestamp(),
                ],
                components: disabledRows,
                }).catch(() => {});
            }

            return interaction.editReply({
                content: '⏹️ Playback stopped and bot disconnected.'
            });
        },
    };