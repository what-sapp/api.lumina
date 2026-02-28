const https = require("https");
const zlib = require("zlib");

module.exports = {
    name: "HitomiDetail",
    desc: "Ambil detail gallery dari Hitomi.moe berdasarkan ID.",
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

        const parseDetail = (html) => {
            const detail = { id };

            const titleM = html.match(/<title>([^<]+)<\/title>/);
            detail.title = titleM ? titleM[1].replace(" - Hitomi.moe", "").trim() : "";

            const mediaM = html.match(/zrocdn\.xyz\/galleries\/(\d+)/);
            detail.mediaId = mediaM ? mediaM[1] : null;

            const pageNums = [];
            const pageRe = /\/g\/\d+\/(\d+)\//g;
            let m;
            while ((m = pageRe.exec(html)) !== null) pageNums.push(parseInt(m[1]));
            detail.numPages = pageNums.length ? Math.max(...pageNums) : 0;

            const extract = (re) => {
                const results = [];
                let match;
                while ((match = re.exec(html)) !== null) results.push(match[1].trim());
                return [...new Set(results)];
            };

            detail.artists    = extract(/href="\/artist\/[^"]+\/">([^<]+)</g);
            detail.tags       = extract(/href="\/tag\/[^"]+\/">([^<]+)</g);
            detail.characters = extract(/href="\/character\/[^"]+\/">([^<]+)</g);
            detail.parodies   = extract(/href="\/parody\/[^"]+\/">([^<]+)</g);
            detail.groups     = extract(/href="\/group\/[^"]+\/">([^<]+)</g);

            const langM = html.match(/href="\/language\/[^"]+\/">([^<]+)</);
            detail.language = langM ? langM[1].trim() : "";

            const typeM = html.match(/href="\/type\/[^"]+\/">([^<]+)</);
            detail.type = typeM ? typeM[1].trim() : "";

            detail.cover   = detail.mediaId ? `https://${CDN}/galleries/${detail.mediaId}/cover.jpg` : null;
            detail.readUrl = `https://hitomi.moe/g/${id}/1/`;

            return detail;
        };

        try {
            const html = await fetchUrl(`https://hitomi.moe/g/${id}/`);
            const detail = parseDetail(html);
            res.status(200).json({ status: true, creator: "Xena", result: detail });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
