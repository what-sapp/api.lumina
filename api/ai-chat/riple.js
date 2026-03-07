const axios = require('axios');

/**
 * Riple AI Chat
 * GET /ai/riple?prompt=hi
 */

module.exports = {
    name:     'RipleAI',
    desc:     'AI Chat powered by Riple AI.',
    category: 'AI',
    method:   'GET',
    params:   ['prompt'],
    paramsSchema: {
        prompt: { type: 'text', required: true },
    },

    async run(req, res) {
        const { prompt } = req.query;
        if (!prompt) return res.status(400).json({ status: false, error: 'Parameter "prompt" wajib diisi.' });

        try {
            const { data } = await axios.post('https://ai.riple.org/', {
                messages: [{ role: 'user', content: prompt }]
            }, {
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            const result = data.split('\n\n')
                .filter(line => line && !line.includes('[DONE]'))
                .map(line => JSON.parse(line.substring(6)))
                .map(line => line.choices[0]?.delta?.content)
                .join('');

            if (!result) throw new Error('No result found.');

            return res.json({ status: true, result });
        } catch (e) {
            return res.status(500).json({ status: false, error: e.message });
        }
    }
};
