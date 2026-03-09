module.exports = {
    name: "Public 2",
    desc: "Chat AI.",
    category: "AI CHAT",
    method: "GET",
    params: ["text"],
    paramsSchema: {
        text: { type: "text", label: "Text", required: true }
    },

    async run(req, res) {
        const text = req.query.text;
        if (!text) return res.status(400).json({ status: false, error: "Parameter 'text' diperlukan." });

        try {
            const r    = await fetch(`https://rynekoo-api.hf.space/text.gen/publicai?text=${encodeURIComponent(text)}`);
            const data = await r.json();

            if (!data.success) throw new Error(data.message || 'Gagal mendapatkan response');

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: { response: data.result }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};

