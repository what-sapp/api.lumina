const https = require("https");
const zlib = require("zlib");

module.exports = {
    name: "HitomiBrowse",
    desc: "Browse tags, artists, characters, parodies, atau groups dari Hitomi.moe.",
    category: "Hentai",
    params: ["type", "page"],

    async run(req, res) {
        const type = req.query.type;
        const page = req.query.page || "a";
        const validTypes = ["tags", "artists", "characters", "parodies", "groups"];

        if (!type) return res.status(400).json({ status: false, error: "Parameter 'type' diperlukan." });
        if (!validTypes.includes(type)) return res.status(400).json({ status: false, error: `Type tidak valid. Pilih: ${validTypes.join(", ")}` });

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

        const parseList = (html, type) => {
            const items = [];
            const typeMap = {
                tags: "tag",
                artists: "artist",
                characters: "character",
                parodies: "parody",
                groups: "group"
            };
            const slug = typeMap[type];
            const re = new RegExp(`href="\\/${slug}\\/([^"]+)\\/">([^<]+)<`, "g");
            let m;
            while ((m = re.exec(html)) !== null) {
                items.push({ slug: m[1], name: m[2].trim() });
            }
            return items;
        };

        try {
            const html = await fetchUrl(`https://hitomi.moe/${type}?page=${page}`);
            const items = parseList(html, type);
            res.status(200).json({
                status: true,
                creator: "Xena",
                type,
                page,
                total: items.length,
                result: items
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};

