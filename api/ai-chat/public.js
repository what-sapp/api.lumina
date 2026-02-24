const axios = require('axios');

/**
 * PUBLIC AI (CLEAN ENGINE)
 * Feature: Event-Stream to JSON Parser
 * Integration: Shannz x Xena
 */
module.exports = {
    name: "Public AI",
    desc: "AI Chat dengan respon cepat dan akurat (PublicAI Engine).",
    category: "AI CHAT",
    params: ["message"],
    async run(req, res) {
        try {
            const { message } = req.query;
            if (!message) return res.status(400).json({ status: false, error: "Tanya apa, Senior?" });

            const generateId = (length = 16) => 
                Array.from({ length }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]).join('');

            const { data } = await axios.post('https://publicai.co/api/chat', {
                tools: {},
                id: "e3sbXV7N4CrZ0IYR", // ID Statis hasil sniff browser kamu
                messages: [{
                    id: generateId(),
                    role: 'user',
                    parts: [{ type: 'text', text: message }]
                }],
                trigger: 'submit-message'
            }, {
                headers: {
                    'accept': 'text/event-stream',
                    'content-type': 'application/json',
                    'origin': 'https://publicai.co',
                    'referer': 'https://publicai.co/chat',
                    'user-agent': 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B)'
                },
                responseType: 'text' // Kita ambil raw text buat diparsing
            });

            // Parsing Stream Data
            const result = data.split('\n')
                .filter(line => line.startsWith('data: ') && !line.includes('[DONE]'))
                .map(line => {
                    try {
                        const parsed = JSON.parse(line.slice(6));
                        return parsed.type === 'text-delta' ? parsed.delta : '';
                    } catch (e) { return ''; }
                }).join('');

            if (!result) {
                return res.status(500).json({ 
                    status: false, 
                    error: "Server PublicAI balikin respon kosong, mungkin ID-nya expired!" 
                });
            }

            res.status(200).json({
                status: true,
                creator: "shannz x Xena",
                result: result.trim()
            });

        } catch (error) {
            console.error('PublicAI Error:', error.message);
            res.status(500).json({ 
                status: false, 
                error: "Duh, PublicAI lagi mogok kerja atau ID Sniff kamu diblokir!" 
            });
        }
    }
};
