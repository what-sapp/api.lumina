const axios = require('axios');
const FormData = require('form-data');

/**
 * CONFIGURATION
 */
const headers = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
    'Referer': 'https://removal.ai/'
};

/**
 * CORE LOGIC: Remove Background AI
 */
const bgRemover = {
    // 1. Ambil Web Token (Kunci Akses)
    getWebToken: async () => {
        const { data } = await axios.get('https://removal.ai/wp-admin/admin-ajax.php', {
            headers,
            params: {
                action: 'ajax_get_webtoken',
                security: '4acc8a2f93' // Note: Security token ini mungkin perlu update berkala jika error
            }
        });
        return data.data.webtoken;
    },

    // 2. Eksekusi Penghapusan Background
    remove: async (imageUrl) => {
        try {
            // Download gambar ke buffer
            const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(imgRes.data);
            
            const webToken = await bgRemover.getWebToken();
            const form = new FormData();
            form.append('image_file', buffer, {
                filename: `image_${Date.now()}.jpg`,
                contentType: 'image/jpeg'
            });

            const { data } = await axios.post('https://api.removal.ai/3.0/remove', form, {
                headers: {
                    ...headers,
                    ...form.getHeaders(),
                    'Web-Token': webToken
                },
            });

            return data;
        } catch (e) {
            throw new Error(e.response?.data?.message || e.message);
        }
    }
};

/**
 * EXPORT MODULE
 */
module.exports = {
    name: "Background Remover",
    desc: "Menghapus background gambar secara otomatis menggunakan AI",
    category: "AI",
    params: ["url"],
    async run(req, res) {
        try {
            const { url } = req.query;

            if (!url || !/^https?:\/\/.+/i.test(url)) {
                return res.status(400).json({
                    status: false,
                    error: 'Parameter "url" (link gambar) wajib diisi!'
                });
            }

            console.log(`Removing background for: ${url}`);
            const result = await bgRemover.remove(url);

            if (result.status !== 200) throw new Error("Gagal memproses gambar");

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    original_url: result.original,
                    no_bg_url: result.url, // Link transparan (preview)
                    dimensions: {
                        width: result.original_width,
                        height: result.original_height
                    }
                }
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                creator: "shannz",
                error: error.message
            });
        }
    }
};
