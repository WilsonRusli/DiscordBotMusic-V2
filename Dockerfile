# Gunakan Node.js versi terbaru yang stabil
FROM node:22

# Wajib instal ffmpeg di dalam Linux Hugging Face untuk memproses suara bot musik
RUN apt-get update && apt-get install -y ffmpeg

# Tentukan folder kerja di dalam server
WORKDIR /app

# Copy package.json dan install semua library
COPY package*.json ./
RUN npm install

# Copy seluruh file bot kamu ke server
COPY . .

# Hugging Face mewajibkan port 7860 untuk aplikasi web
EXPOSE 7860
ENV PORT=7860

# Jalankan bot musik
CMD ["npm", "start"]