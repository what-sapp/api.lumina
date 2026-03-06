const axios   = require('axios');
const cheerio = require('cheerio');

/**
 * BING VIDEO SEARCH
 * GET /search/bing-videos?query=date a live s1 e5
 */

module.exports = {
    name:     'BingVideos',
    desc:     'Cari video di Bing.',
    category: 'SEARCH',
    params:   ['query'],

    async run(req, res) {
        const { query } = req.query;
        if (!query?.trim()) return res.status(400).json({
            status: false, creator: 'Shannz',
            error: "Parameter 'query' wajib diisi."
        });

        try {
            const { data: html } = await axios.get(`https://www.bing.com/videos/search?q=${encodeURIComponent(query.trim())}`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
                timeout: 15000,
            });

            const $       = cheerio.load(html);
            const results = [];

            $('.mc_vtvc').each((i, el) => {
                const title      = $(el).find('.mc_vtvc_title strong').text();
                const duration   = $(el).find('.mc_bc_rc.items').first().text();
                const views      = $(el).find('.meta_vc_content').first().text();
                const uploadDate = $(el).find('.meta_pd_content').first().text();
                const channel    = $(el).find('.mc_vtvc_meta_row_channel').text();
                let link         = $(el).find('a').attr('href') || '';
                if (link && !link.startsWith('http')) {
                    link = link.startsWith('/') ? `https://www.bing.com${link}` : `https://www.bing.com/${link}`;
                }
                results.push({ title, duration, views, uploadDate, channel, link });
            });

            return res.status(200).json({
                status: true, creator: 'Shannz',
                result: { query: query.trim(), total: results.length, data: results }
            });
        } catch (e) {
            return res.status(500).json({ status: false, creator: 'Shannz', error: e.message });
        }
    }
};

