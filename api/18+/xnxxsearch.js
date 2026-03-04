const axios = require('axios');

/**
 * XNXX SEARCH
 * Source: api.deline.web.id
 * Creator: Shannz
 */
module.exports = {
    name: "XNXXSearch",
    desc: "Cari video di XNXX berdasarkan keyword.",
    category: "18+",
    params: ["q"],

    async run(req, res) {
        try {
            const { q } = req.query;

            if (!q || !q.trim()) {
                return res.status(400).json({
                    status: false,
                    creator: "Shannz",
                    error: "Parameter 'q' wajib diisi. Contoh: ?q=anime"
                });
            }

            const UA = 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36';

            const response = await axios.get('https://api.deline.web.id/search/xnxx', {
                params: { q: q.trim() },
                headers: {
                    'User-Agent': UA,
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
                    'Referer': 'https://api.deline.web.id/',
                    'Origin': 'https://api.deline.web.id',
                    'sec-ch-ua': '"Chromium";v="107", "Not=A?Brand";v="24"',
                    'sec-ch-ua-mobile': '?1',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin',
                },
                timeout: 15000,
                responseType: 'text'
            });

            const raw = response.data;

            // Kena block / return HTML
            if (typeof raw === 'string' && raw.trim().startsWith('<')) {
                return res.status(502).json({
                    status: false,
                    creator: "Shannz",
                    error: "Source API mengembalikan HTML, kemungkinan kena rate limit atau block."
                });
            }

            let data;
            try {
                data = typeof raw === 'string' ? JSON.parse(raw) : raw;
            } catch (e) {
                return res.status(502).json({
                    status: false,
                    creator: "Shannz",
                    error: "Gagal parse response dari source API."
                });
            }

            if (!data || !data.status || !data.result || data.result.length === 0) {
                return res.status(404).json({
                    status: false,
                    creator: "Shannz",
                    error: "Hasil pencarian tidak ditemukan."
                });
            }

            res.status(200).json({
                status: true,
                creator: "Shannz",
                query: q.trim(),
                total: data.result.length,
                result: data.result.map(item => ({
                    title: item.title || "",
                    info: item.info || "",
                    link: item.link || ""
                }))
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
