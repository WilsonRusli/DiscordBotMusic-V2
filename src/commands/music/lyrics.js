'use strict';

const { useMainPlayer } = require('discord-player');
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Genius           = require('genius-lyrics');

const geniusClient = new Genius.Client(process.env.GENIUS_API_KEY || undefined);

// Batasi 3000 karakter per halaman agar aman dari limit 6000 karakter total Discord
const MAX_EMBED_LENGTH = 3000;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('Show the lyrics that current playing song.'),

    async execute(interaction,) {
        await interaction.deferReply({ ephemeral: true});

        const player = useMainPlayer();
        const queue = player.nodes.get(interaction.guildId);

        const track = queue?.currentTrack;
        if (!track) {
            return interaction.editReply({ content: '❌ No song currently playing.'});
        }

        const cleanTitle = track.title.replace(/\(.*?\)|\[.*?\]/g, '').trim();
        const searchQuery = `${cleanTitle} ${track.author ?? ''}`.trim();

        try {
            const searches = await geniusClient.songs.search(searchQuery);
            if (!searches.length) {
                return interaction.editReply({ content: `❌ Lyrics not found for **${track.title}**.`});
            }

            const song = searches[0];
            let lyrics = await song.lyrics();

            if (!lyrics) {
                return interaction.editReply({ content: `❌ No Lyrics available for this song.`});
            }

            lyrics = lyrics.replace(/<[^>]*>?/gm, '');
            lyrics = lyrics.replace(/[0-9]+ ContributorsTranslations.*?Lyrics/gi, '');

            const firstSectionMatch = lyrics.match(/\[(Verse|Chorus|Intro|Pre-Chorus|Bridge|Outro|Hook|Refrain|Instrumental).*?\]/i)
            if (firstSectionMatch) {
                lyrics = lyrics.substring(firstSectionMatch.index);
            }
            lyrics = lyrics.trim();

            const chunks = splitText(lyrics, MAX_EMBED_LENGTH);
            const embeds = chunks.map((chunk, i) => 
                new EmbedBuilder()
                    .setColor(0xFFFF64)
                    .setTitle(i === 0 ? `📜 ${song.fullTitle}` : `📜 ${song.fullTitle} (Part ${i + 1})`)
                    .setURL(song.url)
                    .setDescription(chunk)
                    .setFooter({ text: `Halaman ${i + 1} / ${chunks.length} • Source: Genius` }),
                );
                
            if (embeds.length === 1){
                return interaction.editReply({ embeds: [embeds[0]] });
            }

            const prevButton = new ButtonBuilder()
                .setCustomId('prev_lyrics')
                .setLabel('◀ Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true);
            
            const nextButton = new ButtonBuilder()
                .setCustomId('next_lyrics')
                .setLabel('Next ▶')
                .setStyle(ButtonStyle.Primary);

            let row = new ActionRowBuilder().addComponents(prevButton, nextButton);

            let currentPage = 0;
            const message = await interaction.editReply({
                embeds: [embeds[currentPage]],
                components: [row]
            });

            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 300_000
            });

            collector.on('collect', async (i) => {
                if (i.customId === 'prev_lyrics') currentPage--;
                if (i.customId === 'next_lyrics') currentPage++;

                prevButton.setDisabled(currentPage === 0);
                nextButton.setDisabled(currentPage === embeds.length - 1);

                row = new ActionRowBuilder().addComponents(prevButton, nextButton);

                await i.update({
                    embeds: [embeds[currentPage]],
                    components: [row]
                });
            });

            collector.on('end', () => {
                prevButton.setDisabled(true);
                nextButton.setDisabled(true);

                row = new ActionRowBuilder().addComponents(prevButton, nextButton);
                interaction.editReply({ components: [row] }).catch(() => {});
            });

        } catch (err) {
            console.error('[Lyrics] Fetch error:', err.message);
            await interaction.editReply({
                content: `❌ Gagal mengambil lirik: \`${err.message}\'`
            });
        }
    },
};

function splitText(text, size) {
    const chunks = [];
    const lines  = text.split('\n');
    let current = '';
    
    for (const line of lines) {
        if ((current + '\n' + line).length > size) {
            chunks.push(current.trim());
            current = line;
        } else {
            current += (current ? '\n' : '') + line;
        }
    }

    if (current.trim()) chunks.push(current.trim());
    return chunks;
}