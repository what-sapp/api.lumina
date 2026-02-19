const axios = require('axios');
const crypto = require('crypto');

/**
 * EXPORT MODULE
 */
module.exports = {
    name: "AI Image Colorize",
    desc: "Memberi warna pada foto hitam putih secara otomatis menggunakan AI",
    category: "AI TOOLS",
    params: ["url"],
    async run(req, res) {
        try {
            const { url } = req.query;

            if (!url) {
                return res.status(400).json({ status: false, error: 'Parameter "url" (foto hitam putih) wajib diisi!' });
            }

            console.log(`Colorizing image for: ${url}`);
            const productSerial = crypto.randomUUID();
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
                'Product-Serial': productSerial,
                'origin': 'https://unblurimage.ai',
                'referer': 'https://unblurimage.ai/'
            };

            // 1. Fetch image dari URL user
            const imgRes = await axios.get(url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(imgRes.data);

            // 2. Create Colorize Job (Upload via Multipart)
            const FormData = require('form-data');
            const form = new FormData();
            form.append('original_image_file', buffer, {
                filename: 'input.png',
                contentType: 'image/png'
            });

            const { data: create } = await axios.post('https://api.unblurimage.ai/api/imgupscaler/v2/ai-image-colorize/create-job', form, {
                headers: { ...headers, ...form.getHeaders() }
            });

            if (!create.result?.job_id) throw new Error("Gagal membuat job colorize.");
            const jobId = create.result.job_id;

            // 3. Polling Job Status
            let result;
            let attempts = 0;
            while (attempts < 20) { // Max 1 menit polling
                await new Promise(r => setTimeout(r, 3000));
                const { data: status } = await axios.get(`https://api.unblurimage.ai/api/imgupscaler/v2/ai-image-colorize/get-job/${jobId}`, { headers });

                if (status.code === 100000 && status.result?.output_url) {
                    result = status.result;
                    break;
                }
                attempts++;
            }

            if (!result) throw new Error("Processing timeout.");

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    job_id: jobId,
                    input: result.input_url,
                    output: result.output_url
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
