module.exports = {
    name: "JuniorAlive AI",
    desc: "Chat AI dengan berbagai model (Grok, GPT OSS) proxy.",
    category: "AI CHAT",
    method: "GET",
    params: ["prompt", "_systemPrompt", "_model"],
    paramsSchema: {
        prompt:        { type: "text", label: "Prompt", required: true },
        _systemPrompt: { type: "text", label: "System Prompt", required: false },
        _model: {
            type: "select",
            label: "Model",
            required: false,
            default: "grok-4-fast-reasoning",
            options: [
                { label: "Grok 4 Fast Reasoning",     value: "grok-4-fast-reasoning" },
                { label: "Grok 4 Fast Non-Reasoning", value: "grok-4-fast-non-reasoning" },
                { label: "Grok 3 Mini",               value: "grok-3-mini" },
                { label: "GPT OSS 120B",              value: "gpt-oss-120b" },
            ]
        }
    },

    async run(req, res) {
        const prompt       = req.query.prompt;
        const systemPrompt = req.query.systemPrompt || '';
        const model        = req.query.model || 'grok-4-fast-reasoning';

        if (!prompt) return res.status(400).json({ status: false, error: "Parameter 'prompt' diperlukan." });

        try {
            const messages = [];
            if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
            messages.push({ role: 'user', content: prompt });

            const r = await fetch('https://openai.junioralive.workers.dev/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin':       'https://ish.chat',
                    'Referer':      'https://ish.chat/',
                    'x-proxy-key':  'ish-7f9e2c1b-5c8a-4b0f-9a7d-1e5c3b2a9f74',
                    'user-agent':   'Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36'
                },
                body: JSON.stringify({ model, messages, stream: false })
            });

            const data = await r.json();
            const text = data.choices?.[0]?.message?.content;
            if (!text) throw new Error('Tidak ada response: ' + JSON.stringify(data));

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    model:    data.model,
                    response: text
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
