const axios = require("axios");

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         QWEN3 30B — deepai.org                              ║
 * ║                 Creator: Shannz x Xena                      ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  API PARAMS:                                                 ║
 * ║  prompt  → pesan (wajib)                                     ║
 * ║  _system → system prompt (opsional)                          ║
 * ║  INSTALL: npm install axios                                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

async function qwen(prompt, system = "") {
    const chatHistory = [];
    if (system) chatHistory.push({ role: "system", content: system });
    chatHistory.push({ role: "user", content: prompt });

    const form = new URLSearchParams();
    form.append("chat_style", "chat");
    form.append("chatHistory", JSON.stringify(chatHistory));
    form.append("model", "qwen3-30b-a3b");
    form.append("session_uuid", "7b05cd41-1a46-4b75-ad62-042a5f226c76");
    form.append("hacker_is_stinky", "very_stinky");

    const { data } = await axios.post("https://api.deepai.org/hacking_is_a_serious_crime", form, {
        headers: {
            "api-key":      "tryit-30025425476-8e927d7fe1753ca3829f69519862e6fc",
            "user-agent":   "Mozilla/5.0 (Linux; Android 14; Infinix X6833B)",
            "referer":      "https://deepai.org/chat",
            "content-type": "application/x-www-form-urlencoded",
        },
    });

    return data;
}

if (require.main === module) {
    const [,, prompt, system] = process.argv;
    if (!prompt) { console.log('Usage: node qwen.js "pertanyaan" ["system"]'); process.exit(1); }
    qwen(prompt, system)
        .then(r  => console.log("✅ Response:\n" + (typeof r === "string" ? r : JSON.stringify(r, null, 2))))
        .catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
} else {
    module.exports = {
        name:     "Qwen3 30B",
        desc:     "Chat dengan Qwen3 30B via deepai.org — gratis tanpa login.",
        category: "AI CHAT",
        params:   ["prompt", "_system"],
        async run(req, res) {
            try {
                const { prompt, _system } = req.query;
                if (!prompt) return res.status(400).json({ status: false, error: 'Parameter "prompt" wajib diisi!' });
                const result = await qwen(prompt, _system);
                return res.status(200).json({ status: true, creator: "Shannz x Xena", result });
            } catch (e) {
                return res.status(500).json({ status: false, error: e.message });
            }
        }
    };
}

