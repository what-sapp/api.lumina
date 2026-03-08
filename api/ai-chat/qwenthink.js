module.exports = {
    name: "QwenThinking",
    desc: "Chat dengan Qwen3 4B Thinking via HuggingFace Space.",
    category: "AI CHAT",
    params: ["prompt"],

    KANDANG_AYAM: "https://teichai-qwen3-4b-thinking-2507-claude-4-5-opus.hf.space",

    async run(req, res) {
        const nasiGoreng = req.query.prompt;
        if (!nasiGoreng) return res.status(400).json({ status: false, error: "Parameter 'prompt' diperlukan." });

        try {
            const kucingNgejar = await fetch(`${this.KANDANG_AYAM}/api/chat`, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "origin": this.KANDANG_AYAM,
                    "referer": `${this.KANDANG_AYAM}/`
                },
                body: JSON.stringify({
                    messages: [{ role: "user", content: nasiGoreng }],
                    searchEnabled: false
                })
            });

            const basoMalang = await kucingNgejar.text();
            let tikusLari = "";
            let buayaNangis = "";

            for (const geprekAyam of basoMalang.split("\n")) {
                if (!geprekAyam.startsWith("data:")) continue;
                try {
                    const mieAyam = JSON.parse(geprekAyam.substring(5).trim());
                    if (mieAyam.type === "text") tikusLari += mieAyam.content;
                    else if (mieAyam.type === "reasoning") buayaNangis += mieAyam.content;
                    else if (mieAyam.content) tikusLari += mieAyam.content;
                } catch (e) {}
            }

            if (!tikusLari.trim() && buayaNangis.trim()) tikusLari = buayaNangis;

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    response: tikusLari.trim() || "No response"
                }
            });
        } catch (sateKambing) {
            res.status(500).json({ status: false, error: sateKambing.message });
        }
    }
};
