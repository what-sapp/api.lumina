const https = require("https");
const crypto = require("crypto");

/**
 * GENING.AI CHARACTER CHAT
 * Status: GOD MODE - Fitur ke-99
 * Creator: Xena (Solo Project)
 * Features: Auto-Bypass Ticket, SSE Stream Parser, Character Persona Support
 */
module.exports = {
    name: "Yupi Kohata",
    desc: "Chat dengan karakter AI (Yupi Kohata) tanpa limit via gening.ai.",
    category: "AI Chat",
    params: ["query"],

    async run(req, res) {
        const { query } = req.query;
        if (!query) return res.status(400).json({ status: false, error: "Mau ngomong apa sama Yupi, Xena?" });

        try {
            // --- STEP 1: BYPASS TICKET (XENA SIGNATURE) ---
            const code = crypto.randomUUID().replace(/-/g, "");
            const loginBody = `type=0&code=${code}`;
            
            const session = await new Promise((resolve, reject) => {
                const r = https.request({
                    hostname: "www.gening.ai",
                    path: "/cgi-bin/login",
                    method: "POST",
                    headers: {
                        "content-type": "application/x-www-form-urlencoded",
                        "user-agent": "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36"
                    }
                }, (response) => {
                    let data = "";
                    response.on("data", d => data += d);
                    response.on("end", () => {
                        const parsed = JSON.parse(data);
                        resolve({ uid: parsed.data.uid, ticket: parsed.data.ticket });
                    });
                });
                r.write(loginBody);
                r.end();
            });

            // --- STEP 2: CHARACTER CHAT REQUEST ---
            const charId = "a197154d-ffd3-46e4-9a07-1aa73665981a"; // Yupi Kohata
            const chatBody = JSON.stringify({
                query: query,
                style_model: "s10001",
                user: "VISITOR",
                messages: [{ role: "system", content: "Yupi Kohata is a beautiful and assertive girl." }],
                await: 0
            });

            const result = await new Promise((resolve, reject) => {
                const request = https.request({
                    hostname: "www.gening.ai",
                    path: `/cgi-bin/auth/aigc/character2?id=${charId}`,
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                        "cookie": `uid=${session.uid}; ticket=${session.ticket}`,
                        "user-agent": "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36",
                        "origin": "https://www.gening.ai",
                        "referer": `https://www.gening.ai/free-ai-Characters-chat/${charId}`
                    }
                }, (response) => {
                    let fullText = "";
                    response.on("data", (chunk) => {
                        const lines = chunk.toString().split("\n");
                        for (const line of lines) {
                            if (line.trim().startsWith("data:")) {
                                try {
                                    const parsed = JSON.parse(line.slice(5).trim());
                                    if (parsed.answer) fullText += parsed.answer;
                                } catch (e) {}
                            }
                        }
                    });
                    response.on("end", () => resolve(fullText.trim()));
                });
                request.write(chatBody);
                request.end();
            });

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: result || "Yupi lagi malu-malu, coba lagi nanti."
            });

        } catch (err) {
            res.status(500).json({ status: false, error: err.message });
        }
    }
};
