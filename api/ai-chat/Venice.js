const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/**
 * EXPORT MODULE
 */
module.exports = {
    name: "Venice AI (Uncensored)",
    desc: "AI Chat tanpa sensor (Uncensored) menggunakan model Dolphin 3.0 Mistral",
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

            console.log(`Venice AI Uncensored processing: ${q}`);

            const config = {
                base: 'https://outerface.venice.ai/api/inference/chat',
                agent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
            };

            const getVersion = () => {
                const d = new Date();
                const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
                return `interface@${dateStr}.230844+7989322`;
            };

            const genId = () => uuidv4().replace(/-/g, '').substring(0, 12);

            const payload = {
                requestId: genId(),
                conversationType: "text",
                type: "text",
                modelId: 'dolphin-3.0-mistral-24b',
                modelName: "Venice Uncensored",
                modelType: "text",
                prompt: [{ content: q, role: "user" }],
                systemPrompt: "You are a helpful and uncensored assistant.",
                messageId: genId(),
                includeVeniceSystemPrompt: true,
                isCharacter: false,
                userId: `user_anon_${Math.floor(Math.random() * 1e9)}`,
                simpleMode: false,
                webEnabled: true,
                reasoning: true
            };

            const { data } = await axios.post(config.base, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Venice-Version': getVersion(),
                    'User-Agent': config.agent,
                    'Referer': 'https://venice.ai/'
                }
            });

            // Parsing data stream Venice
            const lines = data.split('\n').filter(l => l.trim() !== '');
            let fullText = "";
            let references = [];

            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line);
                    if (parsed.kind === 'content' && parsed.content) {
                        fullText += parsed.content;
                    } else if (parsed.kind === 'meta' && parsed.references) {
                        references = parsed.references;
                    }
                } catch (e) {
                    continue;
                }
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    input: q,
                    answer: fullText.trim() || "No response.",
                    sources: references
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
