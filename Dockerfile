# Gunakan Node.js versi terbaru yang stabil (versi slim agar build lebih cepat)
FROM node:22-slim

# Wajib instal ffmpeg & bersihkan cache installer agar ukuran image tetap ringan
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Tentukan folder kerja di dalam server
WORKDIR /app

# Copy package.json dan install semua library
COPY package*.json ./
RUN npm install

# Copy seluruh file bot kamu ke server
COPY . .

# Aturan wajib Hugging Face untuk port aplikasi web
ENV PORT=7860
EXPOSE 7860

# Jalankan bot musik langsung menggunakan Node (lebih aman untuk process handler)
CMD ["node", "index.js"]


