const https = require("https");
const zlib = require("zlib");

module.exports = {
    name: "HitomiRandom",
    desc: "Ambil gallery random dari Hitomi.moe.",
    category: "Hentai",
    params: [],

    async run(req, res) {
        const UA = "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36";
        const CDN = "zrocdn.xyz";

        const fetchUrl = (url) => new Promise((resolve, reject) => {
            const parsed = new URL(url);
            https.get({
                hostname: parsed.hostname,
                path: parsed.pathname + parsed.search,
                headers: { "user-agent": UA, "accept-encoding": "gzip, deflate, br", "referer": "https://hitomi.moe/" }
            }, (response) => {
                if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    const loc = response.headers.location.startsWith("http")
                        ? response.headers.location
                        : "https://hitomi.moe" + response.headers.location;
                    return resolve(fetchUrl(loc));
                }
                let stream = response;
                const enc = (response.headers["content-encoding"] || "").toLowerCase();
                if (enc === "br") stream = response.pipe(zlib.createBrotliDecompress());
                else if (enc === "gzip") stream = response.pipe(zlib.createGunzip());
                let data = "";
                stream.on("data", d => data += d);
                stream.on("end", () => resolve({ body: data, finalUrl: url }));
                stream.on("error", reject);
            }).on("error", reject);
        });

        const parseDetail = (html, id) => {
            const titleM = html.match(/<title>([^<]+)<\/title>/);
            const title = titleM ? titleM[1].replace(" - Hitomi.moe", "").trim() : "";

            const mediaM = html.match(/zrocdn\.xyz\/galleries\/(\d+)/);
            const mediaId = mediaM ? mediaM[1] : null;

            const pageNums = [];
            const pageRe = /\/g\/\d+\/(\d+)\//g;
            let m;
            while ((m = pageRe.exec(html)) !== null) pageNums.push(parseInt(m[1]));
            const numPages = pageNums.length ? Math.max(...pageNums) : 0;

            const extract = (re) => {
                const results = [];
                let match;
                while ((match = re.exec(html)) !== null) results.push(match[1].trim());
                return [...new Set(results)];
            };

            const artists    = extract(/href="\/artist\/[^"]+\/">([^<]+)</g);
            const tags       = extract(/href="\/tag\/[^"]+\/">([^<]+)</g);
            const characters = extract(/href="\/character\/[^"]+\/">([^<]+)</g);
            const parodies   = extract(/href="\/parody\/[^"]+\/">([^<]+)</g);
            const groups     = extract(/href="\/group\/[^"]+\/">([^<]+)</g);

            const langM = html.match(/href="\/language\/[^"]+\/">([^<]+)</);
            const language = langM ? langM[1].trim() : "";

            const typeM = html.match(/href="\/type\/[^"]+\/">([^<]+)</);
            const type = typeM ? typeM[1].trim() : "";

            return {
                id, title, artists, groups, characters, parodies,
                language, type, tags, numPages,
                mediaId,
                cover: mediaId ? `https://${CDN}/galleries/${mediaId}/cover.jpg` : null,
                thumb: mediaId ? `https://${CDN}/galleries/${mediaId}/thumb.webp` : null,
                url: `https://hitomi.moe/g/${id}/`
            };
        };

        try {
            const result = await fetchUrl("https://hitomi.moe/random");
            const idM = result.finalUrl.match(/\/g\/(\d+)/);
            const id = idM ? idM[1] : null;
            if (!id) return res.status(500).json({ status: false, error: "Gagal mendapatkan gallery random." });

            const detail = parseDetail(result.body, id);
            res.status(200).json({ status: true, creator: "Xena", result: detail });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
