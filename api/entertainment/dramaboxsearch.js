const axios   = require('axios');
const cheerio = require('cheerio');

/**
 * DRAMABOX SEARCH
 * GET /entertainment/dramabox-search?query=ceo
 */

const BASE_URL = 'https://dramabox.web.id';
const HEADERS  = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' };

const resolveUrl = (link) => link && !link.startsWith('http') ? `${BASE_URL}/${link.replace(/^\//, '')}` : link;
const getBookId  = (url) => { try { const m = url?.match(/\/watch\/(\d+)/); return m ? m[1] : new URL(url).searchParams.get('bookId'); } catch(_) { return null; } };

module.exports = {
    name:     'DramaboxSearch',
    desc:     'Cari short drama di Dramabox berdasarkan kata kunci.',
    category: 'Entertainment',
    params:   ['query'],

    async run(req, res) {
        const { query } = req.query;
        if (!query?.trim()) return res.status(400).json({
            status: false, creator: 'Shannz',
            error: "Parameter 'query' wajib diisi."
        });

        try {
            const { data: html } = await axios.get(`${BASE_URL}/search.php?lang=in&q=${encodeURIComponent(query.trim())}`, { headers: HEADERS, timeout: 15000 });
            const $ = cheerio.load(html);

            const results = [];
            $('.drama-grid .drama-card').each((_, el) => {
                const link = resolveUrl($(el).find('.watch-button').attr('href'));
                results.push({
                    title:   $(el).find('.drama-title').text().trim(),
                    book_id: getBookId(link),
                    views:   $(el).find('.drama-meta span').first().text().trim(),
                    image:   $(el).find('.drama-image img').attr('src') || $(el).find('.drama-image img').attr('data-src'),
                });
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
