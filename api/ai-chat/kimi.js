const https = require("https");
const zlib  = require("zlib");

/**
 * KIMI AI PRO (MOONSHOT ENGINE)
 * Feature: Deep Reasoning & Long Context
 * Creator: Shannz x Xena
 */
module.exports = {
    name:     "Kimi AI",
    desc:     "Chat dengan Kimi AI (Moonshot) yang punya kemampuan penalaran tinggi.",
    category: "AI CHAT",
    params:   ["query"],

    async run(req, res) {
        const { query } = req.query;
        if (!query) return res.status(400).json({ status: false, error: "Mau tanya apa ke Kimi, Senior?" });

        // --- CONFIG (Ganti Token/Cookie jika expire) ---
        const TOKEN  = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ1c2VyLWNlbnRlciIsImV4cCI6MTc3NDUwMzc4MiwiaWF0IjoxNzcxOTExNzgyLCJqdGkiOiJkNmVqa3BnNjRvM3J0M3VxNjNjMCIsInR5cCI6ImFjY2VzcyIsImFwcF9pZCI6ImtpbWkiLCJzdWIiOiJkNmVqa3BnNjRvM3J0M3VxNjM4MCIsInNwYWNlX2lkIjoiZDZlamtwZzY0bzNydDN1cTYxOGciLCJhYnN0cmFjdF91c2VyX2lkIjoiZDZlamtwZzY0bzNydDN1cTYxODAiLCJzc2lkIjoiMTczMTU3MjQ4NDA4ODAxMTkzOCIsImRldmljZV9pZCI6Ijc2MDk4ODUwNzg2NzU1Nzk0MDUiLCJyZWdpb24iOiJvdmVyc2VhcyIsIm1lbWJlcnNoaXAiOnsibGV2ZWwiOjEwfX0.UcAFKcQ1uDXh9jvjfCu29D05CtIk1e0W1Uskl2n1pptCmxc475tXJBCxcndv39hZLFLaSSvm2dVEOLHKDJB2aA";

        // ✅ FIX 1: Cookie lengkap (bukan cuma kimi-auth)
        const COOKIE = "_ga=GA1.1.159531503.1771814436; _gcl_au=1.1.1293011081.1771814436; theme=light; __snaker__id=pUA4JRnxdjlwLZFw; gdxidpyhxdE=U0qHkT3WBmZVAsyKzVE5h4b%5Cn5hpXa1tJYBTZRPcoQti4ZxL1xUnAMv%2BrzE6LRUzGYol%2F4T3KSQqo04bCnw1Q%2FCV8%2FN6wz%2BafB8woI7w4QZm2QuG%5CvuDDsvaXDeW8S72g%5CjZWwCvDl%5Cvyj%2BJJN%2FQRo5SmqQcjyCP3IqD3SH%5CyIj1kK9e%3A1771815350547; Hm_lvt_358cae4815e85d48f7e8ab7f3680a74b=1771814437,1771911757; HMACCOUNT=048D053DC724E98E; Hm_lpvt_358cae4815e85d48f7e8ab7f3680a74b=1771911779; kimi-auth=" + TOKEN + "; _ga_YXD8W70SZP=GS2.1.s1771911755$o2$g1$t1771911794$j21$l0$h0";

        const BASE_HEADERS = {
            "accept":               "*/*",
            "accept-encoding":      "gzip, deflate, br",
            "accept-language":      "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            "authorization":        `Bearer ${TOKEN}`,
            "cookie":               COOKIE,
            "origin":               "https://www.kimi.com",
            "r-timezone":           "Asia/Jakarta",
            "sec-ch-ua":            '"Chromium";v="107", "Not=A?Brand";v="24"',
            "sec-ch-ua-mobile":     "?1",
            "sec-ch-ua-platform":   '"Android"',
            "sec-fetch-dest":       "empty",
            "sec-fetch-mode":       "cors",
            "sec-fetch-site":       "same-origin",
            "user-agent":           "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36",
            "x-language":           "en-US",
            "x-msh-device-id":      "7609885078675579405",
            "x-msh-platform":       "web",
            "x-msh-session-id":     "1731572484088011938",
            "x-msh-version":        "1.0.0",
            "x-traffic-id":         "d6ejkpg64o3rt3uq6380",
        };

        // --- HELPER: FRAME BINER CONNECT+JSON ---
        const buildFrame = (obj) => {
            const jsonBuf = Buffer.from(JSON.stringify(obj), "utf-8");
            const frame   = Buffer.alloc(5 + jsonBuf.length);
            frame.writeUInt8(0x00, 0);
            frame.writeUInt32BE(jsonBuf.length, 1);
            jsonBuf.copy(frame, 5);
            return frame;
        };

        // ✅ FIX 2: Parser pakai op:set/append (terbukti work)
        const parseStream = (raw) => {
            let text = "";
            let i    = 0;
            while (i < raw.length) {
                const start = raw.indexOf("{", i);
                if (start === -1) break;
                let depth = 0, j = start, inStr = false, esc = false;
                while (j < raw.length) {
                    const ch = raw[j];
                    if (esc)         { esc = false; j++; continue; }
                    if (ch === "\\") { esc = true;  j++; continue; }
                    if (ch === '"')  { inStr = !inStr; j++; continue; }
                    if (inStr)       { j++; continue; }
                    if (ch === "{")  depth++;
                    if (ch === "}")  depth--;
                    j++;
                    if (depth === 0) break;
                }
                try {
                    const obj = JSON.parse(raw.slice(start, j));
                    if (obj.op === "set"    && obj.mask === "block.text")
                        text += obj.block?.text?.content || "";
                    if (obj.op === "append" && obj.mask === "block.text.content")
                        text += obj.block?.text?.content || "";
                } catch { /* skip */ }
                i = j;
            }
            return text;
        };

        // --- HELPER: DECOMPRESS ---
        const decompress = (r) => {
            const enc = (r.headers["content-encoding"] || "").toLowerCase();
            if (enc === "br")      return r.pipe(zlib.createBrotliDecompress());
            if (enc === "gzip")    return r.pipe(zlib.createGunzip());
            if (enc === "deflate") return r.pipe(zlib.createInflate());
            return r;
        };

        try {
            // STEP 1: Create Chat Session
            const chatRes = await new Promise((resolve, reject) => {
                const postData = JSON.stringify({ is_example: false, name: "New Chat", type: "chat" });
                const reqChat  = https.request({
                    hostname: "www.kimi.com",
                    path:     "/api/chat",
                    method:   "POST",
                    headers:  {
                        ...BASE_HEADERS,
                        "content-type":   "application/json",
                        "content-length": Buffer.byteLength(postData),
                        "referer":        "https://www.kimi.com/",
                    }
                }, (r) => {
                    const stream = decompress(r);
                    let b = "";
                    stream.on("data", d => b += d);
                    stream.on("end",  () => {
                        try { resolve(JSON.parse(b)); }
                        catch { reject(new Error("Gagal parse chat: " + b.slice(0, 100))); }
                    });
                    stream.on("error", reject);
                });
                reqChat.on("error", reject);
                reqChat.write(postData);
                reqChat.end();
            });

            const chatId = chatRes.id;
            if (!chatId) throw new Error("Chat ID tidak ditemukan: " + JSON.stringify(chatRes));
            const rootId = chatId; // rootId = chatId langsung (terbukti work)

            // STEP 2: Send Message & Get Result
            const body = buildFrame({
                chat_id:  chatId,
                scenario: "SCENARIO_K2D5",
                tools:    [{ type: "TOOL_TYPE_SEARCH", search: {} }],
                message: {
                    parent_id: rootId,
                    role:      "user",
                    blocks:    [{ message_id: "", text: { content: query } }],
                    scenario:  "SCENARIO_K2D5",
                },
                options: { thinking: false },
            });

            const fullResult = await new Promise((resolve, reject) => {
                const reqMsg = https.request({
                    hostname: "www.kimi.com",
                    path:     "/apiv2/kimi.gateway.chat.v1.ChatService/Chat",
                    method:   "POST",
                    headers:  {
                        ...BASE_HEADERS,
                        "connect-protocol-version": "1",
                        "content-type":             "application/connect+json",
                        "content-length":           body.length,
                        "referer":                  `https://www.kimi.com/chat/${chatId}`,
                    }
                }, (r) => {
                    const stream = decompress(r);
                    let buffer   = "";
                    stream.on("data",  d => { buffer += d.toString(); });
                    stream.on("end",   () => resolve(parseStream(buffer)));
                    stream.on("error", reject);
                });
                reqMsg.on("error", reject);
                reqMsg.write(body);
                reqMsg.end();
            });

            res.status(200).json({
                status:  true,
                creator: "Shannz x Xena",
                result:  fullResult.trim() || "Kimi terdiam, coba tanya lagi."
            });

        } catch (error) {
            console.error("Kimi Error:", error.message);
            res.status(500).json({ status: false, error: "Kimi AI lagi meditasi, coba sesaat lagi!" });
        }
    }
};
