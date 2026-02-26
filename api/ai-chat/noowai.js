const https = require("https");
const crypto = require("crypto");

/**
 * NOOWAI AI - Fitur ke-111
 * Status: UNLIMITED (Auto-Session & Nonce)
 * Engine: WordPress MWAI (Meow Apps)
 * Creator: Xena
 */

const HOST = "noowai.com";
const UA = "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36";

// Helper: Start Session untuk dapet Nonce + Cookie Otomatis
async function getNoowaiSession() {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: HOST,
            path: "/wp-json/mwai/v1/start_session",
            method: "POST",
            headers: {
                "accept": "*/*",
                "content-type": "application/json",
                "user-agent": UA
            }
        }, (res) => {
            let data = "";
            res.on("data", (d) => data += d);
            res.on("end", () => {
                try {
                    const json = JSON.parse(data);
                    const cookies = res.headers["set-cookie"]?.map(c => c.split(";")[0]).join("; ");
                    if (json.success) {
                        resolve({ 
                            sessionId: json.sessionId, 
                            nonce: json.restNonce, 
                            cookies 
                        });
                    } else reject(new Error("Gagal start session"));
                } catch (e) { reject(e); }
            });
        });
        req.on("error", reject);
        req.write("{}");
        req.end();
    });
}

module.exports = {
    name: "Noowai",
    desc: "Chat AI NooWAI dengan sistem auto-session, respon cepat & cerdas.",
    category: "AI CHAT",
    params: ["query"],

    async run(req, res) {
        const { query } = req.query;
        if (!query) return res.status(400).json({ status: false, creator: "Xena", error: "Tanya apa, Senior?" });

        try {
            // 1. Dapetin Session & Nonce Otomatis
            const sess = await getNoowaiSession();

            const body = JSON.stringify({
                botId: "default",
                session: sess.sessionId,
                chatId: Math.random().toString(36).slice(2, 13),
                contextId: 25,
                messages: [
                    { id: Math.random().toString(36).slice(2, 12), role: "assistant", content: "Hi! How can I help you?" },
                    { id: Math.random().toString(36).slice(2, 12), role: "user", content: query }
                ],
                newMessage: query,
                stream: false // Kita set false biar dapet respon utuh langsung
            });

            // 2. Kirim Chat
            const result = await new Promise((resolve, reject) => {
                const request = https.request({
                    hostname: HOST,
                    path: "/wp-json/mwai-ui/v1/chats/submit",
                    method: "POST",
                    headers: {
                        "accept": "application/json",
                        "content-type": "application/json",
                        "x-wp-nonce": sess.nonce,
                        "cookie": sess.cookies,
                        "user-agent": UA,
                        "content-length": Buffer.byteLength(body)
                    }
                }, (response) => {
                    let fullText = "";
                    response.on("data", (chunk) => fullText += chunk);
                    response.on("end", () => {
                        try {
                            const json = JSON.parse(fullText);
                            if (json.success) resolve(json.reply || json.data);
                            else reject(new Error("AI Noowai lagi sibuk."));
                        } catch (e) { reject(e); }
                    });
                });
                request.on("error", reject);
                request.write(body);
                request.end();
            });

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: result
            });

        } catch (err) {
            res.status(500).json({ status: false, creator: "Xena", error: "Gagal bypass session NooWAI." });
        }
    }
};
