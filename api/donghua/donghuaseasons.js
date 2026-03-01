const axios = require('axios');

/**
 * DONGHUA BY SEASON/YEAR
 * Source: Sanka Vollerei
 * Creator: Xena
 */
module.exports = {
    name: "DonghuaSeasons",
    desc: "Mendapatkan daftar donghua berdasarkan tahun rilis/season.",
    category: "Donghua",
    params: ["year"],

    async run(req, res) {
        try {
            const { year } = req.query;
            const UA = 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36';

            if (!year) {
                return res.status(400).json({
                    status: false,
                    creator: "Xena",
                    error: "Masukkan parameter tahun! Contoh: 2023, 2024, 2025"
                });
            }

            const { data } = await axios.get(`https://www.sankavollerei.com/anime/donghua/seasons/${year}`, {
                headers: {
                    'User-Agent': UA,
                    'Accept': 'application/json'
                },
                timeout: 15000
            });

            if (!data || !data.data || data.data.length === 0) {
                return res.status(404).json({
                    status: false,
                    creator: "Xena",
                    error: `Data donghua untuk tahun ${year} tidak ditemukan.`
                });
            }

            // Response lengkap & informatif khusus buat Xena
            res.status(200).json({
                status: true,
                creator: "Xena",
                year: year,
                totalResults: data.data.length,
                result: data.data.map(item => ({
                    title: item.title,
                    slug: item.slug,
                    alternative: item.alternative,
                    rating: item.rating,
                    status: item.status,
                    episodes: item.episodes,
                    studio: item.studio,
                    poster: item.poster,
                    description: item.description,
                    genres: item.genres.map(g => g.name), // Ambil nama genrenya saja supaya simpel
                    detailPath: item.href,
                    externalSource: item.anichinUrl
                }))
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
