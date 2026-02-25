const https    = require("https");
const fs       = require("fs");
const path     = require("path");

/**
 * IMAGE TO PROMPT (API EDITION)
 * Status: GOD MODE - Fitur ke-94
 * Creator: Shannz x Xena
 * Function: Merubah gambar menjadi deskripsi prompt AI
 */
module.exports = {
    name: "Image to Prompt",
    desc: "Generate prompt dari gambar via imageprompt.org",
    category: "AI TOOLS",
    params: ["url", "lang"],

    async run(req, res) {
        const { url, lang = "id" } = req.query;
        if (!url) return res.status(400).json({ status: false, error: "Mana URL gambar-nya, Senior?" });

        // Nama file temp unik
        const tmpPath = path.join(__dirname, `../tmp/i2p_${Date.now()}.jpg`);

        try {
            // --- STEP 1: DOWNLOAD GAMBAR KE SERVER ---
            await new Promise((resolve, reject) => {
                const protocol = url.startsWith('https') ? https : require('http');
                protocol.get(url, (response) => {
                    if (response.statusCode !== 200) reject(new Error("Gagal download gambar!"));
                    const fileStream = fs.createWriteStream(tmpPath);
                    response.pipe(fileStream);
                    fileStream.on("finish", () => {
                        fileStream.close();
                        resolve();
                    });
                }).on("error", reject);
            });

            // --- STEP 2: CONVERT KE BASE64 (TEKNIK SHANNZ X XENA) ---
            const data = fs.readFileSync(tmpPath);
            const ext = path.extname(tmpPath).toLowerCase() || ".jpg";
            const mimeType = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" }[ext] || "image/jpeg";
            const base64Url = `data:${mimeType};base64,${data.toString("base64")}`;

            // --- STEP 3: TEMBAK API TARGET ---
            const body = JSON.stringify({ base64Url, imageModelId: 1, language: lang });
            const buf = Buffer.from(body);

            const result = await new Promise((resolve, reject) => {
                const request = https.request({
                    hostname: "imageprompt.org",
                    path: "/api/ai/prompts/image",
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                        "content-length": buf.length,
                        "cookie": "_ga=GA1.1.100439322.1772019339; _ga_5BZKBZ4NTB=GS2.1.s1772019339$o1$g1$t1772019384$j15$l0$h0",
                        "user-agent": "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 Chrome/107.0.0.0 Mobile Safari/537.36",
                    },
                }, (response) => {
                    let raw = "";
                    response.on("data", d => raw += d.toString());
                    response.on("end", () => {
                        try {
                            const json = JSON.parse(raw);
                            resolve(json?.prompt || json?.result || json?.data?.prompt || raw);
                        } catch { resolve(raw); }
                    });
                });
                request.on("error", reject);
                request.write(buf);
                request.end();
            });

            // Hapus temp
            if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);

            res.status(200).json({
                status: true,
                creator: "Shannz x Xena",
                result: result
            });

        } catch (e) {
            if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
