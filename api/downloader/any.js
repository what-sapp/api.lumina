const axios = require('axios');

/**
 * ANYDOWNLOADER PRO (ULTIMATE STEALTH)
 * Fix: 403 Forbidden on Datacenter IPs
 * Added: Chrome Client Hints & Improved Hash Logic
 */
module.exports = {
    name: "AnyDL Pro",
    desc: "Nembus Cloudflare AnyDownloader dengan header Chrome modern.",
    category: "Downloader",
    params: ["url"],
    async run(req, res) {
        try {
            const { url } = req.query;
            if (!url) return res.status(400).json({ 
                status: false, 
                error: "Link-nya mana, Mang? Masukin parameter ?url=" 
            });

            const endpoint = 'https://anydownloader.com/wp-json/api/download/';
            
            // Generate Hash & Token tetap sama karena ini logic internal mereka
            const hash = Buffer.from(url).toString('base64') + "1032YXBp";
            const token = "7262ad5f00a065f305ae9655cd93185878278d1d18b6733add0501fbc7029bf7";

            console.log(`[AnyDL] Processing: ${url}`);

            const response = await axios({
                method: 'post',
                url: endpoint,
                // Menggunakan URLSearchParams agar formatnya application/x-www-form-urlencoded murni
                data: new URLSearchParams({ url, token, hash }).toString(),
                headers: {
                    'authority': 'anydownloader.com',
                    'accept': 'application/json, text/plain, */*',
                    'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                    'content-type': 'application/x-www-form-urlencoded',
                    'origin': 'https://anydownloader.com',
                    'referer': 'https://anydownloader.com/en/tiktok-video-downloader/',
                    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
                    // --- HEADER SAKTI ANTI-403 ---
                    'sec-ch-ua': '"Not A(BAbrand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
                    'sec-ch-ua-mobile': '?1',
                    'sec-ch-ua-platform': '"Android"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin',
                    'x-requested-with': 'XMLHttpRequest'
                },
                timeout: 20000
            });

            const data = response.data;

            if (data && data.medias) {
                // Filter No Watermark, kalo gaada ambil yang pertama
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
                        quality: video ? video.quality : 'N/A',
                        size: video ? video.formattedSize : 'N/A'
                    }
                });
            } else {
                res.status(404).json({ 
                    status: false, 
                    error: "Konten tidak ditemukan atau limit tercapai.",
                    debug: data 
                });
            }

        } catch (error) {
            const status = error.response ? error.response.status : 500;
            
            // Jika tetap 403, server butuh Proxy atau pindah region
            if (status === 403) {
                return res.status(403).json({
                    status: false,
                    error: "Cloudflare mendeteksi IP Server kamu (403 Forbidden).",
                    tip: "Gunakan Proxy atau jalankan di lingkungan lokal (Termux) agar tembus."
                });
            }

            res.status(status).json({ 
                status: false, 
                error: "Server Error",
                detail: error.message 
            });
        }
    }
};
