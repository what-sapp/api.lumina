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
            const days = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu','Random'];
            const ongoing = { section: 'On-going Anime', url: 'https://otakudesu.blog/ongoing-anime/', items: [] };
            const complete = { section: 'Complete Anime', url: 'https://otakudesu.blog/complete-anime/', items: [] };

            $('.rseries .venz ul li').each((_, li) => {
                const episode = $(li).find('.epz').text().replace(/\s+/g, ' ').trim();
                const meta    = $(li).find('.epztipe').text().replace(/\s+/g, ' ').trim();
                const date    = $(li).find('.newnime').text().trim();
                const a       = $(li).find('.thumb a').first();
                const url     = a.attr('href') || null;
                const title   = $(li).find('.jdlflm').text().trim();
                const cover   = $(li).find('img').first().attr('src') || null;
                if (!url || !title) return;
                const item = { title, url, cover, episode, meta, date };
                const isOngoing = days.some(d => meta.includes(d));
                if (isOngoing) ongoing.items.push(item);
                else complete.items.push(item);
            });

            const sections = [];
            if (ongoing.items.length) sections.push(ongoing);
            if (complete.items.length) sections.push(complete);

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
