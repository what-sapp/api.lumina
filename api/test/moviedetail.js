const axios = require('axios');
const cheerio = require('cheerio');

/**
 * MOVIEKU DETAIL
 * GET /movie/movieku-detail?slug=monarch-legacy-of-monsters-season-2-2026
 * Creator: Shannz
 */

const BASE = 'https://movieku.space';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,*/*',
    'Referer': 'https://movieku.space/',
};

module.exports = {
    name: 'MoviekuDetail',
    desc: 'Detail film/series dari movieku.space. Termasuk info, sinopsis, episode list, dan rekomendasi.',
    category: 'Movie',
    params: ['slug'],

    async run(req, res) {
        try {
            const { slug } = req.query;
            if (!slug?.trim()) return res.status(400).json({ status: false, creator: 'Shannz', error: "Parameter 'slug' wajib diisi. Contoh: ?slug=monarch-legacy-of-monsters-season-2-2026" });

            const url = `${BASE}/${slug.trim().replace(/^\/|\/$/g, '')}/`;
            const { data: html } = await axios.get(url, { headers, timeout: 15000 });
            const $ = cheerio.load(html);

            // ── Poster ──
            const poster = $('noscript img').first().attr('src')
                        || $('img[itemprop="image"]').attr('data-lazy-src')
                        || $('img.ts-post-image').attr('data-lazy-src') || '';

            // ── Title ──
            const title = $('h1.entry-title, h1[itemprop="headline"]').first().text().trim()
                       || $('h2.entry-title').first().text().trim();

            // ── Info fields dari ul.data ──
            const info = {};
            $('ul.data li').each((_, el) => {
                const label = $(el).find('b').text().replace(':', '').trim();
                const value = $(el).find('.colspan').text().trim()
                           || $(el).clone().children('b').remove().end().text().trim();
                if (label) info[label.toLowerCase()] = value;
            });

            // ── Synopsis ──
            const synopsis = $('[itemprop="description"] p').first().text().trim()
                          || $('[itemprop="description"]').text().trim()
                          || $('div.synops p').first().text().trim();

            // ── Episode list ──
            const episodes = [];
            $('div.epsdlist ul li').each((_, el) => {
                const epUrl   = $(el).find('a').attr('href') || '';
                const epTitle = $(el).find('.epl-num b').text().trim() || $(el).find('.epl-num').text().trim();
                const epDate  = $(el).find('.epl-date').text().trim();
                const epId    = $(el).attr('data-ID') || $(el).attr('data-id') || '';
                if (epUrl) episodes.push({ id: epId, title: epTitle, date: epDate, url: epUrl, slug: epUrl.replace(BASE, '').replace(/\//g, '') });
            });

            // ── Recommendations ──
            const recommendations = [];
            $('#rkms article.box').each((_, el) => {
                const $el    = $(el);
                const rTitle = $el.find('h2.entry-title').text().trim();
                const rUrl   = $el.find('a[itemprop="url"]').attr('href') || '';
                const rThumb = $el.find('img').attr('data-lazy-src') || $el.find('noscript img').attr('src') || '';
                const rQual  = $el.find('span.quality').text().trim();
                if (rTitle) recommendations.push({ title: rTitle, url: rUrl, slug: rUrl.replace(BASE, '').replace(/\//g, ''), thumb: rThumb.startsWith('data:') ? '' : rThumb, quality: rQual });
            });

            if (!title) return res.status(404).json({ status: false, creator: 'Shannz', error: 'Film tidak ditemukan.' });

            res.status(200).json({
                status: true, creator: 'Shannz',
                result: {
                    title,
                    slug: slug.trim(),
                    url,
                    poster,
                    synopsis,
                    info,
                    episodes: { total: episodes.length, data: episodes },
                    recommendations: { total: recommendations.length, data: recommendations },
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, creator: 'Shannz', error: e.message });
        }
    }
};

