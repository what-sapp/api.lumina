const https = require("https");
const zlib = require("zlib");
const crypto = require("crypto");

/**
 * CHATLYAI GPT-4.1 (AUTO-SEARCH EDITION)
 * Fitur ke-104
 * Status: ULTIMATE
 * Creator: Xena
 */

function decompress(res) {
    const enc = (res.headers["content-encoding"] || "").toLowerCase();
    if (enc === "br") return res.pipe(zlib.createBrotliDecompress());
    if (enc === "gzip") return res.pipe(zlib.createGunzip());
    return res;
}

module.exports = {
    name: "ChatlyAI",
    desc: "GPT-4.1 dengan Fitur Auto-Browsing Internet Otomatis.",
    category: "AI CHAT",
    params: ["query"],

    async run(req, res) {
        const { query } = req.query;
        if (!query) return res.status(400).json({ status: false, creator: "Xena", error: "Tanya apa, Senior?" });

        // JWT Token (Tetap butuh token valid dari chatlyai.app)
        let JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiODA2MjAyMS0wMTQ0LTQ0ODEtOTVkZS03OWUxZGUxNDYwMWEiLCJpbnRlZ3JpdHlDaGVjayI6ZmFsc2UsImJhc2VVcmwiOiJodHRwczovL2NoYXRseWFpLmFwcCIsInByb2R1Y3RWYWxpZEZvciI6IkNIQVRMWSIsImlzQWRtaW4iOmZhbHNlLCJpYXQiOjE3NzIwMzg3MDUsImV4cCI6MTc3MjA2MDMwNSwic3ViIjoiYjgwNjIwMjEtMDE0NC00NDgxLTk1ZGUtNzllMWRlMTQ2MDFhIiwianRpIjoiMjBhNmRmZWEtMzBjZi00MzU0LTg0MDEtYTU0YTExZTlkYWM0In0.Dg9TwtUpBCssJJmQIVPKZGGbDJ2WhOHFiT54T_dcpGk";

        try {
            const boundary = "----WebKitFormBoundary" + crypto.randomBytes(12).toString("hex");
            
            // PAYLOAD: web_search diset TRUE secara default
            const data = JSON.stringify({
                id: crypto.randomUUID(),
                temperature: 1,
                model: "vgpt-g4-1-fr",
                web_search: true, // <--- OTOMATIS SEARCH ON
                ltm_summary: "",
                messages: [{
                    id: crypto.randomUUID(),
                    model: "vgpt-a1-1",
                    role: "user",
                    content: [{ type: "text", text: query }]
                }]
            });

            const bodyStr = `--${boundary}\r\nContent-Disposition: form-data; name="data"\r\n\r\n${data}\r\n--${boundary}--\r\n`;
            const buf = Buffer.from(bodyStr);

            const result = await new Promise((resolve, reject) => {
                const request = https.request({
                    hostname: "streaming-chatly.vyro.ai",
                    path: "/v2/agent/completions",
                    method: "POST",
                    headers: {
                        "authorization": `Bearer ${JWT_TOKEN}`,
                        "content-type": `multipart/form-data; boundary=${boundary}`,
                        "content-length": buf.length,
                        "accept-encoding": "gzip, deflate, br",
                        "user-agent": "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 Chrome/107.0.0.0 Mobile Safari/537.36",
                        "origin": "https://chatlyai.app",
                        "referer": "https://chatlyai.app/"
                    }
                }, (response) => {
                    const stream = decompress(response);
                    let fullText = "";
                    let buffer = "";

                    stream.on("data", (chunk) => {
                        buffer += chunk.toString();
                        const lines = buffer.split("\n");
                        buffer = lines.pop();

                        for (const line of lines) {
                            let jsonStr = line.trim();
                            if (jsonStr.startsWith("data:")) jsonStr = jsonStr.slice(5).trim();
                            if (!jsonStr || jsonStr === "[DONE]") continue;

                            try {
                                const obj = JSON.parse(jsonStr);
                                const content = obj?.choices?.[0]?.delta?.content || obj?.content || obj?.text || obj?.message;
                                if (content) fullText += content;
                            } catch (e) {}
                        }
                    });
                    stream.on("end", () => resolve(fullText.trim()));
                });

                request.on("error", reject);
                request.write(buf);
                request.end();
            });

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: result || "Duh, internet lagi lemot, coba lagi ya Senior."
            });

        } catch (err) {
            res.status(500).json({ status: false, creator: "Xena", error: "Token expired atau server Vyro down." });
        }
    }
};
