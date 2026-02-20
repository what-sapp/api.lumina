const axios = require('axios');

/**
 * DRACHIN DETAIL SCRAPER
 * Source: Sanka Vollerei
 * Params: slug (Required)
 */
module.exports = {
    name: "Drachin Detail",
    desc: "Mengambil informasi lengkap drama, sinopsis, dan daftar episode",
    category: "ENTERTAINMENT",
    params: ["slug"],
    async run(req, res) {
        try {
            const { slug } = req.query;

            if (!slug) {
                return res.status(400).json({
                    status: false,
                    error: 'Parameter "slug" wajib diisi untuk melihat detail drama!'
                });
            }

            console.log(`Fetching Drachin Detail for slug: ${slug}`);
            
            const { data } = await axios.get(`https://www.sankavollerei.com/anime/drachin/detail/${slug}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)',
                    'Accept': 'application/json'
                }
            });

            if (data.status !== "success") {
                throw new Error("Gagal mengambil detail drama. Slug mungkin salah.");
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: data.data // Mengirimkan seluruh objek detail (title, synopsis, episodes, dll)
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
