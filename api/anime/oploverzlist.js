const axios = require('axios');

/**
 * OPLOVERZ ANIME LIST FILTER
 * Source: Sanka Vollerei
 * Params: status (ongoing/completed), _page (Opsional)
 */
module.exports = {
    name: "Oploverz List",
    desc: "Melihat daftar anime Oploverz berdasarkan status (ongoing atau completed)",
    category: "ANIME",
    params: ["status", "_page"],
    async run(req, res) {
        try {
            const { status, _page = 1 } = req.query;
            
            if (!status) {
                return res.status(400).json({ 
                    status: false, 
                    error: "Parameter 'status' wajib diisi (ongoing/completed)!" 
                });
            }

            console.log(`Filtering Anime List - Status: ${status}, Page: ${_page}`);
            
            const { data } = await axios.get(`https://www.sankavollerei.com/anime/oploverz/list?status=${status}&page=${_page}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)',
                    'Accept': 'application/json'
                }
            });

            if (data.status !== "success") {
                throw new Error("Gagal mengambil daftar anime.");
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    filter_status: status,
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
