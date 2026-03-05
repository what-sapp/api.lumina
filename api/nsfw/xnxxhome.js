const axios = require('axios');
const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });

/**
 * XNXX HOME - Categories
 * Creator: Shannz
 */
module.exports = {
    name: "XNXXHome",
    desc: "Mendapatkan daftar kategori dari halaman utama XNXX.",
    category: "NSFW",
    params: [],

    async run(req, res) {
        try {
            const { data: html } = await axios.get('https://www.xnxx.com/', {
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

            // HTML-nya ada di dalam JS string yg sudah di-escape
            // Pattern: xv.cats.write_thumb_block_list([...])
            // Tapi karena ada di dalam string JS, quote-nya jadi \"
            const idx = html.indexOf('write_thumb_block_list(');
            if (idx === -1) {
                return res.status(404).json({
                    status: false,
                    creator: "Shannz",
                    error: "Pattern tidak ditemukan di halaman."
                });
            }

            // Ambil dari [ sampai ]) — cari bracket matching
            const start = html.indexOf('[', idx);
            let depth = 0, end = -1;
            for (let i = start; i < html.length; i++) {
                if (html[i] === '[') depth++;
                else if (html[i] === ']') {
                    depth--;
                    if (depth === 0) { end = i + 1; break; }
                }
            }

            if (end === -1) {
                return res.status(404).json({
                    status: false,
                    creator: "Shannz",
                    error: "Gagal parse bracket JSON."
                });
            }

            // Unescape — balik \" → " dan \/ → /
            let raw = html.slice(start, end)
                .replace(/\\"/g, '"')
                .replace(/\\\//g, '/');

            const items = JSON.parse(raw);
            const results = items
                .filter(item => item.u && item.t)
                .map(item => ({
                    title: (item.tf || item.t)
                        .replace(/&#039;/g, "'")
                        .replace(/&amp;/g, '&'),
                    url:   item.u.startsWith('http')
                                ? item.u
                                : `https://www.xnxx.com${item.u}`,
                    thumb: item.i || '',
                    count: item.n || 0,
                    type:  item.ty || 'category',
                    id:    item.id || null,
                }));

            if (results.length === 0) {
                return res.status(404).json({
                    status: false,
                    creator: "Shannz",
                    error: "Data kosong."
                });
            }

            res.status(200).json({
                status: true,
                creator: "Shannz",
                total: results.length,
                result: results
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

