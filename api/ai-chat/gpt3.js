const axios = require('axios');

/**
 * GPT-3 FRANCE (STABLE DIFFUSION HOST)
 * Feature: Ultra-lightweight & Fast Response
 * Integration: Shannz x Xena
 */
module.exports = {
    name: "GPT3 France",
    desc: "AI Chat cepat berbasis GPT-3 dari server stablediffusion.fr.",
    category: "AI CHAT",
    params: ["message"],
    async run(req, res) {
        try {
            const { message } = req.query;
            if (!message) return res.status(400).json({ status: false, error: "Tanya apa hari ini, Senior?" });

            const response = await axios.post("https://stablediffusion.fr/gpt3/predict", 
                { "prompt": message }, 
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B)',
                        'Origin': 'https://stablediffusion.fr',
                        'Referer': 'https://stablediffusion.fr/chatgpt3'
                    }
                }
            );

            // Berdasarkan screenshot response kamu, datanya ada di field 'message'
            const resultData = response.data.message || response.data;

            res.status(200).json({
                status: true,
                creator: "shannz x Xena",
                engine: "GPT-3 France",
                result: resultData
            });

        } catch (error) {
            console.error('GPT-3 FR Error:', error.message);
            res.status(500).json({ 
                status: false, 
                error: "Server Perancis lagi mogok atau limit request!" 
            });
        }
    }
};
