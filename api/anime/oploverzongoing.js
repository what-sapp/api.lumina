const axios = require('axios');

/**
 * OPLOVERZ ONGOING ANIME
 * Source: Sanka Vollerei
 * Params: _page (Opsional)
 */
module.exports = {
    name: "Oploverz Ongoing",
    desc: "Melihat daftar anime yang sedang berlangsung (ongoing) di Oploverz",
    category: "ANIME",
    params: ["_page"],
    async run(req, res) {
        try {
            const { _page = 1 } = req.query;
            console.log(`Fetching Ongoing Anime - Page: ${_page}`);
            
            const { data } = await axios.get(`https://www.sankavollerei.com/anime/oploverz/ongoing?page=${_page}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)',
                    'Accept': 'application/json'
                }
            });

            if (data.status !== "success") {
                throw new Error("Gagal mengambil data anime ongoing.");
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
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
