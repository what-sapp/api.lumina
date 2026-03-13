const axios = require('axios');
const cheerio = require('cheerio');

const BASE = 'https://otakudesu.blog';
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || '';
const AJAX_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': BASE + '/'
};

async function fetchPage(url) {
    if (!SCRAPER_API_KEY) throw new Error('SCRAPER_API_KEY tidak di-set di environment');
    const apiUrl = 'http://api.scraperapi.com?api_key=' + SCRAPER_API_KEY + '&url=' + encodeURIComponent(url);
    const res = await axios.get(apiUrl, { timeout: 60000 });
    if (res.status !== 200) throw new Error('ScraperAPI error: HTTP ' + res.status);
    return cheerio.load(res.data);
}

async function getNonce() {
    const res = await axios.post(`${BASE}/wp-admin/admin-ajax.php`,
        new URLSearchParams({ action: 'aa1208d27f29ca340c92c66d1926f13f' }),
        { headers: AJAX_HEADERS, timeout: 10000 }
    );
    if (!res.data?.data) throw new Error('Gagal mendapatkan nonce');
    return res.data.data;
}

async function getEmbedUrl(id, i, q, nonce) {
    const res = await axios.post(`${BASE}/wp-admin/admin-ajax.php`,
        new URLSearchParams({ id: String(id), i: String(i), q, nonce, action: '2a3505c93b0035d3f455df82bf976b84' }),
        { headers: AJAX_HEADERS, timeout: 10000 }
    );
    if (!res.data?.data) return null;
    const html = Buffer.from(res.data.data, 'base64').toString('utf-8');
    const $ = cheerio.load(html);
    return $('iframe').attr('src') || null;
}

async function bypassFiledon(embedUrl) {
    const slug = embedUrl.split('/embed/')[1];
    if (!slug) return null;
    const res = await axios.get(`https://filedon.co/embed/${slug}`, {
        headers: { 'User-Agent': AJAX_HEADERS['User-Agent'], 'Referer': BASE + '/' },
        timeout: 15000
    });
    const raw = res.data.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\\/g, '');
    const match = raw.match(/"url":"(https:\/\/[^"]+\.mp4[^"]*)"/);
    return match ? match[1] : null;
}

/**
 * OTAKUDESU STREAM SCRAPER
 * Source: otakudesu.blog
 * Params: _url (required) - URL halaman episode
 */
module.exports = {
    name: "Otakudesu Stream",
    desc: "Mendapatkan mirror stream dan link download episode dari Otakudesu",
    category: "ANIME",
    params: ["_url"],
    async run(req, res) {
        try {
            const url = req.query._url || req.query.url;
            if (!url) return res.status(400).json({ status: false, error: 'Parameter url wajib diisi' });
            if (!url.startsWith('https://otakudesu.blog')) return res.status(400).json({ status: false, error: 'URL harus dari otakudesu.blog' });

            const $ = await fetchPage(url);

            const title        = $('.posttl').first().text().trim();
            const default_embed = $('#pembed iframe').attr('src') || null;
            const cover        = $('.cukder img').first().attr('src') || null;

            // next episode + series url
            let series_url = null, next_episode = null;
            $('.flir a').each((_, a) => {
                const href  = $(a).attr('href') || '';
                const title = $(a).attr('title') || '';
                if (href.includes('/anime/')) series_url = href;
                if (title.toLowerCase().includes('selanjutnya')) next_episode = href;
            });

            // episode list dari selectcog
            const episode_list = [];
            $('#selectcog option').each((_, opt) => {
                const val  = $(opt).attr('value') || '';
                const text = $(opt).text().trim();
                if (val && val !== '0') episode_list.push({ label: text, url: val });
            });

            // mirror streams
            const mirrors = {};
            ['.m360p', '.m480p', '.m720p'].forEach(cls => {
                const quality = cls.replace('.m', '');
                mirrors[quality] = [];
                $(`ul${cls} li a`).each((_, a) => {
                    const name    = $(a).text().trim();
                    const encoded = $(a).attr('data-content');
                    if (encoded) {
                        try {
                            const data = JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
                            mirrors[quality].push({ name, ...data });
                        } catch (_) {}
                    }
                });
            });

            // download links
            const downloads = {};
            $('.download ul li').each((_, li) => {
                const quality = $(li).find('strong').text().trim();
                if (!quality) return;
                const size    = $(li).find('i').text().trim();
                const servers = [];
                $(li).find('a').each((_, a) => {
                    const name = $(a).text().trim();
                    const link = $(a).attr('href');
                    if (link && link.startsWith('http')) servers.push({ name, link });
                });
                if (servers.length) downloads[quality] = { size, servers };
            });

            // info anime
            const info = {};
            const genres = [];
            $('.infozingle p').each((_, p) => {
                const text = $(p).text().trim();
                const m    = text.match(/^(.+?):\s*(.+)$/);
                if (m) info[m[1].trim()] = m[2].trim();
            });
            $('.infozingle b:contains("Genres")').parent().find('a').each((_, a) => {
                const g = $(a).text().trim();
                if (g) genres.push(g);
            });

            res.status(200).json({
                status: true,
                result: {
                    title,
                    cover,
                    series_url,
                    next_episode,
                    info,
                    genres,
                    default_embed,
                    mirrors,
                    downloads,
                    episode_list
                }
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                error: error.message
            });
        }
    }
};

