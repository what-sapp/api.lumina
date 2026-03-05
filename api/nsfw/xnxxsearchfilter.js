const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });

/**
 * XNXX SEARCH WITH FILTER
 * Creator: Shannz
 */
module.exports = {
    name: "XNXXSearch Filter",
    desc: "Cari video XNXX berdasarkan keyword dengan filter urutan.",
    category: "NSFW",
    params: ["q", "sort", "page"],

    async run(req, res) {
        try {
            const { q, sort, page } = req.query;

            if (!q || !q.trim()) {
                return res.status(400).json({
                    status: false,
                    creator: "Shannz",
                    error: "Parameter 'q' wajib diisi. Contoh: ?q=anime&sort=new&page=0",
                    filters: {
                        sort: ['new', 'top', 'views', 'default']
                    }
                });
            }

            // Validasi sort
            const validSorts = ['new', 'top', 'views'];
            const sortParam  = validSorts.includes(sort) ? sort : null;

            // Build URL
            const pageNum  = parseInt(page) || 0;
            const keyword  = encodeURIComponent(q.trim().replace(/\s+/g, '_'));
            let fetchUrl   = `https://www.xnxx.com/search/${keyword}`;
            if (pageNum > 0) fetchUrl += `/${pageNum}`;
            if (sortParam)   fetchUrl += `?sort=${sortParam}`;

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

                const videoUrl = $el.find('.thumb a').first().attr('href') || '';
                if (!videoUrl) return;

                const thumb   = $el.find('img').attr('data-src') || $el.find('img').attr('src') || '';
                const preview = $el.find('img').attr('data-pvv') || '';
                const videoId = $el.find('img').attr('data-videoid') || '';
                const title   = $el.find('p.title a').text().trim()
                             || $el.find('a[title]').attr('title')
                             || videoUrl.split('/').pop().replace(/_/g, ' ');

                // Parse metadata
                const metaRaw  = $el.find('.metadata').text().trim();
                const metaParts = metaRaw.split('\n').map(s => s.trim()).filter(s => s && s !== '-');
                const views    = metaParts[0] || '';
                const duration = metaParts[1] || '';
                const quality  = metaParts[2] || '';

                // Uploader
                const uploader    = $el.find('.uploader .name').text().trim() || '';
                const uploaderUrl = $el.find('.uploader a').attr('href') || '';

                results.push({
                    title,
                    url:      `https://www.xnxx.com${videoUrl}`,
                    thumb,
                    preview,
                    videoId,
                    duration,
                    views,
                    quality,
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
                    error: "Tidak ada video ditemukan."
                });
            }

            res.status(200).json({
                status: true,
                creator: "Shannz",
                query: q.trim(),
                sort: sortParam || 'default',
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

