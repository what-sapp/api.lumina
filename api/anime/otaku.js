const axios = require('axios');
const cheerio = require('cheerio');

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
            const { data } = await axios.get('https://otakudesu.blog/', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
                    'Referer': 'https://otakudesu.blog/'
                },
                timeout: 20000
            });

            const $ = cheerio.load(data);
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
