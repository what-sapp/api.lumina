module.exports = {
    name: "RedditDl",
    desc: "Download video dari Reddit.",
    category: "Downloader",
    params: ["url"],

    async run(req, res) {
        const url = req.query.url;
        if (!url) return res.status(400).json({ status: false, error: "Parameter 'url' diperlukan." });

        try {
            const response = await fetch(`https://rapidsave.com/info?url=${encodeURIComponent(url)}`, {
                headers: {
                    "referer": "https://rapidsave.com/",
                    "user-agent": "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36",
                    "accept": "text/html"
                }
            });

            const html = await response.text();

            const dlMatch = html.match(/href="https:\/\/sd\.rapidsave\.com\/download\.php\?([^"]+)"/);
            if (!dlMatch) throw new Error("No video found");

            const params = new URLSearchParams(dlMatch[1]);
            const permalink = params.get("permalink");
            const mergedUrl = `https://sd.rapidsave.com/download.php?${dlMatch[1]}`;

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    permalink,
                    download: mergedUrl
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
