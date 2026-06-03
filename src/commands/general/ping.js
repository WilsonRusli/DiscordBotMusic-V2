'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { execute } = require('../../events/discord/interactionCreate');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('🏓 Check the bot\'s latency and response speed.'),

    /**
         * @param {import('discord.js').ChatInputCommandInteraction} interaction
         */

    async execute(interaction) {
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true});

        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiPing = Math.round(interaction.client.ws.ping);

        const embed = new EmbedBuilder()
            .setColor(0x586F2)
            .setTitle('🏓 Pong!')
            .addFields(
                { name: '🌐 Bot Latency', value: `\`${latency}ms\``, inline: true },
                { name: '📊 API Latency', value: `\`${apiPing}ms\``, inline: true }
            )
            .setTimestamp();

        return interaction.editReply({ content: null, embeds: [embed] });
    },
};