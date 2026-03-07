const axios = require('axios');

/**
 * Deep AI Multi-Model
 * GET /ai/deepai?message=hi&model=5
 */

module.exports = {
    name:     'Deep AI',
    desc:     'AI Chat dengan 13 model pilihan powered by DeepAI.',
    category: 'AI',
    method:   'GET',
    params:   ['message', '_model'],
    paramsSchema: {
        message: { type: 'text', required: true },
        _model: {
            type: 'select',
            required: false,
            default: '5',
            options: [
                { label: '1 - Standard',              value: '1'  },
                { label: '2 - DeepSeek V3.2',         value: '2'  },
                { label: '3 - Gemini 2.5 Flash Lite',  value: '3'  },
                { label: '4 - Online',                value: '4'  },
                { label: '5 - Qwen3 30B (Default)',   value: '5'  },
                { label: '6 - Llama 4 Scout',         value: '6'  },
                { label: '7 - Gemma2 9B',             value: '7'  },
                { label: '8 - Llama 3.1 8B',          value: '8'  },
                { label: '9 - Llama 3.3 70B',         value: '9'  },
                { label: '10 - GPT-5 Nano',           value: '10' },
                { label: '11 - Gemma 3 12B',          value: '11' },
                { label: '12 - GPT OSS 120B',         value: '12' },
                { label: '13 - GPT-4.1 Nano',         value: '13' },
            ]
        },
    },

    async run(req, res) {
        try {
            const { message, model: _model } = req.query;
            if (!message) return res.status(400).json({ status: false, error: 'Parameter "message" wajib diisi.' });

            const modelList = {
                '1': 'standard',          '2': 'deepseek-v3.2',
                '3': 'gemini-2.5-flash-lite', '4': 'online',
                '5': 'qwen3-30b-a3b',     '6': 'llama-4-scout',
                '7': 'gemma2-9b-it',      '8': 'llama-3.1-8b-instant',
                '9': 'llama-3.3-70b-instruct', '10': 'gpt-5-nano',
                '11': 'gemma-3-12b-it',   '12': 'gpt-oss-120b',
                '13': 'gpt-4.1-nano'
            };

            let selectedModel = 'qwen3-30b-a3b';
            let currentUuid   = '7b05cd41-1a46-4b75-ad62-042a5f226c76';

            if (_model === '7') {
                selectedModel = modelList['7'];
                currentUuid   = 'cbeeb9b3-1687-4bfd-8e14-434f1e8be6';
            } else if (['8','9','10','11','12','13'].includes(_model)) {
                selectedModel = modelList[_model];
                currentUuid   = '33693cfb-3399-46d8-ad73-956af59da4';
            } else if (modelList[_model]) {
                selectedModel = modelList[_model];
            }

            const formData = new URLSearchParams();
            formData.append('chat_style', 'chat');
            formData.append('chatHistory', JSON.stringify([{ role: 'user', content: message }]));
            formData.append('model', selectedModel);
            formData.append('session_uuid', currentUuid);
            formData.append('hacker_is_stinky', 'very_stinky');

            const response = await axios.post('https://api.deepai.org/hacking_is_a_serious_crime', formData, {
                headers: {
                    'api-key':      'tryit-30025425476-8e927d7fe1753ca3829f69519862e6fc',
                    'user-agent':   'Mozilla/5.0 (Linux; Android 14; Infinix X6833B)',
                    'referer':      'https://deepai.org/chat',
                    'content-type': 'application/x-www-form-urlencoded'
                }
            });

            return res.json({
                status:     true,
                model_name: selectedModel,
                result:     response.data
            });

        } catch (e) {
            return res.status(500).json({ status: false, error: e.message });
        }
    }
};
