const axios = require('axios');
const cheerio = require('cheerio');

/**
 * MOVIEKU FILTER
 * GET /movie/movieku-filter
 * Params opsional: _type, _genre, _quality, _country, _status, _year, _order, _page
 * Creator: Shannz
 */

const BASE = 'https://movieku.space';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,*/*',
    'Referer': 'https://movieku.space/',
};

module.exports = {
    name: 'MoviekuFilter',
    desc: 'Filter film/series di movieku.space. Filter by type (post/series), genre, quality, country, status, year, sort order.',
    category: 'Movie',
    params: ['_type', '_genre', '_quality', '_country', '_status', '_year', '_order', '_page'],

    async run(req, res) {
        try {
            const {
                type    = '',   // post (movie) | series
                genre   = '',   // action, drama, horror, dll — bisa multiple: action,drama
                quality = '',   // bluray | web-dl | nf-web-dl | hc-web-dl | hdtv
                country = '',   // jp, kr, us, dll
                status  = '',   // on-going | completed | dropped
                year    = '',   // 2026, 2025, dll — bisa multiple: 2025,2026
                order   = 'latest', // latest | added | popular | title | imdb
                page    = '1',
            } = req.query;

            const params = new URLSearchParams();
            if (type.trim())    params.append('type[]', type.trim());
            if (genre.trim())   genre.split(',').forEach(g => params.append('genre[]', g.trim()));
            if (quality.trim()) quality.split(',').forEach(q => params.append('quality[]', q.trim()));
            if (country.trim()) country.split(',').forEach(c => params.append('country[]', c.trim()));
            if (status.trim())  params.append('status[]', status.trim());
            if (year.trim())    year.split(',').forEach(y => params.append('years[]', y.trim()));
            params.append('order', order.trim() || 'latest');

            const pageNum = parseInt(page) || 1;
            const pageStr = pageNum > 1 ? `page/${pageNum}/` : '';
            const url = `${BASE}/advanced-search/${pageStr}?${params.toString()}`;

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
                error: 'Tidak ada hasil ditemukan dengan filter tersebut.'
            });

            res.status(200).json({
                status: true, creator: 'Shannz',
                filters: { type, genre, quality, country, status, year, order },
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

