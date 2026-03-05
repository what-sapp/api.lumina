const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });

/**
 * XNXX PORNSTARS
 * Creator: Shannz
 */
module.exports = {
    name: "XNXXPornstars",
    desc: "Mendapatkan daftar pornstar di XNXX.",
    category: "NSFW",
    params: ["page"],

    async run(req, res) {
        try {
            const pageNum  = parseInt(req.query.page) || 0;
            const fetchUrl = pageNum > 0
                ? `https://www.xnxx.com/pornstars/${pageNum}`
                : `https://www.xnxx.com/pornstars`;

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

                const profileUrl = $el.find('p.title a').attr('href')
                                || $el.find('.thumb a').attr('href') || '';
                if (!profileUrl) return;

                const name = $el.find('p.title a').text().trim() || '';

                // Thumb — extract dari src di dalam script tag
                const scriptHtml = $el.find('script').html() || '';
                const thumbMatch = scriptHtml.match(/src=['"]([^'"]+\.jpg)['"]/);
                const thumb = thumbMatch ? thumbMatch[1]
                            : $el.find('img').attr('src') || $el.find('img').attr('data-src') || '';

                // Video count — dari free-plate title
                const videoCount = $el.find('.free-plate').attr('title')
                                || $el.find('.free-plate').text().trim() || '';

                // Slug dari URL
                const slug = profileUrl.replace('/pornstar/', '').replace('/channel/', '');

                results.push({
                    name,
                    slug,
                    url:        `https://www.xnxx.com${profileUrl}`,
                    thumb,
                    videoCount,
                });
            });

            // Pagination
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
                    error: "Tidak ada pornstar ditemukan."
                });
            }

            res.status(200).json({
                status: true,
                creator: "Shannz",
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
