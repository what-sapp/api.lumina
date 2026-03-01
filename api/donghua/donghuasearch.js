const axios = require('axios');

/**
 * DONGHUA SEARCH
 * Source: Sanka Vollerei
 * Params: q (Judul Donghua, contoh: "Lord of the Mysteries")
 */
module.exports = {
    name: "Donghua Search",
    desc: "Mencari judul Donghua spesifik dari database (BTTH, LOTM, Perfect World, dll)",
    category: "Donghua",
    params: ["q"],
    async run(req, res) {
        try {
            const { q } = req.query;
            if (!q) return res.status(400).json({ status: false, error: "Mau cari donghua apa, Senior?" });

            console.log(`Searching Donghua: ${q}`);

            const { data } = await axios.get(`https://www.sankavollerei.com/anime/donghua/search/${encodeURIComponent(q)}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Accept': 'application/json'
                }
            });

            if (!data.data || data.data.length === 0) {
                throw new Error("Jalur Kultivasi tidak ditemukan (Judul tidak ada).");
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: data.data
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

