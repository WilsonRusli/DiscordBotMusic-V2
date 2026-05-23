'use strict';

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Genius           = require('genius-lyrics');

// Gunakan || agar jika token di .env kosong/bermasalah, otomatis fallback ke mode tanpa token
const geniusClient = new Genius.Client(process.env.GENIUS_API_KEY || undefined);

// Batasi 3000 karakter per halaman agar aman dari limit 6000 karakter total Discord
const MAX_EMBED_LENGTH = 3000;

module.exports = {
  customId: 'music_lyrics',

  async execute(interaction, _client, queue) {
    await interaction.deferReply({ ephemeral: true });

    const track = queue.currentTrack;
    if (!track) {
      return interaction.editReply({ content: '❌ No track is currently playing.' });
    }

    // Membersihkan judul (hilangkan "(Official Video)", "[HD]", dll)
    const cleanTitle  = track.title.replace(/\(.*?\)|\[.*?\]/g, '').trim();
    const searchQuery = `${cleanTitle} ${track.author ?? ''}`.trim();

    try {
      const searches = await geniusClient.songs.search(searchQuery);
      if (!searches.length) {
        return interaction.editReply({ content: `❌ No lyrics found for **${track.title}**.` });
      }

      const song   = searches[0];
      let lyrics = await song.lyrics();

      if (!lyrics) {
        return interaction.editReply({ content: '❌ Lyrics are unavailable for this track.' });
      }

      // ── PEMBERSIH LIRIK (DATA CLEANING) ───────────────────────────────────
      lyrics = lyrics.replace(/<[^>]*>?/gm, ''); // Hapus tag HTML
      lyrics = lyrics.replace(/[0-9]+ ContributorsTranslations.*?Lyrics/gi, ''); // Hapus teks metadata Genius
      
      const firstSectionMatch = lyrics.match(/\[(Verse|Chorus|Intro|Pre-Chorus|Bridge|Outro|Hook|Refrain|Instrumental).*?\]/i);
      if (firstSectionMatch) {
          lyrics = lyrics.substring(firstSectionMatch.index);
      }
      lyrics = lyrics.trim();
      // ──────────────────────────────────────────────────────────────────────

      // Pecah lirik menjadi beberapa halaman jika terlalu panjang
      const chunks = splitText(lyrics, MAX_EMBED_LENGTH);
      const embeds = chunks.map((chunk, i) =>
        new EmbedBuilder()
          .setColor(0xFFFF64)          // Kuning khas Genius
          .setTitle(i === 0 ? `📜 ${song.fullTitle}` : `📜 ${song.fullTitle} (Part ${i + 1})`)
          .setURL(song.url)
          .setDescription(chunk)
          .setFooter({ text: `Halaman ${i + 1} / ${chunks.length} • Source: Genius` }),
      );

      // Jika lirik cukup pendek (cuma 1 halaman), langsung kirim tanpa tombol
      if (embeds.length === 1) {
        return interaction.editReply({ embeds: [embeds[0]] });
      }

      // ── SISTEM TOMBOL NAVIGASI ────────────────────────────────────────────
      const prevButton = new ButtonBuilder()
        .setCustomId('prev_lyrics')
        .setLabel('◀ Previous')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true); // Matikan tombol 'Previous' di halaman pertama

      const nextButton = new ButtonBuilder()
        .setCustomId('next_lyrics')
        .setLabel('Next ▶')
        .setStyle(ButtonStyle.Primary);

      let row = new ActionRowBuilder().addComponents(prevButton, nextButton);

      // Kirim halaman pertama beserta tombol
      let currentPage = 0;
      const message = await interaction.editReply({
        embeds: [embeds[currentPage]],
        components: [row]
      });

      // Collector untuk mendengarkan klik tombol selama 5 menit
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300_000 
      });

      collector.on('collect', async (i) => {
        // Pindah halaman berdasarkan tombol yang diklik
        if (i.customId === 'prev_lyrics') currentPage--;
        if (i.customId === 'next_lyrics') currentPage++;

        // Atur status nyala/mati tombol sesuai posisi halaman
        prevButton.setDisabled(currentPage === 0);
        nextButton.setDisabled(currentPage === embeds.length - 1);

        row = new ActionRowBuilder().addComponents(prevButton, nextButton);

        // Update pesan secara instan (tanpa pesan baru)
        await i.update({
          embeds: [embeds[currentPage]],
          components: [row]
        });
      });

      collector.on('end', () => {
        // Setelah 5 menit, matikan tombol agar interaksi kadaluarsa
        prevButton.setDisabled(true);
        nextButton.setDisabled(true);
        
        row = new ActionRowBuilder().addComponents(prevButton, nextButton);
        interaction.editReply({ components: [row] }).catch(() => {});
      });

    } catch (err) {
      console.error('[Lyrics] Fetch error:', err.message);
      await interaction.editReply({
        content: `❌ Failed to fetch lyrics: \`${err.message}\``,
      });
    }
  },
};

/** Memecah teks panjang menjadi array berdasarkan ukuran maksimal */
function splitText(text, size) {
  const chunks = [];
  const lines  = text.split('\n');
  let current  = '';

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