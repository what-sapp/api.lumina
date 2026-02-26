const https = require("https");
const crypto = require("crypto");

/**
 * TALKAI MULTI-MODEL BYPASS
 * Status: GOD MODE - Fitur ke-101
 * Creator: Xena
 * Supported Models: GPT-4.1, Claude 3, Gemini 2.0, DeepSeek
 */

// Helper Request
function httpsRequest(options, body) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", d => data += d.toString());
            res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
        });
        req.setTimeout(30000, () => { req.destroy(); reject(new Error("Timeout")); });
        req.on("error", reject);
        if (body) req.write(body);
        req.end();
    });
}

// Helper Session (Xena's Secret Key)
async function getFreshSession() {
    const res = await httpsRequest({
        hostname: "talkai.info",
        path: "/chat/",
        method: "GET",
        headers: {
            "user-agent": "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36",
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }
    });

    const cookies = res.headers["set-cookie"] || [];
    const cookieMap = {};
    for (const c of cookies) {
        const [pair] = c.split(";");
        const [k, v] = pair.split("=");
        if (k && v) cookieMap[k.trim()] = v.trim();
    }
    return Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join("; ");
}

module.exports = {
    name: "TalkAI",
    desc: "Chat dengan berbagai model AI (DeepSeek/Gemini/Claude) dengan bypass limit.",
    category: "AI CHAT",
    params: ["query", "model"],

    async run(req, res) {
        const { query, model = "gpt-4.1-nano" } = req.query;

        if (!query) {
            return res.status(400).json({ 
                status: false, 
                creator: "Xena", 
                error: "Tanya apa hari ini, Senior?" 
            });
        }

        try {
            // 1. Ambil session baru (Auto Bypass)
            const cookie = await getFreshSession();

            // 2. Siapkan Payload
            const body = JSON.stringify({
                type: "chat",
                messagesHistory: [{ id: crypto.randomUUID(), from: "you", content: query, model: "" }],
                settings: { model, temperature: 0.7 },
            });

            // 3. Tembak API Utama (Streaming Parser)
            const options = {
                hostname: "talkai.info",
                path: "/chat/send/",
                method: "POST",
                headers: {
                    "accept": "application/json, text/event-stream",
                    "content-type": "application/json",
                    "content-length": Buffer.byteLength(body),
                    "cookie": cookie,
                    "origin": "https://talkai.info",
                    "referer": "https://talkai.info/chat/",
                    "user-agent": "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36"
                }
            };

            const result = await new Promise((resolve, reject) => {
                const request = https.request(options, (response) => {
                    let fullText = "";
                    let buffer = "";

                    response.on("data", (chunk) => {
                        buffer += chunk.toString();
                        const lines = buffer.split("\n");
                        buffer = lines.pop();

                        for (const line of lines) {
                            if (line.trim().startsWith("data:")) {
                                const data = line.trim().slice(5).trim();
                                // Abaikan metadata botmodel, trylimit, dan [DONE]
                                if (data && data !== "[DONE]" && !data.startsWith("{")) {
                                    fullText += data;
                                }
                            }
                        }
                    });
                    response.on("end", () => resolve(fullText.trim()));
                });
                request.on("error", reject);
                request.write(body);
                request.end();
            });

            // 4. Kirim Response
            res.status(200).json({
                status: true,
                creator: "Xena",
                result: result || "Maaf, AI sedang overload.",
                model: model
            });

        } catch (err) {
            res.status(500).json({ 
                status: false, 
                creator: "Xena", 
                error: err.message 
            });
        }
    }
};
