'use strict';

/**
 * Definisi semua audio filter yang tersedia.
 * Setiap entry berisi:
 *   id          – nama filter persis seperti yang dikenal discord-player/FFmpeg
 *   label       – teks yang tampil di Select Menu
 *   emoji       – emoji dekoratif
 *   description – deskripsi singkat (max 100 char untuk Discord)
 *   category    – untuk pengelompokan visual di embed
 *   warning     – (opsional) pesan peringatan
 */
const FILTERS = [
  // ── Frekuensi ───────────────────────────────────────────────────────────────
  {
    id: 'bassboost_low',
    label: 'Bass Boost (Halus)',
    emoji: '🔉',
    description: 'Tambahan bass ringan, cocok untuk semua genre',
    category: 'Frekuensi',
  },
  {
    id: 'bassboost',
    label: 'Bass Boost',
    emoji: '🔊',
    description: 'Penguatan bass standar',
    category: 'Frekuensi',
  },
  {
    id: 'bassboost_high',
    label: 'Bass Boost (Kencang)',
    emoji: '📢',
    description: 'Bass sangat kuat, cocok untuk EDM/Hip-Hop',
    category: 'Frekuensi',
  },
  {
    id: 'subboost',
    label: 'Sub Boost',
    emoji: '💥',
    description: 'Penguatan frekuensi sub-bass sangat rendah',
    category: 'Frekuensi',
  },
  {
    id: 'treble',
    label: 'Treble Boost',
    emoji: '🎶',
    description: 'Penguatan frekuensi tinggi/treble',
    category: 'Frekuensi',
  },

  // ── Spasial ─────────────────────────────────────────────────────────────────
  {
    id: '8D',
    label: '8D Audio',
    emoji: '🎧',
    description: 'Efek audio berputar 360° (pakai headphone!)',
    category: 'Spasial',
  },
  {
    id: 'surrounding',
    label: 'Surround Sound',
    emoji: '🔄',
    description: 'Simulasi audio surround',
    category: 'Spasial',
  },
  {
    id: 'haas',
    label: 'Haas Effect',
    emoji: '👂',
    description: 'Pelebaran stereo dengan efek Haas',
    category: 'Spasial',
  },

  // ── Pitch / Speed ────────────────────────────────────────────────────────────
  {
    id: 'nightcore',
    label: 'Nightcore',
    emoji: '🌙',
    description: 'Lebih cepat & nada lebih tinggi (anime vibes)',
    category: 'Pitch',
  },
  {
    id: 'vaporwave',
    label: 'Vaporwave',
    emoji: '🌊',
    description: 'Lebih lambat & nada lebih rendah (aesthetic)',
    category: 'Pitch',
  },

  // ── Efek Modulasi ────────────────────────────────────────────────────────────
  {
    id: 'vibrato',
    label: 'Vibrato',
    emoji: '〰️',
    description: 'Modulasi nada naik-turun secara periodik',
    category: 'Modulasi',
  },
  {
    id: 'tremolo',
    label: 'Tremolo',
    emoji: '🌀',
    description: 'Modulasi volume naik-turun secara periodik',
    category: 'Modulasi',
  },
  {
    id: 'phaser',
    label: 'Phaser',
    emoji: '🎛️',
    description: 'Efek phase-shift yang khas pada gitar/synth',
    category: 'Modulasi',
  },
  {
    id: 'flanger',
    label: 'Flanger',
    emoji: '🎚️',
    description: 'Efek flanger: delay pendek yang disapu',
    category: 'Modulasi',
  },
  {
    id: 'chorus',
    label: 'Chorus',
    emoji: '🎵',
    description: 'Membuat suara seolah dari banyak sumber',
    category: 'Modulasi',
  },
  {
    id: 'chorus2d',
    label: 'Chorus 2D',
    emoji: '🎼',
    description: 'Variasi chorus dua-dimensi',
    category: 'Modulasi',
  },
  {
    id: 'pulsator',
    label: 'Pulsator',
    emoji: '💓',
    description: 'Audio berdenyut mengikuti ritme',
    category: 'Modulasi',
  },

  // ── Dinamika ─────────────────────────────────────────────────────────────────
  {
    id: 'normalizer',
    label: 'Normalizer',
    emoji: '📊',
    description: 'Samakan level volume audio secara otomatis',
    category: 'Dinamika',
  },
  {
    id: 'compressor',
    label: 'Compressor',
    emoji: '🗜️',
    description: 'Perkecil rentang dinamis audio',
    category: 'Dinamika',
  },
  {
    id: 'gate',
    label: 'Noise Gate',
    emoji: '🚪',
    description: 'Kurangi kebisingan background',
    category: 'Dinamika',
  },

  // ── Efek Khusus ───────────────────────────────────────────────────────────────
  {
    id: 'karaoke',
    label: 'Karaoke',
    emoji: '🎤',
    description: 'Coba hilangkan vokal (tidak sempurna)',
    category: 'Khusus',
  },
  {
    id: 'reverse',
    label: 'Reverse',
    emoji: '⏪',
    description: 'Putar audio secara terbalik',
    category: 'Khusus',
  },
  {
    id: 'mono',
    label: 'Mono',
    emoji: '📻',
    description: 'Gabungkan saluran stereo menjadi mono',
    category: 'Khusus',
  },
  {
    id: 'fadein',
    label: 'Fade In',
    emoji: '🌅',
    description: 'Audio muncul perlahan di awal',
    category: 'Khusus',
  },
  {
    id: 'earrape',
    label: '💀 Earrape',
    emoji: '⚠️',
    description: '⚠️ DISTORSI SANGAT KERAS – gunakan dengan bijak!',
    category: 'Ekstrem',
    warning: '⚠️ Filter ini sangat keras. Kecilkan volume terlebih dahulu!',
  },
];

/** Ambil semua kategori unik dalam urutan yang konsisten */
const CATEGORIES = [...new Set(FILTERS.map((f) => f.category))];

/** Cari satu filter berdasarkan id */
function getFilter(id) {
  return FILTERS.find((f) => f.id === id) ?? null;
}

/** Kembalikan array filter dalam satu kategori */
function getByCategory(category) {
  return FILTERS.filter((f) => f.category === category);
}

module.exports = { FILTERS, CATEGORIES, getFilter, getByCategory };
