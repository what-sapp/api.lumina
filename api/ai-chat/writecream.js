const axios = require("axios");
const FormData = require("form-data");

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         AI CHAT — writecream.com                            ║
 * ║                 Creator: Shannz x Xena                      ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  USAGE CLI:                                                  ║
 * ║  node writecream.js "Halo, apa kabar?"                       ║
 * ║                                                              ║
 * ║  API PARAMS:                                                 ║
 * ║  prompt  → pesan user (wajib)                                ║
 * ║  _system → system prompt (opsional)                          ║
 * ║                                                              ║
 * ║  INSTALL: npm install axios form-data                        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ─── CORE ─────────────────────────────────────────────────────────────────────

async function chat(prompt, system = "You are helpful") {
    const messages = [
        { role: "system",  content: system },
        { role: "user",    content: prompt },
    ];

    const form = new FormData();
    form.append("action", "generate_chat");
    form.append("query",  JSON.stringify(messages));
    form.append("link",   "writecream.com");

    const { data } = await axios.post("https://www.writecream.com/wp-admin/admin-ajax.php", form, {
        headers: {
            ...form.getHeaders(),
            "accept":          "*/*",
            "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            "user-agent":      "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 Chrome/107.0.0.0 Mobile Safari/537.36",
            "referer":         "https://www.writecream.com/",
        },
    });

    if (!data?.success) throw new Error("Gagal: " + JSON.stringify(data));
    return data?.data?.response_content;
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

if (require.main === module) {
    const [,, prompt, system] = process.argv;
    if (!prompt) {
        console.log("Usage:");
        console.log('  node writecream.js "Halo, apa kabar?"');
        console.log('  node writecream.js "Halo" "You are a helpful assistant"');
        process.exit(1);
    }
    chat(prompt, system)
        .then(r  => console.log("✅ Response:\n" + r))
        .catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
} else {
    module.exports = {
        name:     "Writecream",
        desc:     "Chat dengan AI via writecream.com — gratis tanpa login.",
        category: "AI CHAT",
        params:   ["prompt", "_system"],
        async run(req, res) {
            try {
                const { prompt, _system } = req.query;
                if (!prompt) return res.status(400).json({
                    status: false,
                    error: 'Parameter "prompt" wajib diisi!'
                });

                const response = await chat(prompt, _system);
                return res.status(200).json({
                    status: true,
                    creator: "Shannz x Xena",
                    result: response
                });
            } catch (e) {
                return res.status(500).json({ status: false, error: e.message });
            }
        }
    };
}

