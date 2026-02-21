const axios = require('axios');

/**
 * OPLOVERZ ANIME SEARCH
 * Source: Sanka Vollerei
 * Params: q (Judul Anime)
 */
module.exports = {
    name: "Oploverz Search",
    desc: "Mencari anime berdasarkan judul dari database Oploverz",
    category: "ANIME",
    params: ["q"],
    async run(req, res) {
        try {
            const { q } = req.query;
            
            if (!q) {
                return res.status(400).json({ 
                    status: false, 
                    error: "Mau cari anime apa? Masukkan judul di parameter ?q=" 
                });
            }

            console.log(`Searching Anime: ${q}`);
            
            const { data } = await axios.get(`https://www.sankavollerei.com/anime/oploverz/search/${encodeURIComponent(q)}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)',
                    'Accept': 'application/json'
                }
            });

            if (data.status !== "success") {
                throw new Error("Gagal melakukan pencarian anime.");
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    query: q,
                    anime_list: data.anime_list,
                    pagination: data.pagination
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
