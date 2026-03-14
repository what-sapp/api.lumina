const https = require("https");
const zlib = require("zlib");
const crypto = require("crypto");

/**
 * Overchat AI - Customizable System Prompt
 * Base Engine: Overchat (Multi-model support)
 * Creator: Xena (API Wrapper)
 */

module.exports = {
    name: "Custom",
    desc: "Chat dengan Overchat AI - Support custom system prompt & multi-model.",
    category: "AI CHAT",
    params: ["query", "system", "model"],

    async run(req, res) {
        const { query, system, model } = req.query;
        
        if (!query) {
            return res.status(400).json({ 
                status: false, 
                creator: "Xena", 
                error: "Parameter 'query' required!" 
            });
        }

        try {
            const messages = [];
            
            // Add system prompt if provided
            if (system) {
                messages.push({
                    id: crypto.randomUUID(),
                    role: "system",
                    content: system
                });
            }
            
            // Add user message
            messages.push({
                id: crypto.randomUUID(),
                role: "user",
                content: query
            });

            const bodyObj = {
                chatId: crypto.randomUUID(),
                model: model || "gpt-5.2-nano", // Default model
                messages: messages,
                personaId: "free-chat-gpt-landing",
                frequency_penalty: 0,
                max_tokens: 4000,
                presence_penalty: 0,
                stream: true,
                temperature: 0.7,
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
                    }
                }, (response) => {
                    const enc = (response.headers["content-encoding"] || "").toLowerCase();
                    let stream = response;
                    
                    if (enc === "br") stream = response.pipe(zlib.createBrotliDecompress());
                    else if (enc === "gzip") stream = response.pipe(zlib.createGunzip());

                    let fullText = "";
                    let buffer = "";

                    stream.on("data", chunk => {
                        buffer += chunk.toString();
                        const lines = buffer.split("\n");
                        buffer = lines.pop();

                        for (const line of lines) {
                            let t = line.trim();
                            if (!t || t === "data: [DONE]") continue;
                            try {
                                const obj = JSON.parse(t.startsWith("data:") ? t.slice(5).trim() : t);
                                if (obj?.choices?.[0]?.delta?.content) {
                                    fullText += obj.choices[0].delta.content;
                                }
                            } catch {}
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
                model: model || "gpt-5.2-nano",
                result: result || "No response from AI."
            });

        } catch (err) {
            res.status(500).json({ 
                status: false, 
                creator: "Xena", 
                error: "Failed to connect to Overchat API.",
                details: err.message
            });
        }
    }
};
