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

            // Extract download href
            const dlMatch = html.match(/href="https:\/\/sd\.rapidsave\.com\/download\.php\?([^"]+)"/);
            if (!dlMatch) throw new Error("No video found");

            const params = new URLSearchParams(dlMatch[1]);
            const videoUrl = params.get("video_url");
            const audioUrl = params.get("audio_url");
            const permalink = params.get("permalink");
            const mergedUrl = `https://sd.rapidsave.com/download.php?${dlMatch[1]}`;

            // Extract title
            const titleMatch = html.match(/<title>([^<]+)<\/title>/);
            const title = titleMatch ? titleMatch[1].replace(" - RedditSave", "").trim() : "";

            // Extract thumbnail
            const thumbMatch = html.match(/property="og:image" content="([^"]+)"/);
            const thumbnail = thumbMatch ? thumbMatch[1] : null;

            // Extract all quality options
            const formats = [];
            const formatRegex = /href="https:\/\/[^"]*download\.php\?[^"]*video_url=([^&"]+)[^"]*"/g;
            let m;
            while ((m = formatRegex.exec(html)) !== null) {
                const vUrl = decodeURIComponent(m[1]);
                const qualMatch = vUrl.match(/CMAF_(\d+)\.mp4|DASH_(\d+)\.mp4/);
                const quality = qualMatch ? (qualMatch[1] || qualMatch[2]) + "p" : "unknown";
                if (!formats.find(f => f.quality === quality)) {
                    formats.push({ quality, url: vUrl });
                }
            }

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    title,
                    thumbnail,
                    permalink,
                    download: mergedUrl,
                    video: videoUrl ? decodeURIComponent(videoUrl) : null,
                    audio: audioUrl ? decodeURIComponent(audioUrl) : null,
                    formats
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
