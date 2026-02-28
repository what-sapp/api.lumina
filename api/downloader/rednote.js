module.exports = {
    name: "RednoteDl",
    desc: "Download video/gambar dari Xiaohongshu (Rednote).",
    category: "Downloader",
    params: ["url"],

    async run(req, res) {
        const url = req.query.url;
        if (!url) return res.status(400).json({ status: false, error: "Parameter 'url' diperlukan." });

        try {
            const response = await fetch("https://api.seekin.ai/ikool/media/download", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "lang": "en",
                    "sign": "29d8ec9ffe69751e0f5d7700b4ae1a21cf591a7d4f9f3ca43fd3eaffe14d769b",
                    "timestamp": String(Date.now()),
                    "referer": "https://www.seekin.ai/",
                    "user-agent": "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36",
                    "accept": "*/*"
                },
                body: JSON.stringify({ url })
            });

            const json = await response.json();
            if (json.code !== "0000") throw new Error(json.msg || json.message || "Failed");

            const d = json.data;
            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    title: d.title || "",
                    thumbnail: d.imageUrl || null,
                    duration: d.duration || null,
                    type: d.images ? "image" : "video",
                    medias: d.medias?.map(m => ({
                        url: m.url,
                        format: m.format,
                        size: m.fileSize
                    })) || [],
                    images: d.images || null,
                    download: d.medias?.[0]?.url || null
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
