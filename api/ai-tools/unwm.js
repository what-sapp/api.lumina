const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');

module.exports = {
    name: "Unwatermark Pro",
    desc: "Hapus watermark, logo, dan teks pada gambar secara otomatis (AI Upgrade)",
    category: "AI TOOLS",
    params: ["url"],
    async run(req, res) {
        try {
            const { url } = req.query;
            if (!url) return res.status(400).json({ status: false, error: 'Url gambar wajib diisi!' });

            const productSerial = crypto.randomUUID();
            const imgRes = await axios.get(url, { responseType: 'arraybuffer' });

            const form = new FormData();
            form.append('original_image_file', Buffer.from(imgRes.data), { filename: 'input.jpg' });
            form.append('output_format', 'jpg');
            form.append('is_remove_text', 'true');
            form.append('is_remove_logo', 'true');
            form.append('is_enhancer', 'true');

            const { data: create } = await axios.post('https://api.unwatermark.ai/api/web/v1/image-watermark-auto-remove-upgrade/create-job', form, {
                headers: {
                    ...form.getHeaders(),
                    'Product-Serial': productSerial,
                    'Product-Code': '067003',
                    'origin': 'https://unwatermark.ai'
                }
            });

            const jobId = create.result.job_id;
            let result;
            
            for (let i = 0; i < 20; i++) {
                await new Promise(r => setTimeout(r, 4000));
                const { data: check } = await axios.get(`https://api.unwatermark.ai/api/web/v1/image-watermark-auto-remove-upgrade/get-job/${jobId}`, {
                    headers: { 'Product-Serial': productSerial, 'Product-Code': '067003' }
                });

                if (check.code === 100000 && check.result?.output_url) {
                    result = check.result;
                    break;
                }
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    job_id: jobId,
                    input: result.input_url,
                    output: Array.isArray(result.output_url) ? result.output_url[0] : result.output_url
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    }
};
