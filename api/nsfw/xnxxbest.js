const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });

/**
 * XNXX BEST
 * Scrape video terbaik berdasarkan bulan/tahun
 * Creator: Shannz
 */
module.exports = {
    name: "XNXXBest",
    desc: "Mendapatkan video terbaik XNXX berdasarkan bulan. Format: YYYY-MM. Contoh: 2026-02",
    category: "NSFW",
    params: ["month", "page"],

    async run(req, res) {
        try {
            const { month, page } = req.query;

            if (!month || !month.trim()) {
                return res.status(400).json({
                    status: false,
                    creator: "Shannz",
                    error: "Parameter 'month' wajib diisi. Format: YYYY-MM. Contoh: ?month=2026-02"
                });
            }

            // Validasi format YYYY-MM
            if (!/^\d{4}-\d{2}$/.test(month.trim())) {
                return res.status(400).json({
                    status: false,
                    creator: "Shannz",
                    error: "Format month salah. Gunakan YYYY-MM. Contoh: 2026-02"
                });
            }

            const pageNum  = parseInt(page) || 0;
            const fetchUrl = pageNum > 0
                ? `https://www.xnxx.com/best/${month.trim()}/${pageNum}`
                : `https://www.xnxx.com/best/${month.trim()}`;

            const { data: html } = await axios.get(fetchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Referer': 'https://www.xnxx.com/',
                },
                timeout: 20000,
                decompress: true,
                httpsAgent: agent,
            });

            const $ = cheerio.load(html);
            const results = [];

            $('.thumb-block').each((_, el) => {
                const $el = $(el);

                // Data dari attribute data-video
                let videoData = {};
                try {
                    const raw = $el.attr('data-video');
                    if (raw) videoData = JSON.parse(raw.replace(/\\\//g, '/'));
                } catch (_) {}

                const videoUrl = $el.find('a.thumb-link').attr('href')
                              || $el.find('.thumb a').first().attr('href') || '';
                if (!videoUrl) return;

                const thumb   = $el.find('img').attr('data-src') || $el.find('img').attr('src') || '';
                const preview = videoData.previewVideo || '';
                const videoId = videoData.encodedId || videoData.id?.toString() || '';

                // Title — dari a.title attribute
                const title = $el.find('a.title').attr('title')
                           || $el.find('a.title').text().trim()
                           || videoUrl.split('/').pop().replace(/_/g, ' ');

                // Uploader
                const uploader    = $el.find('.uploader a.name').text().trim() || '';
                const uploaderUrl = $el.find('.uploader a.name').attr('href') || '';

                // Metadata — duration, quality, views
                const metaText  = $el.find('.metadata').text().trim();
                const metaParts = metaText.split('\n').map(s => s.trim()).filter(s => s && s !== '-');
                const duration  = metaParts[0] || '';
                const quality   = metaParts[1] || '';
                const views     = metaParts[2] || '';

                results.push({
                    title,
                    url:      `https://www.xnxx.com${videoUrl}`,
                    thumb,
                    preview,
                    videoId,
                    duration,
                    quality,
                    views,
                    uploader,
                    uploaderUrl: uploaderUrl ? `https://www.xnxx.com${uploaderUrl}` : '',
                });
            });

            // Pagination — deduplicate & filter
            const pagesMap = new Map();
            $('.pagination a').each((_, el) => {
                const href = $(el).attr('href');
                const text = $(el).text().trim();
                if (!href || !text || href === '#' || text === '...') return;
                const fullUrl = href.startsWith('http') ? href : `https://www.xnxx.com${href}`;
                if (!pagesMap.has(fullUrl)) pagesMap.set(fullUrl, text);
            });
            const pages = [...pagesMap.entries()].map(([url, page]) => ({ page, url }));

            if (results.length === 0) {
                return res.status(404).json({
                    status: false,
                    creator: "Shannz",
                    error: "Tidak ada video ditemukan untuk bulan tersebut."
                });
            }

            res.status(200).json({
                status: true,
                creator: "Shannz",
                month: month.trim(),
                page: pageNum,
                total: results.length,
                pagination: pages,
                result: results,
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                creator: "Shannz",
                error: error.message
            });
        }
    }
};

