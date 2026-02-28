const axios = require("axios");
const FormData = require("form-data");

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         REMOVE BACKGROUND — image-upscaling.net             ║
 * ║                 Creator: Shannz x Xena                      ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  FLOW:                                                       ║
 * ║  1. Catat processed URLs sebelum upload                      ║
 * ║  2. Upload image                                             ║
 * ║  3. Poll status sampai ada URL baru di processed             ║
 * ║  4. Return output URL                                        ║
 * ║                                                              ║
 * ║  USAGE CLI:                                                  ║
 * ║  node removebg.js "https://example.com/foto.jpg"             ║
 * ║  node removebg.js foto.jpg                                   ║
 * ║                                                              ║
 * ║  API PARAMS:                                                 ║
 * ║  url → URL gambar (wajib)                                    ║
 * ║                                                              ║
 * ║  INSTALL: npm install axios form-data                        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const COOKIE = "client_id=a44897819b07f7a4e5d840519d012cd5; _ga=GA1.1.765669889.1771998496; _ga_1BQ6K7MGR3=GS2.1.s1771998496$o1$g1$t1771998748$j60$l0$h0";

const BASE_HEADERS = {
    "accept":             "*/*",
    "accept-language":    "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "sec-ch-ua":          '"Chromium";v="107", "Not=A?Brand";v="24"',
    "sec-ch-ua-mobile":   "?1",
    "sec-ch-ua-platform": '"Android"',
    "sec-fetch-dest":     "empty",
    "sec-fetch-mode":     "cors",
    "sec-fetch-site":     "same-origin",
    "cookie":             COOKIE,
    "referer":            "https://image-upscaling.net/removebg/en.html",
    "user-agent":         "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 Chrome/107.0.0.0 Mobile Safari/537.36",
};

const MIME_MAP = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".png": "image/png",  ".webp": "image/webp"
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── GET IMAGE BUFFER ─────────────────────────────────────────────────────────

async function getImageBuffer(input) {
    if (/^https?:\/\//i.test(input)) {
        const res = await axios.get(input, { responseType: "arraybuffer" });
        const ext = "." + (input.split(".").pop().split("?")[0].toLowerCase() || "jpg");
        return { buffer: Buffer.from(res.data), fileName: `image${ext}`, mime: MIME_MAP[ext] || "image/jpeg" };
    } else {
        const fs   = require("fs");
        const path = require("path");
        const ext  = path.extname(input).toLowerCase();
        return { buffer: fs.readFileSync(input), fileName: path.basename(input), mime: MIME_MAP[ext] || "image/jpeg" };
    }
}

// ─── GET STATUS ───────────────────────────────────────────────────────────────

async function getStatus() {
    try {
        const { data } = await axios.get("https://image-upscaling.net/removebg_get_status", { headers: BASE_HEADERS });
        return data;
    } catch { return null; }
}

// ─── UPLOAD ───────────────────────────────────────────────────────────────────

async function uploadImage(buffer, fileName, mime) {
    const form = new FormData();
    form.append("image", buffer, { filename: fileName, contentType: mime });

    await axios.post("https://image-upscaling.net/removebg_upload", form, {
        headers: { ...BASE_HEADERS, ...form.getHeaders() },
        maxBodyLength: Infinity,
    });
}

// ─── CORE ─────────────────────────────────────────────────────────────────────

async function removeBg(input) {
    const { buffer, fileName, mime } = await getImageBuffer(input);

    // Catat URL processed sebelum upload
    const before     = await getStatus();
    const urlsBefore = new Set(before?.processed || []);

    // Upload
    await uploadImage(buffer, fileName, mime);

    // Poll sampai ada URL baru
    for (let i = 0; i < 25; i++) {
        await sleep(2000);
        const data      = await getStatus();
        const processed = data?.processed || [];
        const newUrls   = processed.filter(u => !urlsBefore.has(u));
        if (newUrls.length > 0) return newUrls[0];
    }

    throw new Error("Timeout menunggu hasil remove background");
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

if (require.main === module) {
    const [,, input] = process.argv;
    if (!input) {
        console.log("Usage:");
        console.log('  node removebg.js "https://example.com/foto.jpg"');
        console.log("  node removebg.js foto.jpg");
        process.exit(1);
    }
    removeBg(input)
        .then(url => console.log("✅ Output URL:", url))
        .catch(e  => { console.error("❌ Error:", e.message); process.exit(1); });
} else {
    module.exports = {
        name:     "Remove Background V5",
        desc:     "Hapus background gambar otomatis via image-upscaling.net — gratis tanpa login.",
        category: "AI TOOLS",
        params:   ["url"],
        async run(req, res) {
            try {
                const { url } = req.query;
                if (!url) return res.status(400).json({
                    status: false,
                    error: 'Parameter "url" wajib diisi!'
                });

                const outputUrl = await removeBg(url);
                return res.status(200).json({
                    status: true,
                    creator: "Shannz x Xena",
                    result: { output_url: outputUrl }
                });
            } catch (e) {
                return res.status(500).json({ status: false, error: e.message });
            }
        }
    };
}
