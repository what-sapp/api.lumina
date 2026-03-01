const axios = require('axios');

/**
 * DOUYIN DOWNLOADER V2 (MULTI QUALITY)
 * Source: DyySilence API
 * Params: url (Link Video Douyin)
 */
module.exports = {
    name: "Douyin V2",
    desc: "Download video Douyin dengan pilihan resolusi HD dan format MP3 (Audio Only)",
    category: "Downloader",
    params: ["url"],
    async run(req, res) {
        try {
            const { url } = req.query;
            const apikey = "dyy";

            if (!url) {
                return res.status(400).json({ 
                    status: false, 
                    error: "Mana link Douyin-nya, Senior? Masukkan parameter 'url'!" 
                });
            }

            console.log(`Downloading Douyin V2: ${url}`);

            const { data } = await axios.get(`https://api.dyysilence.biz.id/api/downloader/douyin`, {
                params: {
                    url: url,
                    apikey: apikey
                }
            });

            if (!data.status) {
                throw new Error("Douyin V2 gagal mengambil data. Pastikan link valid.");
            }

            res.status(200).json({
                status: true,
               // creator: "shannz",
                result: {
                    title: data.title,
                    thumbnail: data.thumbnail,
                    source_link: data.resolvedUrl,
                    medias: data.downloads // Berisi array HD, SD, & MP3
                }
            });

        } catch (error) {
            res.status(500).json({
                status: false,
               // creator: "shannz",
                error: error.message
            });
        }
    }
};
