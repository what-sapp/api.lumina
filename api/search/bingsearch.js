const axios   = require('axios');
const cheerio = require('cheerio');

/**
 * BING SEARCH
 * GET /search/bing-search?query=kitsulabs shannz
 */

module.exports = {
    name:     'BingSearch',
    desc:     'Cari artikel/website di Bing.',
    category: 'SEARCH',
    params:   ['query'],

    async run(req, res) {
        const { query } = req.query;
        if (!query?.trim()) return res.status(400).json({
            status: false, creator: 'Shannz',
            error: "Parameter 'query' wajib diisi."
        });

        try {
            const { data: html } = await axios.get(`https://www.bing.com/search?q=${encodeURIComponent(query.trim())}`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
                timeout: 15000,
            });

            const $ = cheerio.load(html);
            const results = [];

            $('.b_algo').each((i, el) => {
                const title   = $(el).find('h2').text();
                const link    = $(el).find('a').attr('href');
                const snippet = $(el).find('.b_caption p').text();
                const image   = $(el).find('.cico .rms_iac').attr('data-src');
                results.push({ title, link, snippet, image: image ? `https:${image}` : undefined });
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
