'use strict';

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('📚 Menampilkan panduan dan daftar semua perintah bot.'),

    /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
    async execute(interaction) {
        await interaction.deferReply( {flags: MessageFlags.Ephemeral} );

        const commands = interaction.client.commands;
        
        const commandList = commands.map(cmd => {
            return `**/${cmd.data.name}** - ${cmd.data.description}`;
        }).join('\n\n');

        const helpEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🤖 Panduan Perintah Bot')
            .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true, size: 512 }))
            .setDescription(`Halo! Saya adalah bot serbaguna. Berikut adalah daftar lengkap perintah yang bisa kamu gunakan saat ini:\n\n${commandList}`)
            .setFooter({ 
                text: `Total ${commands.size} perintah tersedia • Diminta oleh ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();
        
        return interaction.editReply( {embeds: [helpEmbed]} );
    },
};