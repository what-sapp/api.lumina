module.exports = {
    name: "CF Gemma",
    desc: "Chat dengan berbagai model Gemma via Cloudflare AI (NekoLabs).",
    category: "AI CHAT",
    method: "GET",
    params: ["text", "_model"],
    paramsSchema: {
        text: { type: "text", label: "Text", required: true },
        _model: {
            type: "select",
            label: "Model",
            required: false,
            default: "gemma-3-12b",
            options: [
                { label: "Gemma 3 12B (~1.2s)",   value: "gemma-3-12b" },
                { label: "Gemma 2B LoRA (~2.5s)", value: "gemma-2b-lora" },
                { label: "Gemma 7B LoRA (~2.3s)", value: "gemma-7b-lora" },
                { label: "Gemma 7B (~2.9s)",      value: "gemma-7b" },
            ]
        }
    },

    async run(req, res) {
        const text  = req.query.text;
        const model = req.query.model || 'gemma-3-12b';

        if (!text) return res.status(400).json({ status: false, error: "Parameter 'text' diperlukan." });

        try {
            const r    = await fetch(`https://rynekoo-api.hf.space/text.gen/cf/${model}?text=${encodeURIComponent(text)}`, {
                signal: AbortSignal.timeout(30000)
            });
            const data = await r.json();

            if (!data.success) throw new Error(data.message || 'Gagal mendapatkan response');

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: { model, response: data.result }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};

