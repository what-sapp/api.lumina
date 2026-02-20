const axios = require('axios');

/**
 * DRACHIN POPULAR SCRAPER
 * Source: Sanka Vollerei
 * Params: _page (Optional)
 */
module.exports = {
    name: "Drachin Popular",
    desc: "Mengambil daftar drama china terpopuler (Trending) dari Drachin",
    category: "ENTERTAINMENT",
    params: ["_page"],
    async run(req, res) {
        try {
            // Default ke page 1 jika _page tidak diisi
            const page = req.query._page || 1;
            
            console.log(`Fetching Drachin Popular - Request Page: ${page}`);
            
            const { data } = await axios.get(`https://www.sankavollerei.com/anime/drachin/popular?page=${page}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)',
                    'Accept': 'application/json'
                }
            });

            if (data.status !== "success") {
                throw new Error("Gagal mengambil data populer. Source mungkin sedang maintenance.");
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    meta: {
                        current_page: data.pagination.current_page,
                        has_next: data.pagination.has_next,
                        query_page: page
                    },
                    data: data.data
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
