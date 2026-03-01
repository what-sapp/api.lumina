const axios = require('axios');

/**
 * DONGHUA LATEST LIST
 * Source: Sanka Vollerei
 * Creator: Xena
 */
module.exports = {
    name: "DonghuaLatest",
    desc: "Mendapatkan daftar update Donghua terbaru (Ongoing/Update).",
    category: "Donghua",
    params: ["page"],

    async run(req, res) {
        try {
            const { page = 1 } = req.query;
            const UA = 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36';

            // Request ke endpoint latest Sanka Vollerei
            const { data } = await axios.get(`https://www.sankavollerei.com/anime/donghua/latest/${page}`, {
                headers: {
                    'User-Agent': UA,
                    'Accept': 'application/json'
                },
                timeout: 15000
            });

            if (!data || !data.latest_donghua || data.latest_donghua.length === 0) {
                return res.status(404).json({
                    status: false,
                    creator: "Xena",
                    error: "Data update donghua tidak ditemukan."
                });
            }

            // Bersihkan data hasil (Opsional: membuang prefix href jika ingin bersih)
            const result = data.latest_donghua.map(item => ({
                title: item.title,
                slug: item.slug,
                poster: item.poster,
                status: item.status,
                type: item.type,
                sub: item.sub,
                anichinUrl: item.anichinUrl
            }));

            res.status(200).json({
                status: true,
                creator: "Xena",
                page: parseInt(page),
                result: result
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                creator: "Xena",
                error: error.message
            });
        }
    }
};

