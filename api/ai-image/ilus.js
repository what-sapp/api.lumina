const axios = require('axios');

/**
 * WAI ILLUSTRIOUS AI (ANIME GENERATOR)
 * Feature: Illustrious XL v1.4.0 (NSFW Support)
 * Integration: Shannz x Xena
 */
module.exports = {
    name: "Illustrious AI",
    desc: "Generator gambar anime kualitas tinggi (Illustrious XL). Gunakan '_model' untuk pilih versi.",
    category: "AI IMAGE",
    params: ["prompt", "_model"],
    async run(req, res) {
        try {
            const { prompt, _model } = req.query;
            if (!prompt) return res.status(400).json({ status: false, error: "Prompt-nya mana, Senior?" });

            const modelVersion = ['v140', 'v130', 'v120'].includes(_model) ? _model : 'v140';
            const session_hash = Math.random().toString(36).substring(2);

            // 1. Join Antrean (Queue)
            await axios.post(`https://nech-c-wainsfwillustrious-v140.hf.space/gradio_api/queue/join?`, {
                data: [
                    modelVersion,
                    prompt,
                    'masterpiece, best quality, fine details, highres', // Quality Prompt
                    'lowres, bad anatomy, bad hands, blurry, low quality', // Negative Prompt
                    0, true, 1024, 1024, 6, 30, 1, null, true
                ],
                event_data: null,
                fn_index: 9,
                trigger_id: 18,
                session_hash: session_hash
            });

            // 2. Ambil Data Hasil (Polling/Streaming Data)
            // Note: Kita beri delay sedikit agar proses Gradio selesai
            const { data } = await axios.get(`https://nech-c-wainsfwillustrious-v140.hf.space/gradio_api/queue/data?session_hash=${session_hash}`);
            
            let imageUrl = null;
            const lines = data.split('\n\n');
            for (const line of lines) {
                if (line.startsWith('data:')) {
                    const parsed = JSON.parse(line.substring(6));
                    if (parsed.msg === 'process_completed') {
                        imageUrl = parsed.output.data[0].url;
                    }
                }
            }

            if (!imageUrl) throw new Error("Gagal mendapatkan URL gambar.");

            res.status(200).json({
                status: true,
                creator: "shannz x Xena",
                model: modelVersion,
                result: imageUrl
            });

        } catch (error) {
            console.error('Illustrious Error:', error.message);
            res.status(500).json({ 
                status: false, 
                error: "Antrean penuh atau server HuggingFace lagi lemot!" 
            });
        }
    }
};
