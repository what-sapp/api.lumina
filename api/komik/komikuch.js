const axios = require('axios');
const cheerio = require('cheerio');

/**
 * KOMIKU CHAPTER
 * GET /komik/komiku-chapter?slug=one-piece-chapter-1175
 * Creator: Shannz
 */

const BASE = 'https://komiku.org';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,*/*',
    'Referer': BASE + '/',
};

const SKIP_DOMAINS = ['asset', 'gravatar', 'gstatic', 'firebase', 'komikuplus', 'ads'];

module.exports = {
    name: 'KomikuChapter',
    desc: 'Ambil halaman gambar dari chapter komik di komiku.org.',
    category: 'Komik',
    params: ['slug'],

    async run(req, res) {
        try {
            const { slug } = req.query;
            if (!slug?.trim()) return res.status(400).json({
                status: false, creator: 'Shannz',
                error: "Parameter 'slug' wajib diisi. Contoh: ?slug=one-piece-chapter-1175"
            });

            const url = `${BASE}/${slug.trim().replace(/^\/|\/$/g, '')}/`;
            const { data: html } = await axios.get(url, { headers, timeout: 15000 });
            const $ = cheerio.load(html);

            const title = $('h1').first().text().trim();
            if (!title) return res.status(404).json({ status: false, creator: 'Shannz', error: 'Chapter tidak ditemukan.' });

            // Images — filter skip ads/asset
            const images = [];
            $('img').each((_, el) => {
                const src = $(el).attr('src') || '';
                if (!src) return;
                if (SKIP_DOMAINS.some(d => src.includes(d))) return;
                if (src.startsWith('/') || src.includes('komiku.org/asset')) return;
                images.push(src);
            });

            // Manga title & link
            const mangaLink = $('.toolbar a[rel="tag"]').attr('href') || '';
            const mangaSlug = mangaLink.replace(BASE, '').replace(/\//g, '').replace('manga', '') || null;

            // Prev / Next
            const prevUrl = $('.toolbar a[aria-label="Prev"]').attr('href') || '';
            const nextUrl = $('.toolbar a[aria-label="Next"]').attr('href') || '';

            if (!images.length) return res.status(404).json({
                status: false, creator: 'Shannz', error: 'Gambar chapter tidak ditemukan.'
            });

            res.status(200).json({
                status: true, creator: 'Shannz',
                result: {
                    title, slug: slug.trim(), url,
                    manga: {
                        title: $('.toolbar a[rel="tag"]').attr('title') || null,
                        slug:  mangaSlug,
                        url:   mangaLink || null,
                    },
                    total_pages: images.length,
                    images,
                    navigation: {
                        prev: prevUrl ? { url: prevUrl, slug: prevUrl.replace(BASE,'').replace(/\//g,'') } : null,
                        next: nextUrl ? { url: nextUrl, slug: nextUrl.replace(BASE,'').replace(/\//g,'') } : null,
                    }
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, creator: 'Shannz', error: e.message });
        }
    }
};
