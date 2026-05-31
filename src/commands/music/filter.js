'use strict';

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags, // 👈 Modul baru untuk menghilangkan warning ephemeral
} = require('discord.js');

const { useQueue } = require('discord-player');
const { FILTERS, CATEGORIES, getByCategory, getFilter } = require('../../utils/filtersList');

// ─── Konstanta ────────────────────────────────────────────────────────────────
const COLLECTOR_TIMEOUT = 120_000;   // 2 menit tanpa interaksi → UI dimatikan
const SELECT_ID         = 'filter_select_cat';    
const MENU_ID           = 'filter_select_filter'; 
const BTN_CLEAR         = 'filter_btn_clear';
const BTN_CLOSE         = 'filter_btn_close';

// ─── Command Definition ───────────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('filter')
    .setDescription('🎛️ Terapkan atau lepas audio filter pada lagu yang sedang diputar'),

  async execute(interaction) {
    // 👇 Menggunakan MessageFlags sesuai standar Discord.js v14+
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // ── Guard ─────────────────────────────────────────────────────────────────
    const queue = useQueue(interaction.guildId);

    if (!queue?.currentTrack) {
      return interaction.editReply({
        embeds: [errEmbed('Tidak ada lagu yang sedang diputar!')],
      });
    }

    const userVoice = interaction.member?.voice?.channel;
    const botVoice  = interaction.guild.members.me?.voice?.channel;

    if (botVoice && userVoice?.id !== botVoice.id) {
      return interaction.editReply({
        embeds: [errEmbed('Kamu harus berada di voice channel yang sama dengan bot!')],
      });
    }

    // ── Kirim UI awal ─────────────────────────────────────────────────────────
    let selectedCategory = CATEGORIES[0];   

    const filterMsg = await interaction.editReply({
      embeds     : [buildStatusEmbed(queue)],
      components : buildComponents(queue, selectedCategory),
    });

    // ─── Collector ─────────────────────────────────────────────────────────────
    const collector = filterMsg.createMessageComponentCollector({
      filter : (i) => i.user.id === interaction.user.id,
      time   : COLLECTOR_TIMEOUT,
    });

    collector.on('collect', async (i) => {
      try {
        // 👇 SABUK PENGAMAN YANG BENAR
        try {
          // Tunggu sampai bot BENAR-BENAR sukses melakukan defer
          await i.deferUpdate();
        } catch (deferErr) {
          // Jika gagal (koneksi API Discord terputus), batalkan klik ini secara diam-diam.
          // User cukup memilih ulang menu filternya.
          return; 
        }

        // Mulai dari baris ini, kita dijamin 100% aman untuk menggunakan i.editReply()

        // ── Ganti kategori ────────────────────────────────────────────────────
        if (i.isStringSelectMenu() && i.customId === SELECT_ID) {
          selectedCategory = i.values[0];
          
          await i.editReply({
            embeds     : [buildStatusEmbed(queue)],
            components : buildComponents(queue, selectedCategory),
          });
          return;
        }

        // ── Toggle filter ─────────────────────────────────────────────────────
        if (i.isStringSelectMenu() && i.customId === MENU_ID) {
          const toToggle = i.values;   

          // 🌟 TAMBAHAN UX: Berikan status "Loading" dan sembunyikan UI 
          // Ini mencegah error kedaluwarsa dan menghindari user melakukan spam klik
          await i.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor(0xFFA500) // Warna oranye (Loading)
                .setDescription('⏳ **Meracik filter audio...**\n*Lagu akan berhenti sejenak untuk memproses efek, mohon tunggu.*')
            ],
            components: [] // Kosongkan komponen sementara agar tidak bisa diklik
          });

          // Peringatan earrape
          const hasEarrape = toToggle.includes('earrape');
          if (hasEarrape) {
            const currentVol = queue.node.volume;
            if (currentVol > 50) {
              queue.node.setVolume(Math.min(currentVol, 30));
            }
          }

          // Toggle di discord-player (Ini adalah proses FFmpeg yang berat)
          await queue.filters.ffmpeg.toggle(toToggle);

          // 🌟 KEMBALIKAN UI: Setelah FFmpeg selesai, munculkan lagi menu filternya
          await i.editReply({
            embeds     : [buildStatusEmbed(queue)],
            components : buildComponents(queue, selectedCategory),
          });

          // Kirim notifikasi sukses
          const details = toToggle.map((id) => {
            const meta    = getFilter(id);
            const active  = queue.filters.ffmpeg.isEnabled(id);
            return `${meta?.emoji ?? '🎛️'} **${meta?.label ?? id}** → ${active ? '✅ ON' : '⬜ OFF'}`;
          }).join('\n');

          await i.followUp({ content: details, flags: MessageFlags.Ephemeral }).catch(() => {});
          return;
        }

        // ── Clear all filters ─────────────────────────────────────────────────
        if (i.isButton() && i.customId === BTN_CLEAR) {
          const active = [...(queue.filters.ffmpeg.filters ?? [])];
          if (active.length > 0) {
            await queue.filters.ffmpeg.toggle(active);
          }
          await i.editReply({
            embeds     : [buildStatusEmbed(queue)],
            components : buildComponents(queue, selectedCategory),
          });
          await i.followUp({ content: '🧹 Semua filter telah dinonaktifkan.', flags: MessageFlags.Ephemeral }).catch(() => {});
          return;
        }

        // ── Tutup UI ─────────────────────────────────────────────────────────
        if (i.isButton() && i.customId === BTN_CLOSE) {
          collector.stop('user_close');
          await i.editReply({ components: [] }).catch(() => {});
          return;
        }

      } catch (err) {
        console.error('[/filter] Collector error:', err.message);
        
        // Pengecekan ganda: hanya kirim followUp jika deferUpdate tadi sukses
        if (i.deferred || i.replied) {
          await i.followUp({ 
            content: `❌ Terjadi error saat memproses filter: \`${err.message}\``, 
            flags: MessageFlags.Ephemeral 
          }).catch(() => {});
        }
      }
    });
  },
};

// ─── Embed Builder ─────────────────────────────────────────────────────────────

function buildStatusEmbed(queue) {
  const activeFilters = queue.filters.ffmpeg.filters ?? [];
  const track         = queue.currentTrack;

  const activeByCategory = {};
  for (const id of activeFilters) {
    const meta = getFilter(id);
    if (!meta) continue;
    if (!activeByCategory[meta.category]) activeByCategory[meta.category] = [];
    activeByCategory[meta.category].push(`${meta.emoji} ${meta.label}`);
  }

  const activeText = activeFilters.length === 0
    ? '*Tidak ada filter aktif*'
    : Object.entries(activeByCategory)
        .map(([cat, list]) => `**${cat}**\n${list.map((l) => `• ${l}`).join('\n')}`)
        .join('\n\n');

  return new EmbedBuilder()
    .setColor(activeFilters.length > 0 ? 0x9B59B6 : 0x2F3136)
    .setAuthor({ name: '🎛️  Audio Filter Manager' })
    .setTitle(
      track.title.length > 60
        ? `${track.title.slice(0, 57)}…`
        : track.title,
    )
    .setURL(track.url)
    .setThumbnail(track.thumbnail || null)
    .addFields(
      {
        name  : `⚡ Filter Aktif (${activeFilters.length} / ${FILTERS.length})`,
        value : activeText,
      },
      {
        name  : '💡 Cara Pakai',
        value :
          '1. Pilih **kategori** dari menu pertama\n'
          + '2. Pilih satu atau beberapa **filter** dari menu kedua\n'
          + '3. Filter yang sudah ✅ aktif akan **dinonaktifkan** jika dipilih lagi\n'
          + '4. Gunakan tombol **🧹 Clear All** untuk reset semua filter',
      },
    )
    .setFooter({ text: `UI otomatis hilang setelah 2 menit tanpa interaksi` })
    .setTimestamp();
}

// ─── Component Builder ─────────────────────────────────────────────────────────

function buildComponents(queue, selectedCategory) {
  const activeFilters = new Set(queue.filters.ffmpeg.filters ?? []);

  const categoryMenu = new StringSelectMenuBuilder()
    .setCustomId(SELECT_ID)
    .setPlaceholder('📂  Pilih kategori filter…')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      CATEGORIES.map((cat) => {
        const filtersInCat  = getByCategory(cat);
        const activeInCat   = filtersInCat.filter((f) => activeFilters.has(f.id)).length;
        const badge         = activeInCat > 0 ? ` (${activeInCat} aktif)` : '';
        return new StringSelectMenuOptionBuilder()
          .setValue(cat)
          .setLabel(`${cat}${badge}`)
          .setDescription(`${filtersInCat.length} filter tersedia`)
          .setDefault(cat === selectedCategory);
      }),
    );

  const filtersInCat = getByCategory(selectedCategory);

  const filterMenu = new StringSelectMenuBuilder()
    .setCustomId(MENU_ID)
    .setPlaceholder(`🎛️  Pilih filter dari kategori "${selectedCategory}"…`)
    .setMinValues(1)
    .setMaxValues(filtersInCat.length)
    .addOptions(
      filtersInCat.map((f) => {
        const isActive = activeFilters.has(f.id);
        return new StringSelectMenuOptionBuilder()
          .setValue(f.id)
          .setLabel(`${isActive ? '✅' : '⬜'} ${f.label}`)
          .setDescription(f.description.slice(0, 100))
          .setEmoji(f.emoji);
      }),
    );

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(BTN_CLEAR)
      .setEmoji('🧹')
      .setLabel('Clear All Filters')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(activeFilters.size === 0),

    new ButtonBuilder()
      .setCustomId(BTN_CLOSE)
      .setEmoji('✖️')
      .setLabel('Tutup')
      .setStyle(ButtonStyle.Secondary),
  );

  return [
    new ActionRowBuilder().addComponents(categoryMenu),
    new ActionRowBuilder().addComponents(filterMenu),
    actionRow,
  ];
}

// 👇 INI DIA FUNGSI YANG HILANG SEBELUMNYA!
// ─── Helpers ───────────────────────────────────────────────────────────────────
function errEmbed(text) {
  return new EmbedBuilder()
    .setColor(0xFF4444)
    .setDescription(`❌  ${text}`);
}