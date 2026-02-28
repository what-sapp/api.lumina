const axios = require("axios");

module.exports = {
    name: "TiktokV4",
    desc: "Download video TikTok tanpa watermark.",
    category: "Downloader",
    params: ["url"],

    async run(req, res) {
        const url = req.query.url;
        if (!url) return res.status(400).json({ status: false, error: "Parameter 'url' diperlukan." });

        try {
            const { data } = await axios.post(
                "https://anydownloader.com/wp-json/api/download/",
                `url=${encodeURIComponent(url)}`,
                {
                    headers: {
                        "content-type": "application/x-www-form-urlencoded",
                        "referer": "https://anydownloader.com/en/tiktok-video-downloader/",
                        "user-agent": "Mozilla/5.0 (Linux; Android 14) Chrome/107.0.0.0"
                    }
                }
            );

            const noWatermark = data.medias?.find(m => m.quality?.toLowerCase().includes("no watermark") && m.videoAvailable);
            const withWatermark = data.medias?.find(m => m.quality?.toLowerCase().includes("hd watermark") && m.videoAvailable);
            const audio = data.medias?.find(m => !m.videoAvailable && m.audioAvailable);

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    title: data.title || "",
                    thumbnail: data.thumbnail || null,
                    noWatermark: noWatermark?.url || null,
                    withWatermark: withWatermark?.url || null,
                    audio: audio?.url || null,
                    medias: data.medias?.map(m => ({
                        quality: m.quality,
                        extension: m.extension,
                        size: m.formattedSize,
                        url: m.url
                    })) || []
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
