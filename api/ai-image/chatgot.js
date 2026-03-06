const axios  = require('axios');
const crypto = require('crypto');

/**
 * DEEPIMG - Text to Image Generator
 * GET /ai/deepimg?prompt=beautiful anime girl&style=Anime
 */

const STYLES = ["Headsot", "Anime", "Tatto", "ID Photo", "Cartoon", "Fantasy 3D"];

module.exports = {
    name:     'DeepImg',
    desc:     `Generate gambar dari teks dengan berbagai style. Style tersedia: ${STYLES.join(", ")}`,
    category: 'AI',
    params:   ['prompt', 'style'],

    async run(req, res) {
        const { prompt, style } = req.query;

        if (!prompt?.trim()) return res.status(400).json({
            status: false, creator: 'Shannz',
            error: "Parameter 'prompt' wajib diisi."
        });

        if (!style?.trim()) return res.status(400).json({
            status: false, creator: 'Shannz',
            error: `Parameter 'style' wajib diisi. Pilih salah satu: ${STYLES.join(", ")}`
        });

        if (!STYLES.includes(style)) return res.status(400).json({
            status: false, creator: 'Shannz',
            error: `Style tidak valid. Pilih salah satu: ${STYLES.join(", ")}`
        });

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
                        'User-Agent':     'ScRaPe/9.9 (KaliLinux; Nusantara Os; My/Shannz)',
                        'Content-Type':   'application/json',
                        'accept-language':'id-ID',
                        'referer':        'https://deepimg.ai/',
                        'origin':         'https://deepimg.ai',
                        'sec-fetch-dest': 'empty',
                        'sec-fetch-mode': 'cors',
                        'sec-fetch-site': 'cross-site',
                        'priority':       'u=0',
                        'te':             'trailers',
                    },
                    timeout: 30000,
                }
            );

            return res.status(200).json({
                status: true, creator: 'Shannz',
                result: {
                    prompt: prompt.trim(),
                    style,
                    image: data?.data?.url || data?.url || data,
                }
            });
        } catch (e) {
            return res.status(500).json({ status: false, creator: 'Shannz', error: e.message });
        }
    }
};
