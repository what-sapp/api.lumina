const axios = require('axios');

/**
 * QWEN AI - IMAGE TO IMAGE (SCENE EDIT)
 * Base: Qwen VL / Image Editing
 * Source: DyySilence API
 */
module.exports = {
    name: "Qwen AI Edit",
    desc: "Mengubah latar belakang atau suasana gambar dengan kecerdasan Qwen AI (Wajib URL & Prompt)",
    category: "AI TOOLS",
    params: ["url", "prompt"],
    async run(req, res) {
        try {
            const { url, prompt } = req.query;
            const apikey = "dyy";

            if (!url || !prompt) {
                return res.status(400).json({ 
                    status: false, 
                    error: "Parameter 'url' dan 'prompt' gak boleh kosong, Mang!" 
                });
            }

            console.log(`Qwen AI Re-imagining: ${prompt}`);

            const { data } = await axios.get(`https://api.dyysilence.biz.id/api/ai-image/qwen`, {
                params: {
                    url: url,
                    prompt: prompt,
                    apikey: apikey
                }
            });

            if (!data.status) {
                throw new Error("Qwen AI lagi pusing, gagal memproses gambar.");
            }

            res.status(200).json({
                status: true,
               // creator: "shannz",
                prompt_used: data.prompt,
                result: data.result_url
            });

        } catch (error) {
            res.status(500).json({
                status: false,
               // creator: "shannz",
                error: error.message
            });
        }
    }
};
