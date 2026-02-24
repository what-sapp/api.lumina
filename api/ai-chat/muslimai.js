const axios = require('axios');

/**
 * MUSLIM AI (QURAN EXPERT ENGINE)
 * Feature: 2-Step RAG (Search & Answer)
 * Integration: Shannz x Xena
 */
module.exports = {
    name: "Muslim AI",
    desc: "AI Pakar Al-Qur'an. Menjawab pertanyaan berdasarkan referensi ayat suci.",
    category: "AI CHAT",
    params: ["query"],
    async run(req, res) {
        try {
            const { query } = req.query;
            if (!query) return res.status(400).json({ status: false, error: "Mau tanya apa tentang Islam, Senior?" });

            const headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B)',
                'Origin': 'https://www.muslimai.io',
                'Referer': 'https://www.muslimai.io/'
            };

            // --- TAHAP 1: SEARCH (Cari Ayat) ---
            const searchRes = await axios.post('https://www.muslimai.io/api/search', { query }, { headers });
            const dataSearch = searchRes.data;

            if (!dataSearch || dataSearch.length === 0) {
                return res.status(404).json({ status: false, error: "Maaf, tidak menemukan referensi ayat yang relevan." });
            }

            // Gabungkan potongan ayat
            const passages = dataSearch.map(item => item.content).join('\n\n');

            // --- TAHAP 2: ANSWER (Generasi Jawaban) ---
            const fullPrompt = `Use the following passages to answer the query to the best of your ability as a world class expert in the Quran. Do not mention that you were provided any passages in your answer: ${query}\n\n${passages}`;

            const { data: answerText } = await axios.post('https://www.muslimai.io/api/answer', { 
                prompt: fullPrompt 
            }, { headers, responseType: 'text' });

            // Cleaning HTML tags
            const cleanAnswer = answerText.replace(/<[^>]*>/g, '').trim();

            // Susun referensi surah
            const references = dataSearch.map(s => ({
                surah: s.surah_title,
                link: s.surah_url
            }));

            res.status(200).json({
                status: true,
                creator: "shannz x Xena",
                result: cleanAnswer,
                sources: references
            });

        } catch (error) {
            console.error('MuslimAI Error:', error.message);
            res.status(500).json({ status: false, error: "Server MuslimAI sedang tidak stabil!" });
        }
    }
};
