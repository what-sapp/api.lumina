const axios = require("axios");
const crypto = require("crypto");

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         CLAUDE 3 HAIKU — talkai.info                        ║
 * ║                 Creator: Shannz x Xena                      ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  USAGE CLI:                                                  ║
 * ║  node claude.js "Halo siapa kamu?"                           ║
 * ║  node claude.js "Siapa kamu?" "Kamu adalah AI bernama Xena"  ║
 * ║                                                              ║
 * ║  API PARAMS:                                                 ║
 * ║  prompt  → pesan (wajib)                                     ║
 * ║  _system → system prompt (opsional)                          ║
 * ║  INSTALL: npm install axios                                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const UA = "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 Chrome/107.0.0.0 Mobile Safari/537.36";

async function getSession() {
    const res = await axios.get("https://talkai.info/id/chat/", {
        headers: { "user-agent": UA, "accept": "text/html" },
    });
    return (res.headers["set-cookie"] || []).map(c => c.split(";")[0]).join("; ");
}

async function claude(prompt, system = "") {
    const cookie = await getSession();

    const messagesHistory = [];
    if (system) messagesHistory.push({ id: crypto.randomUUID(), from: "system", content: system, model: "" });
    messagesHistory.push({ id: crypto.randomUUID(), from: "you", content: prompt, model: "" });

    const body = JSON.stringify({
        type: "chat",
        messagesHistory,
        settings: { model: "claude-3-haiku-20240307", temperature: 0.7 },
    });

    const res = await axios.post("https://talkai.info/id/chat/send/", body, {
        headers: {
            "accept":       "application/json, text/event-stream",
            "content-type": "application/json",
            "cookie":       cookie,
            "origin":       "https://talkai.info",
            "referer":      "https://talkai.info/id/chat/",
            "user-agent":   UA,
        },
        responseType: "text",
    });

    let fullText = "";
    for (const line of res.data.split("\n")) {
        if (line.trim().startsWith("data:")) {
            const data = line.trim().slice(5).trim();
            if (data && data !== "[DONE]" && !data.startsWith("{")) fullText += data;
        }
    }

    return fullText.trim() || "AI sedang overload, coba lagi.";
}

if (require.main === module) {
    const [,, prompt, system] = process.argv;
    if (!prompt) { console.log('Usage: node claude.js "pertanyaan" ["system"]'); process.exit(1); }
    claude(prompt, system)
        .then(r  => console.log("✅ Response:\n" + r))
        .catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
} else {
    module.exports = {
        name:     "Claude 3 Haiku",
        desc:     "Chat dengan Claude 3 Haiku via talkai.info — gratis tanpa login.",
        category: "AI CHAT",
        params:   ["prompt", "_system"],
        async run(req, res) {
            try {
                const { prompt, _system } = req.query;
                if (!prompt) return res.status(400).json({ status: false, error: 'Parameter "prompt" wajib diisi!' });
                const result = await claude(prompt, _system);
                return res.status(200).json({ status: true, creator: "Shannz x Xena", result });
            } catch (e) {
                return res.status(500).json({ status: false, error: e.message });
            }
        }
    };
}

