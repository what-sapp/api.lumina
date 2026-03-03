const axios = require("axios");

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         LLAMA 3.3 70B — deepai.org                          ║
 * ║                 Creator: Shannz x Xena                      ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  API PARAMS:                                                 ║
 * ║  prompt  → pesan (wajib)                                     ║
 * ║  _system → system prompt (opsional)                          ║
 * ║  INSTALL: npm install axios                                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

async function llama(prompt, system = "") {
    const chatHistory = [];
    if (system) chatHistory.push({ role: "system", content: system });
    chatHistory.push({ role: "user", content: prompt });

    const form = new URLSearchParams();
    form.append("chat_style", "chat");
    form.append("chatHistory", JSON.stringify(chatHistory));
    form.append("model", "llama-3.3-70b-instruct");
    form.append("session_uuid", "33693cfb-3399-46d8-ad73-956af59da4");
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
    if (!prompt) { console.log('Usage: node llama.js "pertanyaan" ["system"]'); process.exit(1); }
    llama(prompt, system)
        .then(r  => console.log("✅ Response:\n" + (typeof r === "string" ? r : JSON.stringify(r, null, 2))))
        .catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
} else {
    module.exports = {
        name:     "LLaMA 3.3 70B",
        desc:     "Chat dengan LLaMA 3.3 70B Instruct via deepai.org — gratis tanpa login.",
        category: "AI CHAT",
        params:   ["prompt", "_system"],
        async run(req, res) {
            try {
                const { prompt, _system } = req.query;
                if (!prompt) return res.status(400).json({ status: false, error: 'Parameter "prompt" wajib diisi!' });
                const result = await llama(prompt, _system);
                return res.status(200).json({ status: true, creator: "Shannz x Xena", result });
            } catch (e) {
                return res.status(500).json({ status: false, error: e.message });
            }
        }
    };
}
