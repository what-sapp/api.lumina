const https = require("https");

/**
 * TURBOSEEK.IO AI SEARCH (GOD MODE)
 * Status: LEGENDARY - Fitur ke-100 🏆
 * Creator: Xena (Solo Project)
 * Function: Real-time Web Search & AI Synthesis (Perplexity Style)
 */
module.exports = {
    name: "TurboSeek AI",
    desc: "AI Search mirip Perplexity via turboseek.io — gratis & tanpa login.",
    category: "AI CHAT",
    params: ["text"],

    async run(req, res) {
        const question = req.query.text || req.query.q;

        if (!question) {
            return res.status(400).json({ 
                status: false, 
                creator: "Xena", 
                error: "Mau cari tahu apa hari ini, Senior Xena?" 
            });
        }

        try {
            const BASE_HEADERS = {
                "accept": "*/*",
                "content-type": "application/json",
                "origin": "https://www.turboseek.io",
                "referer": "https://www.turboseek.io/",
                "user-agent": "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36"
            };

            // --- STEP 1: GET SOURCES (SEARCHING THE WEB) ---
            const srcBody = JSON.stringify({ question });
            const srcRes = await new Promise((resolve, reject) => {
                const req = https.request({
                    hostname: "www.turboseek.io",
                    path: "/api/getSources",
                    method: "POST",
                    headers: { ...BASE_HEADERS, "content-length": Buffer.byteLength(srcBody) }
                }, (r) => {
                    let d = "";
                    r.on("data", chunk => d += chunk);
                    r.on("end", () => resolve(d));
                });
                req.on("error", reject);
                req.write(srcBody);
                req.end();
            });

            let sources = [];
            try { sources = JSON.parse(srcRes); } catch (e) { sources = []; }

            // --- STEP 2: GET ANSWER (SYNTHESIZING) ---
            const ansBody = JSON.stringify({ question, sources });
            const answerRes = await new Promise((resolve, reject) => {
                const req = https.request({
                    hostname: "www.turboseek.io",
                    path: "/api/getAnswer",
                    method: "POST",
                    headers: { ...BASE_HEADERS, "content-length": Buffer.byteLength(ansBody) }
                }, (r) => {
                    let d = "";
                    r.on("data", chunk => d += chunk);
                    r.on("end", () => resolve(d));
                });
                req.on("error", reject);
                req.write(ansBody);
                req.end();
            });

            // Clean up output (Xena's Filter)
            const cleanAnswer = answerRes
                .replace(/<[^>]+>/g, "")
                .replace(/&amp;/g, "&")
                .replace(/\n{3,}/g, "\n\n")
                .trim();

            return res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    answer: cleanAnswer,
                    sources: sources.map(s => ({ title: s.title, url: s.url }))
                }
            });

        } catch (e) {
            return res.status(500).json({ 
                status: false, 
                creator: "Xena", 
                error: e.message 
            });
        }
    }
};
