const axios = require('axios');
const cheerio = require('cheerio');

/**
 * MOVIEKU HOME
 * GET /movie/movieku-home
 * Returns: hot_updates, latest_movies, latest_episodes
 * Creator: Shannz
 */

const BASE = 'https://movieku.space';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,*/*',
    'Referer': 'https://movieku.space/',
};

function parseArticles($, container) {
    const results = [];
    $(container).find('article.box').each((_, el) => {
        const $el    = $(el);
        const title  = $el.find('h2.entry-title').text().trim() || $el.find('h2').text().trim();
        const url    = $el.find('a[itemprop="url"]').attr('href') || $el.find('a').first().attr('href') || '';
        const slug   = url.replace(BASE, '').replace(/\//g, '') || '';
        // thumb: data-lazy-src dulu, fallback noscript img, fallback data-src
        const thumb  = $el.find('img').attr('data-lazy-src')
                    || $el.find('noscript img').attr('src')
                    || $el.find('img').attr('data-src')
                    || $el.find('img').attr('src') || '';

        if (title && url) {
            results.push({ title, slug, url, thumb: thumb.startsWith('data:') ? '' : thumb });
        }
    });
    return results;
}

module.exports = {
    name: 'MoviekuHome',
    desc: 'Scrape halaman home movieku.space — Hot Updates, Latest Movies, Latest Episodes.',
    category: 'Movie',
    params: [],

    async run(req, res) {
        try {
            const { data: html } = await axios.get(`${BASE}/`, { headers, timeout: 15000 });
            const $ = cheerio.load(html);

            // Ambil semua section berdasarkan h3 header
            const sections = {};
            $('h3').each((_, hEl) => {
                const label = $(hEl).text().trim();
                const parent = $(hEl).closest('div, section');
                const articles = parseArticles($, parent);
                if (articles.length > 0) {
                    const key = label.toLowerCase().replace(/\s+/g, '_');
                    sections[key] = { label, total: articles.length, data: articles };
                }
            });

            // Fallback: kalau section grouping gagal, ambil semua h2 section manual
            if (Object.keys(sections).length === 0) {
                const allArticles = parseArticles($, 'body');
                sections['all'] = { label: 'All', total: allArticles.length, data: allArticles };
            }

            // Juga ambil Latest Movies & Latest Episodes lewat h2 dividers
            // Cek kalau ada div/section yang punya h2 "Latest Movies" / "Latest Episodes"
            $('h2').each((_, hEl) => {
                const txt = $(hEl).text().trim();
                if (txt === 'Latest Movies' || txt === 'Latest Episodes') {
                    const parent = $(hEl).closest('div, section');
                    const articles = parseArticles($, parent);
                    if (articles.length > 0) {
                        const key = txt.toLowerCase().replace(/\s+/g, '_');
                        sections[key] = { label: txt, total: articles.length, data: articles };
                    }
                }
            });

            if (Object.keys(sections).length === 0) {
                return res.status(404).json({ status: false, creator: 'Shannz', error: 'Tidak ada data ditemukan.' });
            }

            res.status(200).json({ status: true, creator: 'Shannz', source: BASE, sections });
        } catch (e) {
            res.status(500).json({ status: false, creator: 'Shannz', error: e.message });
        }
    }
};

