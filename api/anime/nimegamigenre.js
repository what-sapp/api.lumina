const axios = require("axios");
const cheerio = require("cheerio");

/**
 * NIMEGAMI GENRE
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

async function getGenres() {
    const { data: html } = await ax.get(`${BASE}/genre-category-list/`);
    return [...html.matchAll(/href="https:\/\/nimegami\.id\/genre\/([^"\/]+)\/"[^>]*>([^<]+)</g)]
        .map(m => ({ slug: m[1], name: m[2].trim() }));
}

async function byGenre(genre, page = 1) {
    const url = page > 1
        ? `${BASE}/category/${genre}/page/${page}/`
        : `${BASE}/category/${genre}/`;
    const { data: html } = await ax.get(url);
    return {
        results: parseArticles(html),
        pagination: parsePagination(html),
        total: (html.match(/Kami menemukan <span>(\d+)<\/span>/) || [])[1] || null,
    };
}

module.exports = {
    name: "NimegamiGenre",
    desc: "Mendapatkan anime dari nimegami.id berdasarkan genre. Gunakan ?genre=list untuk melihat semua genre.",
    category: "Anime",
    params: ["genre", "page"],

    async run(req, res) {
        try {
            const { genre, page } = req.query;

            // Return daftar genre jika genre=list
            if (!genre || genre === 'list') {
                const genres = await getGenres();
                return res.status(200).json({ status: true, creator: "Shannz x Xena", total: genres.length, result: genres });
            }

            const data = await byGenre(genre.trim().toLowerCase(), parseInt(page) || 1);

            if (!data.results.length) return res.status(404).json({ status: false, creator: "Shannz x Xena", error: "Tidak ada anime ditemukan." });

            res.status(200).json({
                status: true, creator: "Shannz x Xena",
                genre: genre.trim().toLowerCase(),
                page: parseInt(page) || 1,
                total: data.total,
                pagination: data.pagination,
                result: data.results,
            });
        } catch(e) {
            res.status(500).json({ status: false, creator: "Shannz x Xena", error: e.message });
        }
    }
};
