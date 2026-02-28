const https = require("https");

module.exports = {
    name: "TiktokDl",
    desc: "Download video TikTok tanpa watermark.",
    category: "Downloader",
    params: ["url"],

    async run(req, res) {
        const url = req.query.url;
        if (!url) return res.status(400).json({ status: false, error: "Parameter 'url' diperlukan." });

        const fetchUrl = (body) => new Promise((resolve, reject) => {
            const postData = `url=${encodeURIComponent(url)}`;
            const request = https.request({
                hostname: "anydownloader.com",
                path: "/wp-json/api/download/",
                method: "POST",
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                    "referer": "https://anydownloader.com/en/tiktok-video-downloader/",
                    "user-agent": "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36",
                    "content-length": Buffer.byteLength(postData)
                }
            }, (response) => {
                let data = "";
                response.on("data", d => data += d);
                response.on("end", () => {
                    try { resolve(JSON.parse(data)); }
                    catch (e) { reject(new Error("Invalid JSON response")); }
                });
                response.on("error", reject);
            });
            request.on("error", reject);
            request.write(postData);
            request.end();
        });

        try {
            const data = await fetchUrl();

            // Filter medias
            const noWatermark = data.medias?.find(m => m.quality?.toLowerCase().includes("no watermark") && m.videoAvailable);
            const withWatermark = data.medias?.find(m => m.quality?.toLowerCase().includes("watermark") && m.videoAvailable);
            const audio = data.medias?.find(m => !m.videoAvailable && m.audioAvailable);

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    title: data.title || "",
                    thumbnail: data.thumbnail || null,
                    source: data.source || "tiktok",
                    duration: data.duration || null,
                    noWatermark: noWatermark?.url || null,
                    withWatermark: withWatermark?.url || null,
                    audio: audio?.url || null,
                    medias: data.medias?.map(m => ({
                        quality: m.quality,
                        extension: m.extension,
                        size: m.formattedSize,
                        url: m.url,
                        videoAvailable: m.videoAvailable,
                        audioAvailable: m.audioAvailable
                    })) || []
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
