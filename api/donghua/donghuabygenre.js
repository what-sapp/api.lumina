const axios = require('axios');

/**
 * DONGHUA LIST BY GENRE
 * Source: Sanka Vollerei
 * Creator: Xena
 */
module.exports = {
    name: "DonghuaByGenre",
    desc: "Mendapatkan daftar donghua berdasarkan genre dan halaman.",
    category: "Donghua",
    params: ["genre", "page"],

    async run(req, res) {
        try {
            const { genre, page } = req.query;
            const UA = 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36';

            // Default ke page 1 jika tidak diisi
            const targetPage = page || 1;

            if (!genre) {
                return res.status(400).json({
                    status: false,
                    creator: "Xena",
                    error: "Masukkan parameter genre! Contoh: action, adventure, cultivation"
                });
            }

            const { data } = await axios.get(`https://www.sankavollerei.com/anime/donghua/genres/${genre}/${targetPage}`, {
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
                    error: `Data untuk genre '${genre}' di halaman ${targetPage} tidak ditemukan.`
                });
            }

            // Response bersih untuk Senior Xena
            res.status(200).json({
                status: true,
                creator: "Xena",
                genre: genre,
                currentPage: parseInt(targetPage),
                result: data.data.map(item => ({
                    title: item.title,
                    slug: item.slug,
                    poster: item.poster,
                    status: item.status,
                    type: item.type,
                    sub: item.sub,
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

