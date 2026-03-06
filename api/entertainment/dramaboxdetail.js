const axios   = require('axios');
const cheerio = require('cheerio');

/**
 * DRAMABOX DETAIL
 * GET /entertainment/dramabox-detail?book_id=41000103051
 */

const BASE_URL = 'https://dramabox.web.id';
const HEADERS  = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' };

module.exports = {
    name:     'DramaboxDetail',
    desc:     'Ambil detail drama dan daftar episode dari Dramabox.',
    category: 'Entertainment',
    params:   ['book_id'],

    async run(req, res) {
        const { book_id } = req.query;
        if (!book_id?.trim()) return res.status(400).json({
            status: false, creator: 'Shannz',
            error: "Parameter 'book_id' wajib diisi."
        });

        try {
            const { data: html } = await axios.get(`${BASE_URL}/watch/${book_id.trim()}`, { headers: HEADERS, timeout: 15000 });
            const $ = cheerio.load(html);

            const fullTitle  = $('.video-title').text().trim();
            const cleanTitle = fullTitle.split('- Episode')[0].trim();

            const episodes = [];
            $('.episodes-grid .episode-btn').each((_, el) => {
                episodes.push({
                    episode: parseInt($(el).text().trim()),
                    id:      $(el).attr('data-episode'),
                });
            });

            return res.status(200).json({
                status: true, creator: 'Shannz',
                result: {
                    book_id:      book_id.trim(),
                    title:        cleanTitle,
                    description:  $('.video-description').text().trim(),
                    thumbnail:    $('meta[itemprop="thumbnailUrl"]').attr('content'),
                    upload_date:  $('meta[itemprop="uploadDate"]').attr('content'),
                    stats: {
                        followers:      $('.video-meta span').first().text().trim(),
                        total_episodes: $('span[itemprop="numberOfEpisodes"]').text().replace(/[^0-9]/g, ''),
                    },
                    episode_list: episodes,
                }
            });
        } catch (e) {
            return res.status(500).json({ status: false, creator: 'Shannz', error: e.message });
        }
    }
};
