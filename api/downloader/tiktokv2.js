const axios = require('axios');
const cheerio = require('cheerio');

/**
 * TIKTOK DOWNLOADER V3 (IMAGE & VIDEO HD SUPPORT)
 * Source: Scraper by Fgsi (TikTokio Engine)
 * Params: url (Link TikTok)
 */
module.exports = {
    name: "TikTok V2",
    desc: "Downloader TikTok tercanggih: Support Video HD, No Watermark, MP3, dan Slide Foto/Image Grid.",
    category: "Downloader",
    params: ["url"],
    async run(req, res) {
        try {
            const { url } = req.query;
            if (!url) return res.status(400).json({ status: false, error: "Link TikTok-nya mana, Boss?" });

            console.log(`Scraping TikTok V3 for: ${url}`);

            // Logic Scraper TikTokio
            const baseURL = "https://tiktokio.com/api/v1/tk/html";
            const headers = {
                "content-type": "application/json",
                "user-agent": "Mozilla/5.0 (Linux; Android 10; K)"
            };

            const response = await axios.post(baseURL, {
                vid: url,
                prefix: "tiktokio.com"
            }, { headers });

            const $ = cheerio.load(response.data);
            const decode = (u) => u ? u.replace(/&#38;/g, "&") : null;

            const result = {
                title: $(".video-info h3").first().text().trim() || null,
                cover: decode($(".video-info > img").attr("src")),
                images: [],
                videos: {},
                mp3: null
            };

            // Parse Images (Jika kontennya slide foto)
            $(".images-grid .image-item").each((i, el) => {
                let imgUrl = $(el).find("a").attr("href") || $(el).find("img").attr("src");
                if (imgUrl) result.images.push(decode(imgUrl));
            });

            // Parse Download Links
            $(".download-links a").each((_, el) => {
                const text = $(el).text().toLowerCase();
                let href = decode($(el).attr("href"));
                if (!href) return;

                if (text.includes("without watermark") && text.includes("hd")) result.videos.nowm_hd = href;
                else if (text.includes("without watermark")) result.videos.nowm = href;
                else if (text.includes("watermark")) result.videos.wm = href;
                else if (text.includes("mp3")) result.mp3 = href;
            });

            res.status(200).json({
                status: true,
                //creator: "shannz",
                result: result
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                //creator: "shannz",
                error: error.message
            });
        }
    }
};
