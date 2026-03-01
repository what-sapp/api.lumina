module.exports = {
    name: "Tiktok V3",
    desc: "Download video TikTok tanpa watermark via tikwm.",
    category: "Downloader",
    params: ["url"],

    async run(req, res) {
        const url = req.query.url;
        if (!url) return res.status(400).json({ status: false, error: "Parameter 'url' diperlukan." });

        try {
            const response = await fetch("https://www.tikwm.com/api/", {
                method: "POST",
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                    "user-agent": "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36",
                    "referer": "https://www.tikwm.com/",
                    "accept": "application/json, text/plain, */*"
                },
                body: `url=${encodeURIComponent(url)}&hd=1`
            });

            const json = await response.json();
            if (json.code !== 0) throw new Error(json.msg || "Failed");

            const d = json.data;
            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    id: d.id,
                    title: d.title || "",
                    cover: d.cover || null,
                    duration: d.duration || null,
                    noWatermark: d.play || null,
                    withWatermark: d.wmplay || null,
                    hdplay: d.hdplay || null,
                    music: d.music || null,
                    size: {
                        noWatermark: d.size,
                        withWatermark: d.wm_size,
                        hd: d.hd_size
                    },
                    author: {
                        id: d.author?.id,
                        name: d.author?.nickname,
                        username: d.author?.unique_id,
                        avatar: d.author?.avatar
                    }
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
