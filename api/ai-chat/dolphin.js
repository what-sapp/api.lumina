const axios = require('axios');

/**
 * DOLPHIN AI (24B LOGIC ENGINE)
 * Feature: Streaming Buffer to JSON
 * Integration: Shannz x Xena
 */
module.exports = {
    name: "Dolphin AI",
    desc: "AI dengan logika tinggi menggunakan Dolphin 24B Engine.",
    category: "AI CHAT",
    params: ["message"],
    async run(req, res) {
        try {
            const { message } = req.query;
            if (!message) return res.status(400).json({ status: false, error: "Tanya sesuatu ke Dolphin, Mang!" });

            const url = "https://chat.dphn.ai/api/chat";
            const payload = {
                messages: [{ role: "user", content: message }],
                model: "dolphinserver:24B",
                template: "logical"
            };

            const response = await axios({
                method: 'post',
                url: url,
                data: payload,
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "text/event-stream",
                    "Origin": "https://chat.dphn.ai",
                    "Referer": "https://chat.dphn.ai/",
                    "User-Agent": "Mozilla/5.0 (Linux; Android 14; Infinix X6833B)"
                },
                responseType: 'stream'
            });

            let fullAnswer = "";

            // Kumpulin data streaming sampe beres
            response.data.on('data', (chunk) => {
                const lines = chunk.toString().split('\n');
                for (let line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.replace('data: ', '').trim();
                        if (jsonStr === '[DONE]') continue;
                        try {
                            const json = JSON.parse(jsonStr);
                            const content = json.choices?.[0]?.delta?.content || "";
                            fullAnswer += content;
                        } catch (e) { /* Skip non-JSON */ }
                    }
                }
            });

            response.data.on('end', () => {
                res.status(200).json({
                    status: true,
                    creator: "shannz x Xena",
                    model: "Dolphin 24B",
                    result: fullAnswer.trim()
                });
            });

        } catch (error) {
            console.error('Dolphin Error:', error.message);
            res.status(500).json({ status: false, error: "Dolphin lagi menyelam terlalu dalam, coba lagi!" });
        }
    }
};
