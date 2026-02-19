const axios = require('axios');

/**
 * EXPORT MODULE
 */
module.exports = {
    name: "OpenAI Chat",
    desc: "Asisten AI pintar berbasis GPT untuk tanya jawab",
    category: "AI CHAT", // Kategori Chat
    params: ["q"],
    async run(req, res) {
        try {
            const { q } = req.query;

            if (!q) {
                return res.status(400).json({
                    status: false,
                    error: 'Parameter "q" (pertanyaan) wajib diisi!'
                });
            }

            console.log(`OpenAI asking: ${q}`);
            
            // Fetch dari API Snowping
            const { data } = await axios.get(`https://api.snowping.my.id/api/aichat/openai`, {
                params: { q }
            });

            if (data.status !== 200) {
                throw new Error("Server OpenAI sedang sibuk, coba lagi nanti.");
            }

            res.status(200).json({
                status: true,
                //creator: "shannz",
                result: {
                    question: q,
                    answer: data.result.answer
                }
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
