const axios = require('axios');

/**
 * EXPORT MODULE
 */
module.exports = {
    name: "Turbo AI",
    desc: "AI Search cerdas dengan referensi sumber dan saran pertanyaan terkait",
    category: "AI CHAT",
    params: ["q"],
    async run(req, res) {
        try {
            const { q } = req.query;

            if (!q) {
                return res.status(400).json({
                    status: false,
                    error: 'Parameter "q" wajib diisi!'
                });
            }

            console.log(`Turbo AI searching: ${q}`);
            
            // Fetch dari API Snowping
            const { data } = await axios.get(`https://api.snowping.my.id/api/aichat/turboai`, {
                params: { q }
            });

            if (data.status !== 200) {
                throw new Error("Gagal mengambil data dari Turbo AI.");
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    question: q,
                    answer: data.result.answer,
                    sources: data.result.sources, // Link referensi
                    suggestions: data.result.similarQuestions // Saran pertanyaan
                }
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                creator: "shannz",
                error: error.message
            });
        }
    }
};
