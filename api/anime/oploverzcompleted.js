const axios = require('axios');

/**
 * OPLOVERZ COMPLETED ANIME
 * Source: Sanka Vollerei
 * Params: _page (Opsional)
 */
module.exports = {
    name: "Oploverz Completed",
    desc: "Melihat daftar anime yang sudah tamat (completed) di Oploverz untuk maraton",
    category: "ANIME",
    params: ["_page"],
    async run(req, res) {
        try {
            const { _page = 1 } = req.query;
            console.log(`Fetching Completed Anime - Page: ${_page}`);
            
            const { data } = await axios.get(`https://www.sankavollerei.com/anime/oploverz/completed?page=${_page}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)',
                    'Accept': 'application/json'
                }
            });

            if (data.status !== "success") {
                throw new Error("Gagal mengambil data anime completed.");
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
