const axios    = require('axios');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');

/**
 * MAGICSTUDIO AI ART
 * GET /ai/magicstudio-aiart?prompt=beautiful anime girl
 */

function generateClientId(length = 40) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < length; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
    return id;
}

module.exports = {
    name:     'MagicStudioAiArt',
    desc:     'Generate AI art dari teks menggunakan MagicStudio.',
    category: 'AI IMAGE',
    params:   ['prompt'],

    async run(req, res) {
        const { prompt } = req.query;

        if (!prompt?.trim()) return res.status(400).json({
            status: false, creator: 'Shannz',
            error: "Parameter 'prompt' wajib diisi."
        });

        try {
            const formData = new FormData();
            formData.append('prompt',             prompt.trim());
            formData.append('output_format',      'bytes');
            formData.append('user_profile_id',    'null');
            formData.append('anonymous_user_id',  uuidv4());
            formData.append('request_timestamp',  (Date.now() / 1000).toFixed(3));
            formData.append('user_is_subscribed', 'false');
            formData.append('client_id',          generateClientId());

            const response = await axios.post(
                'https://ai-api.magicstudio.com/api/ai-art-generator',
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        'User-Agent': 'ScRaPe/9.9 (KaliLinux; Nusantara Os; My/Shannz)',
                        'Accept':     'application/json, text/plain, */*',
                        'origin':     'https://magicstudio.com',
                        'referer':    'https://magicstudio.com/ai-art-generator/',
                    },
                    responseType: 'arraybuffer',
                    timeout: 30000,
                }
            );

            const imageBuffer = Buffer.from(response.data);
            const base64      = imageBuffer.toString('base64');
            const mimeType    = 'image/jpeg';

            return res.status(200).json({
                status: true, creator: 'Shannz',
                result: {
                    prompt: prompt.trim(),
                    image:  `data:${mimeType};base64,${base64}`,
                }
            });
        } catch (e) {
            return res.status(500).json({ status: false, creator: 'Shannz', error: e.message });
        }
    }
};
