module.exports = {
    name: "Pollinations AI",
    desc: "Chat AI via Pollinations.ai, gratis tanpa auth.",
    category: "AI CHAT",
    method: "GET",
    params: ["prompt", "_model"],
    paramsSchema: {
        prompt: { type: "text", label: "Prompt", required: true },
        _model: {
            type: "select",
            label: "Model",
            required: false,
            default: "openai-fast",
            options: [
                { label: "OpenAI Fast",    value: "openai-fast" },
                { label: "OpenAI",         value: "openai" },
                { label: "Mistral",        value: "mistral" },
                { label: "DeepSeek R1",    value: "deepseek-reasoner" },
            ]
        }
    },

    async run(req, res) {
        const prompt = req.query.prompt;
        const model  = req.query.model || 'openai-fast';

        if (!prompt) return res.status(400).json({ status: false, error: "Parameter 'prompt' diperlukan." });

        try {
            const r = await fetch('https://text.pollinations.ai/openai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin':       'https://ish.chat',
                    'Referer':      'https://ish.chat/'
                },
                body: JSON.stringify({
                    model,
                    messages:    [{ role: 'user', content: prompt }],
                    stream:      false,
                    temperature: 0.7
                })
            });

            const data = await r.json();
            const text = data.choices?.[0]?.message?.content;
            if (!text) throw new Error('Tidak ada response: ' + JSON.stringify(data));

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    model: data.model || model,
                    response: text
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
