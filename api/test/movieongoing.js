const axios = require('axios');
const cheerio = require('cheerio');

/**
 * MOVIEKU ONGOING
 * GET /movie/movieku-ongoing
 * Creator: Shannz
 */

const BASE = 'https://movieku.space';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,*/*',
    'Referer': 'https://movieku.space/',
};

module.exports = {
    name: 'MoviekuOngoing',
    desc: 'Daftar series ongoing (masih tayang) dari movieku.space.',
    category: 'Movie',
    params: [],

    async run(req, res) {
        try {
            const { data: html } = await axios.get(`${BASE}/ongoing/`, { headers, timeout: 15000 });
            const $ = cheerio.load(html);

            const data = [];
            $('article.box').each((_, el) => {
                const $el   = $(el);
                const title = $el.find('h2.entry-title').text().trim();
                const url   = $el.find('a[itemprop="url"]').attr('href') || '';
                const slug  = url.replace(BASE, '').replace(/\//g, '');
                const thumb = $el.find('img').attr('src') || $el.find('img').attr('data-lazy-src') || '';
                const qual  = $el.find('span.quality').text().trim();
                const id    = $el.find('a').first().attr('rel') || '';
                if (title && url) data.push({
                    id, title, slug, url,
                    thumb: thumb.startsWith('data:') ? '' : thumb,
                    quality: qual || null,
                });
            });

            if (!data.length) return res.status(404).json({ status: false, creator: 'Shannz', error: 'Tidak ada data ongoing.' });

            res.status(200).json({ status: true, creator: 'Shannz', total: data.length, result: data });
        } catch (e) {
            res.status(500).json({ status: false, creator: 'Shannz', error: e.message });
        }
    }
};
