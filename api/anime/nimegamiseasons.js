const axios = require("axios");
const cheerio = require("cheerio");

/**
 * NIMEGAMI SEASON
 * Creator: Shannz x Xena
 */

const BASE = "https://nimegami.id";
const UA   = "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 Chrome/107.0.0.0 Mobile Safari/537.36";
const ax   = axios.create({ headers: { "user-agent": UA }, decompress: true, timeout: 15000 });

function parseArticles(html) {
    const $ = cheerio.load(html);
    const results = [];
    $('article').each((_, el) => {
        const $el    = $(el);
        const url    = $el.find('.thumbnail a').first().attr('href') || '';
        if (!url) return;
        const slug   = url.replace('https://nimegami.id/', '').replace(/\/$/, '');
        const thumb  = $el.find('img').first().attr('src') || '';
        const rating = $el.find('.rating-archive').text().replace(/[^0-9.]/g, '').trim() || null;
        const episode= $el.find('.eps-archive').text().trim() || null;
        const title  = $el.find('h2 a').text().trim() || '';
        const status = $el.find('.term_tag-a a').text().trim() || null;
        const type   = $el.find('.terms_tag a').first().text().trim() || null;
        results.push({ title, slug, url, thumb, rating, episode, status, type });
    });
    return results;
}

function parsePagination(html) {
    const pages = [], seen = new Set();
    const re = /href="(https:\/\/nimegami\.id\/[^"]+page\/(\d+)\/[^"]*)"/g;
    let m;
    while ((m = re.exec(html)) !== null) {
        if (!seen.has(m[2])) { seen.add(m[2]); pages.push({ page: m[2], url: m[1] }); }
    }
    return pages;
}

module.exports = {
    name: "NimegamiSeason",
    desc: "Mendapatkan anime dari nimegami.id berdasarkan musim. season: winter/spring/summer/fall, year: 2024/2025/2026.",
    category: "Anime",
    params: ["season", "year", "page"],

    async run(req, res) {
        try {
            const { season, year, page } = req.query;
            const validSeasons = ["winter","spring","summer","fall"];

            if (!season?.trim()) return res.status(400).json({ status: false, creator: "Shannz x Xena", error: "Parameter 'season' wajib diisi.", validSeasons, example: "?season=winter&year=2026" });
            if (!validSeasons.includes(season.trim().toLowerCase())) return res.status(400).json({ status: false, creator: "Shannz x Xena", error: `Season '${season}' tidak valid.`, validSeasons });

            const key  = year ? `${season.trim().toLowerCase()}-${year.trim()}` : season.trim().toLowerCase();
            const pageNum = parseInt(page) || 1;
            const url  = pageNum > 1
                ? `${BASE}/seasons/${key}/page/${pageNum}/`
                : `${BASE}/seasons/${key}/`;

            const { data: html } = await ax.get(url);
            const results = parseArticles(html);
            const pagination = parsePagination(html);
            const totalM = html.match(/Kami menemukan <span>(\d+)<\/span>/);

            if (!results.length) return res.status(404).json({ status: false, creator: "Shannz x Xena", error: "Tidak ada anime ditemukan." });

            res.status(200).json({
                status: true, creator: "Shannz x Xena",
                season: season.trim().toLowerCase(), year: year?.trim() || null,
                page: pageNum, total: totalM?.[1] || null,
                pagination, result: results,
            });
        } catch(e) {
            res.status(500).json({ status: false, creator: "Shannz x Xena", error: e.message });
        }
    }
};

