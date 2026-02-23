const axios = require('axios');
const FormData = require('form-data');

/**
 * ULTRA UPSCALER AI (4K HD ENGINE)
 * Feature: Auto Job Creation & Polling
 * Integration: Shannz x Xena
 */
module.exports = {
    name: "Upscale AI",
    desc: "Ubah foto burik jadi HD/4K secara otomatis menggunakan engine UnblurImage.",
    category: "Tools",
    params: ["url"], // User cukup kirim URL gambar
    async run(req, res) {
        try {
            const { url } = req.query;
            if (!url) return res.status(400).json({ status: false, error: "Mana URL gambarnya, Senior?" });

            const headers = {
                'product-serial': '2af2315faaacc1785282767cdaa29e80',
                'product-code': '067003',
                'user-agent': 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B)',
                'referer': 'https://unblurimage.ai/',
                'origin': 'https://unblurimage.ai'
            };

            // --- TAHAP 1: UPLOAD (via URL) ---
            // Kita ambil dulu gambar dari URL-nya buat dijadiin stream/buffer
            const imgStream = await axios.get(url, { responseType: 'stream' });
            const form = new FormData();
            form.append('image', imgStream.data, { filename: 'upscale.jpg' });

            const createRes = await axios.post('https://api.unblurimage.ai/api/imgupscaler/v2/image-upscaler-v2/create-job', form, {
                headers: { ...headers, ...form.getHeaders() }
            });

            if (createRes.data.code !== 100000) throw new Error("Gagal membuat antrean upscale.");
            const jobId = createRes.data.result.job_id;

            // --- TAHAP 2: POLLING (Nunggu Proses Selesai) ---
            let outputUrl = null;
            let attempts = 0;
            const maxAttempts = 15; // Max nunggu 60 detik (15 x 4s)

            while (!outputUrl && attempts < maxAttempts) {
                await new Promise(res => setTimeout(res, 4000));
                const check = await axios.get(`https://api.unblurimage.ai/api/imgupscaler/v2/image-upscaler-v2/get-job/${jobId}`, { headers });
                
                if (check.data.code === 100000 && check.data.result.output_url) {
                    outputUrl = check.data.result.output_url[0];
                }
                attempts++;
            }

            if (!outputUrl) throw new Error("Proses terlalu lama (Timeout).");

            res.status(200).json({
                status: true,
                creator: "shannz x Xena",
                job_id: jobId,
                result: outputUrl
            });

        } catch (error) {
            console.error('Upscale Error:', error.message);
            res.status(500).json({ status: false, error: "Gagal memproses gambar, coba lagi nanti!" });
        }
    }
};
