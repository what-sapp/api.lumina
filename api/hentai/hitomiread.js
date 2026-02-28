const https = require("https");
const zlib = require("zlib");

module.exports = {
    name: "HitomiRead",
    desc: "Ambil semua image URL dari gallery Hitomi.moe berdasarkan ID.",
    category: "Hentai",
    params: ["id"],

    async run(req, res) {
        const id = req.query.id;
        if (!id) return res.status(400).json({ status: false, error: "Parameter 'id' diperlukan." });

        const UA = "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36";
        const CDN = "zrocdn.xyz";

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

        const detectFormat = (mediaId) => new Promise((resolve) => {
            https.request({
                hostname: CDN,
                path: `/galleries/${mediaId}/1.webp`,
                method: "HEAD",
                headers: { "referer": "https://hitomi.moe/", "user-agent": UA }
            }, (response) => {
                const ct = response.headers["content-type"] || "";
                resolve(ct.includes("image") ? "webp" : "jpg");
            }).on("error", () => resolve("jpg"))
              .setTimeout(5000, function() { this.destroy(); resolve("jpg"); })
              .end();
        });

        try {
            const html = await fetchUrl(`https://hitomi.moe/g/${id}/`);

            const titleM = html.match(/<title>([^<]+)<\/title>/);
            const title = titleM ? titleM[1].replace(" - Hitomi.moe", "").trim() : "";

            const mediaM = html.match(/zrocdn\.xyz\/galleries\/(\d+)/);
            const mediaId = mediaM ? mediaM[1] : null;
            if (!mediaId) return res.status(500).json({ status: false, error: "Media ID tidak ditemukan." });

            const pageNums = [];
            const pageRe = /\/g\/\d+\/(\d+)\//g;
            let m;
            while ((m = pageRe.exec(html)) !== null) pageNums.push(parseInt(m[1]));
            const numPages = pageNums.length ? Math.max(...pageNums) : 0;

            const fmt = await detectFormat(mediaId);
            const pages = [];
            for (let i = 1; i <= numPages; i++) {
                pages.push({
                    page: i,
                    image: `https://${CDN}/galleries/${mediaId}/${i}.${fmt}`,
                    thumb: `https://${CDN}/galleries/${mediaId}/${i}t.jpg`
                });
            }

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    id,
                    title,
                    mediaId,
                    numPages,
                    format: fmt,
                    cover: `https://${CDN}/galleries/${mediaId}/cover.jpg`,
                    pages
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};

