const axios = require('axios');
const crypto = require('crypto');

module.exports = {
    name: "ClothesRemover",
    desc: "Remove pakaian dari gambar menggunakan DeepFakeMaker AI.",
    category: "AI Tools",
    params: ["image", "_prompt"],
    paramsSchema: {
        image: { type: "file", label: "Image", required: true },
        _prompt: {
            type: "select",
            label: "Mode",
            required: false,
            default: "nude",
            options: [
                { label: "Nude",    value: "nude" },
                { label: "Bikini",  value: "bikini" },
                { label: "Lingerie", value: "lingerie" }
            ]
        }
    },

    aesEncrypt(data, key, iv) {
        const cipher = crypto.createCipheriv('aes-128-cbc', Buffer.from(key, 'utf8'), Buffer.from(iv, 'utf8'));
        return cipher.update(data, 'utf8', 'base64') + cipher.final('base64');
    },

    genRandom(len) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        return Array.from(crypto.randomBytes(len), byte => chars[byte % chars.length]).join('');
    },

    async run(req, res) {
        const file   = req.file;
        const prompt = req.query.prompt || "nude";

        if (!file) return res.status(400).json({ status: false, error: "File image diperlukan." });

        try {
            const buffer = file.buffer;

            const t          = Math.floor(Date.now() / 1000).toString();
            const nonce      = crypto.randomUUID();
            const tempAesKey = this.genRandom(16);
            const secret_key = crypto.publicEncrypt({
                key: `-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDa2oPxMZe71V4dw2r8rHWt59gH\nW5INRmlhepe6GUanrHykqKdlIB4kcJiu8dHC/FJeppOXVoKz82pvwZCmSUrF/1yr\nrnmUDjqUefDu8myjhcbio6CnG5TtQfwN2pz3g6yHkLgp8cFfyPSWwyOCMMMsTU9s\nsnOjvdDb4wiZI8x3UwIDAQAB\n-----END PUBLIC KEY-----`,
                padding: crypto.constants.RSA_PKCS1_PADDING,
            }, Buffer.from(tempAesKey)).toString('base64');

            const userId = this.genRandom(64).toLowerCase();

            const instance = axios.create({
                baseURL: 'https://apiv1.deepfakemaker.io/api',
                params: {
                    app_id: 'ai_df', t, nonce, secret_key,
                    sign: this.aesEncrypt(`ai_df:NHGNy5YFz7HeFb:${t}:${nonce}:${secret_key}`, tempAesKey, tempAesKey),
                },
                headers: {
                    'access-control-allow-credentials': 'true',
                    'content-type': 'application/json',
                    'user-agent': 'Mozilla/5.0 (Android 15; Mobile; SM-F958; rv:130.0) Gecko/130.0 Firefox/130.0',
                    'referer': 'https://deepfakemaker.io/ai-clothes-remover/'
                }
            });

            // Upload sign
            const { data: fileSign } = await instance.post('/user/v2/upload-sign', {
                filename: this.genRandom(32) + '_' + Date.now() + '.jpg',
                hash: crypto.createHash('sha256').update(buffer).digest('hex'),
                user_id: userId
            });

            // Upload to S3
            await axios.put(fileSign.data.url, buffer, {
                headers: { 'content-type': 'image/jpeg', 'content-length': buffer.length }
            });

            // Get CF token
            const { data: cf } = await axios.post('https://x1st-cf.hf.space/action', {
                url: 'https://deepfakemaker.io/ai-clothes-remover/',
                mode: 'turnstile-min',
                siteKey: '0x4AAAAAAB6PHmfUkQvGufDI'
            });
            if (!cf?.data?.token) throw new Error('Failed to get CF token.');

            // Submit task
            const { data: task } = await instance.post('/img/v2/free/clothes/remover/task', {
                prompt,
                image: 'https://cdn.deepfakemaker.io/' + fileSign.data.object_name,
                platform: 'clothes_remover',
                user_id: userId
            }, { headers: { token: cf.data.token } });

            // Poll result
            const MAX_ATTEMPTS = 40;
            for (let i = 0; i < MAX_ATTEMPTS; i++) {
                const { data } = await instance.get('/img/v2/free/clothes/remover/task', {
                    params: { user_id: userId, ...task.data }
                });
                if (data.msg === 'success') {
                    return res.status(200).json({
                        status: true,
                        creator: "Xena",
                        result: { url: data.data.generate_url }
                    });
                }
                await new Promise(r => setTimeout(r, 2500));
            }

            throw new Error('Timeout: hasil tidak tersedia.');
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};

