const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });

/**
 * NHENTAI LATEST
 * Creator: Shannz
 */

const BASE = 'https://nhentai.net';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,*/*',
    'Referer': 'https://nhentai.net/',
};

function parseThumb(url) {
    return url?.startsWith('//') ? `https:${url}` : url || '';
}

module.exports = {
    name: "NhentaiLatest",
    desc: "Mendapatkan doujin terbaru dari nhentai.net.",
    category: "hentai",
    params: ["page"],

    async run(req, res) {
        try {
            const pageNum = parseInt(req.query.page) || 1;
            const { data: html } = await axios.get(`${BASE}/?page=${pageNum}`, { headers, httpsAgent: agent, timeout: 15000 });
            const $ = cheerio.load(html);

            const results = [];
            $('.gallery').each((_, el) => {
                const $el  = $(el);
                const href  = $el.find('a.cover').attr('href') || '';
                const id    = href.replace(/\//g, '').replace('g', '');
                const title = $el.find('.caption').text().trim();
                const thumb = parseThumb($el.find('img').attr('data-src') || $el.find('noscript img').attr('src'));
                const tags  = ($el.attr('data-tags') || '').split(' ').filter(Boolean);
                if (id) results.push({ id, title, url: `${BASE}${href}`, thumb, tags });
            });

            const pages = [];
            $('.pagination a').each((_, el) => {
                const href = $(el).attr('href');
                const text = $(el).text().trim();
                if (href && text && !isNaN(text)) pages.push({ page: text, url: `${BASE}${href}` });
            });

            if (!results.length) return res.status(404).json({ status: false, creator: "Shannz", error: "Tidak ada data." });

            res.status(200).json({ status: true, creator: "Shannz", page: pageNum, total: results.length, pagination: [...new Map(pages.map(p=>[p.page,p])).values()], result: results });
        } catch(e) {
            res.status(500).json({ status: false, creator: "Shannz", error: e.message });
        }
    }
};
