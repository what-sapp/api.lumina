const axios = require('axios');

/**
 * OPLOVERZ ANIME DETAIL & EPISODE LIST
 * Source: Sanka Vollerei
 * Params: slug (Slug Anime, contoh: one-piece)
 */
module.exports = {
    name: "Oploverz Detail",
    desc: "Mendapatkan informasi lengkap anime beserta daftar episodenya dari Oploverz",
    category: "ANIME",
    params: ["slug"],
    async run(req, res) {
        try {
            const { slug } = req.query;
            
            if (!slug) {
                return res.status(400).json({ 
                    status: false, 
                    error: "Masukkan slug anime! Contoh: ?slug=one-piece" 
                });
            }

            console.log(`Fetching Anime Detail: ${slug}`);
            
            const { data } = await axios.get(`https://www.sankavollerei.com/anime/oploverz/anime/${slug}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)',
                    'Accept': 'application/json'
                }
            });

            if (data.status !== "success") {
                throw new Error("Gagal mengambil detail anime. Pastikan slug benar.");
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: data.detail
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                creator: "shannz",
                error: error.message
            });
        }
    }
};
