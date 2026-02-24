const axios = require('axios');

/**
 * AI DETECTOR (ZEROGPT ENGINE)
 * Feature: Detection of AI-Generated Content
 * Integration: Shannz x Xena
 */
module.exports = {
    name: "AI Detector",
    desc: "Cek apakah sebuah teks buatan manusia atau hasil generate AI (ChatGPT/Gemini).",
    category: "AI TOOLS",
    params: ["text"],
    async run(req, res) {
        try {
            const { text } = req.query;
            if (!text) return res.status(400).json({ status: false, error: "Masukkan teks yang mau dicek, Senior!" });

            const { data } = await axios.post('https://api.zerogpt.com/api/detect/detectText', 
                { input_text: text }, 
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Origin': 'https://www.zerogpt.com',
                        'Referer': 'https://www.zerogpt.com/',
                        'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B)'
                    }
                }
            );

            if (data.success) {
                const hasil = data.data;
                res.status(200).json({
                    status: true,
                    creator: "shannz x Xena",
                    result: {
                        is_human: `${hasil.isHuman}%`,
                        is_ai: `${hasil.fakePercentage}%`,
                        feedback: hasil.feedback,
                        words_count: hasil.textWords,
                        ai_words: hasil.aiWords || 0
                    }
                });
            } else {
                res.status(500).json({ status: false, error: data.message });
            }

        } catch (error) {
            console.error('ZeroGPT Error:', error.message);
            res.status(500).json({ status: false, error: "Server ZeroGPT sedang sibuk!" });
        }
    }
};
