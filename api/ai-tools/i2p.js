const axios = require("axios");

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         IMAGE TO PROMPT — imageprompt.org                   ║
 * ║                 Creator: Shannz x Xena                      ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  USAGE CLI:                                                  ║
 * ║  node img2prompt.js "https://example.com/image.jpg"         ║
 * ║  node img2prompt.js "https://example.com/image.jpg" en      ║
 * ║  node img2prompt.js foto.jpg                                 ║
 * ║                                                              ║
 * ║  API PARAMS:                                                 ║
 * ║  url    → URL gambar (wajib)                                 ║
 * ║  lang   → Bahasa output: id (default), en, dll              ║
 * ║                                                              ║
 * ║  INSTALL: npm install axios                                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const COOKIE = "_ga=GA1.1.100439322.1772019339; __gads=ID=ffafd6279c185292:T=1772019342:RT=1772019342:S=ALNI_MaG4xEjGnKpPb1X33zc_fN8KXrMSw; __gpi=UID=0000120a7e67964a:T=1772019342:RT=1772019342:S=ALNI_MY7GqQl9FQkI6oHtVB-9m-GjmN2iQ; __eoi=ID=49f3700f3b0e45a3:T=1772019342:RT=1772019342:S=AA-Afjafemhk1gjV3-YiqBEXH_W_; _ga_5BZKBZ4NTB=GS2.1.s1772019339$o1$g1$t1772019384$j15$l0$h0";

const MIME_MAP = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".png": "image/png",  ".webp": "image/webp", ".gif": "image/gif"
};

// ─── GET IMAGE AS BASE64 (URL atau file lokal) ────────────────────────────────

async function getBase64(input) {
    let buffer, ext;

    if (/^https?:\/\//i.test(input)) {
        const res = await axios.get(input, { responseType: "arraybuffer" });
        buffer = Buffer.from(res.data);
        ext    = "." + (input.split(".").pop().split("?")[0].toLowerCase() || "jpg");
    } else {
        const fs = require("fs"), path = require("path");
        buffer = fs.readFileSync(input);
        ext    = require("path").extname(input).toLowerCase();
    }

    const mime = MIME_MAP[ext] || "image/jpeg";
    return `data:${mime};base64,${buffer.toString("base64")}`;
}

// ─── CORE ─────────────────────────────────────────────────────────────────────

async function getPrompt(input, language = "id") {
    const base64Url = await getBase64(input);

    const { data } = await axios.post("https://imageprompt.org/api/ai/prompts/image", {
        base64Url,
        imageModelId: 1,
        language,
    }, {
        headers: {
            "accept":          "*/*",
            "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            "content-type":    "application/json",
            "cookie":          COOKIE,
            "origin":          "https://imageprompt.org",
            "referer":         "https://imageprompt.org/image-to-prompt",
            "user-agent":      "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 Chrome/107.0.0.0 Mobile Safari/537.36",
            "sec-fetch-dest":  "empty",
            "sec-fetch-mode":  "cors",
            "sec-fetch-site":  "same-origin",
        },
    });

    const prompt = data?.prompt || data?.result || data?.text
                || data?.data?.prompt || data?.description;

    if (!prompt) throw new Error("Prompt tidak ditemukan: " + JSON.stringify(data).slice(0, 200));
    return prompt;
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

if (require.main === module) {
    const [,, input, lang = "id"] = process.argv;
    if (!input) {
        console.log("Usage:");
        console.log('  node img2prompt.js "https://example.com/image.jpg"');
        console.log('  node img2prompt.js "https://example.com/image.jpg" en');
        console.log("  node img2prompt.js foto.jpg");
        process.exit(1);
    }
    getPrompt(input, lang)
        .then(p  => console.log("✅ Prompt:\n" + p))
        .catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
} else {
    module.exports = {
        name:     "Image to Prompt",
        desc:     "Generate prompt dari gambar.",
        category: "AI TOOLS",
        params:   ["url", "lang"],
        async run(req, res) {
            try {
                const { url, lang = "id" } = req.query;
                if (!url) return res.status(400).json({
                    status: false,
                    error: 'Parameter "url" wajib diisi!'
                });

                const prompt = await getPrompt(url, lang);
                return res.status(200).json({
                    status: true,
                    creator: "Shannz x Xena",
                    result: prompt
                });
            } catch (e) {
                return res.status(500).json({ status: false, error: e.message });
            }
        }
    };
}
