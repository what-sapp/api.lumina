const axios = require('axios');
const cheerio = require('cheerio');

/**
 * MOVIEKU SERIES LIST
 * GET /movie/movieku-series-list          → semua series
 * GET /movie/movieku-series-list?letter=A → filter huruf A-Z atau #
 * Creator: Shannz
 */

const BASE = 'https://movieku.space';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,*/*',
    'Referer': 'https://movieku.space/',
};

module.exports = {
    name: 'MoviekuSeriesList',
    desc: 'Daftar semua series di movieku.space. Filter berdasarkan huruf (A-Z atau #).',
    category: 'Movie',
    params: ['_letter'],

    async run(req, res) {
        try {
            const letter = (req.query.letter || '').toUpperCase().trim();

            const { data: html } = await axios.get(`${BASE}/series-list/`, { headers, timeout: 15000 });
            const $ = cheerio.load(html);

            const result = {};

            // Tiap .blc = satu kelompok huruf
            $('div.blc').each((_, el) => {
                const $el    = $(el);
                const anchor = $el.find('a[name]').attr('name') || '';
                const label  = anchor.toUpperCase() || '#';

                // Filter kalau ada param letter
                if (letter && label !== letter) return;

                const items = [];
                $el.find('li a.series').each((_, a) => {
                    const title = $(a).text().trim();
                    const url   = $(a).attr('href') || '';
                    const id    = $(a).attr('rel') || '';
                    const slug  = url.replace(BASE, '').replace(/\//g, '');
                    if (title && url) items.push({ id, title, slug, url });
                });

                if (items.length > 0) result[label] = items;
            });

            if (Object.keys(result).length === 0) {
                return res.status(404).json({
                    status: false, creator: 'Shannz',
                    error: letter ? `Tidak ada series dengan huruf "${letter}".` : 'Tidak ada data ditemukan.'
                });
            }

            const total = Object.values(result).reduce((acc, arr) => acc + arr.length, 0);

            res.status(200).json({
                status: true, creator: 'Shannz',
                filter: letter || 'ALL',
                total,
                result,
            });
        } catch (e) {
            res.status(500).json({ status: false, creator: 'Shannz', error: e.message });
        }
    }
};
