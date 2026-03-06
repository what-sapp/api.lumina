const axios = require('axios');
const cheerio = require('cheerio');

/**
 * KOMIKU HOME
 * GET /komik/komiku-home
 * Creator: Shannz
 */

const BASE = 'https://komiku.org';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,*/*',
    'Referer': BASE + '/',
};

function parseArticle($, el) {
    const $el   = $(el);
    const url   = BASE + ($el.find('a').first().attr('href') || '');
    const slug  = $el.find('a').first().attr('href')?.replace(/\//g, '') || '';
    const thumb = $el.find('img').attr('data-src') || $el.find('img').attr('src') || '';
    const rank  = $el.find('.svg.hot').text().trim() || null;
    const latestChapterUrl = $el.find('.ls2l').attr('href') || '';
    return {
        title:          $el.find('h3 a').text().trim(),
        slug, url,
        thumb:          thumb.includes('lazy.jpg') ? '' : thumb,
        genre:          $el.find('.ls2t').text().trim() || null,
        rank,
        latest_chapter: {
            title: $el.find('.ls2l').text().trim() || null,
            url:   latestChapterUrl ? BASE + latestChapterUrl : null,
            slug:  latestChapterUrl.replace(/\//g, '') || null,
        }
    };
}

module.exports = {
    name: 'KomikuHome',
    desc: 'Home page komiku.org — Peringkat, Manga/Manhwa/Manhua Populer, dan Komik Terbaru.',
    category: 'Komik',
    params: [],

    async run(req, res) {
        try {
            const { data: html } = await axios.get(BASE, { headers, timeout: 15000 });
            const $ = cheerio.load(html);

            // ── Peringkat Komiku ──
            const peringkat = [];
            $('h2.lsh3:contains("Peringkat")').closest('section, div').find('article.ls2').each((_, el) => {
                peringkat.push(parseArticle($, el));
            });

            // ── Populer per tipe ──
            const manga_populer   = [];
            const manhwa_populer  = [];
            const manhua_populer  = [];

            $('h2.lsh3:contains("Manga Populer")').next('.ls112').find('article.ls2').each((_, el) => manga_populer.push(parseArticle($, el)));
            $('h2.lsh3:contains("Manhwa Populer")').next('.ls112').find('article.ls2').each((_, el) => manhwa_populer.push(parseArticle($, el)));
            $('h2.lsh3:contains("Manhua Populer")').next('.ls112').find('article.ls2').each((_, el) => manhua_populer.push(parseArticle($, el)));

            // ── Komik Terbaru (bge section) ──
            const terbaru = [];
            $('.bge').each((_, el) => {
                const $el   = $(el);
                const url   = $el.find('a').first().attr('href') || '';
                const thumb = $el.find('img').attr('data-src') || $el.find('img').attr('src') || '';
                const title = $el.find('h3').text().trim() || $el.find('a').attr('title') || '';
                const chUrl = $el.find('.nf a, .new-chapter a, a.ls2l').attr('href') || '';
                if (title) terbaru.push({
                    title, url: url ? BASE + url : '',
                    slug: url.replace(/\//g, ''),
                    thumb: thumb.includes('lazy.jpg') ? '' : thumb,
                    latest_chapter: chUrl ? { url: BASE + chUrl, title: $el.find('.nf a, a.ls2l').text().trim() } : null,
                });
            });

            res.status(200).json({
                status: true, creator: 'Shannz',
                result: {
                    peringkat:      { total: peringkat.length,      data: peringkat },
                    manga_populer:  { total: manga_populer.length,  data: manga_populer },
                    manhwa_populer: { total: manhwa_populer.length, data: manhwa_populer },
                    manhua_populer: { total: manhua_populer.length, data: manhua_populer },
                    terbaru:        { total: terbaru.length,        data: terbaru },
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, creator: 'Shannz', error: e.message });
        }
    }
};

