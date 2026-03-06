const axios   = require('axios');
const cheerio = require('cheerio');

/**
 * DRAMABOX STREAM
 * GET /entertainment/dramabox-stream?book_id=41000103051&episode=1
 */

const BASE_URL = 'https://dramabox.web.id';
const HEADERS  = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' };

module.exports = {
    name:     'DramaboxStream',
    desc:     'Ambil URL stream episode drama dari Dramabox.',
    category: 'Entertainment',
    params:   ['book_id', 'episode'],

    async run(req, res) {
        const { book_id, episode } = req.query;
        if (!book_id?.trim()) return res.status(400).json({
            status: false, creator: 'Shannz',
            error: "Parameter 'book_id' wajib diisi."
        });
        if (episode === undefined || episode === null || episode === '') return res.status(400).json({
            status: false, creator: 'Shannz',
            error: "Parameter 'episode' wajib diisi."
        });

        try {
            const epNum    = Number(episode);
            const epPath   = epNum === 0 ? '' : `/ep-${epNum}`;
            const { data: html } = await axios.get(`${BASE_URL}/watch/${book_id.trim()}${epPath}`, { headers: HEADERS, timeout: 15000 });
            const $        = cheerio.load(html);
            const rawHtml  = $.html();
            const videoUrls = [];

            // Method 1: parse initialQualities dari JS
            const match = rawHtml.match(/const\s+initialQualities\s*=\s*(\[.*?\]);/s);
            if (match?.[1]) {
                try {
                    JSON.parse(match[1]).forEach(item => {
                        if (item.quality && item.videoPath) {
                            videoUrls.push({ quality: `${item.quality}p`, url: item.videoPath });
                        }
                    });
                } catch(_) {}
            }

            // Method 2: quality menu
            if (!videoUrls.length) {
                $('#qualityMenu .quality-option').each((_, el) => {
                    const q = $(el).attr('data-quality');
                    const u = $(el).attr('data-url');
                    if (q && u) videoUrls.push({ quality: `${q}p`, url: u });
                });
            }

            // Method 3: fallback video tag
            if (!videoUrls.length) {
                const fallback = $('#mainVideo source').attr('src') ||
                                 $('#mainVideo').attr('data-hls-url') ||
                                 $('#mainVideo').attr('src');
                if (fallback) videoUrls.push({ quality: 'default', url: fallback });
            }

            return res.status(200).json({
                status: true, creator: 'Shannz',
                result: { book_id: book_id.trim(), episode: epNum, videos: videoUrls }
            });
        } catch (e) {
            return res.status(500).json({ status: false, creator: 'Shannz', error: e.message });
        }
    }
};

