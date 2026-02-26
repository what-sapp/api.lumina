const https = require("https");
const http = require("http");
const crypto = require("crypto");

/**
 * FLATAI IMAGE TO TEXT - Fitur ke-110
 * Deskripsi: Scan gambar jadi teks/prompt detail
 * Status: PRO (Multipart Scraper)
 * Creator: Xena
 */

// Konfigurasi Scrape Asli
const NONCE = "d7e4714e8c";
const COOKIE = "mg_track_id=998234cf4ba9fde6921d55b7a9a74557";

// Helper: Download gambar dari URL jadi Buffer
function urlToBuffer(url) {
    return new Promise((resolve, reject) => {
        const proto = url.startsWith("https") ? https : http;
        proto.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return urlToBuffer(res.headers.location).then(resolve).catch(reject);
            }
            const chunks = [];
            res.on("data", d => chunks.push(d));
            res.on("end", () => resolve(Buffer.concat(chunks)));
            res.on("error", reject);
        }).on("error", reject);
    });
}

module.exports = {
    name: "FlataiI2T",
    desc: "Scan gambar dan ubah jadi deskripsi teks/prompt AI detail.",
    category: "AI TOOLS",
    params: ["url"],

    async run(req, res) {
        const imageUrl = req.query.url;

        if (!imageUrl || !/^https?:\/\/.+/i.test(imageUrl)) {
            return res.status(400).json({ status: false, creator: "Xena", error: "Mana link gambarnya, Senior?" });
        }

        try {
            // 1. Download Gambar
            const fileBuffer = await urlToBuffer(imageUrl);
            const boundary = "----WebKitFormBoundary" + crypto.randomBytes(8).toString("hex").toUpperCase();

            // 2. Susun Multipart Form-Data (Wajib Presisi agar tidak Error)
            const partImage = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="xena_scan.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`);
            const partAction = Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="action"\r\n\r\nai_image_to_text\r\n`);
            const partNonce = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="nonce"\r\n\r\n${NONCE}\r\n`);
            const partEnd = Buffer.from(`--${boundary}--\r\n`);
            
            const body = Buffer.concat([partImage, fileBuffer, partAction, partNonce, partEnd]);

            // 3. Kirim ke Server Flatai
            const result = await new Promise((resolve, reject) => {
                const request = https.request({
                    hostname: "flatai.org",
                    path: "/wp-admin/admin-ajax.php",
                    method: "POST",
                    headers: {
                        "accept": "*/*",
                        "content-type": `multipart/form-data; boundary=${boundary}`,
                        "content-length": body.length,
                        "cookie": COOKIE,
                        "origin": "https://flatai.org",
                        "referer": "https://flatai.org/free-ai-image-to-text-prompt-no-registration/",
                        "user-agent": "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36..."
                    }
                }, (response) => {
                    let data = "";
                    response.on("data", d => data += d.toString());
                    response.on("end", () => {
                        try {
                            const json = JSON.parse(data);
                            if (json.success && json.data) resolve(json.data);
                            else reject(new Error(json.data || "Gagal scan gambar."));
                        } catch (e) {
                            reject(new Error("Response server ngaco, Senior."));
                        }
                    });
                });

                request.on("error", reject);
                request.write(body);
                request.end();
            });

            // 4. Sukses
            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    prompt: result,
                    image_size: `${(fileBuffer.length / 1024).toFixed(1)} KB`
                }
            });

        } catch (err) {
            res.status(500).json({ status: false, creator: "Xena", error: err.message });
        }
    }
};
