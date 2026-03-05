const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });

/**
 * XNXX TAGS
 * Scrape daftar tag dari XNXX
 * Creator: Shannz
 */
module.exports = {
    name: "XNXXTags",
    desc: "Mendapatkan daftar tag XNXX. Parameter 'letter' opsional (a-z). Tanpa letter = semua huruf.",
    category: "NSFW",
    params: ["letter"],

    async run(req, res) {
        try {
            const { letter } = req.query;

            // Validasi letter
            let fetchUrl = 'https://www.xnxx.com/tags';
            if (letter) {
                const l = letter.trim().toLowerCase();
                if (!/^[a-z]$/.test(l)) {
                    return res.status(400).json({
                        status: false,
                        creator: "Shannz",
                        error: "Parameter 'letter' harus satu huruf a-z. Contoh: ?letter=a"
                    });
                }
                fetchUrl = `https://www.xnxx.com/tags/${l}`;
            }

            const { data: html } = await axios.get(fetchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Referer': 'https://www.xnxx.com/',
                },
                timeout: 20000,
                decompress: true,
                httpsAgent: agent,
            });

            const $ = cheerio.load(html);
            const results = [];

            // Pattern: <a href="/search/xxx">tag name</a><strong>count</strong>
            $('a[href^="/search/"]').each((_, el) => {
                const $el    = $(el);
                const href   = $el.attr('href') || '';
                const name   = $el.text().trim();
                const count  = $el.next('strong').text().trim();

                if (!name || !href) return;

                results.push({
                    tag:    name,
                    url:    `https://www.xnxx.com${href}`,
                    count:  count || '0',
                });
            });

            // Ambil daftar huruf yang tersedia
            const letters = [];
            $('a[href^="/tags/"]').each((_, el) => {
                const href = $(el).attr('href') || '';
                const l    = href.replace('/tags/', '').trim();
                if (/^[a-z]$/.test(l)) letters.push(l);
            });

            if (results.length === 0) {
                return res.status(404).json({
                    status: false,
                    creator: "Shannz",
                    error: "Tidak ada tag ditemukan."
                });
            }

            res.status(200).json({
                status: true,
                creator: "Shannz",
                letter: letter?.toLowerCase() || 'all',
                total: results.length,
                availableLetters: [...new Set(letters)].sort(),
                result: results,
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                creator: "Shannz",
                error: error.message
            });
        }
    }
};

