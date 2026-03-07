const axios  = require('axios');
const crypto = require('crypto');

/**
 * DEEPIMG - Text to Image Generator
 * GET /ai/deepimg?prompt=beautiful anime girl&style=Anime
 */

module.exports = {
    name:     'DeepImg',
    desc:     'Generate gambar dari teks dengan berbagai style pilihan.',
    category: 'AI',
    method:   'GET',
    params:   ['prompt', 'style'],
    paramsSchema: {
        prompt: { type: 'text', required: true },
        style: {
            type: 'select',
            required: true,
            default: 'Anime',
            options: [
                { label: 'Headshot',   value: 'Headsot'    },
                { label: 'Anime',      value: 'Anime'      },
                { label: 'Tattoo',     value: 'Tatto'      },
                { label: 'ID Photo',   value: 'ID Photo'   },
                { label: 'Cartoon',    value: 'Cartoon'    },
                { label: 'Fantasy 3D', value: 'Fantasy 3D' },
            ]
        },
    },

    STYLES: ['Headsot', 'Anime', 'Tatto', 'ID Photo', 'Cartoon', 'Fantasy 3D'],

    async run(req, res) {
        const { prompt, style } = req.query;

        if (!prompt?.trim()) return res.status(400).json({ status: false, error: "Parameter 'prompt' wajib diisi." });
        if (!style?.trim())  return res.status(400).json({ status: false, error: "Parameter 'style' wajib diisi." });
        if (!this.STYLES.includes(style)) return res.status(400).json({ status: false, error: `Style tidak valid. Pilih: ${this.STYLES.join(', ')}` });

        try {
            const { data } = await axios.post(
                'https://api-preview.chatgot.io/api/v1/deepimg/flux-1-dev',
                {
                    device_id: crypto.randomBytes(16).toString('hex'),
                    prompt:    `${prompt.trim()} -style ${style}`,
                    size:      '1024x1024',
                },
                {
                    headers: {
                        'User-Agent':      'ScRaPe/9.9 (KaliLinux; Nusantara Os; My/Shannz)',
                        'Content-Type':    'application/json',
                        'accept-language': 'id-ID',
                        'referer':         'https://deepimg.ai/',
                        'origin':          'https://deepimg.ai',
                        'sec-fetch-dest':  'empty',
                        'sec-fetch-mode':  'cors',
                        'sec-fetch-site':  'cross-site',
                        'priority':        'u=0',
                        'te':              'trailers',
                    },
                    timeout: 30000,
                }
            );

            return res.json({
                status: true,
                result: {
                    prompt: prompt.trim(),
                    style,
                    image: data?.data?.url || data?.url || data,
                }
            });
        } catch (e) {
            return res.status(500).json({ status: false, error: e.message });
        }
    }
};
