const axios = require('axios');

/**
 * DRACHIN HOME SCRAPER
 * Source: Sanka Vollerei
 */
module.exports = {
    name: "Drachin Home",
    desc: "Mengambil daftar drama china terbaru, populer, dan slider dari Drachin",
    category: "ENTERTAINMENT",
    async run(req, res) {
        try {
            console.log("Fetching Drachin Home Data...");
            
            const { data } = await axios.get('https://www.sankavollerei.com/anime/drachin/home', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)',
                    'Accept': 'application/json'
                }
            });

            if (data.status !== "success") {
                throw new Error("Gagal mengambil data dari source Sanka Vollerei.");
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                source: "Drachin",
                result: {
                    slider: data.data.slider,
                    latest: data.data.latest,
                    popular: data.data.popular
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
