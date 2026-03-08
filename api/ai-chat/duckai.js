const crypto = require('crypto');

module.exports = {
    name: "DuckAI",
    desc: "Chat dengan AI via Duck.ai (GPT-4o Mini, Claude, Llama, Mixtral).",
    category: "AI CHAT",
    params: ["prompt", "_model"],
    paramsSchema: {
        prompt: { type: "text", label: "Prompt", required: true },
        _model: {
            type: "select",
            label: "Model",
            required: false,
            default: "gpt-4o-mini",
            options: [
                { label: "GPT-4o Mini",      value: "gpt-4o-mini" },
                { label: "Claude Haiku",     value: "claude-haiku-3-5" },
                { label: "Llama 3.3 70B",    value: "meta-llama/Meta-Llama-3.3-70B-Instruct-Turbo" },
                { label: "Mixtral 8x7B",     value: "mistralai/Mixtral-8x7B-Instruct-v0.1" },
                { label: "o4-mini",          value: "o4-mini" }
            ]
        }
    },

    HEADERS: {
        'accept': 'text/event-stream',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'content-type': 'application/json',
        'origin': 'https://duck.ai',
        'referer': 'https://duck.ai/',
        'sec-ch-ua': '"Chromium";v="107", "Not=A?Brand";v="24"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
        'x-fe-version': 'serp_20260306_145043_ET-1ae610e41a8a58dcc562bfae8ff44c0922009bdd'
    },

    async getVqdHash() {
        const r = await fetch('https://duck.ai/duckchat/v1/status', {
            headers: {
                ...this.HEADERS,
                'x-vqd-accept': '1'
            }
        });
        const hash = r.headers.get('x-vqd-hash-1') || r.headers.get('x-vqd-4');
        if (!hash) throw new Error('Failed to get vqd hash');
        return hash;
    },

    async run(req, res) {
        const prompt = req.query.prompt;
        const model  = req.query.model || 'gpt-4o-mini';

        if (!prompt) return res.status(400).json({ status: false, error: "Parameter 'prompt' diperlukan." });

        try {
            const vqdHash = await this.getVqdHash();

            const body = JSON.stringify({
                model,
                metadata: {
                    toolChoice: {
                        NewsSearch: false,
                        VideosSearch: false,
                        LocalSearch: false,
                        WeatherForecast: false
                    }
                },
                messages: [{ role: 'user', content: prompt }],
                canUseTools: true,
                canUseApproxLocation: null
            });

            const r = await fetch('https://duck.ai/duckchat/v1/chat', {
                method: 'POST',
                headers: {
                    ...this.HEADERS,
                    'x-vqd-hash-1': vqdHash,
                    'x-fe-signals': Buffer.from(JSON.stringify({
                        start: Date.now(),
                        events: [{ name: 'startNewChat_free', delta: 195 }],
                        end: 7177
                    })).toString('base64')
                },
                body
            });

            const text = await r.text();
            let fullText = '';

            for (const line of text.split('\n')) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data:') || trimmed === 'data: [DONE]') continue;
                try {
                    const parsed = JSON.parse(trimmed.slice(5).trim());
                    if (parsed.action === 'success' && parsed.message) {
                        fullText += parsed.message;
                    }
                } catch (e) {}
            }

            res.status(200).json({
                status: true,
                creator: 'Xena',
                result: {
                    model,
                    response: fullText.trim() || 'No response'
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
