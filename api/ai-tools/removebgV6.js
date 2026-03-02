const axios = require("axios");
const FormData = require("form-data");

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         REMOVE BACKGROUND — removal.ai                      ║
 * ║                 Creator: Shannz x Xena                      ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  USAGE CLI:                                                  ║
 * ║  node removalbg.js "https://example.com/foto.jpg"            ║
 * ║  node removalbg.js foto.jpg                                  ║
 * ║                                                              ║
 * ║  API PARAMS:                                                 ║
 * ║  url → URL gambar (wajib)                                    ║
 * ║                                                              ║
 * ║  INSTALL: npm install axios form-data                        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const UA = "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 Chrome/107.0.0.0 Mobile Safari/537.36";

// ─── GET SECURITY TOKEN + COOKIE ─────────────────────────────────────────────

async function getSecurityAndCookie() {
    const res = await axios.get("https://removal.ai/upload/", {
        headers: {
            "accept":          "text/html,*/*",
            "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            "user-agent":      UA,
        },
    });

    // Ambil semua hex token 10 karakter, pakai yang ke-2 (index 1)
    const all = [...new Set([...res.data.matchAll(/["']([a-f0-9]{10})["\']/g)].map(m => m[1]))];
    const security = all[1] || all[0];
    if (!security) throw new Error("Security token tidak ditemukan di HTML");

    // Ambil cookie dari response
    const cookies = (res.headers["set-cookie"] || []).map(c => c.split(";")[0]).join("; ");
    return { security, cookies };
}

// ─── GET WEB TOKEN ───────────────────────────────────────────────────────────

async function getWebToken() {
    const { security, cookies } = await getSecurityAndCookie();

    const { data } = await axios.get(`https://removal.ai/wp-admin/admin-ajax.php?action=ajax_get_webtoken&security=${security}`, {
        headers: {
            "accept":             "*/*",
            "accept-language":    "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            "sec-fetch-dest":     "empty",
            "sec-fetch-mode":     "cors",
            "sec-fetch-site":     "same-origin",
            "x-requested-with":   "XMLHttpRequest",
            "cookie":             cookies,
            "Referer":            "https://removal.ai/upload/",
            "user-agent":         UA,
        },
    });

    const token = data?.data?.webtoken;
    if (!token) throw new Error("Gagal dapat web token: " + JSON.stringify(data));
    return { token, cookies };
}

// ─── GET IMAGE BUFFER ─────────────────────────────────────────────────────────

async function getImageBuffer(input) {
    if (/^https?:\/\//i.test(input)) {
        const res = await axios.get(input, { responseType: "arraybuffer" });
        const ext = input.split(".").pop().split("?")[0].toLowerCase() || "jpg";
        return { buffer: Buffer.from(res.data), fileName: `image.${ext}` };
    } else {
        const fs   = require("fs");
        const path = require("path");
        return { buffer: fs.readFileSync(input), fileName: path.basename(input) };
    }
}

// ─── CORE ─────────────────────────────────────────────────────────────────────

async function removeBg(input) {
    const [{ buffer, fileName }, { token, cookies }] = await Promise.all([
        getImageBuffer(input),
        getWebToken(),
    ]);

    const form = new FormData();
    form.append("image_file", buffer, { filename: fileName, contentType: "image/jpeg" });

    const { data } = await axios.post("https://api.removal.ai/3.0/remove", form, {
        headers: {
            ...form.getHeaders(),
            "accept":           "*/*",
            "accept-language":  "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            "sec-ch-ua":        '"Chromium";v="107", "Not=A?Brand";v="24"',
            "sec-ch-ua-mobile": "?1",
            "sec-fetch-dest":   "empty",
            "sec-fetch-mode":   "cors",
            "sec-fetch-site":   "same-site",
            "web-token":        token,
            "cookie":           cookies,
            "user-agent":       UA,
        },
        maxBodyLength: Infinity,
    });

    if (data?.status !== 200) throw new Error("Gagal: " + JSON.stringify(data));

    return {
        preview_url:  data.preview_demo || data.low_resolution || data.url,
        original_url: data.original,
        width:        data.original_width,
        height:       data.original_height,
    };
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

if (require.main === module) {
    const [,, input] = process.argv;
    if (!input) {
        console.log("Usage:");
        console.log('  node removalbg.js "https://example.com/foto.jpg"');
        console.log("  node removalbg.js foto.jpg");
        process.exit(1);
    }
    removeBg(input)
        .then(r  => console.log("✅ Result:", JSON.stringify(r, null, 2)))
        .catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
} else {
    module.exports = {
        name:     "Remove Background V6",
        desc:     "Hapus background gambar menggunakan removal.ai — gratis tanpa login.",
        category: "AI TOOLS",
        params:   ["url"],
        async run(req, res) {
            try {
                const { url } = req.query;
                if (!url) return res.status(400).json({
                    status: false,
                    error: 'Parameter "url" wajib diisi!'
                });

                const result = await removeBg(url);
                return res.status(200).json({
                    status: true,
                    creator: "Shannz x Xena",
                    result
                });
            } catch (e) {
                return res.status(500).json({ status: false, error: e.message });
            }
        }
    };
}
