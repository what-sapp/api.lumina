const axios = require('axios');

/**
 * DONGHUA DETAIL & EPISODE LIST
 * Source: Sanka Vollerei
 * Creator: Xena
 */
module.exports = {
    name: "DonghuaDetail",
    desc: "Mendapatkan informasi detail donghua dan daftar episode lengkap.",
    category: "Donghua",
    params: ["slug"],

    async run(req, res) {
        try {
            const { slug } = req.query;
            const UA = 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36';

            if (!slug) {
                return res.status(400).json({
                    status: false,
                    creator: "Xena",
                    error: "Masukkan parameter slug! Contoh: little-fairy-yao"
                });
            }

            const { data } = await axios.get(`https://www.sankavollerei.com/anime/donghua/detail/${slug}`, {
                headers: {
                    'User-Agent': UA,
                    'Accept': 'application/json'
                },
                timeout: 15000
            });

            if (!data || data.status === "error") {
                return res.status(404).json({
                    status: false,
                    creator: "Xena",
                    error: "Detail donghua tidak ditemukan."
                });
            }

            // Response lengkap dengan identitas Senior Xena
            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    title: data.title,
                    alternativeTitle: data.alter_title,
                    poster: data.poster,
                    info: {
                        status: data.status,
                        rating: data.rating || "N/A",
                        studio: data.studio,
                        network: data.network,
                        released: data.released,
                        duration: data.duration,
                        episodesCount: data.episodes_count,
                        season: data.season,
                        country: data.country
                    },
                    genres: data.genres.map(g => g.name),
                    synopsis: data.synopsis,
                    episodes: data.episodes_list.map(eps => ({
                        title: eps.episode,
                        slug: eps.slug,
                        url: eps.anichinUrl
                    }))
                }
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

