const axios = require('axios');

/**
 * ANYDOWNLOADER PRO (STEALTH MODE)
 * Fix: Error 500 on Server Deployment
 * Integration: Shannz x Xena
 */
module.exports = {
    name: "AnyDL Pro",
    desc: "Universal Downloader dengan sistem Stealth untuk nembus proteksi server.",
    category: "Downloader",
    params: ["url"],
    async run(req, res) {
        try {
            const { url } = req.query;
            if (!url) return res.status(400).json({ status: false, error: "Link-nya mana, Mang?" });

            const endpoint = 'https://anydownloader.com/wp-json/api/download/';
            const hash = Buffer.from(url).toString('base64') + "1032YXBp";
            const token = "7262ad5f00a065f305ae9655cd93185878278d1d18b6733add0501fbc7029bf7";

            // Gunakan headers yang lebih lengkap sesuai dengan browser asli
            const response = await axios({
                method: 'post',
                url: endpoint,
                data: new URLSearchParams({ url, token, hash }),
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Origin': 'https://anydownloader.com',
                    'Referer': 'https://anydownloader.com/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                timeout: 15000 // Kasih waktu lebih lama biar nggak timeout
            });

            const data = response.data;

            if (data && data.medias) {
                const video = data.medias.find(m => m.quality.toLowerCase().includes("no watermark")) || data.medias[0];
                const audio = data.medias.find(m => m.extension === "mp3");

                res.status(200).json({
                    status: true,
                    creator: "shannz x Xena",
                    title: data.title,
                    thumbnail: data.thumbnail,
                    result: {
                        video: video ? video.url : null,
                        audio: audio ? audio.url : null,
                        quality: video ? video.quality : 'N/A'
                    }
                });
            } else {
                // Balikin error asli dari server AnyDownloader buat debugging
                res.status(404).json({ 
                    status: false, 
                    error: "AnyDownloader tidak memberikan hasil. Link mungkin mati atau privat.",
                    debug: data 
                });
            }

        } catch (error) {
            // Cek apakah error karena diblokir (403/500)
            const errorStatus = error.response ? error.response.status : 500;
            const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
            
            console.error('AnyDL Pro Error:', errorMsg);
            res.status(errorStatus).json({ 
                status: false, 
                error: "AnyDownloader memblokir akses server. Coba ganti Proxy atau IP!",
                detail: error.message 
            });
        }
    }
};
