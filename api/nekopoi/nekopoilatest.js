const axios = require('axios');

/**
 * NEKOPOI LATEST UPDATE
 * Source: Sanka Vollerei
 * Desc: Mendapatkan daftar update terbaru dari Nekopoi
 */
module.exports = {
    name: "Nekopoi Latest",
    desc: "Melihat update konten terbaru dari Nekopoi (NSFW Content)",
    category: "NEKOPOI",
   // params: [],
    async run(req, res) {
        try {
            console.log(`Fetching Nekopoi Latest Update...`);
            
            const { data } = await axios.get(`https://www.sankavollerei.com/anime/neko/latest`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)',
                    'Accept': 'application/json'
                }
            });

            if (!data.success) {
                throw new Error("Gagal mengambil data dari Nekopoi.");
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: data.results
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
