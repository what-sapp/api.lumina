const axios = require('axios');

/**
 * CONFIGURATION
 * Ganti 'YOUR_OPENROUTER_API_KEY' dengan API Key kamu
 */
const OPENROUTER_API_KEY = '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';

/**
 * EXPORT MODULE
 */
module.exports = {
    name: "Trinity AI (Reasoning)",
    desc: "AI dengan kemampuan penalaran mendalam (Reasoning) untuk tugas kompleks",
    category: "AI CHAT",
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

            console.log(`Trinity Reasoning asking: ${q}`);

            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: "arcee-ai/trinity-large-preview:free",
                messages: [
                    {
                        role: "user",
                        content: q
                    }
                ],
                reasoning: {
                    enabled: true // Mengaktifkan mode berpikir mendalam
                }
            }, {
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                }
            });

            const result = response.data.choices[0].message;

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    question: q,
                    reasoning: result.reasoning || "No detailed reasoning provided.", // Menampilkan proses berpikirnya
                    answer: result.content
                }
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                creator: "shannz",
                error: error.response?.data?.error?.message || error.message
            });
        }
    }
};
