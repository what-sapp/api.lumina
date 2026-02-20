const axios = require('axios');

/**
 * DRACHIN STREAM SCRAPER
 * Source: Sanka Vollerei
 * Params: slug (Required), _episode (Optional - Default 1)
 */
module.exports = {
    name: "Drachin Stream",
    desc: "Ambil link nonton video. Gunakan _episode untuk memilih nomor episode.",
    category: "ENTERTAINMENT",
    params: ["slug", "_episode"], // Lebih manusiawi dibanding 'index'
    async run(req, res) {
        try {
            // Kita ambil dari _episode, kalau kosong ya otomatis ke episode 1
            const { slug, _episode = 1 } = req.query;

            if (!slug) {
                return res.status(400).json({
                    status: false,
                    error: 'Mana slug dramanya? Contoh: ?slug=judul-drama-kamu'
                });
            }

            console.log(`User mau nonton: ${slug} | Episode: ${_episode}`);
            
            // Di sisi internal (ke source), kita tetap kirim sebagai 'index' karena sourcenya butuh itu
            const { data } = await axios.get(`https://www.sankavollerei.com/anime/drachin/episode/${slug}?index=${_episode}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)',
                    'Accept': 'application/json'
                }
            });

            if (data.status !== "success") {
                throw new Error("Aduh, videonya gak ketemu. Mungkin episodenya belum rilis?");
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    title: data.data.title,
                    current_episode: _episode,
                    poster: data.data.poster,
                    video_urls: data.data.videos 
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
