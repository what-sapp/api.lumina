const axios = require('axios');

/**
 * TYPLI AI PLUGIN (GPT-5 Nano)
 * Format: Streaming Parser
 */
module.exports = {
    name: "Typli AI (GPT-5)",
    desc: "AI Chat menggunakan model GPT-5 Nano yang sangat cerdas dan responsif",
    category: "AI CHAT",
    params: ["q"],
    async run(req, res) {
        try {
            const { q } = req.query;
            if (!q) return res.status(400).json({ status: false, error: 'Parameter "q" wajib diisi!' });

            console.log(`Typli AI (GPT-5) asking: ${q}`);

            const url = 'https://typli.ai/api/generators/chat';
            const requestData = {
                slug: "free-no-sign-up-chatgpt",
                modelId: "openai/gpt-5-nano",
                id: "BhJK4COzfozOwvqe",
                messages: [{
                    parts: [{ type: "text", text: q }],
                    id: "qo6gwVZZz9kOENyR",
                    role: "user"
                }],
                trigger: "submit-message"
            };

            const response = await axios.post(url, requestData, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)',
                    'Accept': 'text/event-stream'
                },
                responseType: 'stream'
            });

            let fullResponse = '';
            let usage = null;

            return new Promise((resolve) => {
                response.data.on('data', (chunk) => {
                    const chunkStr = chunk.toString();
                    const lines = chunkStr.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.slice(6).trim();
                            if (dataStr === '[DONE]') continue;

                            try {
                                const data = JSON.parse(dataStr);
                                if (data.type === 'text-delta' && data.delta) {
                                    fullResponse += data.delta;
                                } else if (data.type === 'data-session') {
                                    usage = data.data;
                                }
                            } catch (e) {}
                        }
                    }
                });

                response.data.on('end', () => {
                    res.status(200).json({
                        status: true,
                        creator: "shannz",
                        result: {
                            question: q,
                            answer: fullResponse.trim(),
                            usage: usage
                        }
                    });
                    resolve();
                });
            });

        } catch (error) {
            res.status(500).json({ status: false, error: error.message });
        }
    }
};
