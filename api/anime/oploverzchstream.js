const axios   = require('axios');
const cheerio = require('cheerio');

const BASE    = 'https://oploverz.ch';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
    'Referer': BASE + '/'
};

async function fetchPage(url) {
    const res = await axios.get(url, { headers: HEADERS, timeout: 20000, maxRedirects: 5 });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    return cheerio.load(res.data);
}

module.exports = {
    name: "OploverCh Episode",
    desc: "Mendapatkan detail lengkap episode dari oploverz.ch termasuk stream, mirror, download, nav, dan rekomendasi.",
    category: "Anime",
    params: ["url"],
    paramsSchema: {
        url: { type: "string", label: "URL Episode", required: true }
    },

    async run(req, res) {
        const { url } = req.query;
        if (!url) return res.status(400).json({ status: false, error: 'Parameter url wajib diisi' });
        if (!url.startsWith('https://oploverz.ch')) return res.status(400).json({ status: false, error: 'URL harus dari oploverz.ch' });

        try {
            const $ = await fetchPage(url);

            // Info dari ts_configs script
            const scriptText = $('script').map((_, el) => $(el).html()).get().join('\n');
            let seriesName = null, seriesThumb = null, episodeNum = null;
            const itemMatch = scriptText.match(/"item":\{"mid":\d+,"cid":\d+,"c":"([^"]+)","s":"([^"]+)","t":"([^"]+)"/);
            if (itemMatch) {
                episodeNum  = itemMatch[1];
                seriesName  = itemMatch[2];
                seriesThumb = itemMatch[3];
            }

            const title     = $('h1.entry-title, h1').first().text().trim();
            const date      = $('time[itemprop="datePublished"]').attr('datetime') || null;
            const seriesUrl = $('a[href*="/series/"]').first().attr('href') || null;
            const cover     = $('.thumb img.wp-post-image').first().attr('src') || seriesThumb;
            const stream    = $('.megavid iframe').first().attr('src') || null;

            // Mirrors
            const mirrors = [];
            $('select.mirror option').each((_, el) => {
                const val = $(el).attr('value');
                if (!val) return;
                try {
                    const src = Buffer.from(val, 'base64').toString('utf8').match(/src="([^"]+)"/);
                    if (src) mirrors.push({ label: $(el).text().trim() || `Mirror ${mirrors.length + 1}`, url: src[1] });
                } catch(e) {}
            });

            // Downloads
            const downloads = [], seen = new Set();
            $('a[href]').each((_, el) => {
                const href = $(el).attr('href') || '';
                if (/gofile\.io|drive\.google|mega\.nz|streamtape|doodstream/i.test(href) && !seen.has(href)) {
                    seen.add(href);
                    downloads.push({ label: $(el).text().trim() || href, url: href });
                }
            });

            // Nav
            const prev    = $('.naveps a[rel="prev"]').attr('href') || null;
            const next    = $('.naveps a[rel="next"]').attr('href') || null;
            const all_eps = $('.naveps a[aria-label="All Episodes"]').attr('href') || null;

            // Recommended Series
            const recommended = [];
            $('h3').each((_, h3) => {
                if ($(h3).text().includes('Recommended')) {
                    $(h3).closest('.bixbox').find('a[itemprop="url"]').each((_, el) => {
                        const href  = $(el).attr('href');
                        const label = $(el).attr('title') || $(el).text().trim();
                        const img   = $(el).find('img').attr('src') || null;
                        if (href) recommended.push({ title: label, url: href, image: img });
                    });
                }
            });

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    title, date,
                    series: { name: seriesName, url: seriesUrl, cover },
                    episode: episodeNum,
                    stream, mirrors, downloads,
                    nav: { prev, next, all_eps },
                    recommended
                }
            });
        } catch(e) {
            res.status(500).json({ status: false, creator: "Xena", error: e.message });
        }
    }
};
