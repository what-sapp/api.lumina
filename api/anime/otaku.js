const axios = require('axios');
const cheerio = require('cheerio');

let cloudscraper;
try { cloudscraper = require('cloudscraper'); } catch (_) { cloudscraper = null; }

const BASE = 'https://otakudesu.blog';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"'
};

async function fetchPage(url) {
    try {
        const res = await axios.get(url, { headers: HEADERS, timeout: 20000, maxRedirects: 5, decompress: true });
        if (res.status === 200) return cheerio.load(res.data);
    } catch (_) {}

    if (cloudscraper) {
        const html = await cloudscraper.get({ uri: url, headers: { 'Referer': BASE + '/' }, timeout: 30000 });
        return cheerio.load(html);
    }

    throw new Error('Gagal fetch halaman, CF block dan cloudscraper tidak tersedia');
}

/**
 * OTAKUDESU HOME SCRAPER
 * Source: otakudesu.blog
 * Params: none
 */
module.exports = {
    name: "Otakudesu Home",
    desc: "Melihat daftar anime ongoing dan complete terbaru dari Otakudesu",
    category: "ANIME",
    params: [],
    async run(req, res) {
        try {
            const $ = await fetchPage(BASE + '/');
            const sections = [];

            $('.rseries').each((_, section) => {
                const section_title = $(section).find('.rvad h1').text().trim();
                const section_url   = $(section).find('.rapi > a').first().attr('href') || null;

                const items = [];
                $(section).find('.venz ul li').each((_, li) => {
                    const episode = $(li).find('.epz').text().replace(/\s+/g, ' ').trim();
                    const meta    = $(li).find('.epztipe').text().replace(/\s+/g, ' ').trim();
                    const date    = $(li).find('.newnime').text().trim();
                    const a       = $(li).find('.thumb a').first();
                    const url     = a.attr('href') || null;
                    const title   = $(li).find('.jdlflm').text().trim();
                    const cover   = $(li).find('img').first().attr('src') || null;

                    if (url && title) items.push({ title, url, cover, episode, meta, date });
                });

                if (items.length) sections.push({ section: section_title, url: section_url, items });
            });

            res.status(200).json({
                status: true,
                result: sections
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }
};
