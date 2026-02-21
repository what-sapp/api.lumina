const axios = require('axios');
const cheerio = require('cheerio');

/**
 * EXPORT MODULE
 */
module.exports = {
    name: "X/Twitter Downloader",
    desc: "Download video atau foto dari postingan X (Twitter) dengan kualitas terbaik",
    category: "Downloader",
    params: ["url"],
    async run(req, res) {
        try {
            const { url } = req.query;

            if (!url || !/twitter\.com|x\.com/.test(url)) {
                return res.status(400).json({
                    status: false,
                    error: 'Parameter "url" X/Twitter tidak valid!'
                });
            }

            console.log(`Downloading X content: ${url}`);

            // 1. Request ke API Savetwitter
            const body = new URLSearchParams({
                q: url,
                lang: "id",
                cftoken: ""
            });

            const { data: response } = await axios.post("https://savetwitter.net/api/ajaxSearch", body.toString(), {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "Accept": "*/*",
                    "X-Requested-With": "XMLHttpRequest",
                    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K)",
                    "Referer": "https://savetwitter.net/id3"
                }
            });

            if (!response.data) throw new Error("Gagal mengambil data dari server Savetwitter.");

            const $ = cheerio.load(response.data);
            let videos = [];
            let image = null;

            // 2. Scraping Link Video MP4
            $(".tw-button-dl").each((i, el) => {
                const text = $(el).text();
                const href = $(el).attr("href");

                if (!href || !href.startsWith("http")) return;

                if (text.includes("MP4")) {
                    const match = text.match(/\((\d+)p\)/);
                    const quality = match ? parseInt(match[1]) : 0;
                    videos.push({ quality, url: href });
                }
            });

            // 3. Scraping Link Gambar (jika bukan video)
            $(".download-items__btn a").each((i, el) => {
                const href = $(el).attr("href");
                if (href && href.startsWith("http")) image = href;
            });

            // Sort video dari kualitas tertinggi
            videos.sort((a, b) => b.quality - a.quality);

            if (videos.length === 0 && !image) {
                return res.status(404).json({
                    status: false,
                    error: "Konten tidak ditemukan. Pastikan tweet bersifat publik."
                });
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    type: videos.length ? "video" : "image",
                    url: videos.length ? videos[0].url : image,
                    metadata: {
                        all_qualities: videos // List semua resolusi video yang ada
                    }
                }
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                creator: "shannz",
                error: error.message
            });
        }
    }
};
