const axios = require('axios');

/**
 * DRACHIN LATEST SCRAPER
 * Source: Sanka Vollerei
 * Params: _page (Optional)
 */
module.exports = {
    name: "Drachin Latest",
    desc: "Melihat daftar drama china terbaru dengan parameter opsional _page",
    category: "ENTERTAINMENT",
    params: ["_page"], // Menggunakan underscore sesuai request
    async run(req, res) {
        try {
            // Mengambil _page dari query, jika kosong default ke 1
            const page = req.query._page || 1;
            
            console.log(`Fetching Drachin Latest - Request Page: ${page}`);
            
            const { data } = await axios.get(`https://www.sankavollerei.com/anime/drachin/latest?page=${page}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)',
                    'Accept': 'application/json'
                }
            });

            if (data.status !== "success") {
                throw new Error("Gagal mengambil data. Source mungkin sedang down.");
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
                creator: "shannz",
                error: error.message
            });
        }
    }
};
