const axios = require("axios");
const cheerio = require("cheerio");

/**
 * CORE LOGIC: Scraper whatsgrouplink.com
 */
const waGroupScraper = {
    // Tahap 1: Cari daftar artikel berdasarkan keyword
    search: async (query) => {
        try {
            const searchUrl = `https://whatsgrouplink.com/?s=${encodeURIComponent(query)}`;
            const { data } = await axios.get(searchUrl, { timeout: 10000 });
            const $ = cheerio.load(data);
            const results = [];

            $("article").each((_, el) => {
                const title = $(el).find(".entry-title a").text().trim();
                const url = $(el).find(".entry-title a").attr("href");
                if (title && url) {
                    results.push({ title, url });
                }
            });
            return results;
        } catch (error) {
            return [];
        }
    },

    // Tahap 2: Ambil link WA dari dalam artikel
    fetchLinks: async (url) => {
        try {
            const { data } = await axios.get(url, { timeout: 10000 });
            const $ = cheerio.load(data);
            const groups = [];

            $("ul.wp-block-list li").each((_, el) => {
                const link = $(el).find('a[href*="chat.whatsapp.com"]');
                if (link.length) {
                    const href = link.attr("href");
                    const name = $(el).text().replace(/\s*-\s*Link$/, "").trim();
                    groups.push({ name: name || "Grup WhatsApp", link: href });
                }
            });
            return groups;
        } catch (error) {
            return null;
        }
    }
};

/**
 * EXPORT MODULE
 */
module.exports = {
    name: "WA Group Search",
    desc: "Cari dan ambil link grup WhatsApp berdasarkan kategori",
    category: "SEARCH",
    params: ["query"], // Bisa berupa keyword atau link artikel
    async run(req, res) {
        try {
            const { query } = req.query;

            if (!query) {
                return res.status(400).json({
                    status: false,
                    error: 'Masukkan keyword pencarian atau link artikel dari whatsgrouplink.com'
                });
            }

            // CEK: Apakah input berupa URL whatsgrouplink?
            if (query.includes('whatsgrouplink.com/')) {
                console.log(`Extracting group links from: ${query}`);
                const links = await waGroupScraper.fetchLinks(query);
                
                if (!links || links.length === 0) {
                    return res.status(404).json({ status: false, error: "Gagal mengambil link atau link tidak ditemukan." });
                }

                return res.status(200).json({
                    status: true,
                    creator: "shannz",
                    type: "links_list",
                    data: links
                });
            } 
            
            // JIKA BUKAN URL: Maka lakukan pencarian (Search)
            else {
                console.log(`Searching for WA groups with keyword: ${query}`);
                const searchResults = await waGroupScraper.search(query);

                if (searchResults.length === 0) {
                    return res.status(404).json({ status: false, error: "Grup tidak ditemukan." });
                }

                return res.status(200).json({
                    status: true,
                    creator: "shannz",
                    type: "article_list",
                    data: searchResults
                });
            }

        } catch (error) {
            res.status(500).json({
                status: false,
                creator: "shannz",
                error: error.message
            });
        }
    }
};
