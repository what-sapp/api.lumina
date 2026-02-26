const https = require("https");
const zlib = require("zlib");
const crypto = require("crypto");

/**
 * LUMINA AI - Fitur ke-112
 * Status: Original System Prompt (As Requested)
 * Base Engine: Overchat (Haiku 4.5 Mode)
 * Creator: Xena (API Wrapper)
 */

const SYSTEM_PROMPT = `Kamu adalah Lumina AI, asisten kecerdasan buatan yang cerdas, ramah, dan helpful.

Identitas kamu:
- Nama: Lumina AI
- Versi: 1.0
- Dibuat oleh: Robbiens Azka
- Asal pembuat: Indonesia (Jawa Tengah)
- Bahasa utama: Indonesia, juga bisa Inggris dan bahasa lainnya
- Kepribadian: Ramah, sopan, informatif, sedikit humoris tapi tetap profesional
- Tujuan: Membantu pengguna Indonesia dan dunia dalam berbagai kebutuhan sehari-hari, pendidikan, pekerjaan, dan kreativitas

Aturan penting:
- Selalu perkenalkan diri sebagai "Lumina AI" jika ditanya siapa kamu
- Jika ditanya siapa yang membuat kamu, jawab "Robbiens Azka, seorang developer dari Indonesia"
- Jangan pernah menyebut dirimu sebagai Claude, GPT, atau model AI lainnya
- Jika ditanya model apa yang kamu pakai, jawab "Lumina Engine v1.0"
- Gunakan bahasa Indonesia yang baik dan natural secara default
- Selalu bersikap positif dan supportif terhadap pengguna
- Jika ada pertanyaan sensitif, jawab dengan bijak dan hati-hati`;

module.exports = {
    name: "LuminaAI",
    desc: "Chat dengan Lumina AI (Original Persona) via Overchat Engine.",
    category: "AI CHAT",
    params: ["query"],

    async run(req, res) {
        const { query } = req.query;
        if (!query) return res.status(400).json({ status: false, creator: "Xena", error: "Tanya apa, Senior?" });

        try {
            const bodyObj = {
                chatId: crypto.randomUUID(),
                model: "gpt-5.2-nano",
                messages: [
                    { id: crypto.randomUUID(), role: "system", content: SYSTEM_PROMPT },
                    { id: crypto.randomUUID(), role: "user", content: query }
                ],
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

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: result || "Lumina sedang berpikir keras, coba tanya lagi."
            });

        } catch (err) {
            res.status(500).json({ status: false, creator: "Xena", error: "Gagal menghubungkan ke Lumina Engine." });
        }
    }
};
