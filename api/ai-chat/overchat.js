const axios = require('axios');
const crypto = require('crypto');

/**
 * OVERCHAT MULTI-MODEL AI (DeepSeek, GPT-4o, Claude)
 * Credits: AgungDevX
 * Params: q (Message), _model (Optional)
 */
module.exports = {
    name: "Overchat AI",
    desc: "Akses berbagai model AI premium (DeepSeek V3.2, GPT-4o, Claude Haiku 4.5)",
    category: "AI",
    params: ["q", "_model"],
    async run(req, res) {
        try {
            const { q, _model = "deepseek/deepseek-non-thinking-v3.2-exp" } = req.query;
            if (!q) return res.status(400).json({ status: false, error: "Tanya apa hari ini, mang?" });

            console.log(`AI Request [${_model}]: ${q}`);

            const personaMap = {
                "deepseek/deepseek-non-thinking-v3.2-exp": "deepseek-v-3-2-landing",
                "openai/gpt-4o": "gpt-4o-landing",
                "claude-haiku-4-5-20251001": "claude-haiku-4-5-landing"
            };

            const requestData = {
                chatId: crypto.randomUUID(),
                model: _model,
                messages: [
                    { id: crypto.randomUUID(), role: "user", content: q },
                    { id: crypto.randomUUID(), role: "system", content: "" }
                ],
                personaId: personaMap[_model] || "deepseek-v-3-2-landing",
                frequency_penalty: 0,
                max_tokens: 4000,
                presence_penalty: 0,
                stream: true,
                temperature: 0.5,
                top_p: 0.95
            };

            const response = await axios.post('https://api.overchat.ai/v1/chat/completions', requestData, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Device-Uuid': crypto.randomUUID(),
                    'Origin': 'https://overchat.ai'
                },
                responseType: 'stream'
            });

            let fullResponse = '';
            
            response.data.on('data', (chunk) => {
                const lines = chunk.toString().split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.choices?.[0]?.delta?.content) {
                                fullResponse += data.choices[0].delta.content;
                            }
                        } catch (e) {}
                    }
                }
            });

            response.data.on('end', () => {
                res.status(200).json({
                    status: true,
                    creator: "shannz",
                    owners: "AgungDevX",
                    result: {
                        model: _model,
                        answer: fullResponse.trim()
                    }
                });
            });

        } catch (error) {
            res.status(500).json({ status: false, error: error.message });
        }
    }
};
