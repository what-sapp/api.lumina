const https = require("https");
const crypto = require("crypto");

/**
 * GENING.AI CHARACTER CHAT - FULL SCRAPE MIRROR
 * Fitur ke-103
 * Creator: Xena
 * Note: Wajib lengkap agar tidak error 400/500
 */

// Memory untuk session & history per user
let geningDb = {};

module.exports = {
    name: "GeningAI",
    desc: "Chat Unlimited Yupi Kohata. Mirroring Full Scrape Logic (Auto-Bypass).",
    category: "AI YUPI",
    params: ["query", "user"],

    async run(req, res) {
        const { query, user = "default_user" } = req.query;
        if (!query) return res.status(400).json({ status: false, creator: "Xena", error: "Input query wajib ada!" });

        try {
            // --- 1. BYPASS LOGIC (Wajib Fresh kalau Ticket Habis) ---
            if (!geningDb[user] || geningDb[user].remain <= 1) {
                const code = crypto.randomUUID().replace(/-/g, "");
                const loginBody = `type=0&code=${code}`;
                
                const loginRes = await new Promise((resolve, reject) => {
                    const r = https.request("https://www.gening.ai/cgi-bin/login", {
                        method: "POST",
                        headers: {
                            "content-type": "application/x-www-form-urlencoded",
                            "user-agent": "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36"
                        }
                    }, (res) => {
                        let d = ""; res.on("data", chunk => d += chunk);
                        res.on("end", () => resolve(JSON.parse(d)));
                    });
                    r.on("error", reject);
                    r.write(loginBody); r.end();
                });

                if (loginRes.code !== 0) throw new Error("Login Failed");

                geningDb[user] = {
                    uid: loginRes.data.uid,
                    ticket: loginRes.data.ticket,
                    remain: loginRes.data.remain,
                    cookie: `uid=${loginRes.data.uid}; ticket=${loginRes.data.ticket}`,
                    history: [],
                    convId: ""
                };
            }

            const session = geningDb[user];

            // --- 2. FULL PAYLOAD (Sesuai Scrape Asli) ---
            const payload = {
                inputs: {
                    user:            "VISITOR",
                    name:            "Yupi Kohata",
                    gender:          "Female",
                    description:     "Yupi Kohata is an 18-year-old striking beauty with short, dark hair tipped in vibrant purple, and captivating blue eyes that seem to sparkle with mischief. Clad in a stylish white crop top and a black pleated mini skirt, she exudes confidence and flair, effortlessly drawing attention wherever she goes. With a playful yet challenging spirit, Yupi thrives on teasing and provocation, relishing the game of earning the admiration she believes she deserves.",
                    persona:         "MalePOV, Dominant, Original Character, Romantic, Scenario\nName: Yupi Kohata\nAge: 18\nGender: Female\nSpecies: Human\nSexuality: Straight\nAppearance: Short, dark hair with purple highlights at the ends. Large, expressive blue eyes. Fair complexion with a slight blush on her cheeks.\nClothing: white crop top and matching black pleated mini skirt.\nPersonality: Confident, beautiful, assertive, and flirty. Likes attention and teasing others. Has a playful but challenging spirit. Can be stubborn and independent.\nLikes: Attention, teasing others, being challenged, playing pranks. Dislikes people who take themselves too seriously and those who don't appreciate her way her beauty.",
                    scenario:        " ",
                    sample_dialogue: " ",
                    age:             "",
                    relationship:    "",
                    knowledge_level: "",
                },
                query:           query,
                style_model:     "s10001",
                user:            "VISITOR",
                conversation_id: session.convId,
                messages: [
                    { 
                        role: "system", 
                        content: "*Yupi had always been a quiet and shy girl back in middle school... [Full Long System Prompt] ...waiting for a response.*" 
                    },
                    ...session.history
                ],
                await:           0
            };

            const body = JSON.stringify(payload);

            // --- 3. STREAMING REQUEST (Mirroring Headers) ---
            const result = await new Promise((resolve, reject) => {
                const request = https.request(`https://www.gening.ai/cgi-bin/auth/aigc/character2?id=a197154d-ffd3-46e4-9a07-1aa73665981a`, {
                    method: "POST",
                    headers: {
                        "accept":          "*/*",
                        "content-type":    "application/json",
                        "cookie":          session.cookie,
                        "origin":          "https://www.gening.ai",
                        "referer":         "https://www.gening.ai/free-ai-Characters-chat/a197154d-ffd3-46e4-9a07-1aa73665981a",
                        "user-agent":      "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36",
                        "content-length":  Buffer.byteLength(body)
                    }
                }, (response) => {
                    let fullText = "";
                    let buffer = "";

                    response.on("data", (chunk) => {
                        buffer += chunk.toString();
                        const lines = buffer.split("\n");
                        buffer = lines.pop();

                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (!trimmed || !trimmed.startsWith("data:")) continue;
                            const raw = trimmed.slice(5).trim();
                            if (!raw || raw === "{}") continue;

                            try {
                                const data = JSON.parse(raw);
                                if (data.event === "message" && data.answer) {
                                    fullText += data.answer;
                                }
                                if (data.conversation_id) session.convId = data.conversation_id;
                                if (data.remain != null) session.remain = data.remain;
                            } catch (e) {}
                        }
                    });
                    response.on("end", () => resolve(fullText.trim()));
                });
                request.on("error", reject);
                request.write(body);
                request.end();
            });

            // Update History Chat
            session.history.push({ role: "user", content: query });
            session.history.push({ role: "assistant", content: result });

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: result,
                info: { remain: session.remain, convId: session.convId }
            });

        } catch (err) {
            res.status(500).json({ status: false, creator: "Xena", error: err.message });
        }
    }
};
