module.exports = {
    name: "PixWithAI",
    desc: "Generate gambar AI menggunakan Flux Dev Free.",
    category: "AI IMAGE",
    params: ["prompt", "ratio"],

    TOKEN: "a887b936b661edf25d9198bca64c3dec1",

    async run(req, res) {
        const prompt = req.query.prompt;
        const ratio = req.query.ratio || "1:1";
        if (!prompt) return res.status(400).json({ status: false, error: "Parameter 'prompt' diperlukan." });

        const BASE = "https://api.pixwith.ai";
        const UA = "Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36";

        const headers = {
            "content-type": "application/json",
            "x-session-token": this.TOKEN,
            "origin": "https://pixwith.ai",
            "referer": "https://pixwith.ai/",
            "user-agent": UA
        };

        try {
            // Step 1: Create task
            const createRes = await fetch(`${BASE}/api/items/create`, {
                method: "POST", headers,
                body: JSON.stringify({
                    images: {},
                    prompt,
                    options: { prompt_optimization: true, num_outputs: 1, aspect_ratio: ratio },
                    model_id: "0-0"
                })
            });
            const createData = await createRes.json();
            if (createData.code !== 1) throw new Error(createData.message || "Create failed");

            // Step 2: Poll history sampai gambar selesai
            for (let i = 0; i < 20; i++) {
                await new Promise(r => setTimeout(r, 3000));
                const histRes = await fetch(`${BASE}/api/items/history`, {
                    method: "POST", headers,
                    body: JSON.stringify({ tool_type: "0", tag: "", page: 0, page_size: 1 })
                });
                const histData = await histRes.json();
                const item = histData.data?.items?.[0];

                if (item && item.status === 2 && item.result_urls?.length > 0) {
                    // Pastikan prompt cocok
                    return res.status(200).json({
                        status: true,
                        creator: "Xena",
                        result: {
                            prompt: item.prompt,
                            model: item.model_name,
                            image: item.result_urls[0].hd,
                            created_at: item.created_at
                        }
                    });
                }
            }
            throw new Error("Timeout waiting for result");
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
