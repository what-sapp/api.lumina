module.exports = {
    name: "MayaQwen",
    desc: "Chat dengan Qwen3.5 via HuggingFace Space (MAYA-AI).",
    category: "AI CHAT",
    params: ["prompt", "_model", "_mode"],
    paramsSchema: {
        prompt: { type: "text", label: "Prompt", required: true },
        _model: {
            type: "select",
            label: "Model",
            required: false,
            default: "Qwen/Qwen3.5-122B-A10B",
            options: [
                { label: "Qwen3.5 122B A10B", value: "Qwen/Qwen3.5-122B-A10B" },
                { label: "Qwen3.5 27B",       value: "Qwen/Qwen3.5-27B" }
            ]
        },
        _mode: {
            type: "select",
            label: "Mode",
            required: false,
            default: "⚡ Fast Mode  (direct answer)",
            options: [
                { label: "⚡ Fast Mode",     value: "⚡ Fast Mode  (direct answer)" },
                { label: "🧠 Thinking Mode", value: "🧠 Thinking Mode  (chain-of-thought reasoning)" }
            ]
        }
    },

    kandangKuda: "https://maya-ai-qwen-3-5-chat.hf.space",

    async run(req, res) {
        const omongApaan   = req.query.prompt;
        const modelNyasar  = req.query.model  || "Qwen/Qwen3.5-122B-A10B";
        const modeGalau    = req.query.mode   || "⚡ Fast Mode  (direct answer)";

        if (!omongApaan) return res.status(400).json({ status: false, error: "Parameter 'prompt' diperlukan." });

        try {
            const headerBengong = {
                "content-type": "application/json",
                "referer": `${this.kandangKuda}/?__theme=system`
            };

            // Submit ke server yang entah dimana
            const responGhoib = await fetch(`${this.kandangKuda}/gradio/gradio_api/call/chat`, {
                method: "POST",
                headers: headerBengong,
                body: JSON.stringify({
                    data: [omongApaan, [], modelNyasar, modeGalau, null,
                        "You are a helpful, harmless, and honest AI assistant.",
                        1024, 0.7, 0.9]
                })
            });

            const dataKejatuhan = await responGhoib.json();
            if (!dataKejatuhan.event_id) throw new Error("Failed to get event_id");

            // Nunggu SSE kayak nungguin mantan
            const responMerana = await fetch(`${this.kandangKuda}/gradio/gradio_api/call/chat/${dataKejatuhan.event_id}`, {
                headers: { "accept": "text/event-stream" }
            });

            const teksNyasar = await responMerana.text();

            let hasilNgebacot = "";
            for (const barisGalau of teksNyasar.split("\n")) {
                if (barisGalau.startsWith("data:")) {
                    try {
                        const isiKalengan = JSON.parse(barisGalau.substring(5).trim());
                        if (Array.isArray(isiKalengan) && typeof isiKalengan[0] === "string") {
                            hasilNgebacot = isiKalengan[0];
                        }
                    } catch (e) {}
                }
            }

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    model: modelNyasar,
                    response: hasilNgebacot.trim() || "No response"
                }
            });
        } catch (errorNyemplung) {
            res.status(500).json({ status: false, error: errorNyemplung.message });
        }
    }
};
