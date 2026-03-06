const axios   = require('axios');
const cheerio = require('cheerio');

/**
 * BING IMAGE SEARCH
 * GET /search/bing-images?query=tokosaki kurumi
 */

module.exports = {
    name:     'BingImages',
    desc:     'Cari gambar di Bing.',
    category: 'SEARCH',
    params:   ['query'],

    async run(req, res) {
        const { query } = req.query;
        if (!query?.trim()) return res.status(400).json({
            status: false, creator: 'Shannz',
            error: "Parameter 'query' wajib diisi."
        });

        try {
            const { data: html } = await axios.get(`https://www.bing.com/images/search?q=${encodeURIComponent(query.trim())}`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
                timeout: 15000,
            });

            const $       = cheerio.load(html);
            const results = [];

            $(".imgpt > a").each((i, el) => {
                const href = $(el).attr("href");
                if (href) results.push({ photo: 'https://www.bing.com' + href });
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

