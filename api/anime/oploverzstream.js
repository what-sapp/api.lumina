const axios = require('axios');

/**
 * OPLOVERZ EPISODE STREAM & DOWNLOAD
 * Source: Sanka Vollerei
 * Params: slug (Slug episode, contoh: one-piece-episode-1148-subtitle-indonesia)
 */
module.exports = {
    name: "Oploverz Stream",
    desc: "Mendapatkan link streaming dan download video anime dari Oploverz",
    category: "ANIME",
    params: ["slug"],
    async run(req, res) {
        try {
            const { slug } = req.query;
            
            if (!slug) {
                return res.status(400).json({ 
                    status: false, 
                    error: "Masukkan slug episode! Contoh: ?slug=one-piece-episode-1148-subtitle-indonesia" 
                });
            }

            console.log(`Fetching Stream Data: ${slug}`);
            
            const { data } = await axios.get(`https://www.sankavollerei.com/anime/oploverz/episode/${slug}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)',
                    'Accept': 'application/json'
                }
            });

            if (data.status !== "success") {
                throw new Error("Gagal mengambil data episode. Pastikan slug benar.");
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    title: data.episode_title,
                    streams: data.streams,
                    downloads: data.downloads
                }
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
