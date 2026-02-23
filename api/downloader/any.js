const axios = require('axios');
const fs = require('fs');

/**
 * ANYDOWNLOADER PRO (STREAMING SAVER)
 * Feature: Auto-Fetch & Buffer Delivery
 * Integration: Shannz x Xena
 */
module.exports = {
    name: "AnyDL Pro",
    desc: "Download video sosmed otomatis dan simpan langsung ke sistem.",
    category: "Downloader",
    params: ["url"],
    async run(req, res) {
        try {
            const { url } = req.query;
            if (!url) return res.status(400).json({ status: false, error: "Link-nya mana, Mang?" });

            const endpoint = 'https://anydownloader.com/wp-json/api/download/';
            const hash = Buffer.from(url).toString('base64') + "1032YXBp";
            const token = "7262ad5f00a065f305ae9655cd93185878278d1d18b6733add0501fbc7029bf7";

            const response = await axios.post(endpoint, 
                new URLSearchParams({ url, token, hash }), 
                {
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded',
                        'user-agent': 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B)'
                    }
                }
            );

            const data = response.data;
            if (data && data.medias) {
                const videoNoWm = data.medias.find(m => m.quality.includes("No Watermark")) || data.medias[0];
                const cleanTitle = (data.title || 'video').replace(/[^\w\s]/gi, '').slice(0, 30);

                // --- OPTIONAL: KIRIM JSON + LINK ---
                res.status(200).json({
                    status: true,
                    creator: "shannz x Xena",
                    title: data.title,
                    thumbnail: data.thumbnail,
                    filename: `${cleanTitle}.mp4`,
                    download_url: videoNoWm.url,
                    audio_url: data.medias.find(m => m.extension === "mp3")?.url || null
                });

                // Note: Jika ingin API langsung ngirim FILE (bukan JSON),
                // kamu bisa ganti res.json di atas jadi pipe stream.
                
            } else {
                res.status(404).json({ status: false, error: "Gagal ambil data, link mungkin privat!" });
            }

        } catch (error) {
            console.error('AnyDL Pro Error:', error.message);
            res.status(500).json({ status: false, error: "Server Downloader lagi mogok!" });
        }
    }
};
