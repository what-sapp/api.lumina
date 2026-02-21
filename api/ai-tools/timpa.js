const axios = require('axios');
const FormData = require('form-data');

/**
 * AI TEXT REPLACER (Magic Eraser Engine)
 * Params: url, find (teks yg dicari), replace (teks pengganti)
 */
module.exports = {
    name: "AI Text Replace",
    desc: "Mengganti teks di dalam gambar dengan teks baru menggunakan AI",
    category: "AI",
    params: ["url", "find", "replace"],
    async run(req, res) {
        try {
            const { url, find, replace } = req.query;
            if (!url || !find || !replace) {
                return res.status(400).json({ status: false, error: "Missing params: url, find, & replace are required!" });
            }

            const genserial = () => {
                let s = '';
                for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
                return s;
            };

            const isSuccess = (r) => r.data && r.data.code === 100000;

            console.log(`Starting AI Text Replace: "${find}" -> "${replace}"`);

            // Step 1: Create Job
            const form = new FormData();
            form.append('original_image_url', url);
            form.append('original_text', find);
            form.append('replace_text', replace);

            const jobRes = await axios.post('https://api.magiceraser.org/api/magiceraser/v2/text-replace/create-job',
                form, {
                    headers: {
                        ...form.getHeaders(),
                        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)',
                        'product-code': 'magiceraser',
                        'product-serial': genserial(),
                        origin: 'https://imgupscaler.ai',
                        referer: 'https://imgupscaler.ai/'
                    }
                }
            );

            if (!isSuccess(jobRes)) throw new Error("Gagal membuat antrian AI.");

            const jobId = jobRes.data.result.job_id;
            
            // Step 2: Polling Status
            let result;
            let attempts = 0;
            const maxAttempts = 30; 

            do {
                await new Promise(r => setTimeout(r, 3000));
                const check = await axios.get(`https://api.magiceraser.org/api/magiceraser/v1/ai-remove/get-job/${jobId}`, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)' }
                });

                if (!isSuccess(check)) throw new Error("Gagal mengecek status job.");
                
                result = check.data.result;
                attempts++;
                if (result.status === 'failed' || result.status === 'error') throw new Error("AI gagal memproses gambar.");

            } while (result.status !== 'completed' && attempts < maxAttempts);

            if (attempts >= maxAttempts) throw new Error("Proses terlalu lama (Timeout).");

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: {
                    original: result.input_image_url,
                    output: result.output_url?.[0] || result.output_image_url,
                    processing_time: `${attempts * 3}s`
                }
            });

        } catch (error) {
            res.status(500).json({ status: false, error: error.message });
        }
    }
};
