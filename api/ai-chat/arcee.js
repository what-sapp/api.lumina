module.exports = {
    name: "OpenRouter",
    desc: "Chat dengan berbagai model AI gratis via OpenRouter.",
    category: "AI CHAT",
    method: "GET",
    params: ["prompt", "_model"],
    paramsSchema: {
        prompt: { type: "text", label: "Prompt", required: true },
        _model: {
            type: "select",
            label: "Model",
            required: false,
            default: "arcee-ai/trinity-large-preview:free",
            options: [
                { label: "Arcee Trinity Large",   value: "arcee-ai/trinity-large-preview:free" },
                { label: "StepFun Step 3.5 Flash", value: "stepfun/step-3.5-flash:free" },
                { label: "Nvidia Nemotron 30B",   value: "nvidia/nemotron-3-nano-30b-a3b:free" }
            ]
        }
    },

    API_KEY: "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",

    async run(req, res) {
        const prompt = req.query.prompt;
        const model  = req.query.model || "arcee-ai/trinity-large-preview:free";

        if (!prompt) return res.status(400).json({ status: false, error: "Parameter 'prompt' diperlukan." });

        try {
            const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: "user", content: prompt }]
                })
            });

            const data = await r.json();
            if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    model: data.model,
                    response: data.choices?.[0]?.message?.content || "No response"
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
