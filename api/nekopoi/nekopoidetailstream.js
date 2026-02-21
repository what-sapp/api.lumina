const axios = require('axios');

/**
 * NEKOPOI GET DETAIL (STREAM & DOWNLOAD)
 * Source: Sanka Vollerei
 * Note: Wajib menggunakan URL yang sudah di-encode!
 */
module.exports = {
    name: "Nekopoi Detail & Stream",
    desc: "Mendapatkan info detail, stream, & download Nekopoi. (NOTE: URL pada parameter wajib di-encode/URL-Encoded!)",
    category: "NEKOPOI",
    params: ["url"],
    async run(req, res) {
        try {
            const { url } = req.query;
            
            if (!url) {
                return res.status(400).json({ 
                    status: false, 
                    error: "Masukkan parameter url! Contoh: ?url=https%3A%2F%2Fnekopoi.care%2Fxxx" 
                });
            }

            console.log(`Fetching Nekopoi Detail - Target: ${url}`);
            
            // Menggunakan decodeURIComponent dulu untuk memastikan tidak ada double-encoding sebelum ditembak ke source
            const targetUrl = decodeURIComponent(url);
            
            const { data } = await axios.get(`https://www.sankavollerei.com/anime/neko/get?url=${encodeURIComponent(targetUrl)}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)',
                    'Accept': 'application/json'
                }
            });

            if (!data.success) {
                throw new Error("Gagal mengambil detail konten Nekopoi. Pastikan URL valid.");
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
