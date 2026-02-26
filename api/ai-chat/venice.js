const axios = require('axios');

/**
 * VENICE AI (DOLPHIN MISTRAL BYPASS)
 * Status: GOD MODE - Fitur ke-96
 * Creator: Xena
 * Model: dolphin-3.0-mistral-24b
 * Feature: Uncensored Chat & Web Enabled
 */
module.exports = {
    name: "Venice AI",
    desc: "Chat dengan Venice AI (Mistral 24B) tanpa limit.",
    category: "AI CHAT",
    params: ["message"],

    async run(req, res) {
        const { message } = req.query;
        if (!message) return res.status(400).json({ status: false, error: "Tanya apa, Xena?" });

        try {
            const { data } = await axios.request({
                method: 'POST',
                url: 'https://outerface.venice.ai/api/inference/chat',
                headers: {
                    'accept': '*/*',
                    'content-type': 'application/json',
                    'origin': 'https://venice.ai',
                    'referer': 'https://venice.ai/',
                    'user-agent': 'Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
                    'x-venice-version': 'interface@20250523.214528+393d253'
                },
                data: {
                    requestId: 'nekorinn',
                    modelId: 'dolphin-3.0-mistral-24b',
                    prompt: [{ content: message, role: 'user' }],
                    systemPrompt: 'Be a helpful AI assistant.',
                    conversationType: 'text',
                    temperature: 0.8,
                    webEnabled: true,
                    topP: 0.9,
                    isCharacter: false,
                    clientProcessingTime: 15
                }
            });

            // Parsing Chunk Data (Xena's Signature Logic)
            const chunks = data
                .split('\n')
                .filter(Boolean)
                .map(chunk => {
                    try { return JSON.parse(chunk); } 
                    catch { return null; }
                })
                .filter(Boolean);

            let result = chunks.map(chunk => chunk?.content ?? '').join('');

            // Clean up formatting
            result = result.replace(/\\"/g, '"')
                           .replace(/^"(.*)"$/, '$1')
                           .replace(/\\n/g, '\n') // Diubah dikit biar line break-nya enak dibaca
                           .replace(/\\r/g, '')
                           .replace(/\\t/g, ' ')
                           .trim();

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: result || "AI-nya lagi bengong, Mang."
            });

        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message
            });
        }
    }
};
