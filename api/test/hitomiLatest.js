const https = require("https");
const zlib = require("zlib");

module.exports = {
    name: "HitomiLatest",
    desc: "Ambil daftar ID gallery terbaru dari Hitomi.",
    category: "Hentai",
    params: ["page"],

    async run(req, res) {
        const page = req.query.page || 1;
        const UA = "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36";

        const request = (url) => new Promise((resolve, reject) => {
            const req = https.get(url, { headers: { "user-agent": UA, "accept-encoding": "gzip, deflate, br", "referer": "https://hitomi.moe/" }}, (res) => {
                let stream = res;
                if (res.headers["content-encoding"] === "br") stream = res.pipe(zlib.createBrotliDecompress());
                else if (res.headers["content-encoding"] === "gzip") stream = res.pipe(zlib.createGunzip());
                let data = "";
                stream.on("data", d => data += d);
                stream.on("end", () => resolve(data));
            });
            req.on("error", reject);
        });

        try {
            const html = await request(`https://hitomi.moe/?page=${page}`);
            const ids = [...new Set(html.match(/href="\/g\/(\d+)\/"/g))].map(v => v.match(/\d+/)[0]);
            res.status(200).json({ status: true, creator: "Xena", result: ids });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
