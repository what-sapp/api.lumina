const axios = require('axios');

const SESSION_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0IjoicyIsInYiOiIwLjAuMCIsInUiOiJqbW1DYVdDc1E2dWpKZUVDNWlNbXBnPT0iLCJ1dSI6ImZza3ZERXloUm51NFIxcHdFSVVNU1E9PSIsImlhdCI6MTc3MzA3NTE3N30.Rvqtp1EL3bIKy7TPwHPqJ1lUHm__ySGstA5QqBUfAAs';

let cachedToken = null;
let cacheExpiry = 0;

async function getGuiToken() {
    if (cachedToken && Date.now() < cacheExpiry) return cachedToken;
    const r = await axios.get('https://puter.com/get-gui-token', {
        headers: {
            'cookie':     `puter_auth_token=${SESSION_TOKEN}`,
            'User-Agent': 'Mozilla/5.0 (Linux; Android 14)'
        }
    });
    cachedToken = r.data.token;
    cacheExpiry = Date.now() + 55 * 60 * 1000;
    return cachedToken;
}

module.exports = {
    name: "PuterAI",
    desc: "Chat AI via Puter dengan berbagai model. Support vision (upload gambar).",
    category: "AI CHAT",
    method: "POST",
    params: ["prompt", "_model"],
    paramsSchema: {
        prompt: { type: "text", label: "Prompt", required: true },
        image:  { type: "file", label: "Gambar (opsional)", required: false, accept: "image/*" },
        _model: {
            type: "select",
            label: "Model",
            required: false,
            default: "openrouter:openrouter/free",
            options: [
                { label: "OpenRouter Free",     value: "openrouter:openrouter/free" },
                { label: "Arcee Trinity Large", value: "arcee-ai/trinity-large-preview:free" },
                { label: "GPT-5 Mini",          value: "openai/gpt-5-mini" },
                { label: "Gemini 2.5 Pro",      value: "openrouter:google/gemini-2.5-pro" },
                { label: "DeepSeek R1",         value: "openrouter:deepseek/deepseek-r1" },
                { label: "GPT-4o Search",       value: "openrouter:openai/gpt-4o-search-preview" },
                { label: "GPT OSS 120B",        value: "openai/gpt-oss-120b" },
                { label: "GPT-5 Nano",          value: "openai/gpt-5-nano" },
                { label: "Gemma 3N 4B",          value: "openrouter:google/gemma-3n-e4b-it:free" },
                { label: "Gemma 3 12B",          value: "openrouter:google/gemma-3-12b-it:free" },
                { label: "Nemotron 30B A3B",     value: "openrouter:nvidia/nemotron-3-nano-30b-a3b:free" },
            ]
        }
    },

    async run(req, res) {
        const prompt = req.body?.prompt || req.query.prompt;
        const model  = req.body?.model  || req.query.model || 'openrouter:openrouter/free';
        const file   = req.file;

        if (!prompt) return res.status(400).json({ status: false, error: "Parameter 'prompt' diperlukan." });

        try {
            const token = await getGuiToken();

            // Build message content
            let content;
            if (file) {
                const base64 = file.buffer.toString('base64');
                const mime   = file.mimetype;
                content = [
                    prompt,
                    { image_url: { url: `data:${mime};base64,${base64}` } }
                ];
            } else {
                content = prompt;
            }

            const r = await axios.post('https://api.puter.com/drivers/call', {
                interface: 'puter-chat-completion',
                driver:    'ai-chat',
                test_mode: false,
                method:    'complete',
                args: {
                    vision:   !!file,
                    messages: [{ role: 'user', content }],
                    model,
                    stream:   false
                },
                auth_token: token
            }, {
                headers: {
                    'Content-Type': 'text/plain;actually=json',
                    'Origin':       'https://ish.chat',
                    'Referer':      'https://ish.chat/'
                }
            });

            if (!r.data.success) throw new Error(r.data.message || JSON.stringify(r.data));

            res.status(200).json({
                status: true,
                creator: "Xena",
                result: {
                    model,
                    response: r.data.result?.message?.content || 'No response'
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.response?.data || e.message });
        }
    }
};
