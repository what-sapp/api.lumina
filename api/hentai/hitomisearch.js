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
        const CDN = "zrocdn.xyz";

        const fetchUrl = (url) => new Promise((resolve, reject) => {
            https.get(url, { headers: { "user-agent": UA, "accept-encoding": "gzip, deflate, br", "referer": "https://hitomi.moe/" } }, (response) => {
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
            const cards = html.match(/gallery-content[\s\S]*?(?=gallery-content|$)/g) || [];
            const galleries = [];
            const seenIds = new Set();
            for (const card of cards) {
                const id = (card.match(/href="\/g\/(\d+)\/"/) || [])[1];
                if (!id || seenIds.has(id)) continue;
                seenIds.add(id);
                const mediaId = (card.match(/zrocdn\.xyz\/galleries\/(\d+)\/thumb/) || [])[1];
                const title = (card.match(/class="lillie"><a[^>]+>([^<]+)<\/a><\/h1>/) || [])[1] || "";
                const artists = [...card.matchAll(/href="\/artist\/[^"]+\/">([^<]+)</g)].map(m => m[1].trim());
                const series = (card.match(/class="series-list">[\s\S]*?<a[^>]+>([^<]+)<\/a>/) || [])[1] || null;
                const language = (card.match(/href="\/language\/[^"]+\/">([^<]+)</) || [])[1] || "";
                const tags = [...card.matchAll(/href="\/tag\/[^"]+\/">([^<]+)</g)].map(m => m[1].trim());
                const date = (card.match(/class="dj-date date">([^<]+)</) || [])[1] || "";
                galleries.push({
                    id, title, artists, series, language, tags, date,
                    mediaId: mediaId || null,
                    thumb: mediaId ? `https://${CDN}/galleries/${mediaId}/thumb.webp` : null,
                    cover: mediaId ? `https://${CDN}/galleries/${mediaId}/cover.jpg` : null,
                    url: `https://hitomi.moe/g/${id}/`
                });
            }
            return galleries;
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
            const galleries = parseGalleries(html);
            const maxPage = parseMaxPage(html);
            res.status(200).json({ status: true, creator: "Xena", query, page: parseInt(page), maxPage, total: galleries.length, result: galleries });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
