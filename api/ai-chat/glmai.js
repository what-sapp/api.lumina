module.exports = {
    name: "GLM AI",
    desc: "Chat dengan GLM (4.5 Air / 4.6), support system prompt, web search, reasoning, dan session.",
    category: "AI CHAT",
    method: "GET",
    params: ["text", "_model", "_systemPrompt", "_sessionId", "_search", "_reasoning"],
    paramsSchema: {
        text:         { type: "text",   label: "Text",          required: true },
        _model: {
            type: "select", label: "Model", required: false, default: "4.5-air",
            options: [
                { label: "GLM 4.5 Air", value: "4.5-air" },
                { label: "GLM 4.6",     value: "4.6" },
                { label: "GLM 4.6V",    value: "4.6v" }
            ]
        },
        _systemPrompt:{ type: "text",   label: "System Prompt", required: false },
        _sessionId:   { type: "text",   label: "Session ID",    required: false },
        _search: {
            type: "select", label: "Web Search", required: false, default: "false",
            options: [
                { label: "Off", value: "false" },
                { label: "On",  value: "true" }
            ]
        },
        _reasoning: {
            type: "select", label: "Reasoning", required: false, default: "false",
            options: [
                { label: "Off", value: "false" },
                { label: "On",  value: "true" }
            ]
        }
    },

    async run(req, res) {
        const text         = req.query.text;
        const model        = req.query.model        || '4.5-air';
        const systemPrompt = req.query.systemPrompt || '';
        const sessionId    = req.query.sessionId    || '';
        const search       = req.query.search       || 'false';
        const reasoning    = req.query.reasoning    || 'false';

        if (!text) return res.status(400).json({ status: false, error: "Parameter 'text' diperlukan." });

        try {
            let url = `https://rynekoo-api.hf.space/text.gen/glm/${model}?text=${encodeURIComponent(text)}&search=${search}&reasoning=${reasoning}`;
            if (systemPrompt) url += `&systemPrompt=${encodeURIComponent(systemPrompt)}`;
            if (sessionId)    url += `&sessionId=${encodeURIComponent(sessionId)}`;

            const r    = await fetch(url);
            const data = await r.json();

            if (!data.success) throw new Error(data.message || 'Gagal mendapatkan response');

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    response:  data.result.content,
                    reasoning: data.result.reasoning || null,
                    search:    data.result.search    || []
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
