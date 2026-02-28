module.exports = {
    name: "Spotify V2",
    desc: "Download lagu dari Spotify.",
    category: "Downloader",
    params: ["url"],

    async run(req, res) {
        const url = req.query.url;
        if (!url) return res.status(400).json({ status: false, error: "Parameter 'url' diperlukan." });

        try {
            const response = await fetch("https://sssspotify.com/api/download/get-url", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "referer": "https://sssspotify.com/id",
                    "user-agent": "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36",
                    "accept": "application/json, text/plain, */*"
                },
                body: JSON.stringify({ url })
            });

            const data = await response.json();
            if (data.code !== 200) throw new Error(data.message || "Failed");

            // Decode base64 URL
            const b64 = data.originalVideoUrl.replace("/api/download/dl?url=", "");
            const downloadUrl = Buffer.from(b64, "base64").toString("utf-8");

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    title: data.title || "",
                    artist: data.authorName || "",
                    cover: data.coverUrl || null,
                    download: downloadUrl
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
