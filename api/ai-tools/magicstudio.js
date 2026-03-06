const axios    = require('axios');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');

/**
 * MAGICSTUDIO REMOVE BG
 * GET /ai/magicstudio-removebg?url=https://example.com/image.jpg
 */

function generateClientId(length = 40) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < length; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
    return id;
}

module.exports = {
    name:     'MagicStudioRemoveBg',
    desc:     'Hapus background gambar menggunakan MagicStudio.',
    category: 'AI TOOLS',
    params:   ['url'],

    async run(req, res) {
        const { url } = req.query;

        if (!url?.trim()) return res.status(400).json({
            status: false, creator: 'Shannz',
            error: "Parameter 'url' wajib diisi. Masukkan URL gambar."
        });

        try {
            // Download gambar dari URL
            const imgRes = await axios.get(url.trim(), { responseType: 'arraybuffer', timeout: 15000 });
            const contentType = imgRes.headers['content-type'] || 'image/jpeg';
            const base64Data  = Buffer.from(imgRes.data).toString('base64');
            const dataUri     = `data:${contentType};base64,${base64Data}`;

            const formData = new FormData();
            formData.append('image',              dataUri);
            formData.append('output_type',        'image');
            formData.append('output_format',      'url');
            formData.append('auto_delete_data',   'true');
            formData.append('user_profile_id',    'null');
            formData.append('anonymous_user_id',  uuidv4());
            formData.append('request_timestamp',  (Date.now() / 1000).toFixed(3));
            formData.append('user_is_subscribed', 'false');
            formData.append('client_id',          generateClientId());

            const response = await axios.post(
                'https://ai-api.magicstudio.com/api/remove-background',
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36',
                        'Accept':     'application/json, text/plain, */*',
                        'origin':     'https://magicstudio.com',
                        'referer':    'https://magicstudio.com/background-remover/editor/',
                    },
                    timeout: 30000,
                }
            );

            const data = response.data;
            if (data?.status === 'success' && data?.results?.[0]?.image) {
                return res.status(200).json({
                    status: true, creator: 'Shannz',
                    result: {
                        original: url.trim(),
                        image:    data.results[0].image,
                    }
                });
            } else {
                throw new Error('Format respons API tidak sesuai.');
            }
        } catch (e) {
            return res.status(500).json({ status: false, creator: 'Shannz', error: e.message });
        }
    }
};

