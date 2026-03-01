const axios = require('axios');

/**
 * DONGHUA GENRES LIST
 * Source: Sanka Vollerei
 * Modified for: Xena
 */
module.exports = {
    name: "DonghuaGenres",
    desc: "Mendapatkan daftar lengkap genre, studio, dan tahun donghua.",
    category: "Donghua",
    params: [], // Tidak butuh parameter wajib, tapi bisa ditambah logic search nanti

    async run(req, res) {
        try {
            const UA = 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36';

            const { data } = await axios.get(`https://www.sankavollerei.com/anime/donghua/genres`, {
                headers: {
                    'User-Agent': UA,
                    'Accept': 'application/json'
                },
                timeout: 15000
            });

            if (!data || !data.data) {
                return res.status(404).json({
                    status: false,
                    creator: "Xena",
                    error: "Data genre tidak ditemukan."
                });
            }

            // Logic untuk membersihkan duplikat berdasarkan slug
            const uniqueData = data.data.filter((item, index, self) =>
                index === self.findIndex((t) => t.slug === item.slug)
            );

            // Response rapih khusus buat Xena
            res.status(200).json({
                status: true,
                creator: "Xena",
                total: uniqueData.length,
                result: uniqueData.map(item => ({
                    name: item.name,
                    slug: item.slug,
                    path: item.href,
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

