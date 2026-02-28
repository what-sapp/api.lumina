const https = require("https");
const zlib = require("zlib");

module.exports = {
    name: "HitomiSearch",
    desc: "Cari gallery di Hitomi.moe berdasarkan keyword.",
    category: "Hentai",
    params: ["query", "page"],

    async run(req, res) {
        const query = req.query.query;
        const page = req.query.page || 1;

        if (!query) return res.status(400).json({ status: false, error: "Parameter 'query' diperlukan." });

        const UA = "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36";

        const fetchUrl = (url) => new Promise((resolve, reject) => {
            https.get(url, {
                headers: {
                    "user-agent": UA,
                    "accept-encoding": "gzip, deflate, br",
                    "referer": "https://hitomi.moe/"
                }
            }, (response) => {
                let stream = response;
                const enc = (response.headers["content-encoding"] || "").toLowerCase();
                if (enc === "br") stream = response.pipe(zlib.createBrotliDecompress());
                else if (enc === "gzip") stream = response.pipe(zlib.createGunzip());
                let data = "";
                stream.on("data", d => data += d);
                stream.on("end", () => resolve(data));
                stream.on("error", reject);
            }).on("error", reject);
        });

        const parseGalleries = (html) => {
            const seen = new Set();
            const ids = [];
            const re = /href="\/g\/(\d+)\/"/g;
            let m;
            while ((m = re.exec(html)) !== null) {
                if (!seen.has(m[1])) { seen.add(m[1]); ids.push(m[1]); }
            }
            return ids;
        };

        const parseMaxPage = (html) => {
            const matches = html.match(/[?&]page=(\d+)/g) || [];
            let max = 1;
            for (const m of matches) {
                const n = parseInt(m.replace(/[?&]page=/, ""));
                if (n > max) max = n;
            }
            return max;
        };

        try {
            const html = await fetchUrl(`https://hitomi.moe/search/?q=${encodeURIComponent(query)}&page=${page}`);
            const ids = parseGalleries(html);
            const maxPage = parseMaxPage(html);
            res.status(200).json({
                status: true,
                creator: "Xena",
                query,
                page: parseInt(page),
                maxPage,
                total: ids.length,
                result: ids
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
