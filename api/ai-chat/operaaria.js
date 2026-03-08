module.exports = {
    name: "OperaARIA",
    desc: "Chat dengan Opera ARIA AI (text, image generation, vision).",
    category: "AI CHAT",
    params: ["prompt", "_type"],
    paramsSchema: {
        prompt: { type: "text", label: "Prompt", required: true },
        _type: {
            type: "select",
            label: "Type",
            required: false,
            default: "chat",
            options: [
                { label: "Chat",   value: "chat" },
                { label: "Vision", value: "vision" }
            ]
        }
    },

    async run(req, res) {
        const prompt = req.query.prompt;
        const type   = req.query.type || 'chat';
        const media  = req.query.media || '';

        if (!prompt) return res.status(400).json({ status: false, error: "Parameter 'prompt' diperlukan." });

        try {
            const r = await fetch(`https://anabot.my.id/api/ai/opera?prompt=${encodeURIComponent(prompt)}&apikey=freeApikey&type=${encodeURIComponent(type)}&media=${encodeURIComponent(media)}`);
            const data = await r.json();

            if (!data.success) throw new Error(data.message || 'Opera ARIA error');

            res.status(200).json({
                status: true,
                creator: 'Xena',
                result: {
                    type,
                    response: data.data?.result || 'No response'
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
