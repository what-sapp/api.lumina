const axios = require('axios');

/**
 * GPT-4 FRANCE (STABLE DIFFUSION HOST)
 * Feature: High-Intelligence GPT-4 Engine
 * Integration: Shannz x Xena
 */
module.exports = {
    name: "GPT4 France",
    desc: "AI Chat cerdas berbasis GPT-4 dari server stablediffusion.fr.",
    category: "AI CHAT",
    params: ["message"],
    async run(req, res) {
        try {
            const { message } = req.query;
            if (!message) return res.status(400).json({ status: false, error: "Tanya apa hari ini, Senior?" });

            const response = await axios.post("https://stablediffusion.fr/gpt4/predict2", 
                { "prompt": message }, 
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B)',
                        'Origin': 'https://stablediffusion.fr',
                        'Referer': 'https://stablediffusion.fr/gpt4'
                    }
                }
            );

            // Response GPT-4 biasanya ada di field 'message'
            const resultData = response.data.message || response.data;

            res.status(200).json({
                status: true,
                creator: "shannz x Xena",
                engine: "GPT-4 France (Enhanced)",
                result: resultData
            });

        } catch (error) {
            console.error('GPT-4 FR Error:', error.message);
            res.status(500).json({ 
                status: false, 
                error: "GPT-4 lagi overload atau Cookie/Session expired!" 
            });
        }
    }
};
