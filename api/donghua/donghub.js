const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

/**
 * DONGHUB SCHEDULE
 * GET /anime/donghub-schedule
 * GET /anime/donghub-schedule?day=friday
 * Creator: Shannz
 */

const BASE = 'https://donghub.vip';
const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

const getHeaders = (extra = {}) => ({
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
    'Accept': 'text/html,*/*',
    'Referer': BASE + '/',
    ...extra
});
const genCookie = () => {
    const r = n => crypto.randomBytes(Math.ceil(n/2)).toString('hex').slice(0, n);
    return `_ga=GA1.1.${r(8)}.${r(10)};`;
};

module.exports = {
    name: 'DonghubSchedule',
    desc: 'Jadwal rilis donghua per hari dari donghub.vip.',
    category: 'Donghua',
    params: ['_day'],

    async run(req, res) {
        try {
            const day = (req.query.day || '').toLowerCase().trim();
            if (day && !DAYS.includes(day)) return res.status(400).json({
                status: false, creator: 'Shannz',
                error: `Day tidak valid. Pilihan: ${DAYS.join(', ')}`
            });

            const { data: html } = await axios.get(`${BASE}/schedule/`, {
                headers: getHeaders({ Cookie: genCookie() }), timeout: 15000
            });
            const $ = cheerio.load(html);

            const schedule = {};

            $('[class*="schedulepage sch_"]').each((_, el) => {
                const $box  = $(el);
                const cls   = $box.attr('class') || '';
                const match = cls.match(/sch_(\w+)/);
                if (!match) return;
                const dayName = match[1]; // thursday, friday, dll

                if (day && dayName !== day) return;

                const items = [];
                $box.find('.bs').each((_, item) => {
                    const $item = $(item);
                    const url   = $item.find('a').attr('href') || '';
                    const slug  = url.replace(BASE, '').replace(/\//g, '');
                    const thumb = $item.find('img').attr('src') || '';
                    const epx   = $item.find('.epx');
                    const status = epx.hasClass('cndwn') ? 'upcoming' : 'released';
                    const time   = epx.hasClass('cndwn') ? epx.text().trim() : null;
                    const countdown = epx.attr('data-cndwn') ? parseInt(epx.attr('data-cndwn')) : null;

                    items.push({
                        title:   $item.find('.tt').text().trim() || $item.find('a').attr('title') || '',
                        slug, url,
                        thumb:   thumb.startsWith('data:') ? '' : thumb,
                        episode: $item.find('.sb').text().trim() || null,
                        status,
                        air_time: time,
                        countdown_seconds: countdown,
                    });
                });

                schedule[dayName] = items;
            });

            if (!Object.keys(schedule).length) return res.status(404).json({
                status: false, creator: 'Shannz', error: 'Tidak ada data schedule.'
            });

            res.status(200).json({
                status: true, creator: 'Shannz',
                filter: day || 'all',
                result: schedule,
            });
        } catch (e) {
            res.status(500).json({ status: false, creator: 'Shannz', error: e.message });
        }
    }
};
