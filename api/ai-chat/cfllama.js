module.exports = {
    name: "CF Llama",
    desc: "Chat dengan berbagai model Llama via Cloudflare AI (NekoLabs).",
    category: "AI CHAT",
    method: "GET",
    params: ["text", "_model"],
    paramsSchema: {
        text: { type: "text", label: "Text", required: true },
        _model: {
            type: "select",
            label: "Model",
            required: false,
            default: "llama-3.2-1b",
            options: [
                { label: "Llama 3.2 1B (~281ms)", value: "llama-3.2-1b" },
                { label: "Llama 3.2 3B (~291ms)", value: "llama-3.2-3b" },
                { label: "Llama 3.1 8B (~1s)",    value: "llama-3.1-8b" },
                { label: "Llama 3 8B (~2s)",       value: "llama-3-8b" },
                { label: "Llama 4 Scout 17B (~637ms)", value: "llama-4-scout-17b" },
                { label: "Llama 3.3 70B (~744ms)",   value: "llama-3.3-70b" },
                { label: "Llama 2 7B (~16s)",      value: "llama-2-7b" },
            ]
        }
    },

    async run(req, res) {
        const text  = req.query.text;
        const model = req.query.model || 'llama-3.2-1b';

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

