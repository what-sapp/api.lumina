const axios = require('axios');
const qs = require('qs');

/**
 * FACEBOOK DOWNLOADER (Y2Date Engine)
 * Params: url (Link Video/Reels FB)
 */
module.exports = {
    name: "Facebook Downloader",
    desc: "Mendownload video atau reels dari Facebook dengan berbagai resolusi",
    category: "Downloader",
    params: ["url"],
    async run(req, res) {
        try {
            const { url } = req.query;
            if (!url) {
                return res.status(400).json({ 
                    status: false, 
                    error: "Mana link Facebook-nya? Masukkan di parameter ?url=" 
                });
            }

            console.log(`Downloading FB Video: ${url}`);

            const token = '3ecace38ab99d0aa20f9560f0c9703787d4957d34d2a2d42bfe5b447f397e03c';
            const payload = qs.stringify({ url: url, token: token });

            const { data } = await axios.post('https://y2date.com/wp-json/aio-dl/video-data/', payload, {
                headers: {
                    'accept': '*/*',
                    'origin': 'https://y2date.com',
                    'referer': 'https://y2date.com/facebook-video-downloader/',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'content-type': 'application/x-www-form-urlencoded'
                }
            });

            if (!data || data.error) {
                throw new Error(data.message || "Gagal mengambil data video Facebook.");
            }

            // Kita bersihkan response agar lebih enak dibaca di API
            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    title: data.title,
                    thumbnail: data.thumbnail,
                    duration: data.duration,
                    source: data.source,
                    medias: data.medias // Berisi list MP4 berbagai kualitas
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
