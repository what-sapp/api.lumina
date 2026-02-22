const axios = require('axios');

/**
 * KLING AI - IMAGE EDITING
 * Base: Image-to-Image with Prompt
 * Source: DyySilence API
 */
module.exports = {
    name: "Kling AI Edit",
    desc: "Mengubah atau menambahkan elemen pada gambar menggunakan Kling AI (Wajib URL Gambar & Prompt)",
    category: "AI TOOLS",
    params: ["url", "prompt"],
    async run(req, res) {
        try {
            const { url, prompt } = req.query;
            const apikey = "dyy"; // API Key default dari source

            if (!url || !prompt) {
                return res.status(400).json({ 
                    status: false, 
                    error: "Masukkan parameter 'url' gambar dan 'prompt' modifikasinya!" 
                });
            }

            console.log(`Kling AI Processing: ${prompt}`);

            const { data } = await axios.get(`https://api.dyysilence.biz.id/api/ai-image/klingai`, {
                params: {
                    url: url,
                    prompt: prompt,
                    apikey: apikey
                }
            });

            if (!data.status) {
                throw new Error("Kling AI gagal memproses gambar. Coba prompt lain.");
            }

            res.status(200).json({
                status: true,
                //creator: "shannz",
                prompt_used: data.prompt,
                result: data.result_url
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                //creator: "shannz",
                error: error.message
            });
        }
    }
};
