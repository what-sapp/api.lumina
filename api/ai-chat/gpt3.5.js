const axios = require('axios');

/**
 * GPT CHAT (FUN MODE)
 * Personality: Humorous, Friendly, and Witty
 * Source: Siputzx API
 */
module.exports = {
    name: "GPT Chat Fun",
    desc: "Chatting dengan GPT yang punya kepribadian lucu, asik, dan nggak kaku.",
    category: "AI CHAT",
    params: ["text"],
    async run(req, res) {
        try {
            const { text } = req.query;
            
            if (!text) {
                return res.status(400).json({ 
                    status: false, 
                    error: "Kasih kata-kata dulu dong, biar AI-nya bisa ngelawak!" 
                });
            }

            console.log(`GPT Fun Mode processing: ${text}`);

            const { data } = await axios.get(`https://apis-liart.vercel.app/api/gpt`, {
                params: { text }
            });

            if (!data.success) {
                throw new Error("AI-nya lagi keselek, gagal dapet respon.");
            }

            res.status(200).json({
                status: true,
               // creator: "shannz",
                result: data.data.content
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
