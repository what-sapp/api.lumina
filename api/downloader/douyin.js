const axios = require('axios');

/**
 * DOUYIN & TIKTOK DOWNLOADER (Seekin AI Engine)
 * Credits: AgungDevX
 * Params: url
 */
module.exports = {
    name: "Douyin",
    desc: "Download video atau image slide dari Douyin/TikTok tanpa watermark",
    category: "Downloader",
    params: ["url"],
    async run(req, res) {
        try {
            const { url } = req.query;
            if (!url) return res.status(400).json({ status: false, error: "URL wajib diisi!" });

            console.log(`Scraping Douyin/TikTok via Seekin: ${url}`);

            const payload = { url: url };
            const { data } = await axios.post('https://api.seekin.ai/ikool/media/download', payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'lang': 'en',
                    'timestamp': '1766750360505',
                    'sign': 'a90f96ca8fc1307461574c3313ebf03582a5d942f87f51266043f8f0be2ca6b7',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Origin': 'https://seekin.ai',
                    'Referer': 'https://seekin.ai/'
                }
            });

            if (data.code !== "0000") throw new Error(data.msg || "Gagal mengambil data.");

            const result = data.data;

            res.status(200).json({
                status: true,
               // creator: "shannz",
                //owners: "AgungDevX",
                result: {
                    title: result.title,
                    thumbnail: result.imageUrl,
                    duration: result.duration,
                    video: result.medias, // Link MP4
                    images: result.images?.map(img => img.url) || [] // Link Gambar (Slide)
                }
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                //creator: "shannz",
                error: error.message
            });
        }
    }
};
