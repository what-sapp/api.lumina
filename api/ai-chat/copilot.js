const WebSocket = require('ws');
const axios = require('axios');

class CopilotClient {
    constructor() {
        this.headers = {
            'origin': 'https://copilot.microsoft.com',
            'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
        };
    }

    async createConversation() {
        const { data } = await axios.post('https://copilot.microsoft.com/c/api/conversations', null, {
            headers: this.headers
        });
        return data.id;
    }

    async chat(message, model = 'chat') {
        const conversationId = await this.createConversation();

        return new Promise((resolve, reject) => {
            const ws = new WebSocket(
                'wss://copilot.microsoft.com/c/api/chat?api-version=2&features=-,ncedge,edgepagecontext&setflight=-,ncedge,edgepagecontext&ncedge=1',
                { headers: this.headers }
            );

            const response = { text: '', citations: [] };
            const timeout = setTimeout(() => {
                ws.close();
                reject(new Error('Timeout'));
            }, 60000);

            ws.on('open', () => {
                ws.send(JSON.stringify({
                    event: 'setOptions',
                    supportedFeatures: ['partial-generated-images'],
                    supportedCards: ['weather', 'local', 'image', 'sports', 'video', 'ads', 'safetyHelpline', 'quiz', 'finance', 'recipe'],
                    ads: { supportedTypes: ['text', 'product', 'multimedia', 'tourActivity', 'propertyPromotion'] }
                }));

                ws.send(JSON.stringify({
                    event: 'send',
                    mode: model,
                    conversationId,
                    content: [{ type: 'text', text: message }],
                    context: {}
                }));
            });

            ws.on('message', (chunk) => {
                try {
                    const parsed = JSON.parse(chunk.toString());
                    switch (parsed.event) {
                        case 'appendText':
                            response.text += parsed.text || '';
                            break;
                        case 'citation':
                            response.citations.push({
                                title: parsed.title,
                                url: parsed.url,
                                publisher: parsed.publisher,
                                icon: parsed.iconUrl
                            });
                            break;
                        case 'done':
                            clearTimeout(timeout);
                            resolve(response);
                            ws.close();
                            break;
                        case 'error':
                            clearTimeout(timeout);
                            reject(new Error(parsed.message));
                            ws.close();
                            break;
                    }
                } catch (e) {
                    clearTimeout(timeout);
                    reject(e);
                }
            });

            ws.on('error', (e) => { clearTimeout(timeout); reject(e); });
        });
    }
}

module.exports = {
    name: "CopilotAI",
    desc: "Chat dengan Microsoft Copilot AI via WebSocket.",
    category: "AI CHAT",
    params: ["prompt", "_model"],
    paramsSchema: {
        prompt: { type: "text", label: "Prompt", required: true },
        _model: {
            type: "select",
            label: "Model",
            required: false,
            default: "chat",
            options: [
                { label: "Default",      value: "chat" },
                { label: "Think Deeper", value: "reasoning" },
                { label: "GPT-5",        value: "smart" }
            ]
        }
    },

    async run(req, res) {
        const prompt = req.query.prompt;
        const model  = req.query.model || 'chat';

        if (!prompt) return res.status(400).json({ status: false, error: "Parameter 'prompt' diperlukan." });

        try {
            const client   = new CopilotClient();
            const response = await client.chat(prompt, model);

            res.status(200).json({
                status: true,
                creator: 'Xena',
                result: {
                    model,
                    response: response.text.trim() || 'No response',
                    citations: response.citations
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};

