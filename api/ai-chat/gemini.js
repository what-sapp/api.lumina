module.exports = {
    name: "Gemini Realtime",
    desc: "Chat dengan Gemini Realtime via NekoLabs, support memory session.",
    category: "AI CHAT",
    method: "GET",
    params: ["text", "_systemPrompt", "_sessionId"],
    paramsSchema: {
        text:          { type: "text", label: "Text", required: true },
        _systemPrompt: { type: "text", label: "System Prompt", required: false },
        _sessionId:    { type: "text", label: "Session ID (kosong = baru)", required: false }
    },

    async run(req, res) {
        const text         = req.query.text;
        const systemPrompt = req.query.systemPrompt || '';
        const sessionId    = req.query.sessionId || '';

        if (!text) return res.status(400).json({ status: false, error: "Parameter 'text' diperlukan." });

        try {
            let url = `https://rynekoo-api.hf.space/text.gen/gemini/realtime?text=${encodeURIComponent(text)}&systemPrompt=${encodeURIComponent(systemPrompt)}`;
            if (sessionId) url += `&sessionId=${encodeURIComponent(sessionId)}`;

            const r    = await fetch(url);
            const data = await r.json();

            if (!data.success) throw new Error(data.message || 'Gagal mendapatkan response');

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    response:  data.result.text,
                    sessionId: data.result.sessionId
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};

