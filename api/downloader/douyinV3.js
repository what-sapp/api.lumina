module.exports = {
    name: "Douyin V3",
    desc: "Download video Douyin tanpa watermark.",
    category: "Downloader",
    params: ["url"],

    async run(req, res) {
        const url = req.query.url;
        if (!url) return res.status(400).json({ status: false, error: "Parameter 'url' diperlukan." });

        try {
            const response = await fetch("https://musicaldown.net/api/ajaxSearch", {
                method: "POST",
                headers: {
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "x-requested-with": "XMLHttpRequest",
                    "referer": "https://musicaldown.net/id/douyin-video-downloader",
                    "user-agent": "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36",
                    "accept": "*/*"
                },
                body: `q=${encodeURIComponent(url)}&cursor=0&page=0&lang=id`
            });

            const json = await response.json();
            if (json.status !== "ok") throw new Error("Failed to fetch video");

            const html = json.data;

            // Extract thumbnail
            const thumbMatch = html.match(/img src="([^"]+douyinpic[^"]+)"/);
            const thumbnail = thumbMatch ? thumbMatch[1].replace(/&amp;/g, "&") : null;

            // Extract title
            const titleMatch = html.match(/<h3>([^<]+)<\/h3>/);
            const title = titleMatch ? titleMatch[1].trim() : "";

            // Extract duration
            const durMatch = html.match(/<p>(\d+:\d+)<\/p>/);
            const duration = durMatch ? durMatch[1] : null;

            // Extract all JWT tokens from href
            const tokenRegex = /href="https:\/\/pro\.snapcdn\.app\/dl\?token=([^"]+)"/g;
            const tokens = [];
            let m;
            while ((m = tokenRegex.exec(html)) !== null) {
                tokens.push(m[1]);
            }

            // Decode JWT payload (base64 middle part)
            const decodeJWT = (token) => {
                try {
                    const parts = token.split(".");
                    if (parts.length < 2) return null;
                    const payload = Buffer.from(parts[1], "base64").toString("utf-8");
                    return JSON.parse(payload);
                } catch (e) { return null; }
            };

            const medias = tokens.map((token, i) => {
                const payload = decodeJWT(token);
                return {
                    url: payload?.url || null,
                    filename: payload?.filename || null,
                    downloadUrl: `https://pro.snapcdn.app/dl?token=${token}`
                };
            }).filter(m => m.url);

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    title,
                    thumbnail,
                    duration,
                    download: medias?.[0]?.url || null,
                    medias
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
