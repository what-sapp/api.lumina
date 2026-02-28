module.exports = {
    name: "TwitterDl",
    desc: "Download video Twitter/X tanpa watermark.",
    category: "Downloader",
    params: ["url"],

    async run(req, res) {
        const url = req.query.url;
        if (!url) return res.status(400).json({ status: false, error: "Parameter 'url' diperlukan." });

        try {
            const response = await fetch("https://api.x-downloader.com/request", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "referer": "https://x-downloader.net/",
                    "user-agent": "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36",
                    "accept": "*/*"
                },
                body: JSON.stringify({ url, type: ".mp4" })
            });

            const data = await response.json();
            if (data.status !== "finished") throw new Error("Failed to process video");

            const BASE = "https://api.x-downloader.com/";

            // Ambil kualitas tertinggi
            const best = data.formats?.[data.formats.length - 1];

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    title: data.title || "",
                    description: data.description || "",
                    thumbnail: data.thumbnail ? `${BASE}${data.thumbnail}` : null,
                    platform: data.platform,
                    download: `${BASE}${data.filename}`,
                    best: best ? `${BASE}${best.filename}` : null,
                    formats: data.formats?.map(f => ({
                        label: f.label,
                        url: `${BASE}${f.filename}`
                    })) || []
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
