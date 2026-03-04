const axios = require('axios');

/**
 * XN SEARCH
 * Source: api.deline.web.id
 * Creator: Shannz
 */
module.exports = {
    name: "XNXX Search",
    desc: "Cari video di XN berdasarkan keyword.",
    category: "18+",
    params: ["q"],

    async run(req, res) {
        try {
            const { q } = req.query;

            if (!q || !q.trim()) {
                return res.status(400).json({
                    status: false,
                    creator: "Shannz",
                    error: "Parameter 'q' wajib diisi. Contoh: ?q=anime"
                });
            }

            const UA = 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36';

            const { data } = await axios.get('https://api.deline.web.id/search/xnxx', {
                params: { q: q.trim() },
                headers: {
                    'User-Agent': UA,
                    'Accept': 'application/json',
                    'Referer': 'https://api.deline.web.id/'
                },
                timeout: 15000
            });

            if (!data || !data.status || !data.result || data.result.length === 0) {
                return res.status(404).json({
                    status: false,
                    creator: "Shannz",
                    error: "Hasil pencarian tidak ditemukan."
                });
            }

            res.status(200).json({
                status: true,
                creator: "Shannz",
                query: q.trim(),
                total: data.result.length,
                result: data.result.map(item => ({
                    title: item.title || "",
                    info: item.info || "",
                    link: item.link || ""
                }))
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                creator: "Shannz",
                error: error.message
            });
        }
    }
};
