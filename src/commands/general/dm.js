'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dm')
    .setDescription('✉️ Mengirimkan DM (bisa pilih nama user ATAU pakai User ID).')
    // 1. OPSI WAJIB HARUS DI ATAS
    .addStringOption((opt) =>
      opt
        .setName('pesan')
        .setDescription('Ketik isi pesan yang ingin dikirimkan')
        .setRequired(true) 
    )
    // 2. OPSI OPSIONAL DI BAWAHNYA
    .addUserOption((opt) =>
      opt
        .setName('target')
        .setDescription('Pilih user dari daftar (kosongkan jika ingin pakai ID)')
        .setRequired(false) 
    )
    // 3. OPSI OPSIONAL DI BAWAHNYA
    .addStringOption((opt) =>
      opt
        .setName('userid')
        .setDescription('Atau ketik User ID (kosongkan jika sudah pilih target)')
        .setRequired(false) 
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Ambil semua input yang dimasukkan user
    const targetOpt = interaction.options.getUser('target');
    const useridOpt = interaction.options.getString('userid');
    const messageContent = interaction.options.getString('pesan');

    // 🛡️ VALIDASI: Pastikan user minimal mengisi salah satu (target atau userid)
    if (!targetOpt && !useridOpt) {
      const warningEmbed = new EmbedBuilder()
        .setColor(0xFFA500) // Warna Oranye
        .setTitle('⚠️ Input Kurang Lengkap')
        .setDescription('Kamu harus mengisi salah satu: **pilih target user** ATAU **masukkan userid**.\nSilakan jalankan ulang perintahnya.')
        .setTimestamp();
        
      return interaction.editReply({ embeds: [warningEmbed] });
    }

    // 🧠 LOGIKA PINTAR: Tentukan ID mana yang akan dipakai
    // Prioritaskan pilihan dari daftar (targetOpt), jika kosong, ambil dari ketikan (useridOpt)
    const finalTargetId = targetOpt ? targetOpt.id : useridOpt;

    let targetUser;

    try {
      // 🔍 TAHAP 1: Mencari User di database pusat Discord berdasarkan ID akhir
      targetUser = await interaction.client.users.fetch(finalTargetId);
    } catch (error) {
      // Jika error, berarti ID tidak valid
      const invalidIdEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ User Tidak Ditemukan')
        .setDescription(`Tidak dapat menemukan user dengan ID \`${finalTargetId}\`. Pastikan angkanya sudah benar.`)
        .setTimestamp();
      
      return interaction.editReply({ embeds: [invalidIdEmbed] });
    }

    try {
      // 📨 TAHAP 2: Mencoba mengirimkan DM
      await targetUser.send({ content: messageContent });

      // Jika berhasil
      const successEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ DM Berhasil Dikirim')
        .setDescription(`Pesan kamu telah terkirim ke **${targetUser.tag}**.\n\n**Isi Pesan:**\n${messageContent}`)
        .setFooter({ text: `Target ID: ${targetUser.id}` })
        .setTimestamp();

      return interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
      // Jika DM ditolak/ditutup oleh target
      console.error(`Gagal mengirim DM ke ${targetUser.tag}:`, error);

      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Gagal Mengirim DM')
        .setDescription(`Bot berhasil menemukan **${targetUser.tag}**, tetapi tidak dapat mengirim pesan. Mereka mungkin telah menonaktifkan DM atau memblokir bot ini.`)
        .setTimestamp();

      return interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};