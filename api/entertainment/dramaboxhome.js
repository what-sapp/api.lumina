const axios   = require('axios');
const cheerio = require('cheerio');

/**
 * DRAMABOX HOME
 * GET /entertainment/dramabox-home
 */

const BASE_URL = 'https://dramabox.web.id';
const HEADERS  = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' };

const resolveUrl = (link) => link && !link.startsWith('http') ? `${BASE_URL}/${link.replace(/^\//, '')}` : link;
const getBookId  = (url) => { try { const m = url?.match(/\/watch\/(\d+)/); return m ? m[1] : new URL(url).searchParams.get('bookId'); } catch(_) { return null; } };

module.exports = {
    name:     'DramaboxHome',
    desc:     'Ambil daftar drama terbaru dan trending dari Dramabox.',
    category: 'Entertainment',
    params:   [],

    async run(req, res) {
        try {
            const { data: html } = await axios.get(`${BASE_URL}/in`, { headers: HEADERS, timeout: 15000 });
            const $ = cheerio.load(html);

            const latest = [];
            $('.drama-grid .drama-card').each((_, el) => {
                const link     = resolveUrl($(el).find('.watch-button').attr('href'));
                const episodes = $(el).find('.drama-meta span[itemprop="numberOfEpisodes"]').text().replace(/[^0-9]/g, '');
                latest.push({
                    title:    $(el).find('.drama-title').text().trim(),
                    book_id:  getBookId(link),
                    image:    $(el).find('.drama-image img').attr('src') || $(el).find('.drama-image img').attr('data-src'),
                    episodes,
                });
            });

            const trending = [];
            $('.sidebar-widget .rank-list .rank-item').each((_, el) => {
                const link     = resolveUrl($(el).attr('href'));
                const episodes = $(el).find('.rank-meta span').text().replace(/[^0-9]/g, '');
                trending.push({
                    rank:    $(el).find('.rank-number').text().trim(),
                    title:   $(el).find('.rank-title').text().trim(),
                    book_id: getBookId(link),
                    image:   $(el).find('.rank-image img').attr('src') || $(el).find('.rank-image img').attr('data-src'),
                    episodes,
                });
            });

            return res.status(200).json({ status: true, creator: 'Shannz', result: { latest, trending } });
        } catch (e) {
            return res.status(500).json({ status: false, creator: 'Shannz', error: e.message });
        }
    }
};

