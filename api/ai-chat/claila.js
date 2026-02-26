const https    = require("https");
const zlib     = require("zlib");

/**
 * CLAILA AI (GPT-4O BYPASS)
 * Status: PERFECT CODE - Fitur ke-93
 * Creator: Shannz x Xena
 * Update: Clean Params (Query & Model Only)
 */

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const COOKIE     = "dmcfkjn3cdc=h8lrmcdeh4u9op0uce8cm1skjh; _fbp=fb.1.1772001120569.40904032060515337; theme=dark; auh=9cc3f540; _ga_Q4FCSLM1EK=GS2.1.s1772001119$o1$g1$t1772001291$j60$l0$h0";
const CSRF_TOKEN = "e3ce1302df8490fe89636ce009229faf32b680ef033431f5370dd203f7df3834";
const SESSION_ID = "1772001290";
const UID        = "b243f347";

const MODELS = {
    "gpt5-mini":  "gpt-5-mini",
    "gpt41-mini": "gpt-4.1-mini",
    "default":    "gpt-4.1-mini",
};

// ─── HELPER DECOMPRESS ────────────────────────────────────────────────────────
function decompress(res) {
    const enc = (res.headers["content-encoding"] || "").toLowerCase();
    if (enc === "br")      return res.pipe(zlib.createBrotliDecompress());
    if (enc === "gzip")    return res.pipe(zlib.createGunzip());
    if (enc === "deflate") return res.pipe(zlib.createInflate());
    return res;
}

// ─── SEND MESSAGE FUNCTION ────────────────────────────────────────────────────
async function sendMessage(message, model = "gpt-4.1-mini", websearch = false) {
    const body = new URLSearchParams({
        model,
        message,
        sessionId:   SESSION_ID,
        chat_mode:   "chat",
        websearch:   websearch ? "true" : "false",
        tmp_enabled: "0",
    }).toString();

    const buf = Buffer.from(body);

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: "app.claila.com",
            path:     "/api/v2/aichat",
            method:   "POST",
            headers:  {
                "accept":           "*/*",
                "accept-encoding":  "gzip, deflate, br",
                "content-type":     "application/x-www-form-urlencoded; charset=UTF-8",
                "content-length":   buf.length,
                "cookie":           COOKIE,
                "origin":           "https://app.claila.com",
                "referer":          `https://app.claila.com/chat?uid=${UID}&lang=en`,
                "user-agent":       "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 Chrome/107.0.0.0 Mobile Safari/537.36",
                "x-csrf-token":     CSRF_TOKEN,
                "x-requested-with": "XMLHttpRequest",
            },
        }, (res) => {
            const stream = decompress(res);
            let raw = "";

            stream.on("data", d => { raw += d.toString(); });

            stream.on("end", () => {
                let text = "";
                try {
                    const json = JSON.parse(raw);
                    text = json?.message || json?.content || json?.text || "";
                } catch {
                    const lines = raw.split("\n");
                    for (let line of lines) {
                        if (line.trim().startsWith("data:")) {
                            try {
                                const chunkData = JSON.parse(line.replace("data:", "").trim());
                                const content = chunkData?.choices?.[0]?.delta?.content || chunkData?.message || "";
                                text += content;
                            } catch (e) {}
                        }
                    }
                }
                if (!text) text = raw.trim();
                resolve({ raw, text });
            });

            stream.on("error", reject);
        });

        req.on("error", reject);
        req.write(buf);
        req.end();
    });
}

// ─── MODULE EXPORTS ───────────────────────────────────────────────────────────
module.exports = {
    name:     "Claila AI",
    desc:     "Chat dengan GPT-4o via claila.com tanpa API Key.",
    category: "AI CHAT",
    params:   ["query", "model"], // Search dihapus biar clean

    async run(req, res) {
        try {
            const query = req.query.query || req.query.text;
            const model = req.query.model;

            if (!query) return res.status(400).json({ status: false, error: "Mau tanya apa, Senior?" });

            // Default model selection
            let selectedModel = MODELS.default;
            if (model === "gpt5") selectedModel = MODELS["gpt5-mini"];
            if (model === "gpt4") selectedModel = MODELS["gpt41-mini"];

            // Web Search selalu false sesuai permintaan
            const { raw, text } = await sendMessage(query, selectedModel, false);

            return res.status(200).json({
                status:  true,
                creator: "Shannz x Xena",
                result: {
                    model_used: selectedModel,
                    response: text || "Gagal mendapatkan respon dari Claila."
                }
            });
        } catch (e) {
            return res.status(500).json({ status: false, error: e.message });
        }
    }
};
