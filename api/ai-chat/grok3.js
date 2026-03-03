const axios = require("axios");

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         GROK 3 MINI — heckai.weight-wave.com                ║
 * ║                 Creator: Shannz x Xena                      ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  USAGE CLI:                                                  ║
 * ║  node grok.js "Halo siapa kamu?"                             ║
 * ║                                                              ║
 * ║  API PARAMS:                                                 ║
 * ║  prompt  → pesan (wajib)                                     ║
 * ║  _system → system prompt (opsional)                          ║
 * ║  INSTALL: npm install axios                                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const BASE_URL = "https://api.heckai.weight-wave.com/api/ha/v1";
const HEADERS  = {
    "content-type": "application/json",
    "user-agent":   "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "origin":       "https://api.heckai.weight-wave.com",
};

async function grok(prompt, system = "") {
    // Step 1: Create session
    const sessionRes = await axios.post(`${BASE_URL}/session/create`,
        { title: "Chat_" + Date.now() },
        { headers: HEADERS }
    );
    const sessionId = sessionRes.data.id;

    // Step 2: Chat
    const res = await axios.post(`${BASE_URL}/chat`, {
        model:     "x-ai/grok-3-mini-beta",
        question:  system ? `${system}\n\n${prompt}` : prompt,
        language:  "Indonesian",
        sessionId,
    }, { headers: HEADERS, responseType: "text" });

    // Step 3: Parse SSE
    let result  = "";
    let capture = false;
    for (const line of res.data.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const chunk = line.slice(6).trim();
        if (chunk === "[ANSWER_START]") { capture = true; continue; }
        if (chunk === "[ANSWER_DONE]")  { break; }
        if (capture) result += chunk;
    }

    return result.replace(/\\n/g, "\n").trim() || "AI sedang overload, coba lagi.";
}

if (require.main === module) {
    const [,, prompt, system] = process.argv;
    if (!prompt) { console.log('Usage: node grok.js "pertanyaan" ["system"]'); process.exit(1); }
    grok(prompt, system)
        .then(r  => console.log("✅ Response:\n" + r))
        .catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
} else {
    module.exports = {
        name:     "Grok 3 Mini",
        desc:     "Chat dengan Grok 3 Mini Beta via heckai — gratis tanpa login.",
        category: "AI CHAT",
        params:   ["prompt", "_system"],
        async run(req, res) {
            try {
                const { prompt, _system } = req.query;
                if (!prompt) return res.status(400).json({ status: false, error: 'Parameter "prompt" wajib diisi!' });
                const result = await grok(prompt, _system);
                return res.status(200).json({ status: true, creator: "Shannz x Xena", result });
            } catch (e) {
                return res.status(500).json({ status: false, error: e.message });
            }
        }
    };
}

