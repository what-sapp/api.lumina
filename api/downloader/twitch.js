module.exports = {
    name: "TwitchDl",
    desc: "Download clip Twitch berbagai kualitas.",
    category: "Downloader",
    params: ["url"],

    async run(req, res) {
        const url = req.query.url;
        if (!url) return res.status(400).json({ status: false, error: "Parameter 'url' diperlukan." });

        try {
            const response = await fetch("https://tcdownloader.com/wp-json/aio-dl/video-data/", {
                method: "POST",
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                    "referer": "https://tcdownloader.com/",
                    "user-agent": "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36",
                    "accept": "*/*"
                },
                body: `url=${encodeURIComponent(url)}`
            });

            const data = await response.json();
            if (!data.medias?.length) throw new Error("No media found");

            const best = data.medias[data.medias.length - 1];

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    title: data.title || "",
                    thumbnail: data.thumbnail || null,
                    source: data.source || "twitch",
                    download: best?.url || null,
                    formats: data.medias.map(m => ({
                        quality: m.quality,
                        url: m.url,
                        size: m.formattedSize
                    }))
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
