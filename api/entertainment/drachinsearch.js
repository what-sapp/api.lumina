const axios = require('axios');

/**
 * DRACHIN SEARCH SCRAPER
 * Source: Sanka Vollerei
 * Params: q (Query), _page (Optional)
 */
module.exports = {
    name: "Drachin Search",
    desc: "Mencari judul drama china berdasarkan kata kunci",
    category: "ENTERTAINMENT",
    params: ["q", "_page"],
    async run(req, res) {
        try {
            const { q, _page = 1 } = req.query;

            if (!q) {
                return res.status(400).json({
                    status: false,
                    error: 'Parameter "q" (kata kunci pencarian) wajib diisi!'
                });
            }

            console.log(`Searching Drachin for: "${q}" - Page: ${_page}`);
            
            const { data } = await axios.get(`https://www.sankavollerei.com/anime/drachin/search/${encodeURIComponent(q)}?page=${_page}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)',
                    'Accept': 'application/json'
                }
            });

            if (data.status !== "success") {
                throw new Error("Gagal melakukan pencarian drama.");
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    meta: {
                        query: q,
                        current_page: data.pagination.current_page,
                        has_next: data.pagination.has_next
                    },
                    data: data.data
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
