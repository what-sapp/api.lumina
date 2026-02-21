const axios = require('axios');

/**
 * OPLOVERZ ANIME SCHEDULE
 * Source: Sanka Vollerei
 * Desc: Melihat jadwal rilis anime harian (Simulcast)
 */
module.exports = {
    name: "Anime Schedule",
    desc: "Melihat jadwal rilis anime terbaru setiap harinya dari Oploverz",
    category: "ANIME",
    params: [],
    async run(req, res) {
        try {
            console.log(`Fetching Anime Schedule...`);
            
            const { data } = await axios.get(`https://www.sankavollerei.com/anime/oploverz/schedule`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)',
                    'Accept': 'application/json'
                }
            });

            if (data.status !== "success") {
                throw new Error("Gagal mengambil data jadwal anime.");
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: data.schedule
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
