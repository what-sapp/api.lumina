module.exports = {
    name: "RednoteDl",
    desc: "Download video/gambar dari Xiaohongshu (Rednote).",
    category: "Downloader",
    params: ["url"],

    async run(req, res) {
        const url = req.query.url;
        if (!url) return res.status(400).json({ status: false, error: "Parameter 'url' diperlukan." });

        try {
            const response = await fetch("https://rednotedownloader.com/", {
                method: "POST",
                headers: {
                    "content-type": "text/plain;charset=UTF-8",
                    "next-action": "352bef296627adedcfc99e32c80dd93a4ee49d35",
                    "referer": "https://rednotedownloader.com/",
                    "user-agent": "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36",
                    "accept": "text/x-component"
                },
                body: JSON.stringify([url, ""])
            });

            const text = await response.text();

            // Parse Next.js server action response format: "1:{...}"
            const match = text.match(/1:(\{.*\})/s);
            if (!match) throw new Error("Failed to parse response");

            const data = JSON.parse(match[1]);
            if (data.error) throw new Error("Failed to process URL");

            // Decode base64 video URL dari medias
            const medias = (data.medias || []).map(m => {
                let dlUrl = m.url;
                // Extract base64 dari /download?url=BASE64
                const b64 = dlUrl.match(/\/download\?url=([^&]+)/)?.[1];
                if (b64) {
                    try { dlUrl = Buffer.from(b64, "base64").toString("utf-8"); }
                    catch (e) {}
                }
                return {
                    url: dlUrl,
                    quality: m.quality || null,
                    extension: m.extension || null,
                    type: m.type || null
                };
            });

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    title: data.title || "",
                    author: data.author || "",
                    thumbnail: data.thumbnail || null,
                    duration: data.duration || null,
                    type: data.type || "video",
                    download: medias?.[0]?.url || null,
                    medias,
                    images: data.images || null
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
