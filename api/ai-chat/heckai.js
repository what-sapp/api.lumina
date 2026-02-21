const axios = require('axios');

/**
 * HECKAI ELITE AI (Grok-3 & Llama-4)
 * Credits: AgungDevX
 * Params: q (Prompt), _model (Optional)
 */
module.exports = {
    name: "Heckai AI",
    desc: "Akses AI generasi terbaru seperti Grok-3 Mini Beta dan Llama-4 Scout",
    category: "AI CHAT",
    params: ["q", "_model"],
    async run(req, res) {
        try {
            const { q, _model = "x-ai/grok-3-mini-beta" } = req.query;
            if (!q) return res.status(400).json({ status: false, error: "Tanya apa hari ini, Mang?" });

            console.log(`Heckai AI Request [${_model}]: ${q}`);

            const baseUrl = 'https://api.heckai.weight-wave.com/api/ha/v1';
            const headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Origin': 'https://api.heckai.weight-wave.com'
            };

            // Step 1: Create Session
            const sessionRes = await axios.post(`${baseUrl}/session/create`, 
                { title: 'Chat_' + Date.now() }, 
                { headers }
            );
            const sessionId = sessionRes.data.id;

            // Step 2: Chat Request
            const response = await axios.post(`${baseUrl}/chat`, {
                model: _model,
                question: q,
                language: 'Indonesian',
                sessionId: sessionId
            }, { headers, responseType: 'text' });

            // Processing SSE Data
            const lines = response.data.split('\n');
            let resultText = '';
            let capture = false;

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const chunk = line.replace('data: ', '').trim();

                if (chunk === '[ANSWER_START]') { capture = true; continue; }
                if (chunk === '[ANSWER_DONE]') { capture = false; break; }
                if (capture) resultText += chunk;
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                owners: "AgungDevX",
                result: {
                    model: _model,
                    answer: resultText.replace(/\\n/g, '\n').trim()
                }
            });

        } catch (error) {
            res.status(500).json({ status: false, error: error.message });
        }
    }
};
