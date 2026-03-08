module.exports = {
    name: "MayaQwen",
    desc: "Chat dengan Qwen3.5 via HuggingFace Space (MAYA-AI).",
    category: "AI CHAT",
    params: ["prompt", "model", "mode"],

    BASE: "https://maya-ai-qwen-3-5-chat.hf.space",
    MODELS: [
        "Qwen/Qwen3.5-122B-A10B",
        "Qwen/Qwen3.5-27B"
    ],
    MODES: [
        "⚡ Fast Mode  (direct answer)",
        "🧠 Thinking Mode  (chain-of-thought reasoning)"
    ],

    async run(req, res) {
        const prompt = req.query.prompt;
        const model = req.query.model || "Qwen/Qwen3.5-122B-A10B";
        const mode = req.query.mode || "⚡ Fast Mode  (direct answer)";
        if (!prompt) return res.status(400).json({ status: false, error: "Parameter 'prompt' diperlukan." });

        try {
            const headers = {
                "content-type": "application/json",
                "referer": `${this.BASE}/?__theme=system`
            };

            // Submit
            const submitRes = await fetch(`${this.BASE}/gradio/gradio_api/call/chat`, {
                method: "POST", headers,
                body: JSON.stringify({
                    data: [prompt, [], model, mode, null,
                        "You are a helpful, harmless, and honest AI assistant.",
                        1024, 0.7, 0.9]
                })
            });
            const submitData = await submitRes.json();
            if (!submitData.event_id) throw new Error("Failed to get event_id");

            // Poll SSE
            const eventRes = await fetch(`${this.BASE}/gradio/gradio_api/call/chat/${submitData.event_id}`, {
                headers: { "accept": "text/event-stream" }
            });
            const text = await eventRes.text();

            let result = "";
            for (const line of text.split("\n")) {
                if (line.startsWith("data:")) {
                    try {
                        const parsed = JSON.parse(line.substring(5).trim());
                        if (Array.isArray(parsed) && typeof parsed[0] === "string") {
                            result = parsed[0];
                        }
                    } catch (e) {}
                }
            }

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: { model, response: result.trim() || "No response" }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};

