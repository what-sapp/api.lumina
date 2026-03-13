const axios = require('axios');
const cheerio = require('cheerio');

const BASE = 'https://otakudesu.blog';
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || '';

async function fetchPage(url) {
    if (!SCRAPER_API_KEY) throw new Error('SCRAPER_API_KEY tidak di-set di environment');
    const apiUrl = 'http://api.scraperapi.com?api_key=' + SCRAPER_API_KEY + '&url=' + encodeURIComponent(url);
    const res = await axios.get(apiUrl, { timeout: 60000 });
    if (res.status !== 200) throw new Error('ScraperAPI error: HTTP ' + res.status);
    return cheerio.load(res.data);
}

/**
 * OTAKUDESU DETAIL SCRAPER
 * Source: otakudesu.blog
 * Params: _url (required) - URL halaman anime series
 */
module.exports = {
    name: "Otakudesu Detail",
    desc: "Melihat detail anime dan daftar episode dari Otakudesu",
    category: "ANIME",
    params: ["_url"],
    async run(req, res) {
        try {
            const url = req.query._url || req.query.url;
            if (!url) return res.status(400).json({ status: false, error: 'Parameter url wajib diisi' });
            if (!url.startsWith('https://otakudesu.blog')) return res.status(400).json({ status: false, error: 'URL harus dari otakudesu.blog' });

            const $ = await fetchPage(url);

            // title
            const title = $('.jdlrx h1').first().text().trim();

            // cover
            const cover = $('.fotoanime img').first().attr('src') || null;

            // info dari infozingle
            const info = {};
            const genres = [];
            $('.infozingle p').each((_, p) => {
                const key = $(p).find('b').first().text().replace(':', '').trim();
                if (!key) return;
                if (key === 'Genre') {
                    $(p).find('a').each((_, a) => {
                        const g = $(a).text().trim();
                        if (g) genres.push(g);
                    });
                } else {
                    const val = $(p).find('span').first().text().replace(key + ':', '').trim();
                    if (val) info[key] = val;
                }
            });

            // synopsis
            const synopsis = $('.sinopc').text().trim() || null;

            // episode sections (batch, per-episode, lengkap)
            const episode_sections = [];
            $('.episodelist').each((_, section) => {
                const section_title = $(section).find('.monktit').text().trim();
                const episodes = [];
                $(section).find('ul li').each((_, li) => {
                    const a     = $(li).find('a').first();
                    const label = a.text().trim();
                    const epUrl = a.attr('href') || '';
                    const date  = $(li).find('.zeebr').text().trim();
                    if (epUrl) episodes.push({ label, url: epUrl, date });
                });
                if (episodes.length) episode_sections.push({ section: section_title, episodes });
            });

            // rekomendasi
            const recommendations = [];
            $('#recommend-anime-series .isi-konten').each((_, item) => {
                const a     = $(item).find('.judul-anime a').first();
                const label = a.text().trim();
                const href  = a.attr('href') || '';
                const img   = $(item).find('img').first().attr('src') || null;
                if (href) recommendations.push({ title: label, url: href, cover: img });
            });

            res.status(200).json({
                status: true,
                result: {
                    title,
                    cover,
                    info,
                    genres,
                    synopsis,
                    episode_sections,
                    recommendations
                }
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }
};

