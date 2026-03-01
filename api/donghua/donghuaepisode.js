const axios = require('axios');

/**
 * DONGHUA EPISODE STREAM & DOWNLOAD
 * Source: Sanka Vollerei
 * Creator: Xena
 */
module.exports = {
    name: "DonghuaEpisode",
    desc: "Mendapatkan link streaming dan download episode donghua.",
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
                    error: "Masukkan parameter slug episode! Contoh: little-fairy-yao-episode-03-subtitle-indonesia"
                });
            }

            const { data } = await axios.get(`https://www.sankavollerei.com/anime/donghua/episode/${slug}`, {
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
                    error: "Data episode tidak ditemukan."
                });
            }

            // Response bersih khusus buat Senior Xena
            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    episodeTitle: data.episode,
                    donghua: {
                        title: data.donghua_details.title,
                        slug: data.donghua_details.slug,
                        poster: data.donghua_details.poster
                    },
                    streaming: data.streaming.servers.map(srv => ({
                        server: srv.name,
                        url: srv.url
                    })),
                    download: data.download_url,
                    navigation: {
                        prev: data.navigation.previous_episode?.slug || null,
                        next: data.navigation.next_episode?.slug || null,
                        allEpisodes: data.navigation.all_episodes?.slug || null
                    }
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

