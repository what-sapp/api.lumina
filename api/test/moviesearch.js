const axios = require('axios');
const cheerio = require('cheerio');

/**
 * MOVIEKU SEARCH
 * GET /movie/movieku-search?query=monarch
 * Creator: Shannz
 */

const BASE = 'https://movieku.space';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,*/*',
    'Referer': 'https://movieku.space/',
};

module.exports = {
    name: 'MoviekuSearch',
    desc: 'Cari film/series di movieku.space berdasarkan judul.',
    category: 'Movie',
    params: ['query'],

    async run(req, res) {
        try {
            const { query, page = '1' } = req.query;
            if (!query?.trim()) return res.status(400).json({
                status: false, creator: 'Shannz',
                error: "Parameter 'query' wajib diisi. Contoh: ?query=monarch"
            });

            const pageNum = parseInt(page) || 1;
            const pageStr = pageNum > 1 ? `page/${pageNum}/` : '';
            const url = `${BASE}/${pageStr}?s=${encodeURIComponent(query.trim())}`;

            const { data: html } = await axios.get(url, { headers, timeout: 15000 });
            const $ = cheerio.load(html);

            const results = [];
            $('article.box').each((_, el) => {
                const $el   = $(el);
                const title = $el.find('h2.entry-title').text().trim();
                const href  = $el.find('a[itemprop="url"], a.tip').attr('href') || '';
                const slug  = href.replace(BASE, '').replace(/\//g, '');
                const thumb = $el.find('img').attr('src') || $el.find('img').attr('data-lazy-src') || '';
                const qual  = $el.find('span.quality').text().trim();
                const id    = $el.find('a').first().attr('rel') || '';
                if (title && href) results.push({
                    id, title, slug, url: href,
                    thumb: thumb.startsWith('data:') ? '' : thumb,
                    quality: qual || null,
                });
            });

            let totalPages = 1;
            $('.pagination .page-numbers:not(.next):not(.prev)').each((_, el) => {
                const n = parseInt($(el).text().trim());
                if (!isNaN(n) && n > totalPages) totalPages = n;
            });

            if (!results.length) return res.status(404).json({
                status: false, creator: 'Shannz',
                error: `Tidak ada hasil untuk "${query}".`
            });

            res.status(200).json({
                status: true, creator: 'Shannz',
                query: query.trim(),
                page: pageNum,
                total_pages: totalPages,
                total_results: results.length,
                result: results,
            });
        } catch (e) {
            res.status(500).json({ status: false, creator: 'Shannz', error: e.message });
        }
    }
};

