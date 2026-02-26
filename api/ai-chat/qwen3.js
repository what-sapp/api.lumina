const https = require("https");
const zlib = require("zlib");
const crypto = require("crypto");

module.exports = {
    name: "Qwen3",
    desc: "Chat Alibaba Qwen3 via Overchat Engine. Model: [ alibaba/qwen3-next-80b-a3b-instruct ]",
    category: "AI CHAT",
    params: ["query"],

    async run(req, res) {
        const { query } = req.query;
        if (!query) return res.status(400).json({ status: false, creator: "Xena", error: "Tanya apa, Senior?" });

        try {
            const bodyObj = {
                chatId: crypto.randomUUID(),
                model: "alibaba/qwen3-next-80b-a3b-instruct",
                messages: [
                    { id: crypto.randomUUID(), role: "user", content: query },
                    { id: crypto.randomUUID(), role: "system", content: "" }
                ],
                personaId: "qwen-3-landing",
                frequency_penalty: 0,
                max_tokens: 4000,
                presence_penalty: 0,
                stream: true,
                temperature: 0.5,
                top_p: 0.95,
            };

            const buf = Buffer.from(JSON.stringify(bodyObj));
            const result = await new Promise((resolve, reject) => {
                const request = https.request({
                    hostname: "api.overchat.ai",
                    path: "/v1/chat/completions",
                    method: "POST",
                    headers: {
                        "accept": "*/*",
                        "accept-encoding": "gzip, deflate, br",
                        "content-type": "application/json",
                        "content-length": buf.length,
                        "origin": "https://overchat.ai",
                        "referer": "https://overchat.ai/",
                        "user-agent": "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 Chrome/107.0.0.0 Mobile Safari/537.36",
                        "x-device-uuid": crypto.randomUUID(),
                        "x-device-platform": "web",
                        "x-device-version": "1.0.44"
                    },
                }, (response) => {
                    const enc = (response.headers["content-encoding"] || "").toLowerCase();
                    let stream = response;
                    if (enc === "br") stream = response.pipe(zlib.createBrotliDecompress());
                    else if (enc === "gzip") stream = response.pipe(zlib.createGunzip());

                    let fullText = "", buffer = "";
                    stream.on("data", chunk => {
                        buffer += chunk.toString();
                        const lines = buffer.split("\n");
                        buffer = lines.pop();
                        for (const line of lines) {
                            let t = line.trim();
                            if (!t || t === "data: [DONE]") continue;
                            try {
                                const obj = JSON.parse(t.startsWith("data:") ? t.slice(5).trim() : t);
                                if (obj?.choices?.[0]?.delta?.content) fullText += obj.choices[0].delta.content;
                            } catch {}
                        }
                    });
                    stream.on("end", () => resolve(fullText.trim()));
                });
                request.on("error", reject);
                request.write(buf);
                request.end();
            });

            res.status(200).json({ status: true, creator: "Xena", result });
        } catch (e) { res.status(500).json({ status: false, error: e.message }); }
    }
};
