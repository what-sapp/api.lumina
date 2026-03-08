module.exports = {
    name: "Jennifer",
    desc: "Chat dengan karakter AI Jennifer via zelapioffciall.",
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
            const r    = await fetch(`https://zelapioffciall.koyeb.app/ai/jennifer?text=${encodeURIComponent(text)}`);
            const data = await r.json();

            if (!data.status) throw new Error(data.message || 'Error dari Jennifer API');

            res.status(200).json({
                status: true,
                creator: 'Xena',
                result: { response: data.result?.answer || 'No response' }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};

