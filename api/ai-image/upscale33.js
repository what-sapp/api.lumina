const axios = require('axios');
const FormData = require('form-data');

/**
 * ULTRA UPSCALER AI (STABLE VERSION)
 * Fix: Error 500 with Buffer Handling & Valid Headers
 * Integration: Shannz x Xena
 */
module.exports = {
    name: "Upscale AI",
    desc: "Ubah foto burik jadi HD/4K secara otomatis. Kirim URL gambar di parameter 'url'.",
    category: "Tools",
    params: ["url"],
    async run(req, res) {
        try {
            const { url } = req.query;
            if (!url) return res.status(400).json({ status: false, error: "Mana URL gambarnya, Senior?" });

            const commonHeaders = {
                'product-serial': '2af2315faaacc1785282767cdaa29e80',
                'product-code': '067003',
                'user-agent': 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B)',
                'referer': 'https://unblurimage.ai/',
                'origin': 'https://unblurimage.ai',
                'accept': 'application/json, text/plain, */*'
            };

            // --- TAHAP 1: DOWNLOAD KE BUFFER ---
            // Ini kunci biar gak Error 500, kita pastiin filenya utuh sebelum diupload
            const imgResponse = await axios.get(url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(imgResponse.data, 'binary');

            const form = new FormData();
            form.append('image', buffer, { 
                filename: 'upscale.jpg', 
                contentType: 'image/jpeg' 
            });

            // --- TAHAP 2: CREATE JOB ---
            const createRes = await axios.post('https://api.unblurimage.ai/api/imgupscaler/v2/image-upscaler-v2/create-job', form, {
                headers: { 
                    ...commonHeaders, 
                    ...form.getHeaders() 
                }
            });

            if (createRes.data.code !== 100000) {
                return res.status(500).json({ status: false, error: "Server sana nolak gambarnya, coba URL lain!" });
            }

            const jobId = createRes.data.result.job_id;

            // --- TAHAP 3: POLLING (SMART WAIT) ---
            let outputUrl = null;
            let attempts = 0;
            const maxAttempts = 10; // Total nunggu sekitar 40-50 detik

            while (!outputUrl && attempts < maxAttempts) {
                // Kasih nafas 5 detik tiap ngecek
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                const check = await axios.get(`https://api.unblurimage.ai/api/imgupscaler/v2/image-upscaler-v2/get-job/${jobId}`, { 
                    headers: commonHeaders 
                });
                
                if (check.data.code === 100000 && check.data.result.output_url && check.data.result.output_url.length > 0) {
                    outputUrl = check.data.result.output_url[0];
                    break;
                }
                attempts++;
            }

            if (!outputUrl) {
                return res.status(504).json({ status: false, error: "Proses HD terlalu lama, tapi job ID sudah terdaftar." });
            }

            res.status(200).json({
                status: true,
                creator: "shannz x Xena",
                engine: "UnblurImage v2",
                result: outputUrl
            });

        } catch (error) {
            console.error('Upscale Error:', error.response ? error.response.data : error.message);
            res.status(500).json({ 
                status: false, 
                error: "Duh, server HD-nya lagi penuh antrean atau URL gambar mati!" 
            });
        }
    }
};
