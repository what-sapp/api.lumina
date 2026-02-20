const axios = require('axios');

/**
 * OPLOVERZ HOME SCRAPER
 * Source: Sanka Vollerei
 * Params: _page (Optional - Default 1)
 */
module.exports = {
    name: "Oploverz Home",
    desc: "Melihat daftar update anime terbaru dari Oploverz",
    category: "ANIME",
    params: ["_page"],
    async run(req, res) {
        try {
            const page = req.query._page || 1;
            
            console.log(`Fetching Oploverz Home - Page: ${page}`);
            
            const { data } = await axios.get(`https://www.sankavollerei.com/anime/oploverz/home?page=${page}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)',
                    'Accept': 'application/json'
                }
            });

            if (data.status !== "success") {
                throw new Error("Gagal mengambil data dari Oploverz.");
            }

            res.status(200).json({
                status: true,
                //creator: "shannz",
                result: {
                    pagination: {
                        current_page: data.pagination.currentPage,
                        has_next: data.pagination.hasNext,
                        has_prev: data.pagination.hasPrev
                    },
                    anime_list: data.anime_list
                }
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                //creator: "shannz",
                error: error.message
            });
        }
    }
};
