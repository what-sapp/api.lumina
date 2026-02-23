const axios = require('axios');

/**
 * ANYDOWNLOADER (UNIVERSAL ENGINE)
 * Feature: TikTok No WM, IG, FB, etc.
 * Integration: Shannz x Xena
 */
module.exports = {
    name: "Any DL",
    desc: "Unduh video dari TikTok (No WM), IG, FB, dan lainnya via AnyDownloader.",
    category: "Downloader",
    params: ["url"],
    async run(req, res) {
        try {
            const { url } = req.query;
            if (!url) return res.status(400).json({ status: false, error: "Link-nya mana, Senior?" });

            const endpoint = 'https://anydownloader.com/wp-json/api/download/';
            
            // Logic Hash: Base64 URL + Salt '1032YXBp'
            const hash = Buffer.from(url).toString('base64') + "1032YXBp";
            
            // Token statis dari hasil sniff kamu
            const token = "7262ad5f00a065f305ae9655cd93185878278d1d18b6733add0501fbc7029bf7";

            const response = await axios.post(endpoint, 
                new URLSearchParams({
                    url: url,
                    token: token,
                    hash: hash
                }), 
                {
                    headers: {
                        'accept': '*/*',
                        'content-type': 'application/x-www-form-urlencoded',
                        'origin': 'https://anydownloader.com',
                        'referer': 'https://anydownloader.com/',
                        'user-agent': 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B)'
                    }
                }
            );

            const data = response.data;

            if (data && data.medias) {
                // Cari video kualitas terbaik (No Watermark untuk TikTok)
                const video = data.medias.find(m => m.quality.toLowerCase().includes("no watermark")) || data.medias[0];
                const audio = data.medias.find(m => m.extension === "mp3");

                res.status(200).json({
                    status: true,
                    creator: "shannz x Xena",
                    title: data.title,
                    thumbnail: data.thumbnail,
                    source: data.source,
                    result: {
                        video: video ? video.url : null,
                        audio: audio ? audio.url : null,
                        quality: video ? video.quality : 'N/A'
                    }
                });
            } else {
                res.status(404).json({ status: false, error: "Gagal mengambil data, mungkin link tidak didukung!" });
            }

        } catch (error) {
            console.error('AnyDL Error:', error.message);
            res.status(500).json({ 
                status: false, 
                error: "Duh, server AnyDownloader lagi sibuk atau token-nya wafat!" 
            });
        }
    }
};
