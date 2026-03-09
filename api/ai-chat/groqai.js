module.exports = {
    name: "GroqAI",
    desc: "Chat AI via Groq Compound dengan dukungan session dan system prompt.",
    category: "AI CHAT",
    method: "GET",
    params: ["text", "_systemPrompt", "_sessionId"],
    paramsSchema: {
        text:          { type: "text", label: "Text", required: true },
        _systemPrompt: { type: "text", label: "System Prompt", required: false },
        _sessionId:    { type: "text", label: "Session ID", required: false }
    },

    async run(req, res) {
        const text         = req.query.text;
        const systemPrompt = req.query.systemPrompt || '';
        const sessionId    = req.query.sessionId || Date.now().toString();

        if (!text) return res.status(400).json({ status: false, error: "Parameter 'text' diperlukan." });

        try {
            const url = `https://rynekoo-api.hf.space/text.gen/groq/compound?text=${encodeURIComponent(text)}&systemPrompt=${encodeURIComponent(systemPrompt)}&sessionId=${encodeURIComponent(sessionId)}`;
            const r   = await fetch(url);
            const data = await r.json();

            if (!data.success) throw new Error(data.message || 'Gagal mendapatkan response');

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    response:  data.result,
                    sessionId: sessionId
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
