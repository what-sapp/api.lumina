module.exports = {
    name: "QwenThinking",
    desc: "Chat dengan Qwen3 4B Thinking via HuggingFace Space.",
    category: "AI CHAT",
    params: ["prompt"],

    BASE: "https://teichai-qwen3-4b-thinking-2507-claude-4-5-opus.hf.space",

    async run(req, res) {
        const prompt = req.query.prompt;
        if (!prompt) return res.status(400).json({ status: false, error: "Parameter 'prompt' diperlukan." });

        try {
            const chatRes = await fetch(`${this.BASE}/api/chat`, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "origin": this.BASE,
                    "referer": `${this.BASE}/`
                },
                body: JSON.stringify({
                    messages: [{ role: "user", content: prompt }],
                    searchEnabled: false
                })
            });

            const text = await chatRes.text();
            let response = "";
            let thinking = "";

            for (const line of text.split("\n")) {
                if (!line.startsWith("data:")) continue;
                try {
                    const parsed = JSON.parse(line.substring(5).trim());
                    if (parsed.type === "text") response += parsed.content;
                    else if (parsed.type === "reasoning") thinking += parsed.content;
                } catch (e) {}
            }

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    response: response.trim() || "No response",
                    thinking: thinking.trim() || null
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
